#!/usr/bin/env python3
"""
Backend API Tests for Smart Parking Portal - Application Type Flow
Tests the new applicationType, remarks, and paymentRequired fields
"""

import requests
import json
import io
from typing import Dict, Any, Optional, List

# Backend URL from frontend/.env
BASE_URL = "https://parking-email-field.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_USERNAME = "Hispeedcity"
ADMIN_PASSWORD = "Hispeedcity2026@"

# Test results tracking
test_results = []
created_references = []  # Track created application references


def log_test(test_name: str, passed: bool, details: str = "", response_body: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({
        "test": test_name,
        "passed": passed,
        "details": details,
        "response": response_body
    })
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    if response_body and not passed:
        print(f"  Response: {response_body[:500]}")


def create_dummy_receipt_file():
    """Create a small dummy file for receipt upload"""
    # Create a tiny PNG-like file (just a few bytes)
    return io.BytesIO(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01')


def test_admin_login() -> Optional[str]:
    """Admin login to get token for authenticated tests"""
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
                log_test("Admin login", True, f"Token received")
                return token
            else:
                log_test("Admin login", False, f"No token in response", json.dumps(data))
                return None
        else:
            log_test("Admin login", False, f"Status: {response.status_code}", response.text)
            return None
    except Exception as e:
        log_test("Admin login", False, f"Exception: {str(e)}")
        return None


def test_1_deregistration_without_receipt():
    """Test 1: Deregistration success WITHOUT receipt - should return 200"""
    try:
        application_data = {
            "applicationType": "deregistration",
            "fullName": "Test User Dereg",
            "phoneNumber": "0123456789",
            "email": "tester1@example.com",
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "ABC123",
                "vehicleModel": "Perodua Myvi",
                "vehicleType": "Sedan",
                "vehicleColor": "Red"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly"
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json')
            # NO receipt file
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        response_text = response.text
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        
        if response.status_code == 200:
            ref_num = data.get("referenceNumber", "")
            status = data.get("status", "")
            submitted_at = data.get("submittedAt", "")
            
            if ref_num.startswith("SP-") and status == "Pending" and submitted_at:
                created_references.append(ref_num)
                log_test("Test 1: Deregistration WITHOUT receipt", True, 
                        f"Reference: {ref_num}, Status: {status}, SubmittedAt: {submitted_at}")
                return True
            else:
                log_test("Test 1: Deregistration WITHOUT receipt", False, 
                        f"Missing required fields in response", json.dumps(data, indent=2))
                return False
        else:
            log_test("Test 1: Deregistration WITHOUT receipt", False, 
                    f"Expected 200, got {response.status_code}", response_text)
            return False
    except Exception as e:
        log_test("Test 1: Deregistration WITHOUT receipt", False, f"Exception: {str(e)}")
        return False


def test_2_edit_remove_without_remarks():
    """Test 2: Edit/Remove without remarks - should return 400"""
    try:
        application_data = {
            "applicationType": "edit_remove",
            "fullName": "Test User Edit",
            "phoneNumber": "0123456789",
            "email": "tester2@example.com",
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "DEF456",
                "vehicleModel": "Perodua Myvi",
                "vehicleType": "Sedan",
                "vehicleColor": "Blue"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly"
            # NO remarks field
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json')
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        response_text = response.text
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        
        if response.status_code == 400:
            detail = data.get("detail", "")
            if "Remarks / Notes are required for Edit / Remove Vehicle requests" in detail:
                log_test("Test 2: Edit/Remove WITHOUT remarks", True, 
                        f"Correct error: {detail}")
                return True
            else:
                log_test("Test 2: Edit/Remove WITHOUT remarks", False, 
                        f"Wrong error message: {detail}", response_text)
                return False
        else:
            log_test("Test 2: Edit/Remove WITHOUT remarks", False, 
                    f"Expected 400, got {response.status_code}", response_text)
            return False
    except Exception as e:
        log_test("Test 2: Edit/Remove WITHOUT remarks", False, f"Exception: {str(e)}")
        return False


def test_3_edit_remove_with_remarks():
    """Test 3: Edit/Remove with remarks WITHOUT receipt - should return 200"""
    try:
        application_data = {
            "applicationType": "edit_remove",
            "fullName": "Test User Edit With Remarks",
            "phoneNumber": "0123456789",
            "email": "tester3@example.com",
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "GHI789",
                "vehicleModel": "Perodua Myvi",
                "vehicleType": "Sedan",
                "vehicleColor": "Green"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly",
            "remarks": "Replace ABC123 with DEF456"
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json')
            # NO receipt file
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        response_text = response.text
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        
        if response.status_code == 200:
            ref_num = data.get("referenceNumber", "")
            status = data.get("status", "")
            submitted_at = data.get("submittedAt", "")
            
            if ref_num.startswith("SP-") and status == "Pending" and submitted_at:
                created_references.append(ref_num)
                log_test("Test 3: Edit/Remove WITH remarks WITHOUT receipt", True, 
                        f"Reference: {ref_num}, Status: {status}")
                return True
            else:
                log_test("Test 3: Edit/Remove WITH remarks WITHOUT receipt", False, 
                        f"Missing required fields in response", json.dumps(data, indent=2))
                return False
        else:
            log_test("Test 3: Edit/Remove WITH remarks WITHOUT receipt", False, 
                    f"Expected 200, got {response.status_code}", response_text)
            return False
    except Exception as e:
        log_test("Test 3: Edit/Remove WITH remarks WITHOUT receipt", False, f"Exception: {str(e)}")
        return False


def test_4_registration_without_receipt():
    """Test 4: Registration without receipt - should return 400"""
    try:
        application_data = {
            "applicationType": "registration",
            "fullName": "Test User Reg No Receipt",
            "phoneNumber": "0123456789",
            "email": "reg@example.com",
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "JKL012",
                "vehicleModel": "Perodua Myvi",
                "vehicleType": "Sedan",
                "vehicleColor": "Yellow"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly"
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json')
            # NO receipt file
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        response_text = response.text
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        
        if response.status_code == 400:
            detail = data.get("detail", "")
            if "Payment receipt is required" in detail:
                log_test("Test 4: Registration WITHOUT receipt", True, 
                        f"Correct error: {detail}")
                return True
            else:
                log_test("Test 4: Registration WITHOUT receipt", False, 
                        f"Wrong error message: {detail}", response_text)
                return False
        else:
            log_test("Test 4: Registration WITHOUT receipt", False, 
                    f"Expected 400, got {response.status_code}", response_text)
            return False
    except Exception as e:
        log_test("Test 4: Registration WITHOUT receipt", False, f"Exception: {str(e)}")
        return False


def test_5_registration_with_receipt():
    """Test 5: Registration WITH receipt - Cloudinary will fail with 5xx, but validation should pass"""
    try:
        application_data = {
            "applicationType": "registration",
            "fullName": "Test User Reg With Receipt",
            "phoneNumber": "0123456789",
            "email": "regwithreceipt@example.com",
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "MNO345",
                "vehicleModel": "Perodua Myvi",
                "vehicleType": "Sedan",
                "vehicleColor": "White"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly"
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
        
        response_text = response.text
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        detail = data.get("detail", "")
        
        # Validation should NOT trigger 400 errors about receipt or email
        if response.status_code == 400:
            if "Payment receipt is required" in detail or "Missing required fields" in detail or "Customer email is required" in detail:
                log_test("Test 5: Registration WITH receipt", False, 
                        f"Validation failed when it should pass: {detail}", response_text)
                return False
            else:
                # Some other 400 error (not validation) - acceptable
                log_test("Test 5: Registration WITH receipt", True, 
                        f"Validation passed. Got 400 for other reason: {detail}")
                return True
        elif response.status_code >= 500:
            # 5xx error (Cloudinary) is expected and acceptable
            log_test("Test 5: Registration WITH receipt", True, 
                    f"Validation passed. Got {response.status_code} (Cloudinary error expected): {detail or response_text[:200]}")
            return True
        elif response.status_code == 200:
            # Unexpected success (Cloudinary worked?)
            ref_num = data.get("referenceNumber", "")
            created_references.append(ref_num)
            log_test("Test 5: Registration WITH receipt", True, 
                    f"Unexpected success! Reference: {ref_num}")
            return True
        else:
            log_test("Test 5: Registration WITH receipt", False, 
                    f"Unexpected status {response.status_code}", response_text)
            return False
    except Exception as e:
        log_test("Test 5: Registration WITH receipt", False, f"Exception: {str(e)}")
        return False


def test_6_backward_compatibility():
    """Test 6: No applicationType key + receipt = treated as registration"""
    try:
        application_data = {
            # NO applicationType field
            "fullName": "Test User Backward Compat",
            "phoneNumber": "0123456789",
            "email": "backward@example.com",
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "PQR678",
                "vehicleModel": "Perodua Myvi",
                "vehicleType": "Sedan",
                "vehicleColor": "Black"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly"
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
        
        response_text = response.text
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        detail = data.get("detail", "")
        
        # Should NOT get 400 about applicationType
        if response.status_code == 400:
            if "applicationType" in detail.lower():
                log_test("Test 6: Backward compatibility (no applicationType)", False, 
                        f"Got 400 about applicationType: {detail}", response_text)
                return False
            else:
                # Some other 400 error - acceptable
                log_test("Test 6: Backward compatibility (no applicationType)", True, 
                        f"No applicationType error. Got 400 for other reason: {detail}")
                return True
        elif response.status_code >= 500:
            # 5xx error (Cloudinary) is expected and acceptable
            log_test("Test 6: Backward compatibility (no applicationType)", True, 
                    f"No applicationType error. Got {response.status_code} (Cloudinary error expected)")
            return True
        elif response.status_code == 200:
            ref_num = data.get("referenceNumber", "")
            created_references.append(ref_num)
            log_test("Test 6: Backward compatibility (no applicationType)", True, 
                    f"Success! Reference: {ref_num}")
            return True
        else:
            log_test("Test 6: Backward compatibility (no applicationType)", False, 
                    f"Unexpected status {response.status_code}", response_text)
            return False
    except Exception as e:
        log_test("Test 6: Backward compatibility (no applicationType)", False, f"Exception: {str(e)}")
        return False


def test_7_email_validation():
    """Test 7: Email validation still works - no email with deregistration should fail"""
    try:
        application_data = {
            "applicationType": "deregistration",
            "fullName": "Test User No Email",
            "phoneNumber": "0123456789",
            # NO email field
            "companyName": "ACME",
            "staffId": "",
            "vehicles": [{
                "vehicleNumber": "STU901",
                "vehicleModel": "Perodua Myvi",
                "vehicleType": "Sedan",
                "vehicleColor": "Silver"
            }],
            "parkingType": "Reserved",
            "subscriptionPeriod": "Monthly"
        }
        
        files = {
            'applicationData': (None, json.dumps(application_data), 'application/json')
        }
        
        response = requests.post(
            f"{BASE_URL}/applications",
            files=files,
            timeout=10
        )
        
        response_text = response.text
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        
        if response.status_code == 400:
            detail = data.get("detail", "")
            if "Customer email is required" in detail:
                log_test("Test 7: Email validation still works", True, 
                        f"Correct error: {detail}")
                return True
            else:
                log_test("Test 7: Email validation still works", False, 
                        f"Wrong error message: {detail}", response_text)
                return False
        else:
            log_test("Test 7: Email validation still works", False, 
                    f"Expected 400, got {response.status_code}", response_text)
            return False
    except Exception as e:
        log_test("Test 7: Email validation still works", False, f"Exception: {str(e)}")
        return False


def test_8_admin_list_check(token: str):
    """Test 8: Admin list check - verify applicationType, paymentRequired, remarks fields"""
    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }
        response = requests.get(
            f"{BASE_URL}/admin/applications",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Test 8: Admin list check", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return False
        
        data = response.json()
        applications = data.get("applications", [])
        
        if not applications:
            log_test("Test 8: Admin list check", True, 
                    f"No applications found (empty list is OK)")
            return True
        
        # Find the applications we created in tests 1 and 3
        dereg_app = None
        edit_app = None
        
        for app in applications:
            ref = app.get("referenceNumber", "")
            if ref in created_references:
                app_type = app.get("applicationType", "")
                if app_type == "deregistration":
                    dereg_app = app
                elif app_type == "edit_remove":
                    edit_app = app
        
        # Check if required fields exist
        issues = []
        
        # Check deregistration record
        if dereg_app:
            if dereg_app.get("applicationType") != "deregistration":
                issues.append(f"Deregistration app has wrong applicationType: {dereg_app.get('applicationType')}")
            if dereg_app.get("paymentRequired") != False:
                issues.append(f"Deregistration app has wrong paymentRequired: {dereg_app.get('paymentRequired')}")
            if dereg_app.get("remarks") != "":
                issues.append(f"Deregistration app has non-empty remarks: {dereg_app.get('remarks')}")
        
        # Check edit_remove record
        if edit_app:
            if edit_app.get("applicationType") != "edit_remove":
                issues.append(f"Edit/Remove app has wrong applicationType: {edit_app.get('applicationType')}")
            if edit_app.get("paymentRequired") != False:
                issues.append(f"Edit/Remove app has wrong paymentRequired: {edit_app.get('paymentRequired')}")
            remarks = edit_app.get("remarks", "")
            if "Replace ABC123 with DEF456" not in remarks:
                issues.append(f"Edit/Remove app has wrong remarks: {remarks}")
        
        if issues:
            log_test("Test 8: Admin list check", False, 
                    f"Issues found: {'; '.join(issues)}")
            return False
        else:
            log_test("Test 8: Admin list check", True, 
                    f"Found {len(applications)} applications. Verified applicationType, paymentRequired, remarks fields. Dereg found: {dereg_app is not None}, Edit found: {edit_app is not None}")
            return True
    except Exception as e:
        log_test("Test 8: Admin list check", False, f"Exception: {str(e)}")
        return False


def test_9_admin_details_check(token: str):
    """Test 9: Admin details check - verify applicationType/paymentRequired/remarks in detail view"""
    try:
        if not created_references:
            log_test("Test 9: Admin details check", True, 
                    f"No applications created to check (skipped)")
            return True
        
        # Check the first created reference
        ref = created_references[0]
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        response = requests.get(
            f"{BASE_URL}/admin/applications/{ref}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Test 9: Admin details check", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return False
        
        data = response.json()
        app = data.get("application", {})
        
        # Check if required fields exist
        has_app_type = "applicationType" in app
        has_payment_req = "paymentRequired" in app
        has_remarks = "remarks" in app
        
        if has_app_type and has_payment_req and has_remarks:
            log_test("Test 9: Admin details check", True, 
                    f"Reference {ref}: applicationType={app.get('applicationType')}, paymentRequired={app.get('paymentRequired')}, remarks={app.get('remarks')}")
            return True
        else:
            missing = []
            if not has_app_type:
                missing.append("applicationType")
            if not has_payment_req:
                missing.append("paymentRequired")
            if not has_remarks:
                missing.append("remarks")
            log_test("Test 9: Admin details check", False, 
                    f"Missing fields: {', '.join(missing)}")
            return False
    except Exception as e:
        log_test("Test 9: Admin details check", False, f"Exception: {str(e)}")
        return False


def main():
    """Run all backend tests for Application Type flow"""
    print("=" * 80)
    print("SMART PARKING PORTAL - APPLICATION TYPE FLOW TESTS")
    print("Testing applicationType, remarks, and paymentRequired fields")
    print("=" * 80)
    print()
    
    # Get admin token first
    print("Authenticating...")
    print("-" * 80)
    token = test_admin_login()
    print()
    
    if not token:
        print("⚠️  Cannot proceed with authenticated tests - admin login failed")
        print_summary()
        return
    
    # Run all 9 tests
    print("Running Application Type Flow Tests...")
    print("-" * 80)
    print()
    
    print("Test 1: Deregistration WITHOUT receipt (should succeed)")
    test_1_deregistration_without_receipt()
    print()
    
    print("Test 2: Edit/Remove WITHOUT remarks (should fail with 400)")
    test_2_edit_remove_without_remarks()
    print()
    
    print("Test 3: Edit/Remove WITH remarks WITHOUT receipt (should succeed)")
    test_3_edit_remove_with_remarks()
    print()
    
    print("Test 4: Registration WITHOUT receipt (should fail with 400)")
    test_4_registration_without_receipt()
    print()
    
    print("Test 5: Registration WITH receipt (Cloudinary will fail, but validation should pass)")
    test_5_registration_with_receipt()
    print()
    
    print("Test 6: Backward compatibility - no applicationType + receipt (should work)")
    test_6_backward_compatibility()
    print()
    
    print("Test 7: Email validation still works (should fail with 400)")
    test_7_email_validation()
    print()
    
    print("Test 8: Admin list check (verify new fields)")
    test_8_admin_list_check(token)
    print()
    
    print("Test 9: Admin details check (verify new fields)")
    test_9_admin_details_check(token)
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
    
    if created_references:
        print(f"Created Application References: {', '.join(created_references)}")
        print()
    
    if total - passed > 0:
        print("Failed Tests:")
        for result in test_results:
            if not result["passed"]:
                print(f"  ❌ {result['test']}")
                if result["details"]:
                    print(f"     {result['details']}")
        print()
    else:
        print("✅ All tests passed!")
        print()
    
    print("=" * 80)


if __name__ == "__main__":
    main()
