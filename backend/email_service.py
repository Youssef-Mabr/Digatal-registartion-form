from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests


RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_SENDER_EMAIL = "hi@hispeedcity.com"
DEFAULT_RENEWAL_SUBJECT = "Parking Renewal Receipt"


@dataclass(slots=True)
class EmailDeliveryResult:
    status: str
    sent_at: datetime | None = None
    error_message: str | None = None
    provider_message_id: str | None = None


def _build_recipients(to_email: str | list[str]) -> list[str]:
    if isinstance(to_email, list):
        return [str(item).strip() for item in to_email if str(item or "").strip()]
    recipient = str(to_email).strip()
    return [recipient] if recipient else []


def _build_attachment_payload(filename: str, content_bytes: bytes, content_type: str = "application/pdf") -> dict[str, str]:
    return {
        "filename": filename,
        "content": base64.b64encode(content_bytes).decode("ascii"),
        "content_type": content_type,
    }


def build_renewal_receipt_email_message(customer_name: str, receipt_number: str) -> tuple[str, str]:
    text_body = (
        "Dear Valued customer,\n\n"
        "Please find the detailed booking and renewal receipt attached for your reference.\n\n"
        "We gently recommend renewing your season parking subscription a week prior to the expiry date. All active season parking passes will expire on the final day of each month. Failure to renew on time will result in your parking being converted to hourly visitor parking rates automatically, for reserved parking, upon expired, your parking lot will be taken by those on waiting list.\n\n"
        "We recommend you to opt for quarterly or half-year advance payment plans, you can receive refund in case of early termination (notification to us 48 hours in advanced) for remaining non-consumed month/s\n\n"
        "We make things easy ! Cashless Touchless Fast-Flow !\n\n"
        "Thank you\n\n"
        "Hispeedcity Sdn Bhd (1331446-H)"
    )
    html_body = (
        "<p>Dear Valued customer,</p>"
        "<p>Please find the detailed booking and renewal receipt attached for your reference.</p>"
        "<p>We gently recommend renewing your season parking subscription a week prior to the expiry date. All active season parking passes will expire on the final day of each month. Failure to renew on time will result in your parking being converted to hourly visitor parking rates automatically, for reserved parking, upon expired, your parking lot will be taken by those on waiting list.</p>"
        "<p>We recommend you to opt for quarterly or half-year advance payment plans, you can receive refund in case of early termination (notification to us 48 hours in advanced) for remaining non-consumed month/s</p>"
        "<p>We make things easy ! Cashless Touchless Fast-Flow !</p>"
        "<p>Thank you</p>"
        "<p><strong>Hispeedcity Sdn Bhd (1331446-H)</strong></p>"
    )
    return text_body, html_body


def build_receipt_email_message(customer_name: str, receipt_number: str) -> tuple[str, str]:
    return build_renewal_receipt_email_message(customer_name, receipt_number)


def send_email_with_attachment(
    *,
    to_email: str | list[str],
    subject: str,
    text_body: str,
    html_body: str | None = None,
    attachment_filename: str,
    attachment_bytes: bytes,
    attachment_content_type: str = "application/pdf",
    from_email: str | None = None,
) -> EmailDeliveryResult:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured")

    payload: dict[str, Any] = {
        "from": from_email or DEFAULT_SENDER_EMAIL,
        "to": _build_recipients(to_email),
        "subject": subject,
        "text": text_body,
        "attachments": [
            _build_attachment_payload(attachment_filename, attachment_bytes, attachment_content_type)
        ],
    }
    if html_body:
        payload["html"] = html_body

    response = requests.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )

    if response.status_code >= 400:
        raise RuntimeError(f"Resend request failed: {response.status_code} {response.text}")

    response_data = response.json() if response.content else {}
    return EmailDeliveryResult(
        status="Sent",
        sent_at=datetime.now(timezone.utc),
        provider_message_id=str(response_data.get("id") or "").strip() or None,
    )