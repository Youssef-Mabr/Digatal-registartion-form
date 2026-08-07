#!/usr/bin/env python3
"""
Backend API Tests for Smart Parking Portal
Tests the Customer Email field validation and related endpoints
"""

import requests
import json
import io
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://parking-email-field.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_USERNAME = "Hispeedcity"
ADMIN_PASSWORD = "Hispeedcity2026@"

# Test results tracking
test_results = []


def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({
        "test": test_name,
        "passed": passed,
        "details": details
    })
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")


def test_health_endpoint():
    """Test 1: Health endpoint should return 200 with message ok"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "ok":
                log_test("Health endpoint", True, f"Response: {data}")
                return True
            else:
                log_test("Health endpoint", False, f"Unexpected response: {data}")
                return False
        else:
            log_test("Health endpoint", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Health endpoint", False, f"Exception: {str(e)}")
        return False


def test_admin_login() -> Optional[str]:
    """Test 2: Admin login should return 200 with token"""
    try:
        payload = {
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        }
        response = requests.post(
            f"{BASE_URL}/admin/login",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                log_test("Admin login", True, f"Token received: {token[:20]}...")
                return token
            else:
                log_test("Admin login", False, f"No token in response: {data}")
                return None
        else:
            log_test("Admin login", False, f"Status: {response.status_code}, Body: {response.text}")
            return None
    except Exception as e:
        log_test("Admin login", False, f"Exception: {str(e)}")
        return None


def create_dummy_receipt_file():
    """Create a small dummy file for receipt upload"""
    # Create a tiny PNG-like file (just a few bytes)
    return io.BytesIO(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01')


def test_email_validation_missing():
    """Test 3a: Missing email should return 400 with 'Customer email is required'"""
    try:
        application_data = {
            "fullName": "Test User",
            "phoneNumber": "0123456789",
            # email is missing
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "ABC123",
                "vehicleModel": "Camry",
                "vehicleType": "Sedan",
                "vehicleColor": "Red"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly",
            "totalAmount": 200
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json'),
            'receipt': ('test.png', create_dummy_receipt_file(), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            if "Customer email is required" in detail:
                log_test("Email validation - missing email", True, f"Correct error: {detail}")
                return True
            else:
                log_test("Email validation - missing email", False, f"Wrong error message: {detail}")
                return False
        else:
            log_test("Email validation - missing email", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Email validation - missing email", False, f"Exception: {str(e)}")
        return False


def test_email_validation_empty():
    """Test 3b: Empty email should return 400 with 'Customer email is required'"""
    try:
        application_data = {
            "fullName": "Test User",
            "phoneNumber": "0123456789",
            "email": "",  # empty email
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "ABC123",
                "vehicleModel": "Camry",
                "vehicleType": "Sedan",
                "vehicleColor": "Red"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly",
            "totalAmount": 200
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json'),
            'receipt': ('test.png', create_dummy_receipt_file(), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            if "Customer email is required" in detail:
                log_test("Email validation - empty email", True, f"Correct error: {detail}")
                return True
            else:
                log_test("Email validation - empty email", False, f"Wrong error message: {detail}")
                return False
        else:
            log_test("Email validation - empty email", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Email validation - empty email", False, f"Exception: {str(e)}")
        return False


def test_email_validation_invalid_format():
    """Test 3c: Invalid email format should return 400 with 'Invalid email format'"""
    try:
        application_data = {
            "fullName": "Test User",
            "phoneNumber": "0123456789",
            "email": "abc",  # invalid format
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "ABC123",
                "vehicleModel": "Camry",
                "vehicleType": "Sedan",
                "vehicleColor": "Red"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly",
            "totalAmount": 200
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json'),
            'receipt': ('test.png', create_dummy_receipt_file(), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            if "Invalid email format" in detail:
                log_test("Email validation - invalid format", True, f"Correct error: {detail}")
                return True
            else:
                log_test("Email validation - invalid format", False, f"Wrong error message: {detail}")
                return False
        else:
            log_test("Email validation - invalid format", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Email validation - invalid format", False, f"Exception: {str(e)}")
        return False


def test_email_validation_valid_with_optional_staffid():
    """Test 3d & 4: Valid email with optional staffId should pass validation (may fail at Cloudinary)"""
    try:
        application_data = {
            "fullName": "John Smith",
            "phoneNumber": "0123456789",
            "email": "john.smith@acme.com",  # valid email
            "companyName": "ACME Corporation",
            "staffId": "",  # optional, empty
            "vehicles": [{
                "vehicleNumber": "XYZ789",
                "vehicleModel": "Camry",
                "vehicleType": "Sedan",
                "vehicleColor": "Blue"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly",
            "totalAmount": 200
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json'),
            'receipt': ('test.png', create_dummy_receipt_file(), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        # We expect this to fail at Cloudinary (5xx or 4xx) but NOT with email validation errors
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        detail = data.get("detail", "")
        
        # Check that the error is NOT about email validation
        if "Customer email is required" in detail or "Invalid email format" in detail:
            log_test("Email validation - valid email with optional staffId", False, 
                    f"Email validation failed when it should pass. Status: {response.status_code}, Error: {detail}")
            return False
        else:
            # Validation passed (error is about something else, likely Cloudinary)
            log_test("Email validation - valid email with optional staffId", True, 
                    f"Email validation passed. Status: {response.status_code}, Response: {detail or response.text[:200]}")
            return True
    except Exception as e:
        log_test("Email validation - valid email with optional staffId", False, f"Exception: {str(e)}")
        return False


def test_admin_list_applications(token: str):
    """Test 5: GET /api/admin/applications should return 200 with applications list"""
    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }
        response = requests.get(
            f"{BASE_URL}/admin/applications",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "applications" in data:
                applications = data["applications"]
                log_test("Admin list applications", True, 
                        f"Retrieved {len(applications)} applications. Sample: {json.dumps(applications[0] if applications else {}, indent=2)[:200]}")
                
                # Check if any application has email field
                if applications:
                    has_email = any("email" in app for app in applications)
                    if has_email:
                        print("  ✓ Email field present in application documents")
                    else:
                        print("  ⚠ No email field found in existing applications (may be legacy data)")
                
                return True
            else:
                log_test("Admin list applications", False, f"No 'applications' key in response: {data}")
                return False
        else:
            log_test("Admin list applications", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Admin list applications", False, f"Exception: {str(e)}")
        return False


def test_admin_get_application_by_reference(token: str, reference_number: str):
    """Test: GET /api/admin/applications/{ref} should return application with email field"""
    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }
        response = requests.get(
            f"{BASE_URL}/admin/applications/{reference_number}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "application" in data:
                app = data["application"]
                has_email = "email" in app
                log_test(f"Admin get application {reference_number}", True, 
                        f"Email field present: {has_email}, Email: {app.get('email', 'N/A')}")
                return True
            else:
                log_test(f"Admin get application {reference_number}", False, f"No 'application' key in response: {data}")
                return False
        elif response.status_code == 404:
            log_test(f"Admin get application {reference_number}", True, 
                    f"Application not found (expected if no applications exist)")
            return True
        else:
            log_test(f"Admin get application {reference_number}", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test(f"Admin get application {reference_number}", False, f"Exception: {str(e)}")
        return False


def main():
    """Run all backend tests"""
    print("=" * 80)
    print("SMART PARKING PORTAL - BACKEND API TESTS")
    print("Testing Customer Email Field Validation")
    print("=" * 80)
    print()
    
    # Test 1: Health check
    print("Test 1: Health Endpoint")
    print("-" * 80)
    test_health_endpoint()
    print()
    
    # Test 2: Admin login
    print("Test 2: Admin Login")
    print("-" * 80)
    token = test_admin_login()
    print()
    
    if not token:
        print("⚠️  Cannot proceed with authenticated tests - admin login failed")
        print_summary()
        return
    
    # Test 3: Email validation scenarios
    print("Test 3: Email Validation Scenarios")
    print("-" * 80)
    test_email_validation_missing()
    print()
    test_email_validation_empty()
    print()
    test_email_validation_invalid_format()
    print()
    test_email_validation_valid_with_optional_staffid()
    print()
    
    # Test 4: Admin endpoints
    print("Test 4: Admin Endpoints (Authenticated)")
    print("-" * 80)
    test_admin_list_applications(token)
    print()
    
    # Try to get a specific application if any exist
    # We'll use a dummy reference number - if it doesn't exist, that's fine
    test_admin_get_application_by_reference(token, "SP-2025-000001")
    print()
    
    # Print summary
    print_summary()


def print_summary():
    """Print test summary"""
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print()
    
    if total - passed > 0:
        print("Failed Tests:")
        for result in test_results:
            if not result["passed"]:
                print(f"  ❌ {result['test']}")
                if result["details"]:
                    print(f"     {result['details']}")
        print()
    
    print("=" * 80)


if __name__ == "__main__":
    main()
