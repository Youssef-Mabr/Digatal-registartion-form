from __future__ import annotations

from backend.receipt_renderer import render_renewal_receipt_html


def test_render_renewal_receipt_html_includes_approval_fields() -> None:
    renewal = {
        "renewalType": "Individual",
        "fullName": "Local Test User",
        "email": "local.test@example.com",
        "phoneNumber": "0123456789",
        "vehiclePlateNumbers": ["ABC1234"],
        "renewalMonthNote": "August 2026",
        "renewalReference": "RN-2026-000061",
    }
    receipt_info = {
        "customerName": "Local Test User",
        "customerEmail": "local.test@example.com",
        "customerMobileNumber": "0123456789",
        "vehiclePlateNumbers": ["ABC1234"],
        "companyName": "Hispeedcity Sdn Bhd",
        "companyAddress": "Menara IIB, Persiaran Medini Central 1, Bandar Medini Iskandar Malaysia, 79250 Iskandar Puteri, Johor Darul Takzim",
        "receiptNumber": "RCPT-RN-2026-000061",
        "productMonth": "August 2026",
        "parkingType": "Individual Renewal",
        "quantity": 1,
        "unitPrice": 159,
        "totalAmount": 159,
        "additionalNotes": "Optional note",
        "approvedAt": "2026-08-17T10:15:00+00:00",
    }

    html_doc = render_renewal_receipt_html(renewal, receipt_info=receipt_info)

    assert "RCPT-RN-2026-000061" in html_doc
    assert "Local Test User" in html_doc
    assert "0123456789" in html_doc
    assert "Vehicle Plate Number" in html_doc
    assert "Customer Mobile Number" in html_doc
    assert "Parking Type" in html_doc
    assert "August 2026" in html_doc
    assert "ABC1234" in html_doc
    assert "Optional note" in html_doc
    assert "Hispeedcity Sdn Bhd (1331446-H)" in html_doc
    assert "Lot 29.01 Public Bank Tower" in html_doc
    assert "{%" not in html_doc