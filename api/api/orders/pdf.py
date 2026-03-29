"""PDF generation for rental orders — invoice and rental contract."""
from __future__ import annotations

import io
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register DejaVu Sans font for Unicode support (₹ symbol)
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    UNICODE_FONT = 'DejaVuSans'
    UNICODE_FONT_BOLD = 'DejaVuSans-Bold'
except Exception:
    # Fallback to default font if DejaVu is not available
    UNICODE_FONT = 'Helvetica'
    UNICODE_FONT_BOLD = 'Helvetica-Bold'

# ── Colours ────────────────────────────────────────────────────────────────────

BLACK = colors.black
DARK_GREY = colors.HexColor("#333333")
MEDIUM_GREY = colors.HexColor("#666666")
LIGHT_GREY = colors.HexColor("#CCCCCC")
TABLE_HEADER_GREY = colors.HexColor("#F5F5F5")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt_date(d: date | str | None) -> str:
    if d is None:
        return "—"
    if isinstance(d, str):
        try:
            d = date.fromisoformat(d)
        except ValueError:
            return str(d)
    return d.strftime("%d %b %Y")


def _fmt_inr(amount: Decimal | float | None) -> str:
    if amount is None:
        return "₹0.00"
    return f"₹{float(amount):,.2f}"


def _build_document(buffer: io.BytesIO, title: str) -> BaseDocTemplate:
    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=title,
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="main",
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=frame)])
    return doc


def _header_table(order: dict) -> Table:
    """Top header: brand on left, order meta on right."""
    styles = getSampleStyleSheet()
    brand = Paragraph(
        "<b>RentalMkt</b>",
        ParagraphStyle("brand", parent=styles["Normal"], fontSize=20, leading=24, fontName=UNICODE_FONT_BOLD, textColor=BLACK),
    )
    order_no = Paragraph(
        f"<b>Invoice No: {str(order['id'])[:8].upper()}</b>",
        ParagraphStyle("ordno", parent=styles["Normal"], fontSize=10, leading=14, alignment=2, fontName=UNICODE_FONT_BOLD, textColor=BLACK),
    )
    created = Paragraph(
        f"Date: {_fmt_date(order.get('created_at', date.today()))}",
        ParagraphStyle("meta", parent=styles["Normal"], fontSize=9, textColor=DARK_GREY, alignment=2, fontName=UNICODE_FONT),
    )
    status_lbl = Paragraph(
        f"Status: {order.get('status', '').replace('_', ' ').title()}",
        ParagraphStyle("status", parent=styles["Normal"], fontSize=9, alignment=2, fontName=UNICODE_FONT, textColor=DARK_GREY),
    )
    tbl = Table(
        [[brand, [order_no, created, status_lbl]]],
        colWidths=["55%", "45%"],
    )
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, -1), 2, BLACK),
    ]))
    return tbl


def _two_col_section(left_title: str, left_rows: list[tuple[str, str]],
                     right_title: str, right_rows: list[tuple[str, str]]) -> Table:
    """Two-column info box: customer / vendor or similar."""
    styles = getSampleStyleSheet()
    label_style = ParagraphStyle("lbl", parent=styles["Normal"], fontSize=8, textColor=MEDIUM_GREY, fontName=UNICODE_FONT)
    value_style = ParagraphStyle("val", parent=styles["Normal"], fontSize=9, textColor=BLACK, fontName=UNICODE_FONT)
    title_style = ParagraphStyle("ttl", parent=styles["Normal"], fontSize=10, textColor=BLACK, fontName=UNICODE_FONT_BOLD)

    def _col(title: str, rows: list[tuple[str, str]]) -> list:
        items: list = [Paragraph(f"<b>{title}</b>", title_style), Spacer(1, 3)]
        for lbl, val in rows:
            items.append(Paragraph(lbl, label_style))
            items.append(Paragraph(val or "—", value_style))
        return items

    tbl = Table(
        [[_col(left_title, left_rows), _col(right_title, right_rows)]],
        colWidths=["50%", "50%"],
    )
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 1, LIGHT_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, LIGHT_GREY),
    ]))
    return tbl


def _amount_table(order: dict) -> Table:
    """Pricing breakdown table."""
    styles = getSampleStyleSheet()
    rows = [
        ["Description", "Amount"],
        ["Rental Amount (base)", _fmt_inr(order.get("amount"))],
    ]
    if float(order.get("discount", 0)) > 0:
        rows.append([f"Promo Discount ({order.get('promo_code', '')})", f"- {_fmt_inr(order.get('discount'))}"])
    rows += [
        ["Net Rental Amount", _fmt_inr(order.get("net_amount"))],
        ["CGST (9%)", _fmt_inr(order.get("cgst_amount"))],
        ["SGST (9%)", _fmt_inr(order.get("sgst_amount"))],
        ["Security Deposit (refundable)", _fmt_inr(order.get("security_deposit"))],
    ]
    if float(order.get("damage_amount", 0)) > 0:
        rows.append(["Damage Charge", _fmt_inr(order.get("damage_amount"))])
    if float(order.get("defect_charge", 0)) > 0:
        rows.append(["Defect Charge", _fmt_inr(order.get("defect_charge"))])
    rows.append(["Total Amount", _fmt_inr(order.get("grand_total"))])
    
    label_style = ParagraphStyle("lbl2", parent=styles["Normal"], fontSize=9, fontName=UNICODE_FONT, textColor=BLACK)
    val_style = ParagraphStyle("val2", parent=styles["Normal"], fontSize=9, alignment=2, fontName=UNICODE_FONT, textColor=BLACK)
    table_data = [
        [Paragraph(f"<b>{r[0]}</b>", label_style), Paragraph(f"<b>{r[1]}</b>", val_style)]
        if i == 0
        else [Paragraph(r[0], label_style), Paragraph(r[1], val_style)]
        for i, r in enumerate(rows)
    ]
    tbl = Table(table_data, colWidths=["70%", "30%"])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_GREY),
        ("TEXTCOLOR", (0, 0), (-1, -1), BLACK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.white]),
        ("BACKGROUND", (0, -1), (-1, -1), TABLE_HEADER_GREY),
        ("FONTNAME", (0, -1), (-1, -1), UNICODE_FONT_BOLD),
        ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_GREY),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return tbl


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_invoice_pdf(order: dict[str, Any]) -> bytes:
    """Generate a temporary invoice PDF for the given order dict."""
    buffer = io.BytesIO()
    doc = _build_document(buffer, f"Invoice — {str(order['id'])[:8].upper()}")
    styles = getSampleStyleSheet()
    section_title = ParagraphStyle(
        "sec", parent=styles["Heading2"], fontSize=11, textColor=BLACK, spaceBefore=12, spaceAfter=4, fontName=UNICODE_FONT_BOLD
    )
    note_style = ParagraphStyle(
        "note", parent=styles["Normal"], fontSize=8, textColor=MEDIUM_GREY, spaceAfter=4, fontName=UNICODE_FONT
    )

    story: list[Any] = [
        _header_table(order),
        Spacer(1, 8 * mm),
        Paragraph("<b>TAX INVOICE</b>", ParagraphStyle(
            "inv_title", parent=styles["Normal"], fontSize=14, textColor=BLACK, spaceAfter=2, fontName=UNICODE_FONT_BOLD, alignment=1
        )),
        Paragraph(
            "This is a system-generated invoice. A final invoice will be issued upon order completion.",
            ParagraphStyle("subtitle", parent=styles["Normal"], fontSize=8, textColor=MEDIUM_GREY, spaceAfter=4, fontName=UNICODE_FONT, alignment=1),
        ),
        Spacer(1, 6 * mm),
        Paragraph("Billed To / Customer Details", section_title),
        _two_col_section(
            "Customer Information",
            [
                ("Name", order.get("customer_name", "—")),
                ("Mobile", order.get("customer_mobile", "—")),
                ("Email", order.get("customer_email", "—")),
                ("Delivery Address", order.get("delivery_address_line", "—")),
            ],
            "Vendor Information",
            [
                ("Name", order.get("vendor_name", "—")),
                ("GST No.", order.get("vendor_gst", "—")),
                ("City", order.get("vendor_city", "—")),
            ],
        ),
        Spacer(1, 4 * mm),
        Paragraph("Rental Details", section_title),
        _two_col_section(
            "Product & Device",
            [
                ("Product", order.get("product_name", "—")),
                ("Device ID", str(order.get("device_id", "—"))[:8].upper()),
                ("Delivery Type", order.get("delivery_type", "—").replace("_", " ").title()),
            ],
            "Schedule",
            [
                ("Rental Start", _fmt_date(order.get("start_date"))),
                ("Rental End", _fmt_date(order.get("end_date"))),
                ("Delivery Date", _fmt_date(order.get("delivery_date"))),
                ("Return Date", _fmt_date(order.get("return_date"))),
                ("Total Days", str(order.get("rental_days", "—"))),
            ],
        ),
        Spacer(1, 4 * mm),
        Paragraph("Payment Details", section_title),
        _amount_table(order),
        Spacer(1, 6 * mm),
        Paragraph(
            "<b>Terms & Conditions:</b>",
            ParagraphStyle("terms_title", parent=styles["Normal"], fontSize=9, textColor=BLACK, fontName=UNICODE_FONT_BOLD, spaceAfter=2),
        ),
        Paragraph(
            "1. Security deposit will be refunded within 5-7 business days after the device is returned and inspected.<br/>"
            "2. Late returns will incur additional charges at 1.5× the daily rate.<br/>"
            "3. Equipment must be returned in good condition, subject to normal wear and tear.<br/>"
            "4. This invoice is subject to the terms outlined in the rental agreement.",
            ParagraphStyle("terms", parent=styles["Normal"], fontSize=8, textColor=MEDIUM_GREY, fontName=UNICODE_FONT, leading=12),
        ),
    ]
    doc.build(story)
    return buffer.getvalue()


def generate_contract_pdf(order: dict[str, Any]) -> bytes:
    """Generate a rental contract PDF between vendor and customer."""
    buffer = io.BytesIO()
    doc = _build_document(buffer, f"Rental Contract — {str(order['id'])[:8].upper()}")
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1c", parent=styles["Heading1"], fontSize=16, textColor=BLACK, alignment=1, fontName=UNICODE_FONT_BOLD)
    h2 = ParagraphStyle("h2c", parent=styles["Heading2"], fontSize=11, textColor=BLACK, spaceBefore=10, spaceAfter=4, fontName=UNICODE_FONT_BOLD)
    body = ParagraphStyle("bodyc", parent=styles["Normal"], fontSize=9, leading=14, textColor=BLACK, fontName=UNICODE_FONT)
    sig_style = ParagraphStyle("sig", parent=styles["Normal"], fontSize=9, textColor=DARK_GREY, fontName=UNICODE_FONT)

    start = _fmt_date(order.get("start_date"))
    end = _fmt_date(order.get("end_date"))
    return_date = _fmt_date(order.get("return_date"))
    delivery_date = _fmt_date(order.get("delivery_date"))

    clauses = [
        ("1. Parties", (
            f"This Rental Agreement ('Agreement') is entered into between <b>{order.get('vendor_name','Vendor')}</b> "
            f"('Vendor') and <b>{order.get('customer_name','Customer')}</b> ('Customer') "
            f"for the rental of <b>{order.get('product_name','the Product')}</b> "
            f"(Device ID: {str(order.get('device_id',''))[:8].upper()})."
        )),
        ("2. Rental Period", (
            f"The rental period commences on <b>{start}</b> and ends on <b>{end}</b> "
            f"({order.get('rental_days','—')} days). "
            f"The product shall be delivered/available by <b>{delivery_date}</b> "
            f"and must be returned by <b>{return_date}</b>."
        )),
        ("3. Payment", (
            f"The Customer agrees to pay a total of <b>{_fmt_inr(order.get('grand_total'))}</b> comprising: "
            f"rental amount {_fmt_inr(order.get('net_amount'))}, "
            f"CGST {_fmt_inr(order.get('cgst_amount'))}, "
            f"SGST {_fmt_inr(order.get('sgst_amount'))}, "
            f"and a refundable security deposit of {_fmt_inr(order.get('security_deposit'))}. "
            "Payment is collected in full at time of booking via Stripe."
        )),
        ("4. Security Deposit", (
            f"The security deposit of {_fmt_inr(order.get('security_deposit'))} is held against damage, "
            "late return, or loss. It will be refunded within 5–7 business days after the device is returned "
            "and inspected with no issues outstanding."
        )),
        ("5. Condition of Equipment", (
            "The Customer acknowledges receipt of the equipment in the condition described at time of delivery. "
            "The Customer is responsible for maintaining the equipment in good working condition and returning "
            "it in the same or better state, subject to normal wear and tear."
        )),
        ("6. Damage & Loss", (
            f"Should the equipment be returned damaged beyond normal wear and tear, lost, or stolen, "
            f"the Customer shall be liable for repair or replacement costs at market value, "
            f"up to and including the full defect charge of {_fmt_inr(order.get('defect_charge'))}. "
            "The Vendor reserves the right to deduct such costs from the security deposit and invoice "
            "any outstanding balance."
        )),
        ("7. Late Return", (
            f"The equipment must be returned by <b>{return_date}</b>. "
            "Late returns will incur a daily penalty equal to 1.5× the daily rate, "
            "charged for each additional day or part thereof. "
            "The Vendor may also recover the equipment at the Customer's cost."
        )),
        ("8. Permitted Use", (
            "The Customer agrees to use the equipment solely for its intended lawful purpose. "
            "Sub-letting, further renting, or transfer of possession to any third party is strictly prohibited."
        )),
        ("9. Liability", (
            "The Vendor shall not be liable for any indirect, incidental, or consequential loss arising "
            "from the use or inability to use the rented equipment. The Vendor's total liability shall not "
            "exceed the total rental amount paid under this Agreement."
        )),
        ("10. Termination & Cancellation", (
            "Either party may cancel the rental before delivery. Cancellation after delivery but before "
            "the rental start date will incur a cancellation fee of 20% of the net rental amount. "
            "No refund is available once the rental period has commenced, except at the Vendor's discretion. "
            "The security deposit is always refundable net of any outstanding charges."
        )),
        ("11. Governing Law", (
            "This Agreement shall be governed by and construed in accordance with the laws of India. "
            "Any disputes shall be subject to the exclusive jurisdiction of courts in the Vendor's city of operations."
        )),
        ("12. Entire Agreement", (
            "This Agreement constitutes the entire understanding between the parties with respect to the "
            "subject matter hereof and supersedes all prior negotiations, representations, or agreements "
            "relating to the equipment rental."
        )),
    ]

    story: list[Any] = [
        _header_table(order),
        Spacer(1, 8 * mm),
        Paragraph("RENTAL AGREEMENT & CONTRACT", h1),
        Spacer(1, 2 * mm),
        Paragraph(
            f"Contract Reference: <b>#{str(order['id'])[:8].upper()}</b> &nbsp;|&nbsp; "
            f"Date: <b>{_fmt_date(order.get('created_at', date.today()))}</b>",
            ParagraphStyle("refline", parent=styles["Normal"], fontSize=9, textColor=MEDIUM_GREY, alignment=1, fontName=UNICODE_FONT),
        ),
        Spacer(1, 6 * mm),
    ]

    for title, text in clauses:
        story.append(Paragraph(title, h2))
        story.append(Paragraph(text, body))

    story += [
        Spacer(1, 10 * mm),
        Paragraph("Signatures", h2),
        Table(
            [
                [
                    Paragraph("Vendor Signature: ___________________________", sig_style),
                    Paragraph("Customer Signature: ___________________________", sig_style),
                ],
                [
                    Paragraph(f"Name: {order.get('vendor_name','')}", sig_style),
                    Paragraph(f"Name: {order.get('customer_name','')}", sig_style),
                ],
                [
                    Paragraph(f"Date: {_fmt_date(date.today())}", sig_style),
                    Paragraph(f"Date: {_fmt_date(date.today())}", sig_style),
                ],
            ],
            colWidths=["50%", "50%"],
        ),
        Spacer(1, 5 * mm),
        Paragraph(
            "This is a system-generated contract. Digital acceptance is recorded at the time of payment.",
            ParagraphStyle("footer", parent=styles["Normal"], fontSize=8, textColor=MEDIUM_GREY, alignment=1, fontName=UNICODE_FONT),
        ),
    ]

    doc.build(story)
    return buffer.getvalue()
