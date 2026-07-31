# Renewal Receipt Template

This folder contains the reusable HTML receipt template used to render renewal receipts before PDF generation.

Files:
- `renewal_receipt.html`: print-ready receipt layout matching the current receipt style.

Template placeholders expected by the backend renderer:
- `logo_data_uri`
- `receipt_number`
- `customer_name`
- `company_name`
- `address_block`
- `item_rows_html`
- `grand_total`
- `footer_help_line`
- `footer_computer_line`
- `footer_company_line`

The renderer in `backend/receipt_renderer.py` automatically looks for the company logo at `frontend/public/assets/favicon.png` and injects it as a base64 data URI when available.
