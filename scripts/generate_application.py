"""
State-of-the-art PDF resume + Word cover letter generator.
Usage: python3 generate_application.py <application_folder>
"""

import sys, os, re
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph,
    Spacer, HRFlowable, Table, TableStyle, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ── Palette ───────────────────────────────────────────────────────────────────
C_NAVY   = colors.HexColor("#0D1B2A")   # deep navy
C_TEAL   = colors.HexColor("#1B7A8C")   # primary teal
C_LTEAL  = colors.HexColor("#E8F4F7")   # teal tint background
C_GOLD   = colors.HexColor("#C9A84C")   # accent gold
C_GRAY   = colors.HexColor("#4A5568")   # body text
C_LGRAY  = colors.HexColor("#718096")   # secondary text
C_RULE   = colors.HexColor("#CBD5E0")   # divider
C_WHITE  = colors.white
C_BG     = colors.HexColor("#F7FAFC")   # page bg tint (sidebar)

W = letter[0]
H = letter[1]
MARGIN   = 0.35 * inch
SIDEBAR  = 1.95 * inch
MAIN_W   = W - SIDEBAR - MARGIN * 2.8


# ── Custom Flowables ──────────────────────────────────────────────────────────

class ColorRect(Flowable):
    """Solid colour rectangle — used for sidebar background."""
    def __init__(self, w, h, color):
        super().__init__()
        self.w, self.h, self.color = w, h, color
    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.w, -self.h, fill=1, stroke=0)
    def wrap(self, *args): return self.w, 0


class Dot(Flowable):
    """Small teal filled circle — bullet for sidebar."""
    def draw(self):
        self.canv.setFillColor(C_TEAL)
        self.canv.circle(3, 3, 3, fill=1, stroke=0)
    def wrap(self, *args): return 8, 8


class SidebarPage:
    """Page template that draws the navy sidebar behind everything."""
    def __init__(self):
        pass
    def __call__(self, canvas, doc):
        canvas.saveState()
        # Full-height sidebar
        canvas.setFillColor(C_NAVY)
        canvas.rect(0, 0, SIDEBAR + MARGIN * 0.5, H, fill=1, stroke=0)
        # Gold accent line where sidebar meets main content
        canvas.setFillColor(C_GOLD)
        canvas.rect(SIDEBAR + MARGIN * 0.5, 0, 2, H, fill=1, stroke=0)
        canvas.restoreState()


# ── Style factory ─────────────────────────────────────────────────────────────

def S(name, **kw):
    defaults = dict(fontName="Helvetica", fontSize=8, leading=11,
                    textColor=C_GRAY, spaceAfter=0, spaceBefore=0)
    defaults.update(kw)
    return ParagraphStyle(name, **defaults)


# Sidebar styles
s_name      = S("sName", fontName="Helvetica-Bold", fontSize=17,
                 textColor=C_WHITE, leading=20, spaceAfter=1)
s_subtitle  = S("sSub",  fontName="Helvetica",     fontSize=7.5,
                 textColor=C_GOLD,  leading=10, spaceAfter=4)
s_sec_side  = S("sSecS", fontName="Helvetica-Bold", fontSize=6.5,
                 textColor=C_GOLD,  leading=9, spaceAfter=2,
                 spaceBefore=7)
s_side_body = S("sSB",   fontName="Helvetica", fontSize=7.2,
                 textColor=colors.HexColor("#CBD5E0"), leading=10)
s_side_bull = S("sSBull",fontName="Helvetica", fontSize=7.2,
                 textColor=colors.HexColor("#CBD5E0"), leading=10,
                 leftIndent=9, firstLineIndent=-7)

# Main content styles
s_sec_main  = S("sMSec", fontName="Helvetica-Bold", fontSize=7,
                 textColor=C_TEAL,  leading=9,
                 spaceBefore=5, spaceAfter=1)
s_job_title = S("sJT",   fontName="Helvetica-Bold", fontSize=8.5,
                 textColor=C_NAVY,  leading=11)
s_company   = S("sCo",   fontName="Helvetica-Oblique", fontSize=7.5,
                 textColor=C_TEAL,  leading=10, spaceAfter=1)
s_dates     = S("sDt",   fontName="Helvetica", fontSize=7.5,
                 textColor=C_LGRAY, leading=10, alignment=TA_RIGHT)
s_body      = S("sBody", fontName="Helvetica", fontSize=8,
                 textColor=C_GRAY,  leading=11)
s_bullet    = S("sBull", fontName="Helvetica", fontSize=7.8,
                 textColor=C_GRAY,  leading=10.5,
                 leftIndent=11, firstLineIndent=-8, spaceAfter=1)
s_summary   = S("sSum",  fontName="Helvetica", fontSize=8,
                 textColor=C_GRAY,  leading=11.5, spaceAfter=2)
s_italic    = S("sItal", fontName="Helvetica-Oblique", fontSize=7,
                 textColor=C_LGRAY, leading=9, leftIndent=8)
s_skill_cat = S("sSCat", fontName="Helvetica-Bold", fontSize=7.5,
                 textColor=C_TEAL,  leading=10)
s_skill_val = S("sSVal", fontName="Helvetica", fontSize=7.5,
                 textColor=C_GRAY,  leading=10)


def rule():
    return HRFlowable(width="100%", thickness=0.5, color=C_RULE,
                      spaceAfter=2, spaceBefore=0)

def section_heading(text):
    return KeepTogether([
        Paragraph(text.upper(), s_sec_main),
        HRFlowable(width="100%", thickness=1.2, color=C_TEAL,
                   spaceAfter=2, spaceBefore=0)
    ])

def sidebar_section(text):
    return Paragraph(text.upper(), s_sec_side)


# ── PDF Builder ───────────────────────────────────────────────────────────────

def build_pdf_resume(md: str, out_path: str):
    lines = md.strip().split("\n")

    # ── Parse markdown into structured data ───────────────────────────────────
    name = ""; subtitle = ""; contact = ""
    sections = {}       # ordered list of (section_name, [content_lines])
    current = None

    i = 0
    while i < len(lines):
        ln = lines[i].strip()
        if ln.startswith("# "):
            name = ln[2:].strip(); i += 1; continue
        if ln.startswith("**") and ln.endswith("**") and not current:
            subtitle = ln.strip("*"); i += 1; continue
        if not current and ("@" in ln or "(" in ln) and "|" in ln:
            contact = ln; i += 1; continue
        if ln.startswith("## "):
            current = ln[3:].strip()
            sections[current] = []; i += 1; continue
        if current is not None:
            sections[current].append(lines[i])
        i += 1

    # ── Sidebar content ───────────────────────────────────────────────────────
    sidebar_story = []

    # Name block
    sidebar_story.append(Spacer(1, 0.22*inch))
    for part in name.split():
        sidebar_story.append(Paragraph(part, s_name))
    sidebar_story.append(Spacer(1, 2))
    if subtitle:
        sidebar_story.append(Paragraph(subtitle, s_subtitle))

    # Contact
    if contact:
        sidebar_story.append(sidebar_section("Contact"))
        for item in contact.split("|"):
            item = item.strip()
            if item:
                sidebar_story.append(Paragraph(f"• {item}", s_side_bull))
        sidebar_story.append(Spacer(1, 4))

    # Skills section → sidebar
    if "Core Skills" in sections or "Technical Skills" in sections or "Skills" in sections:
        key = next((k for k in ("Core Skills","Technical Skills","Skills")
                    if k in sections), None)
        if key:
            sidebar_story.append(sidebar_section("Skills"))
            for ln in sections[key]:
                ln = ln.strip()
                if ln.startswith("- "):
                    skill = re.sub(r'\*\*(.*?)\*\*', r'\1', ln[2:].strip())
                    # Truncate long skill lines
                    if len(skill) > 38:
                        skill = skill[:36] + "…"
                    sidebar_story.append(Paragraph(f"• {skill}", s_side_bull))
            del sections[key]

    # Education → sidebar
    if "Education" in sections:
        sidebar_story.append(sidebar_section("Education"))
        for ln in sections["Education"]:
            ln = ln.strip()
            if not ln: continue
            ln_clean = re.sub(r'\*\*(.*?)\*\*', r'\1', ln)
            ln_clean = re.sub(r'\*(.*?)\*', r'\1', ln_clean)
            sidebar_story.append(Paragraph(ln_clean, s_side_body))
        del sections["Education"]

    # Certifications → sidebar
    if "Certifications" in sections:
        sidebar_story.append(sidebar_section("Certifications"))
        for ln in sections["Certifications"]:
            ln = ln.strip()
            if ln.startswith("- "):
                cert = re.sub(r'\*\*(.*?)\*\*', r'\1', ln[2:])
                sidebar_story.append(Paragraph(f"• {cert}", s_side_bull))
        del sections["Certifications"]

    # ── Main content ──────────────────────────────────────────────────────────
    main_story = []
    main_story.append(Spacer(1, 0.15*inch))

    for sec_name, sec_lines in sections.items():
        main_story.append(section_heading(sec_name))

        i = 0
        while i < len(sec_lines):
            ln = sec_lines[i].strip()

            if not ln: i += 1; continue

            # ### Job heading
            if ln.startswith("### "):
                parts = ln[4:].split("|")
                job_t   = parts[0].strip() if len(parts) > 0 else ""
                company = parts[1].strip() if len(parts) > 1 else ""
                dates   = parts[2].strip() if len(parts) > 2 else ""

                left  = Paragraph(f"<b>{job_t}</b>", s_job_title)
                right = Paragraph(dates, s_dates)
                t = Table([[left, right]],
                          colWidths=[MAIN_W * 0.72, MAIN_W * 0.28])
                t.setStyle(TableStyle([
                    ("VALIGN",        (0,0),(-1,-1),"BOTTOM"),
                    ("LEFTPADDING",   (0,0),(-1,-1),0),
                    ("RIGHTPADDING",  (0,0),(-1,-1),0),
                    ("TOPPADDING",    (0,0),(-1,-1),0),
                    ("BOTTOMPADDING", (0,0),(-1,-1),1),
                ]))
                main_story.append(KeepTogether([t]))
                if company:
                    main_story.append(Paragraph(company, s_company))
                i += 1; continue

            # Markdown table
            if ln.startswith("|") and "---" not in ln:
                rows = []
                while i < len(sec_lines) and sec_lines[i].strip().startswith("|"):
                    row_ln = sec_lines[i].strip()
                    if "---" not in row_ln:
                        cells = [c.strip() for c in row_ln.split("|")[1:-1]]
                        rows.append(cells)
                    i += 1
                if rows:
                    tdata = []
                    for r_i, row in enumerate(rows):
                        styled = []
                        for c_i, cell in enumerate(row):
                            cell = re.sub(r'\*\*(.*?)\*\*', r'\1', cell)
                            st = ParagraphStyle("TC", fontName=(
                                "Helvetica-Bold" if c_i == 0 else "Helvetica"),
                                fontSize=8.5, leading=12,
                                textColor=(C_TEAL if c_i == 0 else C_GRAY))
                            styled.append(Paragraph(cell, st))
                        tdata.append(styled)
                    col_w = [MAIN_W * 0.34, MAIN_W * 0.66]
                    t = Table(tdata, colWidths=col_w, repeatRows=0)
                    t.setStyle(TableStyle([
                        ("ROWBACKGROUNDS",(0,0),(-1,-1),
                         [C_LTEAL, C_WHITE]),
                        ("BOX",          (0,0),(-1,-1), 0.5, C_RULE),
                        ("INNERGRID",    (0,0),(-1,-1), 0.25, C_RULE),
                        ("VALIGN",       (0,0),(-1,-1), "TOP"),
                        ("LEFTPADDING",  (0,0),(-1,-1), 5),
                        ("RIGHTPADDING", (0,0),(-1,-1), 5),
                        ("TOPPADDING",   (0,0),(-1,-1), 3),
                        ("BOTTOMPADDING",(0,0),(-1,-1), 3),
                    ]))
                    main_story.append(t)
                    main_story.append(Spacer(1, 4))
                continue

            # Bullet
            if ln.startswith("- "):
                text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', ln[2:])
                main_story.append(Paragraph(f"<font color='#1B7A8C'>▸</font>  {text}",
                                            s_bullet))
                i += 1; continue

            # Italic line
            if ln.startswith("*") and ln.endswith("*") and not ln.startswith("**"):
                main_story.append(Paragraph(ln.strip("*"), s_italic))
                i += 1; continue

            # Regular text
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', ln)
            text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
            main_story.append(Paragraph(text, s_summary))
            i += 1

        main_story.append(Spacer(1, 2))

    # ── Lay out two-column page ───────────────────────────────────────────────
    sidebar_x = MARGIN * 0.3
    sidebar_w = SIDEBAR
    main_x    = SIDEBAR + MARGIN * 1.1
    content_h = H - MARGIN * 1.5

    content_h = H - MARGIN * 1.2

    sidebar_frame = Frame(sidebar_x, MARGIN * 0.55,
                          sidebar_w, content_h,
                          leftPadding=9, rightPadding=5,
                          topPadding=0, bottomPadding=0,
                          id="sidebar", showBoundary=0)

    main_frame    = Frame(main_x, MARGIN * 0.55,
                          MAIN_W, content_h,
                          leftPadding=3, rightPadding=3,
                          topPadding=0, bottomPadding=0,
                          id="main", showBoundary=0)

    page_bg = SidebarPage()
    template = PageTemplate(id="TwoCol",
                            frames=[sidebar_frame, main_frame],
                            onPage=page_bg)

    from reportlab.platypus import FrameBreak

    # Count pages first to warn if overflow
    from io import BytesIO
    from reportlab.platypus import BaseDocTemplate as BDT
    test_doc = BDT(BytesIO(), pagesize=letter,
                   pageTemplates=[PageTemplate(
                       id="TwoCol2",
                       frames=[
                           Frame(sidebar_x, MARGIN*0.55, sidebar_w, content_h,
                                 leftPadding=9, rightPadding=5, id="s2"),
                           Frame(main_x, MARGIN*0.55, MAIN_W, content_h,
                                 leftPadding=3, rightPadding=3, id="m2"),
                       ], onPage=page_bg)],
                   leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0)
    test_doc.build(sidebar_story[:] + [FrameBreak()] + main_story[:])
    pages = test_doc.page
    if pages > 1:
        print(f"⚠️  Resume is {pages} pages — consider trimming bullet points.")

    doc = BaseDocTemplate(out_path, pagesize=letter,
                          pageTemplates=[template],
                          leftMargin=0, rightMargin=0,
                          topMargin=0, bottomMargin=0)
    full_story = sidebar_story + [FrameBreak()] + main_story
    doc.build(full_story)
    print(f"✓ PDF ({pages}p): {out_path}")


# ── Word Cover Letter ─────────────────────────────────────────────────────────

def build_word_cover_letter(md: str, out_path: str):
    doc = Document()

    # Page setup
    for sec in doc.sections:
        sec.top_margin    = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin   = Inches(1.1)
        sec.right_margin  = Inches(1.1)

    # Default paragraph style
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    def add_para(text="", bold=False, size=11, color=None,
                 align=WD_ALIGN_PARAGRAPH.LEFT, space_after=6):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.space_before = Pt(0)
        if not text:
            return p
        parts = re.split(r'(\*\*.*?\*\*)', text)
        for part in parts:
            is_bold = part.startswith("**") and part.endswith("**")
            run = p.add_run(part[2:-2] if is_bold else part)
            run.bold = bold or is_bold
            run.font.size = Pt(size)
            run.font.name = "Calibri"
            if color:
                run.font.color.rgb = color
        return p

    def add_rule(color_hex="1B7A8C", thickness=12):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(8)
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bot  = OxmlElement("w:bottom")
        bot.set(qn("w:val"),   "single")
        bot.set(qn("w:sz"),    str(thickness))
        bot.set(qn("w:space"), "1")
        bot.set(qn("w:color"), color_hex)
        pBdr.append(bot)
        pPr.append(pBdr)

    lines = md.strip().split("\n")
    i = 0

    # Skip H1
    while i < len(lines) and not lines[i].strip().startswith("# "):
        i += 1
    i += 1  # skip the title line

    # Header: name
    name_line = lines[i].strip() if i < len(lines) else ""
    add_para(name_line, bold=True, size=18,
             color=RGBColor(0x0D, 0x1B, 0x2A), space_after=2)
    i += 1

    # Contact / date lines
    while i < len(lines) and lines[i].strip():
        add_para(lines[i].strip(), size=10,
                 color=RGBColor(0x71, 0x80, 0x96), space_after=0)
        i += 1

    add_rule("1B7A8C", 16)

    # Skip blanks
    while i < len(lines) and not lines[i].strip(): i += 1

    # Recipient block
    while i < len(lines) and lines[i].strip() \
          and not lines[i].strip().startswith("Dear"):
        add_para(lines[i].strip(), size=10.5,
                 color=RGBColor(0x0D, 0x1B, 0x2A), space_after=0)
        i += 1

    add_para()

    # Body
    in_body = False
    while i < len(lines):
        ln = lines[i].strip()
        if not ln:
            add_para(space_after=4)
            i += 1; continue

        if ln.startswith("Dear"):
            add_para(ln, bold=True, size=11,
                     color=RGBColor(0x0D, 0x1B, 0x2A), space_after=10)
            i += 1; in_body = True; continue

        if ln.startswith("Sincerely"):
            add_para()
            add_para(ln, size=11, color=RGBColor(0x0D, 0x1B, 0x2A),
                     space_after=0)
            i += 1; continue

        add_para(ln, size=11, color=RGBColor(0x0D, 0x1B, 0x2A),
                 space_after=8)
        i += 1

    doc.save(out_path)
    print(f"✓ DOCX: {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 generate_application.py <folder>")
        sys.exit(1)

    folder = sys.argv[1]
    with open(os.path.join(folder, "resume.md"))       as f: resume_md = f.read()
    with open(os.path.join(folder, "cover_letter.md")) as f: cover_md  = f.read()

    build_pdf_resume(resume_md,          os.path.join(folder, "resume.pdf"))
    build_word_cover_letter(cover_md,    os.path.join(folder, "cover_letter.docx"))
