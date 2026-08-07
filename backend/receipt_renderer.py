from __future__ import annotations

from __future__ import annotations

import base64
import html
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from playwright.async_api import async_playwright

ROOT_DIR = Path(__file__).parent
TEMPLATE_PATH = ROOT_DIR / "templates" / "renewal_receipt.html"
FAVICON_PATH = ROOT_DIR.parent / "frontend" / "public" / "assets" / "favicon.png"

DEFAULT_ADDRESS_LINES = [
    "Menara IIB Persiaran Medini Central 1, Bandar Medini",
    "Iskandar Malaysia, 79250 Iskandar Puteri, Johor Darul Takzim",
]
DEFAULT_FOOTER_HELP_LINE = (
    "Should you have any enquiries concerning this delivery note, please contact us at +6011-14200953"
)
DEFAULT_FOOTER_COMPUTER_LINE = "This is computer generated receipt no signature required"
DEFAULT_FOOTER_COMPANY_LINE = (
    "Hispeedcity S'dn Bhd (1331446-H), Lot 29.01 Public Bank Tower, 19 Jalan Along Ah Fook, "
    "80000 No Tel: 07-2071118 | 017-3680600"
)

_TEMPLATE_ENV = Environment(
    loader=FileSystemLoader(str(ROOT_DIR / "templates")),
    autoescape=select_autoescape(("html", "xml")),
    trim_blocks=True,
    lstrip_blocks=True,
)


@dataclass(slots=True)
class ReceiptRenderArtifact:
    html: str
    pdf_bytes: bytes
    pdf_path: Path


def _escape(value: Any) -> str:
    return html.escape("") if value is None else html.escape(str(value), quote=True)


def _format_currency(value: Any) -> str:
    try:
        amount = int(float(value))
    except (TypeError, ValueError):
        return "RM 0"
    return f"RM {amount:,}"


def _format_integer(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _to_lines(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item or "").strip()]
    if isinstance(value, str):
        return [line.strip() for line in value.splitlines() if line.strip()]
    return []


def _split_address_lines(value: Any) -> list[str]:
    lines = _to_lines(value)
    if lines:
        return lines
    if isinstance(value, str):
        parts = [part.strip() for part in value.split(",") if part.strip()]
        if parts:
            return parts
    return []


def _build_address_block(address_lines: list[str]) -> str:
    lines = address_lines or DEFAULT_ADDRESS_LINES
    return "<br>".join(_escape(line) for line in lines)


def _normalize_plate_numbers(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    plates: list[str] = []
    for value in values:
        plate = str(value or "").strip().upper()
        if plate:
            plates.append(plate)
    return list(dict.fromkeys(plates))


def _build_summary_rows_html(data: dict[str, Any]) -> str:
    rows = [
        ("Receipt Number", data["receipt_number"]),
        ("Customer Name", data["customer_name"]),
        ("Customer Email", data["customer_email"]),
        ("Company Name", data["company_name"]),
        ("Company Address", data["company_address_display"]),
        ("Parking Type", data["parking_type"]),
        ("Subscription Month", data["subscription_month"]),
        ("Vehicle Plate Number(s)", data["vehicle_plate_numbers_text"]),
        ("Quantity", data["quantity_display"]),
        ("Unit Price", data["unit_price_display"]),
        ("Total Amount", data["total_amount_display"]),
        ("Notes", data["additional_notes"] or "-"),
    ]
    return "\n".join(
        "<tr>"
        f"<th class='receipt__details-label'>{_escape(label)}</th>"
        f"<td class='receipt__details-value'>{_escape(value)}</td>"
        "</tr>"
        for label, value in rows
    )


def _build_item_rows_html(data: dict[str, Any]) -> str:
    renewal_type = str(data.get("renewalType") or "Renewal").strip()
    grand_total = data.get("grandTotal") or data.get("totalAmount") or 0

    rows: list[str] = []

    if renewal_type.lower() == "tenant":
        quantities = data.get("parkingQuantities") or {}
        pricing = data.get("pricingBreakdown") or {}
        pricing_map = pricing.get("parkingPrices") or {}
        line_specs = [
            ("non_reserved", "Non-Reserved Parking"),
            ("reserved", "Reserved Parking"),
            ("premium", "Premium Parking"),
        ]

        item_index = 1
        for key, label in line_specs:
            quantity = _format_integer(quantities.get(key, 0), 0)
            if quantity <= 0:
                continue
            unit_price = _format_integer(pricing_map.get(key, 0), 0)
            line_total = quantity * unit_price
            rows.append(
                "<tr>"
                f"<td class='col-item'>{item_index}</td>"
                f"<td class='col-product'>{_escape(label)}</td>"
                f"<td class='col-description'>Monthly renewal</td>"
                f"<td class='col-qty'>{quantity}</td>"
                f"<td class='col-unit'>{_escape(_format_currency(unit_price))}</td>"
                f"<td class='col-total'>{_escape(_format_currency(line_total))}</td>"
                "</tr>"
            )
            item_index += 1

        if not rows:
            rows.append(
                "<tr>"
                "<td class='col-item'>1</td>"
                "<td class='col-product'>Tenant Renewal</td>"
                "<td class='col-description'>Monthly renewal</td>"
                "<td class='col-qty'>1</td>"
                f"<td class='col-unit'>{_escape(_format_currency(grand_total))}</td>"
                f"<td class='col-total'>{_escape(_format_currency(grand_total))}</td>"
                "</tr>"
            )
    else:
        plate_text = data.get("vehicle_plate_numbers_text") or "-"
        renewal_month_note = str(data.get("subscription_month") or data.get("renewalMonthNote") or "Monthly renewal").strip()
        parking_type = str(data.get("parking_type") or data.get("parkingType") or "Individual Renewal").strip()
        quantity = _format_integer(data.get("quantity") or 1, 1)
        unit_price = _format_integer(data.get("unitPrice") or grand_total or 0, 0)
        total_amount = _format_integer(data.get("totalAmount") or grand_total or quantity * unit_price, quantity * unit_price)
        rows.append(
            "<tr>"
            "<td class='col-item'>1</td>"
            f"<td class='col-product'>{_escape(parking_type)}</td>"
            f"<td class='col-description'>{_escape(renewal_month_note)}<br>{_escape(plate_text)}</td>"
            f"<td class='col-qty'>{quantity}</td>"
            f"<td class='col-unit'>{_escape(_format_currency(unit_price))}</td>"
            f"<td class='col-total'>{_escape(_format_currency(total_amount))}</td>"
            "</tr>"
        )

    return "\n                    ".join(rows)


def load_logo_data_uri() -> str:
    if not FAVICON_PATH.exists():
        return ""
    content = FAVICON_PATH.read_bytes()
    return f"data:image/png;base64,{base64.b64encode(content).decode('ascii')}"


def build_renewal_receipt_context(
    renewal: dict[str, Any],
    receipt_info: dict[str, Any] | None = None,
    logo_data_uri: str | None = None,
) -> dict[str, Any]:
    receipt_info = receipt_info or {}
    combined = {**renewal, **receipt_info}

    customer_name = str(
        combined.get("customerName")
        or combined.get("fullName")
        or combined.get("contactPerson")
        or combined.get("name")
        or "-"
    ).strip() or "-"
    customer_email = str(combined.get("customerEmail") or combined.get("email") or "-").strip() or "-"
    company_name = str(combined.get("companyName") or combined.get("company") or "-").strip() or "-"
    company_address_value = combined.get("companyAddress") or combined.get("address") or combined.get("addressLines") or ""

    address_lines = _split_address_lines(company_address_value)
    if not address_lines:
        address_lines = _split_address_lines(renewal.get("addressLines")) or DEFAULT_ADDRESS_LINES

    receipt_number = str(
        combined.get("receiptNumber")
        or combined.get("renewalReference")
        or combined.get("referenceNumber")
        or "-"
    ).strip() or "-"
    parking_type = str(combined.get("parkingType") or combined.get("renewalType") or "Individual Renewal").strip() or "Individual Renewal"
    subscription_month = str(
        combined.get("subscriptionMonth")
        or combined.get("productMonth")
        or combined.get("renewalMonthNote")
        or "-"
    ).strip() or "-"
    vehicle_plate_numbers = _normalize_plate_numbers(combined.get("vehiclePlateNumbers"))
    vehicle_plate_numbers_text = ", ".join(vehicle_plate_numbers) or "-"
    quantity = _format_integer(combined.get("quantity") or 1, 1)
    unit_price = _format_integer(combined.get("unitPrice") or combined.get("totalAmount") or 0, 0)
    total_amount = _format_integer(
        combined.get("totalAmount") or combined.get("grandTotal") or quantity * unit_price,
        quantity * unit_price,
    )
    additional_notes = str(combined.get("additionalNotes") or "").strip()

    context = {
        "logo_data_uri": logo_data_uri if logo_data_uri is not None else load_logo_data_uri(),
        "receipt_number": _escape(receipt_number),
        "customer_name": _escape(customer_name),
        "customer_email": _escape(customer_email),
        "company_name": _escape(company_name),
        "company_address_display": _escape(str(company_address_value or "-").strip() or "-"),
        "address_block": _build_address_block(address_lines),
        "parking_type": _escape(parking_type),
        "subscription_month": _escape(subscription_month),
        "vehicle_plate_numbers_text": _escape(vehicle_plate_numbers_text),
        "quantity_display": _escape(quantity),
        "unit_price_display": _escape(_format_currency(unit_price)),
        "total_amount_display": _escape(_format_currency(total_amount)),
        "additional_notes": _escape(additional_notes),
        "item_rows_html": _build_item_rows_html(combined),
        "summary_rows_html": _build_summary_rows_html(
            {
                "receipt_number": receipt_number,
                "customer_name": customer_name,
                "customer_email": customer_email,
                "company_name": company_name,
                "company_address_display": str(company_address_value or "-").strip() or "-",
                "parking_type": parking_type,
                "subscription_month": subscription_month,
                "vehicle_plate_numbers_text": vehicle_plate_numbers_text,
                "quantity_display": quantity,
                "unit_price_display": _format_currency(unit_price),
                "total_amount_display": _format_currency(total_amount),
                "additional_notes": additional_notes,
            }
        ),
        "grand_total": _escape(_format_currency(total_amount)),
        "footer_help_line": _escape(combined.get("footerHelpLine") or DEFAULT_FOOTER_HELP_LINE),
        "footer_computer_line": _escape(combined.get("footerComputerLine") or DEFAULT_FOOTER_COMPUTER_LINE),
        "footer_company_line": _escape(combined.get("footerCompanyLine") or DEFAULT_FOOTER_COMPANY_LINE),
    }
    return context


def render_renewal_receipt_html(
    renewal: dict[str, Any],
    receipt_info: dict[str, Any] | None = None,
    logo_data_uri: str | None = None,
) -> str:
    template = _TEMPLATE_ENV.get_template(TEMPLATE_PATH.name)
    context = build_renewal_receipt_context(renewal, receipt_info=receipt_info, logo_data_uri=logo_data_uri)
    return template.render(**context)


async def generate_renewal_receipt_pdf(
    renewal: dict[str, Any],
    receipt_info: dict[str, Any] | None = None,
    logo_data_uri: str | None = None,
) -> ReceiptRenderArtifact:
    html_doc = render_renewal_receipt_html(renewal, receipt_info=receipt_info, logo_data_uri=logo_data_uri)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            page = await browser.new_page(viewport={"width": 1240, "height": 1754}, device_scale_factor=1)
            await page.set_content(html_doc, wait_until="networkidle")
            pdf_bytes = await page.pdf(format="A4", print_background=True, prefer_css_page_size=True)
        finally:
            await browser.close()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", prefix="renewal-receipt-") as temp_file:
        temp_file.write(pdf_bytes)
        temp_path = Path(temp_file.name)

    return ReceiptRenderArtifact(html=html_doc, pdf_bytes=pdf_bytes, pdf_path=temp_path)
