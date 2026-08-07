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
        f"Hello {customer_name},\n\n"
        "Your parking renewal has been approved. Your receipt is attached to this email.\n\n"
        f"Receipt Number: {receipt_number}\n\n"
        "Regards,\n"
        "Hi Speed City"
    )
    html_body = (
        f"<p>Hello {customer_name},</p>"
        "<p>Your parking renewal has been approved. Your receipt is attached to this email.</p>"
        f"<p><strong>Receipt Number:</strong> {receipt_number}</p>"
        "<p>Regards,<br>Hi Speed City</p>"
    )
    return text_body, html_body


def build_receipt_email_message(customer_name: str, receipt_number: str) -> tuple[str, str]:
    text_body = (
        f"Hello {customer_name},\n\n"
        "Your parking request has been approved. Your receipt is attached to this email.\n\n"
        f"Receipt Number: {receipt_number}\n\n"
        "Regards,\n"
        "Hi Speed City"
    )
    html_body = (
        f"<p>Hello {customer_name},</p>"
        "<p>Your parking request has been approved. Your receipt is attached to this email.</p>"
        f"<p><strong>Receipt Number:</strong> {receipt_number}</p>"
        "<p>Regards,<br>Hi Speed City</p>"
    )
    return text_body, html_body


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