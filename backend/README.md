# Hi Speed City Smart Parking Backend

Node.js + Express backend for the Hi Speed City Smart Parking frontend.

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas via Mongoose
- Cloudinary for receipt uploads
- JWT for admin authentication
- bcrypt for password hashing

## Folder Structure

- `src/server.js` - application bootstrap
- `src/app.js` - Express app and middleware
- `src/config/` - MongoDB and Cloudinary setup
- `src/models/` - Mongoose collections
- `src/routes/` - API endpoints
- `src/middleware/` - auth and error handling
- `src/utils/` - reference number generator

## Environment Variables

Create `backend/.env` with:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## Install

```bash
cd backend
npm install
```

## Run

```bash
cd backend
npm start
```

## API Summary

### Public

- `GET /api/health` - health check
- `POST /api/applications` - submit application with receipt upload
- `GET /api/applications/reference/:referenceNumber` - fetch submitted application by reference

### Admin

- `POST /api/admin/login` - get JWT token
- `POST /api/admin/logout` - optional logout endpoint
- `GET /api/admin/me` - current admin info
- `PUT /api/admin/change-password` - change admin password
- `GET /api/admin/dashboard/stats` - dashboard counts
- `GET /api/admin/applications` - list all applications
- `GET /api/admin/applications/:referenceNumber` - application details
- `PATCH /api/admin/applications/:referenceNumber/status` - approve/reject/pending

## Default Admin

If no admin exists, the server seeds one automatically using the values from `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

## Notes

- Payment receipts are uploaded to Cloudinary.
- Only the Cloudinary receipt URL is stored in MongoDB.
- Reference numbers follow the pattern `SP-YYYY-000001`.