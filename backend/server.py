from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

import bcrypt
import cloudinary
import cloudinary.uploader
import certifi
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, ConfigDict, EmailStr, Field, TypeAdapter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL") or os.environ["MONGODB_URI"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
DEFAULT_ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "Hispeedcity").strip()
DEFAULT_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Hispeedcity2026@").strip()

cloudinary.config(
    cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
    api_key=os.environ["CLOUDINARY_API_KEY"],
    api_secret=os.environ["CLOUDINARY_API_SECRET"],
    secure=True,
)

client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where() if 'localhost' not in MONGO_URL else None)
db = client[DB_NAME]


def parse_cors_origins(raw_value: str) -> list[str]:
    return [origin.strip().strip('"').strip("'") for origin in raw_value.split(',') if origin.strip()]

app = FastAPI(title="Hi Speed City Smart Parking API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(os.environ.get("CORS_ORIGIN", "*")),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class VehicleIn(BaseModel):
    vehicleNumber: str
    vehicleModel: str
    vehicleType: str
    vehicleColor: str


class ApplicationStatus(str, Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"


class ApplicationBase(BaseModel):
    fullName: str
    phoneNumber: str
    email: EmailStr
    companyName: str
    staffId: Optional[str] = ""
    vehicleNumber: str
    vehicleModel: str
    vehicleType: str
    vehicleColor: str
    parkingType: str
    subscriptionPeriod: str
    totalAmount: int
    vehicles: list[VehicleIn] = []


class ApplicationOut(ApplicationBase):
    model_config = ConfigDict(extra="ignore")

    referenceNumber: str
    receiptUrl: str
    status: ApplicationStatus
    submittedAt: datetime
    updatedAt: datetime


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str
    confirmNewPassword: str


class StatusUpdateRequest(BaseModel):
    status: ApplicationStatus


class ParkingAvailabilityUpdateRequest(BaseModel):
    available: bool


class ParkingPrice(BaseModel):
    key: str
    parkingType: str
    label: str
    monthlyPrice: int


PARKING_TYPE_SETTINGS = [
    {
        'key': 'non_reserved',
        'parkingType': 'Non Reserved',
        'label': 'Non-Reserved Parking',
    },
    {
        'key': 'reserved',
        'parkingType': 'Reserved',
        'label': 'Reserved Parking',
    },
    {
        'key': 'premium',
        'parkingType': 'Premium',
        'label': 'Premium Parking',
    },
]

PARKING_TYPE_LOOKUP = {item['parkingType']: item for item in PARKING_TYPE_SETTINGS}
PARKING_KEY_LOOKUP = {item['key']: item for item in PARKING_TYPE_SETTINGS}
PARKING_PRICES = {
    'non_reserved': 159,
    'reserved': 212,
    'premium': 318,
}


def parking_type_to_key(parking_type: str | None) -> str | None:
    if not parking_type:
        return None
    config = PARKING_TYPE_LOOKUP.get(parking_type.strip())
    return config['key'] if config else None


def parking_type_to_label(parking_type: str | None) -> str:
    if not parking_type:
        return 'Parking Type'
    config = PARKING_TYPE_LOOKUP.get(parking_type.strip())
    return config['label'] if config else parking_type.strip()


async def seed_default_parking_settings() -> None:
    for config in PARKING_TYPE_SETTINGS:
        await db.parking_settings.update_one(
            {'key': config['key']},
            {
                '$setOnInsert': {
                    'key': config['key'],
                    'parkingType': config['parkingType'],
                    'label': config['label'],
                    'available': True,
                    'createdAt': now_utc(),
                    'updatedAt': now_utc(),
                }
            },
            upsert=True,
        )


async def get_parking_availability_records() -> list[dict[str, Any]]:
    docs = await db.parking_settings.find({}, {'_id': 0}).to_list(20)
    doc_map = {doc.get('key'): doc for doc in docs if doc.get('key')}
    records: list[dict[str, Any]] = []

    for config in PARKING_TYPE_SETTINGS:
        doc = doc_map.get(config['key'], {})
        records.append({
            'key': config['key'],
            'parkingType': config['parkingType'],
            'label': config['label'],
            'available': doc.get('available', True),
            'updatedAt': doc.get('updatedAt'),
        })

    return records


async def get_parking_availability_map() -> dict[str, dict[str, Any]]:
    return {record['key']: record for record in await get_parking_availability_records()}


def get_parking_price_records() -> list[dict[str, Any]]:
    return [
        {
            'key': config['key'],
            'parkingType': config['parkingType'],
            'label': config['label'],
            'monthlyPrice': PARKING_PRICES.get(config['key'], 0),
        }
        for config in PARKING_TYPE_SETTINGS
    ]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_jwt(admin: dict[str, Any]) -> str:
    payload = {
        "sub": str(admin["_id"]),
        "username": admin["username"],
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc().timestamp()) + 60 * 60 * 24 * 7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt_from_header(authorization: str | None) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token missing")

    token = authorization.split(" ", 1)[1].strip()
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


async def get_current_admin(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    payload = decode_jwt_from_header(authorization)
    admin_id: Any = payload["sub"]
    try:
        admin_id = ObjectId(admin_id)
    except Exception:
        pass
    admin = await db.admins.find_one({"_id": admin_id}, {"passwordHash": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin


async def seed_default_admin() -> None:
    existing_admin = await db.admins.find_one({"username": DEFAULT_ADMIN_USERNAME.lower()})
    admin_doc = {
        "username": DEFAULT_ADMIN_USERNAME.lower(),
        "passwordHash": hash_password(DEFAULT_ADMIN_PASSWORD),
        "createdAt": now_utc(),
    }
    if existing_admin:
        await db.admins.update_one({"_id": existing_admin["_id"]}, {"$set": admin_doc})
        return
    await db.admins.insert_one(admin_doc)


async def next_reference_number() -> str:
    year = now_utc().year
    counter_id = f"applications-{year}"
    counter = await db.counters.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    seq = counter["seq"] if counter and "seq" in counter else 1
    return f"SP-{year}-{seq:06d}"


def normalize_vehicles(payload: dict[str, Any]) -> list[dict[str, Any]]:
    vehicles = payload.get("vehicles") or []
    if vehicles:
        return vehicles
    if all(payload.get(key) for key in ["vehicleNumber", "vehicleModel", "vehicleType", "vehicleColor"]):
        return [
            {
                "vehicleNumber": payload["vehicleNumber"],
                "vehicleModel": payload["vehicleModel"],
                "vehicleType": payload["vehicleType"],
                "vehicleColor": payload["vehicleColor"],
            }
        ]
    return []


def calculate_total_amount(parking_type: str, subscription_period: str, vehicle_count: int) -> int:
    parking_prices = {"Non Reserved": 159, "Reserved": 212, "Premium": 318}
    multipliers = {"Monthly": 1, "Quarterly": 3, "Yearly": 12}
    return parking_prices.get(parking_type, 0) * multipliers.get(subscription_period, 1) * max(vehicle_count, 1)


async def upload_receipt_to_cloudinary(file: UploadFile) -> str:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Receipt file is empty")
    buffer = BytesIO(content)
    result = cloudinary.uploader.upload(
        buffer,
        folder="hispeedcity/receipts",
        resource_type="auto",
    )
    return result["secure_url"]


@app.on_event("startup")
async def startup_event() -> None:
    await seed_default_admin()
    await seed_default_parking_settings()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    client.close()


@app.get("/api/")
async def root() -> dict[str, str]:
    return {"message": "Hi Speed City API is running"}


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"message": "ok"}


@app.post("/api/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate) -> StatusCheck:
    status_obj = StatusCheck(client_name=input.client_name)
    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@app.get("/api/status", response_model=list[StatusCheck])
async def get_status_checks() -> list[StatusCheck]:
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check.get("timestamp"), str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])
    return status_checks


@app.post("/api/admin/login")
async def admin_login(request: AdminLoginRequest) -> dict[str, Any]:
    admin = await db.admins.find_one({"username": request.username.lower().strip()})
    if not admin or not verify_password(request.password, admin["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(admin)
    return {"message": "Login successful", "token": token, "admin": {"username": admin["username"]}}


@app.post("/api/admin/logout")
async def admin_logout(_: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    return {"message": "Logout successful"}


@app.get("/api/admin/me")
async def admin_me(current_admin: dict[str, Any] = Depends(get_current_admin)) -> dict[str, Any]:
    return {"username": current_admin["username"]}


@app.put("/api/admin/change-password")
async def change_password(request: ChangePasswordRequest, current_admin: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    if not request.currentPassword.strip() or not request.newPassword.strip() or not request.confirmNewPassword.strip():
        raise HTTPException(status_code=400, detail="All password fields are required")

    if request.newPassword != request.confirmNewPassword:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")

    if request.currentPassword == request.newPassword:
        raise HTTPException(status_code=400, detail="New password must be different from the current password")

    admin = await db.admins.find_one({"_id": current_admin["_id"]})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if not verify_password(request.currentPassword, admin["passwordHash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    await db.admins.update_one(
        {"_id": admin["_id"]},
        {"$set": {"passwordHash": hash_password(request.newPassword)}},
    )
    return {"message": "Password updated successfully"}


@app.get("/api/admin/dashboard/stats")
async def dashboard_stats(_: dict[str, Any] = Depends(get_current_admin)) -> dict[str, int]:
    total = await db.applications.count_documents({})
    pending = await db.applications.count_documents({"status": "Pending"})
    approved = await db.applications.count_documents({"status": "Approved"})
    rejected = await db.applications.count_documents({"status": "Rejected"})
    return {
        "totalApplications": total,
        "pendingApplications": pending,
        "approvedApplications": approved,
        "rejectedApplications": rejected,
    }


@app.get('/api/parking-availability')
async def get_public_parking_availability() -> dict[str, list[dict[str, Any]]]:
    return {'parkingAvailability': await get_parking_availability_records()}


@app.get('/api/admin/parking-availability')
async def get_admin_parking_availability(_: dict[str, Any] = Depends(get_current_admin)) -> dict[str, list[dict[str, Any]]]:
    return {'parkingAvailability': await get_parking_availability_records()}


@app.put('/api/admin/parking-availability/{parking_key}')
async def update_parking_availability(
    parking_key: str,
    request: ParkingAvailabilityUpdateRequest,
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, list[dict[str, Any]]]:
    config = PARKING_KEY_LOOKUP.get(parking_key)
    if not config:
        raise HTTPException(status_code=404, detail='Parking type not found')

    await db.parking_settings.update_one(
        {'key': parking_key},
        {
            '$set': {
                'available': request.available,
                'updatedAt': now_utc(),
            },
            '$setOnInsert': {
                'key': parking_key,
                'parkingType': config['parkingType'],
                'label': config['label'],
                'createdAt': now_utc(),
            },
        },
        upsert=True,
    )

    return {'parkingAvailability': await get_parking_availability_records()}


@app.get("/api/admin/applications")
async def list_applications(_: dict[str, Any] = Depends(get_current_admin)) -> dict[str, list[dict[str, Any]]]:
    applications = await db.applications.find({}, {"_id": 0}).sort("submittedAt", -1).to_list(1000)
    return {"applications": applications}


@app.get("/api/admin/applications/{reference_number}")
async def get_application(reference_number: str, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, Any]:
    application = await db.applications.find_one({"referenceNumber": reference_number}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"application": application}


@app.patch("/api/admin/applications/{reference_number}/status")
async def update_application_status(reference_number: str, request: StatusUpdateRequest, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, Any]:
    result = await db.applications.find_one_and_update(
        {"referenceNumber": reference_number},
        {"$set": {"status": request.status.value, "updatedAt": now_utc()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")
    result.pop("_id", None)
    return {"message": "Application status updated", "application": result}


@app.get("/api/applications/reference/{reference_number}")
async def get_public_application(reference_number: str) -> dict[str, Any]:
    application = await db.applications.find_one({"referenceNumber": reference_number}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId
from io import BytesIO
import os
import uuid
import bcrypt
import certifi
import jwt
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
from pymongo.errors import PyMongoError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL')
if not MONGO_URL:
    raise RuntimeError('MONGODB_URI is required')


def parse_cors_origins(raw_value: str) -> list[str]:
    return [origin.strip().strip('"').strip("'") for origin in raw_value.split(',') if origin.strip()]


DB_NAME = os.environ.get('DB_NAME', 'hispeedcity')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'Hispeedcity')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Hispeedcity2026@')
CORS_ORIGINS = parse_cors_origins(os.environ.get('CORS_ORIGIN', os.environ.get('CORS_ORIGINS', '*')))
MONGO_TIMEOUT_MS = int(os.environ.get('MONGO_TIMEOUT_MS', '5000'))

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True,
)

client = AsyncIOMotorClient(
    MONGO_URL,
    tlsCAFile=certifi.where() if 'localhost' not in MONGO_URL else None,
    serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
    connectTimeoutMS=MONGO_TIMEOUT_MS,
    socketTimeoutMS=MONGO_TIMEOUT_MS,
)
db = client[DB_NAME]

app = FastAPI()
api_router = APIRouter(prefix='/api')

STATUS_PENDING = 'Pending'
STATUS_APPROVED = 'Approved'
STATUS_REJECTED = 'Rejected'
ALLOWED_STATUSES = {STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED}


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc = dict(doc)
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


def to_application_response(doc: Dict[str, Any]) -> Dict[str, Any]:
    return serialize_doc(doc)


def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def normalize_email_address(raw_value: Any) -> str:
    email = str(raw_value or '').strip()
    if not email:
        raise HTTPException(status_code=400, detail='Email address is required')

    try:
        validated_email = TypeAdapter(EmailStr).validate_python(email)
    except Exception as exc:
        raise HTTPException(status_code=400, detail='Invalid email address') from exc

    return str(validated_email)


def create_token(username: str) -> str:
    payload = {
        'sub': username,
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def require_admin(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authorization token missing')
    token = authorization.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['sub']
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid or expired token')


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str
    confirmNewPassword: str


class StatusUpdateRequest(BaseModel):
    status: str

class RenewalCreateResponse(BaseModel):
    message: str
    renewalReference: str
    email: Optional[EmailStr] = None
    status: str
    submittedAt: datetime


class ApplicationCreateResponse(BaseModel):
    message: str
    referenceNumber: str
    status: str
    submittedAt: datetime


@api_router.get('/')
async def root():
    return {'message': 'Hi Speed City API is running'}


@api_router.get('/health')
async def health():
    return {'message': 'ok'}


@api_router.get('/health/db')
async def database_health():
    try:
        await db.command('ping')
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail='Database is not reachable') from exc
    return {'message': 'database ok'}


@api_router.post('/admin/login')
async def admin_login(payload: AdminLoginRequest):
    try:
        admin = await db.admins.find_one({'username': payload.username})
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail='Database is not reachable') from exc

    if not admin or not verify_password(payload.password, admin['passwordHash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token = create_token(admin['username'])
    return {'message': 'Login successful', 'token': token, 'admin': {'username': admin['username']}}


@api_router.post('/admin/logout')
async def admin_logout(_: str = Depends(require_admin)):
    return {'message': 'Logout successful'}


@api_router.get('/admin/me')
async def admin_me(username: str = Depends(require_admin)):
    return {'username': username}


@api_router.put('/admin/change-password')
async def change_password(payload: ChangePasswordRequest, username: str = Depends(require_admin)):
    if not payload.currentPassword.strip() or not payload.newPassword.strip() or not payload.confirmNewPassword.strip():
        raise HTTPException(status_code=400, detail='All password fields are required')

    if payload.newPassword != payload.confirmNewPassword:
        raise HTTPException(status_code=400, detail='New password and confirmation do not match')

    if payload.currentPassword == payload.newPassword:
        raise HTTPException(status_code=400, detail='New password must be different from the current password')

    admin = await db.admins.find_one({'username': username})
    if not admin:
        raise HTTPException(status_code=404, detail='Admin account not found')

    if not verify_password(payload.currentPassword, admin['passwordHash']):
        raise HTTPException(status_code=400, detail='Current password is incorrect')

    new_hash = hash_password(payload.newPassword).decode('utf-8')
    await db.admins.update_one({'_id': admin['_id']}, {'$set': {'passwordHash': new_hash}})
    return {'message': 'Password updated successfully'}


@api_router.get('/admin/dashboard/stats')
async def dashboard_stats(_: str = Depends(require_admin)):
    total = await db.applications.count_documents({})
    pending = await db.applications.count_documents({'status': STATUS_PENDING})
    approved = await db.applications.count_documents({'status': STATUS_APPROVED})
    rejected = await db.applications.count_documents({'status': STATUS_REJECTED})
    total_renewals = await db.renewals.count_documents({})
    pending_renewals = await db.renewals.count_documents({'status': STATUS_PENDING})
    approved_renewals = await db.renewals.count_documents({'status': STATUS_APPROVED})
    rejected_renewals = await db.renewals.count_documents({'status': STATUS_REJECTED})
    return {
        'totalApplications': total,
        'pendingApplications': pending,
        'approvedApplications': approved,
        'rejectedApplications': rejected,
        'totalRenewals': total_renewals,
        'pendingRenewals': pending_renewals,
        'approvedRenewals': approved_renewals,
        'rejectedRenewals': rejected_renewals,
    }


@api_router.get('/parking-availability')
async def get_public_parking_availability():
    return {'parkingAvailability': await get_parking_availability_records()}


@api_router.get('/parking-prices')
async def get_public_parking_prices():
    return {'parkingPrices': get_parking_price_records()}


@api_router.get('/admin/parking-availability')
async def get_admin_parking_availability(_: str = Depends(require_admin)):
    return {'parkingAvailability': await get_parking_availability_records()}


@api_router.put('/admin/parking-availability/{parking_key}')
async def update_parking_availability(
    parking_key: str,
    payload: ParkingAvailabilityUpdateRequest,
    _: str = Depends(require_admin),
):
    config = PARKING_KEY_LOOKUP.get(parking_key)
    if not config:
        raise HTTPException(status_code=404, detail='Parking type not found')

    await db.parking_settings.update_one(
        {'key': parking_key},
        {
            '$set': {
                'available': payload.available,
                'updatedAt': datetime.now(timezone.utc),
            },
            '$setOnInsert': {
                'key': parking_key,
                'parkingType': config['parkingType'],
                'label': config['label'],
                'createdAt': datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )

    return {'parkingAvailability': await get_parking_availability_records()}


@api_router.get('/admin/applications')
async def list_applications(_: str = Depends(require_admin)):
    cursor = db.applications.find({}).sort('submittedAt', -1)
    applications = []
    async for doc in cursor:
        applications.append(to_application_response(doc))
    return {'applications': applications}


@api_router.get('/admin/applications/{reference_number}')
async def get_application(reference_number: str, _: str = Depends(require_admin)):
    application = await db.applications.find_one({'referenceNumber': reference_number})
    if not application:
        raise HTTPException(status_code=404, detail='Application not found')
    return {'application': to_application_response(application)}


@api_router.patch('/admin/applications/{reference_number}/status')
async def update_application_status(reference_number: str, payload: StatusUpdateRequest, _: str = Depends(require_admin)):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail='Invalid status value')

    result = await db.applications.find_one_and_update(
        {'referenceNumber': reference_number},
        {'$set': {'status': payload.status, 'updatedAt': datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail='Application not found')
    return {'message': 'Application status updated', 'application': to_application_response(result)}


def calculate_total_amount(parking_type: str, subscription_period: str, vehicle_count: int) -> int:
    parking_prices = {
        'Non Reserved': 159,
        'Reserved': 212,
        'Premium': 318,
    }
    multipliers = {
        'Monthly': 1,
        'Quarterly': 3,
        'Yearly': 12,
    }
    return parking_prices.get(parking_type, 0) * multipliers.get(subscription_period, 1) * max(vehicle_count, 1)


async def upload_receipt(file: UploadFile) -> str:
    contents = await file.read()
    result = cloudinary.uploader.upload(
        contents,
        resource_type='auto',
        folder='hispeedcity/receipts',
        public_id=f'receipt-{uuid.uuid4().hex}',
    )
    return result['secure_url']



async def upload_renewal_receipt(file: UploadFile) -> str:
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail='Receipt file is empty')

    result = cloudinary.uploader.upload(
        contents,
        resource_type='auto',
        folder='hispeedcity/renewals',
        public_id=f'renewal-receipt-{uuid.uuid4().hex}',
    )
    return result['secure_url']


def normalize_plate_numbers(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    cleaned = []
    for value in values:
        plate = str(value or '').strip().upper()
        if plate:
            cleaned.append(plate)
    return list(dict.fromkeys(cleaned))


def normalize_tenant_plate_groups(values: Any) -> dict[str, list[str]]:
    if not isinstance(values, dict):
        return {}
    grouped: dict[str, list[str]] = {}
    for key in ('non_reserved', 'reserved', 'premium'):
        grouped[key] = normalize_plate_numbers(values.get(key, []))
    return grouped


def calculate_tenant_total(quantities: dict[str, int], price_records: list[dict[str, Any]]) -> dict[str, int]:
    price_map = {item['key']: int(item.get('monthlyPrice', 0)) for item in price_records}
    totals = {
        'non_reservedTotal': int(quantities.get('non_reserved', 0)) * price_map.get('non_reserved', 0),
        'reservedTotal': int(quantities.get('reserved', 0)) * price_map.get('reserved', 0),
        'premiumTotal': int(quantities.get('premium', 0)) * price_map.get('premium', 0),
    }
    totals['grandTotal'] = totals['non_reservedTotal'] + totals['reservedTotal'] + totals['premiumTotal']
    return totals


async def next_renewal_reference() -> str:
    year = datetime.now(timezone.utc).year
    counter_id = f'renewals-{year}'
    counter = await db.counters.find_one_and_update(
        {'_id': counter_id},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=True,
    )
    if not counter:
        counter = {'seq': 1}
    sequence = counter.get('seq', 1)
    return f'RN-{year}-{sequence:06d}'


@api_router.post('/renewals', response_model=RenewalCreateResponse)
async def create_individual_renewal(
    renewalData: str = Form(...),
    receipt: Optional[UploadFile] = File(None),
):
    import json

    try:
        payload = json.loads(renewalData)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid renewal data')

    renewal_type = str(payload.get('renewalType') or '').strip() or 'Individual'
    if renewal_type != 'Individual':
        raise HTTPException(status_code=400, detail='Only Individual renewal is supported at this time')

    full_name = str(payload.get('fullName') or '').strip()
    if not full_name:
        raise HTTPException(status_code=400, detail='Full Name is required')

    email = normalize_email_address(payload.get('email'))

    month_note = str(payload.get('renewalMonthNote') or '').strip()
    if not month_note:
        raise HTTPException(status_code=400, detail='Renewal Month / Payment Note is required')

    raw_plates = payload.get('vehiclePlateNumbers')
    if not isinstance(raw_plates, list):
        raise HTTPException(status_code=400, detail='Vehicle plate numbers must be provided as a list')

    cleaned_plates = []
    for plate in raw_plates:
        cleaned = str(plate or '').strip().upper()
        if cleaned:
            cleaned_plates.append(cleaned)

    # Preserve input order while removing duplicates.
    unique_plates = list(dict.fromkeys(cleaned_plates))

    if not unique_plates:
        raise HTTPException(status_code=400, detail='At least one vehicle plate number is required')
    if len(unique_plates) > 3:
        raise HTTPException(status_code=400, detail='A maximum of 3 vehicle plate numbers is allowed')

    if receipt is None:
        raise HTTPException(status_code=400, detail='Payment receipt is required')

    receipt_url = await upload_renewal_receipt(receipt)
    submitted_at = datetime.now(timezone.utc)
    renewal_reference = await next_renewal_reference()

    renewal_doc = {
        'renewalReference': renewal_reference,
        'renewalType': 'Individual',
        'fullName': full_name,
        'email': email,
        'vehiclePlateNumbers': unique_plates,
        'renewalMonthNote': month_note,
        'receiptUrl': receipt_url,
        'status': STATUS_PENDING,
        'submittedAt': submitted_at,
        'updatedAt': submitted_at,
    }

    await db.renewals.insert_one(renewal_doc)

    return RenewalCreateResponse(
        message='Renewal request submitted successfully',
        renewalReference=renewal_reference,
        email=email,
        status=STATUS_PENDING,
        submittedAt=submitted_at,
    )


@api_router.post('/renewals/tenant', response_model=RenewalCreateResponse)
async def create_tenant_renewal(
    renewalData: str = Form(...),
    receipt: Optional[UploadFile] = File(None),
):
    import json

    try:
        payload = json.loads(renewalData)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid renewal data')

    renewal_type = str(payload.get('renewalType') or '').strip() or 'Tenant'
    if renewal_type != 'Tenant':
        raise HTTPException(status_code=400, detail='Only Tenant renewal is supported at this time')

    company_name = str(payload.get('companyName') or '').strip()
    contact_person = str(payload.get('contactPerson') or '').strip()
    email = normalize_email_address(payload.get('email'))
    phone_number = str(payload.get('phoneNumber') or '').strip()
    month_note = str(payload.get('renewalMonthNote') or '').strip()
    if not all([company_name, contact_person, email, phone_number, month_note]):
        raise HTTPException(status_code=400, detail='All company and contact fields are required')

    quantities_raw = payload.get('parkingQuantities')
    if not isinstance(quantities_raw, dict):
        raise HTTPException(status_code=400, detail='Parking quantities are required')

    try:
        quantities = {
            'non_reserved': max(0, int(quantities_raw.get('non_reserved', 0) or 0)),
            'reserved': max(0, int(quantities_raw.get('reserved', 0) or 0)),
            'premium': max(0, int(quantities_raw.get('premium', 0) or 0)),
        }
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail='Parking quantities must be whole numbers')

    plate_groups = normalize_tenant_plate_groups(payload.get('vehiclePlateNumbers'))
    for key, quantity in quantities.items():
        if quantity > 0 and len(plate_groups.get(key, [])) != quantity:
            raise HTTPException(status_code=400, detail=f'{key.replace("_", " ").title()} vehicle plate list must match the selected quantity')

    price_records = get_parking_price_records()
    totals = calculate_tenant_total(quantities, price_records)

    if receipt is None:
        raise HTTPException(status_code=400, detail='Payment receipt is required')

    receipt_url = await upload_renewal_receipt(receipt)
    submitted_at = datetime.now(timezone.utc)
    renewal_reference = await next_renewal_reference()

    renewal_doc = {
        'renewalReference': renewal_reference,
        'renewalType': 'Tenant',
        'companyName': company_name,
        'contactPerson': contact_person,
        'email': email,
        'phoneNumber': phone_number,
        'renewalMonthNote': month_note,
        'parkingQuantities': quantities,
        'vehiclePlateNumbers': plate_groups,
        'pricingBreakdown': {
            'parkingPrices': {item['key']: item['monthlyPrice'] for item in price_records},
            **totals,
        },
        'receiptUrl': receipt_url,
        'status': STATUS_PENDING,
        'submittedAt': submitted_at,
        'updatedAt': submitted_at,
    }

    await db.renewals.insert_one(renewal_doc)

    return RenewalCreateResponse(
        message='Renewal request submitted successfully',
        renewalReference=renewal_reference,
        email=email,
        status=STATUS_PENDING,
        submittedAt=submitted_at,
    )


@api_router.get('/admin/renewals')
async def list_renewals(_: str = Depends(require_admin)):
    cursor = db.renewals.find({}).sort('submittedAt', -1)
    renewals = []
    async for doc in cursor:
        renewals.append(serialize_doc(doc))
    return {'renewals': renewals}


@api_router.get('/admin/renewals/{renewal_reference}')
async def get_renewal(renewal_reference: str, _: str = Depends(require_admin)):
    renewal = await db.renewals.find_one({'renewalReference': renewal_reference})
    if not renewal:
        raise HTTPException(status_code=404, detail='Renewal request not found')
    return {'renewal': serialize_doc(renewal)}


@api_router.patch('/admin/renewals/{renewal_reference}/status')
async def update_renewal_status(
    renewal_reference: str,
    payload: StatusUpdateRequest,
    _: str = Depends(require_admin),
):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail='Invalid status value')

    result = await db.renewals.find_one_and_update(
        {'renewalReference': renewal_reference},
        {'$set': {'status': payload.status, 'updatedAt': datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail='Renewal request not found')

    return {'message': 'Renewal status updated', 'renewal': serialize_doc(result)}


@api_router.get('/renewals/reference/{renewal_reference}')
async def get_public_renewal_by_reference(renewal_reference: str):
    renewal = await db.renewals.find_one({'renewalReference': renewal_reference})
    if not renewal:
        raise HTTPException(status_code=404, detail='Renewal request not found')
    return serialize_doc(renewal)

@api_router.post('/applications', response_model=ApplicationCreateResponse)
async def create_application(
    applicationData: str = Form(...),
    receipt: Optional[UploadFile] = File(None),
):
    import json
    import re

    try:
        payload = json.loads(applicationData)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid application data')

    # Application type determines whether payment/receipt is required
    application_type = (payload.get('applicationType') or 'registration').strip().lower()
    if application_type not in {'registration', 'deregistration', 'edit_remove'}:
        application_type = 'registration'
    payment_required = application_type == 'registration'

    vehicles = payload.get('vehicles') or []
    if not vehicles:
        raise HTTPException(status_code=400, detail='At least one vehicle is required')

    first_vehicle = vehicles[0]
    if not all([
        payload.get('fullName'), payload.get('phoneNumber'), payload.get('companyName'),
        first_vehicle.get('vehicleNumber'), first_vehicle.get('vehicleModel'), first_vehicle.get('vehicleType'), first_vehicle.get('vehicleColor'),
        payload.get('parkingType'), payload.get('subscriptionPeriod')
    ]):
        raise HTTPException(status_code=400, detail='Missing required fields')

    # Email validation
    email_raw = payload.get('email')
    if not email_raw or not str(email_raw).strip():
        raise HTTPException(status_code=400, detail='Customer email is required')
    email_clean = str(email_raw).strip()
    email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    if not email_regex.match(email_clean):
        raise HTTPException(status_code=400, detail='Invalid email format')

    # Remarks are required for edit_remove
    remarks_raw = payload.get('remarks') or ''
    remarks_clean = str(remarks_raw).strip()
    if application_type == 'edit_remove' and not remarks_clean:
        raise HTTPException(status_code=400, detail='Remarks / Notes are required for Edit / Remove Vehicle requests')

    parking_key = parking_type_to_key(payload.get('parkingType'))
    if not parking_key:
        raise HTTPException(status_code=400, detail='Invalid parking type selected')

    parking_availability_map = await get_parking_availability_map()
    parking_record = parking_availability_map.get(parking_key)
    if not parking_record:
        raise HTTPException(status_code=400, detail='Invalid parking type selected')
    if not parking_record.get('available', True):
        raise HTTPException(status_code=400, detail=f'{parking_type_to_label(payload.get("parkingType"))} is sold out. Please choose another parking type.')

    # Receipt is only required for paid (registration) applications
    receipt_url = ''
    if payment_required:
        if receipt is None:
            raise HTTPException(status_code=400, detail='Payment receipt is required')
        receipt_url = await upload_receipt(receipt)

    year = datetime.now(timezone.utc).year
    counter_id = f'applications-{year}'
    counter = await db.counters.find_one_and_update(
        {'_id': counter_id},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=True,
    )
    if not counter:
        counter = {'seq': 1}
    sequence = counter.get('seq', 1)
    reference_number = f'SP-{year}-{sequence:06d}'

    total_amount = payload.get('totalAmount')
    if not isinstance(total_amount, (int, float)) or total_amount <= 0:
        total_amount = calculate_total_amount(payload.get('parkingType', ''), payload.get('subscriptionPeriod', ''), len(vehicles))

    document = {
        'referenceNumber': reference_number,
        'applicationType': application_type,
        'paymentRequired': payment_required,
        'remarks': remarks_clean,
        'fullName': payload.get('fullName'),
        'phoneNumber': payload.get('phoneNumber'),
        'email': email_clean,
        'companyName': payload.get('companyName'),
        'staffId': (payload.get('staffId') or '').strip(),
        'vehicleNumber': first_vehicle.get('vehicleNumber'),
        'vehicleModel': first_vehicle.get('vehicleModel'),
        'vehicleType': first_vehicle.get('vehicleType'),
        'vehicleColor': first_vehicle.get('vehicleColor'),
        'vehicles': vehicles,
        'parkingType': payload.get('parkingType'),
        'subscriptionPeriod': payload.get('subscriptionPeriod'),
        'totalAmount': total_amount,
        'receiptUrl': receipt_url,
        'status': STATUS_PENDING,
        'submittedAt': datetime.now(timezone.utc),
        'updatedAt': datetime.now(timezone.utc),
    }

    await db.applications.insert_one(document)
    return ApplicationCreateResponse(
        message='Application submitted successfully',
        referenceNumber=reference_number,
        status=STATUS_PENDING,
        submittedAt=document['submittedAt'],
    )


@api_router.get('/applications/reference/{reference_number}')
async def get_application_by_reference(reference_number: str):
    application = await db.applications.find_one({'referenceNumber': reference_number})
    if not application:
        raise HTTPException(status_code=404, detail='Application not found')
    return to_application_response(application)


@app.on_event('startup')
async def startup_event():
    try:
        admin_count = await db.admins.count_documents({})
        if admin_count == 0:
            await db.admins.insert_one({
                'username': ADMIN_USERNAME,
                'passwordHash': hash_password(ADMIN_PASSWORD).decode('utf-8'),
                'createdAt': datetime.now(timezone.utc),
            })
        await seed_default_parking_settings()
    except Exception as exc:
        print(f'Application startup warning: database initialization skipped: {exc}')


@app.on_event('shutdown')
async def shutdown_event():
    client.close()


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ['*'] else ['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(api_router)
