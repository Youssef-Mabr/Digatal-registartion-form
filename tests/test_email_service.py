from __future__ import annotations

import base64

from backend import email_service


def test_send_email_with_attachment_builds_resend_payload(monkeypatch) -> None:
    captured = {}

    class FakeResponse:
        status_code = 200
        content = b'{"id":"email_123"}'

        @staticmethod
        def json():
            return {"id": "email_123"}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setenv("RESEND_API_KEY", "test-resend-key")
    monkeypatch.setattr(email_service.requests, "post", fake_post)

    result = email_service.send_email_with_attachment(
        to_email="customer@example.com",
        subject="Parking Renewal Receipt",
        text_body="Receipt attached.",
        html_body="<p>Receipt attached.</p>",
        attachment_filename="receipt.pdf",
        attachment_bytes=b"pdf-bytes",
    )

    assert captured["url"] == email_service.RESEND_API_URL
    assert captured["headers"]["Authorization"] == "Bearer test-resend-key"
    assert captured["json"]["from"] == "hi@hispeedcity.com"
    assert captured["json"]["to"] == ["customer@example.com"]
    assert captured["json"]["subject"] == "Parking Renewal Receipt"
    assert captured["json"]["attachments"][0]["filename"] == "receipt.pdf"
    assert captured["json"]["attachments"][0]["content"] == base64.b64encode(b"pdf-bytes").decode("ascii")
    assert result.status == "Sent"
    assert result.provider_message_id == "email_123"


def test_build_renewal_receipt_email_message_mentions_receipt_number() -> None:
    text_body, html_body = email_service.build_renewal_receipt_email_message("PDF Test User", "RCPT-123")

    assert "PDF Test User" in text_body
    assert "RCPT-123" in text_body
    assert "PDF Test User" in html_body
    assert "RCPT-123" in html_body