"""
Generate a styled PDF from a cover_letter.md file.
Usage: python3 scripts/generate_cover_letter_pdf.py <folder>
"""
import sys, os, re
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

_FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fonts")
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def _reg(name, filename):
    path = os.path.join(_FONT_DIR, filename)
    if os.path.exists(path):
        pdfmetrics.registerFont(TTFont(name, path))
        return True
    return False

_inter = (
    _reg("Inter", "Inter-Regular.ttf") and
    _reg("Inter-Bold", "Inter-Bold.ttf") and
    _reg("Inter-SemiBold", "Inter-SemiBold.ttf") and
    _reg("Inter-Italic", "Inter-Italic.ttf")
)

F_REG  = "Inter" if _inter else "Helvetica"
F_BOLD = "Inter-Bold" if _inter else "Helvetica-Bold"
F_SEMI = "Inter-SemiBold" if _inter else "Helvetica-Bold"
F_ITAL = "Inter-Italic" if _inter else "Helvetica-Oblique"

C_NAVY = colors.HexColor("#09152A")
C_TEAL = colors.HexColor("#1A7A8A")
C_GOLD = colors.HexColor("#C9A84C")
C_GRAY = colors.HexColor("#1A202C")
C_LGRAY = colors.HexColor("#4A5568")
C_WHITE = colors.white

W, H = letter

def rich(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'\*(.*?)\*', r'<i>\1</i>', t)

def generate(folder):
    md_path  = os.path.join(folder, "cover_letter.md")
    out_path = os.path.join(folder, "cover_letter.pdf")

    with open(md_path) as f:
        raw = f.read()

    lines = raw.strip().split("\n")

    # Strip title line (# ...) and horizontal rules
    body_lines = []
    for ln in lines:
        stripped = ln.strip()
        if stripped.startswith("# "):
            continue
        if stripped == "---":
            continue
        body_lines.append(ln)

    # Styles
    s_normal = ParagraphStyle("normal", fontName=F_REG, fontSize=10.5, leading=16,
                               textColor=C_GRAY, spaceAfter=0, spaceBefore=0)
    s_bold_head = ParagraphStyle("bhead", fontName=F_BOLD, fontSize=10.5, leading=16,
                                  textColor=C_TEAL, spaceAfter=4, spaceBefore=8)
    s_contact = ParagraphStyle("contact", fontName=F_SEMI, fontSize=10, leading=14,
                                textColor=C_NAVY)
    s_small = ParagraphStyle("small", fontName=F_REG, fontSize=9.5, leading=13,
                              textColor=C_LGRAY)
    s_sig = ParagraphStyle("sig", fontName=F_SEMI, fontSize=10.5, leading=15,
                            textColor=C_NAVY)

    doc = SimpleDocTemplate(
        out_path,
        pagesize=letter,
        leftMargin=1.0*inch,
        rightMargin=1.0*inch,
        topMargin=0.85*inch,
        bottomMargin=0.75*inch,
    )

    story = []

    # Header block — name + contact
    def make_header(lines_block):
        els = []
        for i, ln in enumerate(lines_block):
            s = ln.strip()
            if not s:
                continue
            if i == 0:
                els.append(Paragraph(s, ParagraphStyle("name", fontName=F_BOLD, fontSize=16,
                                                        leading=20, textColor=C_NAVY)))
                els.append(Spacer(1, 2))
            else:
                els.append(Paragraph(s, s_small))
        return els

    # Parse body lines into story elements
    i = 0
    header_block = []
    header_done = False
    date_block = []
    date_done = False

    while i < len(body_lines):
        ln = body_lines[i]
        stripped = ln.strip()

        # Collect header (name + contact line)
        if not header_done:
            if stripped:
                header_block.append(stripped)
            else:
                if header_block:
                    story += make_header(header_block)
                    story.append(Spacer(1, 10))
                    story.append(HRFlowable(width="100%", thickness=1.5,
                                            color=C_TEAL, spaceAfter=10))
                    header_done = True
            i += 1
            continue

        # Date / recipient block (before "Dear")
        if not date_done:
            if stripped.lower().startswith("dear"):
                if date_block:
                    for dl in date_block:
                        if dl:
                            story.append(Paragraph(dl, s_small))
                    story.append(Spacer(1, 14))
                date_done = True
                story.append(Paragraph(stripped, s_normal))
                story.append(Spacer(1, 12))
            else:
                date_block.append(stripped)
            i += 1
            continue

        # Bold standalone heading (** text **)
        if re.match(r'^\*\*.+\*\*$', stripped):
            text = stripped.strip("*")
            story.append(Spacer(1, 4))
            story.append(Paragraph(text, s_bold_head))
            i += 1
            continue

        # Signature block
        if stripped.lower() in ("sincerely,", "regards,", "best,"):
            story.append(Spacer(1, 18))
            story.append(Paragraph(stripped, s_normal))
            i += 1
            continue

        # primelayertrades.com or similar sign-off line after sincerely
        if stripped and i > 0 and body_lines[i-1].strip().lower() in ("sincerely,", "regards,", "best,"):
            story.append(Paragraph(stripped, s_sig))
            i += 1
            continue

        # Empty line
        if not stripped:
            story.append(Spacer(1, 8))
            i += 1
            continue

        # Normal paragraph
        story.append(Paragraph(rich(stripped), s_normal))
        i += 1

    # Footer rule
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_TEAL, spaceAfter=6))
    story.append(Paragraph(
        "(757) 289-1204  ·  atobin@alum.utk.edu  ·  Virginia Beach, VA  ·  primelayertrades.com",
        ParagraphStyle("footer", fontName=F_REG, fontSize=8, leading=11,
                       textColor=C_LGRAY, alignment=1)
    ))

    doc.build(story)
    print(f"✓ Cover letter PDF: {out_path}")

if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else "."
    generate(folder)
