from __future__ import annotations

import base64
import html
from pathlib import Path
from typing import Any

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


def _escape(value: Any) -> str:
    return html.escape("") if value is None else html.escape(str(value), quote=True)


def _format_currency(value: Any) -> str:
    try:
        amount = int(float(value))
    except (TypeError, ValueError):
        return "RM 0"
    return f"RM {amount:,}"


def _to_lines(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item or '').strip()]
    if isinstance(value, str):
        return [line.strip() for line in value.splitlines() if line.strip()]
    return []


def _build_address_block(address_lines: list[str]) -> str:
    lines = address_lines or DEFAULT_ADDRESS_LINES
    return "<br>".join(_escape(line) for line in lines)


def _build_item_rows_html(renewal: dict[str, Any]) -> str:
    renewal_type = str(renewal.get("renewalType") or "Renewal").strip()
    grand_total = renewal.get("grandTotal") or renewal.get("totalAmount") or 0

    rows: list[str] = []

    if renewal_type.lower() == "tenant":
        quantities = renewal.get("parkingQuantities") or {}
        pricing = renewal.get("pricingBreakdown") or {}
        pricing_map = pricing.get("parkingPrices") or {}
        line_specs = [
            ("non_reserved", "Non-Reserved Parking"),
            ("reserved", "Reserved Parking"),
            ("premium", "Premium Parking"),
        ]

        item_index = 1
        for key, label in line_specs:
            quantity = int(quantities.get(key, 0) or 0)
            if quantity <= 0:
                continue
            unit_price = pricing_map.get(key, 0)
            line_total = int(quantity) * int(unit_price or 0)
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
        plate_numbers = renewal.get("vehiclePlateNumbers") or []
        if not isinstance(plate_numbers, list):
            plate_numbers = []
        plate_text = ", ".join(str(plate or "").strip().upper() for plate in plate_numbers if str(plate or "").strip())
        renewal_month_note = str(renewal.get("renewalMonthNote") or "Monthly renewal").strip()
        rows.append(
            "<tr>"
            "<td class='col-item'>1</td>"
            "<td class='col-product'>Individual Renewal</td>"
            f"<td class='col-description'>{_escape(renewal_month_note if renewal_month_note else 'Monthly renewal')}"
            f"<br>{_escape(plate_text)}</td>"
            "<td class='col-qty'>1</td>"
            f"<td class='col-unit'>{_escape(_format_currency(grand_total))}</td>"
            f"<td class='col-total'>{_escape(_format_currency(grand_total))}</td>"
            "</tr>"
        )

    return "\n                    ".join(rows)


def load_logo_data_uri() -> str:
    if not FAVICON_PATH.exists():
        return ""
    content = FAVICON_PATH.read_bytes()
    return f"data:image/png;base64,{base64.b64encode(content).decode('ascii')}"


def build_renewal_receipt_context(renewal: dict[str, Any], logo_data_uri: str | None = None) -> dict[str, str]:
    customer_name = str(
        renewal.get("fullName")
        or renewal.get("contactPerson")
        or renewal.get("customerName")
        or "-"
    ).strip() or "-"
    company_name = str(renewal.get("companyName") or renewal.get("company") or "-").strip() or "-"

    address_lines = _to_lines(renewal.get("addressLines")) or DEFAULT_ADDRESS_LINES
    if renewal.get("address") and not renewal.get("addressLines"):
        address_lines = _to_lines(renewal.get("address")) or DEFAULT_ADDRESS_LINES

    pricing_breakdown = renewal.get("pricingBreakdown") or {}
    grand_total = pricing_breakdown.get("grandTotal") or renewal.get("grandTotal") or renewal.get("totalAmount") or 0

    context = {
        "logo_data_uri": logo_data_uri if logo_data_uri is not None else load_logo_data_uri(),
        "receipt_number": _escape(renewal.get("renewalReference") or renewal.get("referenceNumber") or "-"),
        "customer_name": _escape(customer_name),
        "company_name": _escape(company_name),
        "address_block": _build_address_block(address_lines),
        "item_rows_html": _build_item_rows_html(renewal),
        "grand_total": _escape(_format_currency(grand_total)),
        "footer_help_line": _escape(renewal.get("footerHelpLine") or DEFAULT_FOOTER_HELP_LINE),
        "footer_computer_line": _escape(renewal.get("footerComputerLine") or DEFAULT_FOOTER_COMPUTER_LINE),
        "footer_company_line": _escape(renewal.get("footerCompanyLine") or DEFAULT_FOOTER_COMPANY_LINE),
    }
    return context


def render_renewal_receipt_html(renewal: dict[str, Any], logo_data_uri: str | None = None) -> str:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    context = build_renewal_receipt_context(renewal, logo_data_uri=logo_data_uri)
    html_doc = template
    for key, value in context.items():
        html_doc = html_doc.replace(f"{{{{ {key} }}}}", value)
    return html_doc
