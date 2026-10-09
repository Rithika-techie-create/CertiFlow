import os
from pathlib import Path
from datetime import date
from typing import Optional

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.pdfgen import canvas

def generate_pdf_certificate(
    output_path: Path,
    recipient_name: str,
    event_name: str,
    issuer_name: str,
    issue_date: date,
    certificate_id: str,
    organization: Optional[str] = None,
    expiry_date: Optional[date] = None
) -> str:
    """
    Generates a high-quality landscape A4 PDF certificate.
    Returns the string representation of output_path on success.
    """
    # Ensure directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # A4 landscape dimensions: width = 841.89 pt (11.69 in), height = 595.27 pt (8.27 in)
    width, height = landscape(A4)
    
    c = canvas.Canvas(str(output_path), pagesize=landscape(A4))
    c.setTitle(f"Certificate - {recipient_name}")
    c.setAuthor(issuer_name)
    c.setSubject(event_name)

    # 1. Background Fill (Very soft off-white/cream)
    c.setFillColor(colors.HexColor("#FAFAFC"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # 2. Outer Border (Deep Indigo)
    c.setStrokeColor(colors.HexColor("#1E1B4B"))
    c.setLineWidth(6)
    c.rect(25, 25, width - 50, height - 50)

    # 3. Inner Border (Subtle Indigo)
    c.setStrokeColor(colors.HexColor("#6366F1"))
    c.setLineWidth(1.5)
    c.rect(33, 33, width - 66, height - 66)

    # 4. Corner Decorative Accents
    accent_color = colors.HexColor("#4F46E5")
    c.setStrokeColor(accent_color)
    c.setLineWidth(3)
    
    # Top-left corner accent
    c.line(20, height - 40, 55, height - 40)
    c.line(40, height - 20, 40, height - 55)
    # Top-right corner accent
    c.line(width - 20, height - 40, width - 55, height - 40)
    c.line(width - 40, height - 20, width - 40, height - 55)
    # Bottom-left corner accent
    c.line(20, 40, 55, 40)
    c.line(40, 20, 40, 55)
    # Bottom-right corner accent
    c.line(width - 20, 40, width - 55, 40)
    c.line(width - 40, 20, width - 40, 55)

    # 5. Header Title
    c.setFillColor(colors.HexColor("#1E1B4B"))
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width / 2.0, height - 85, issuer_name.upper())

    c.setFillColor(colors.HexColor("#4F46E5"))
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width / 2.0, height - 130, "CERTIFICATE OF ACHIEVEMENT")

    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1)
    c.line(width / 2.0 - 150, height - 145, width / 2.0 + 150, height - 145)

    # 6. Recipient Section
    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2.0, height - 180, "PROUDLY PRESENTED TO")

    # Recipient Name
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(width / 2.0, height - 230, recipient_name)

    c.setStrokeColor(colors.HexColor("#4F46E5"))
    c.setLineWidth(2)
    name_width = c.stringWidth(recipient_name, "Helvetica-Bold", 30)
    c.line(width / 2.0 - max(120, name_width / 2 + 20), height - 240, width / 2.0 + max(120, name_width / 2 + 20), height - 240)

    # Organization line if present
    current_y = height - 275
    if organization:
        c.setFillColor(colors.HexColor("#64748B"))
        c.setFont("Helvetica-Oblique", 13)
        c.drawCentredString(width / 2.0, current_y, f"Representing {organization}")
        current_y -= 30

    # 7. Event & Fulfillment statement
    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2.0, current_y, "for successfully completing and demonstrating excellence in")
    current_y -= 40

    c.setFillColor(colors.HexColor("#1E1B4B"))
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2.0, current_y, event_name)
    current_y -= 60

    # 8. Signature & Metadata Section
    # Left column: Issue Date & Expiry
    left_x = 120
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 11)
    c.drawString(left_x, current_y + 15, "DATE OF ISSUANCE")
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 12)
    date_str = issue_date.strftime("%B %d, %Y")
    c.drawString(left_x, current_y, date_str)
    
    if expiry_date:
        exp_str = expiry_date.strftime("%B %d, %Y")
        c.setFillColor(colors.HexColor("#64748B"))
        c.setFont("Helvetica", 11)
        c.drawString(left_x, current_y - 20, f"EXPIRES: {exp_str}")

    # Right column: Signature Line
    right_x = width - 240
    c.setStrokeColor(colors.HexColor("#0F172A"))
    c.setLineWidth(1)
    c.line(right_x, current_y + 15, right_x + 160, current_y + 15)
    
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(right_x, current_y, issuer_name)
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 11)
    c.drawString(right_x, current_y - 15, "Authorized Representative")

    # 9. Footer: Certificate ID
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2.0, 45, f"VERIFICATION ID: {certificate_id}  •  ISSUED VIA CERTIFLOW")

    c.showPage()
    c.save()
    return str(output_path)
