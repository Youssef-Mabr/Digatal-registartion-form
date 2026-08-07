# Renewal Receipt Template

This folder contains the reusable HTML receipt template used to render renewal receipts before PDF generation.

Files:
- `renewal_receipt.html`: print-ready receipt layout matching the current receipt style.

Template placeholders expected by the backend renderer:
- `logo_data_uri`
- `receipt_number`
- `customer_name`
- `customer_email`
- `company_name`
- `company_address_display`
- `address_block`
- `parking_type`
- `subscription_month`
- `vehicle_plate_numbers_text`
- `quantity_display`
- `unit_price_display`
- `total_amount_display`
- `additional_notes`
- `item_rows_html`
- `summary_rows_html`
- `grand_total`
- `footer_help_line`
- `footer_computer_line`
- `footer_company_line`

The renderer in `backend/receipt_renderer.py` automatically looks for the company logo at `frontend/public/assets/favicon.png` and injects it as a base64 data URI when available.
The template is rendered with Jinja2 before the PDF is generated.
