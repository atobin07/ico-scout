"""
State-of-the-art PDF resume + Word cover letter generator.
Layout: full-width navy header → sidebar (skills/edu/certs) + main (summary/experience)
Usage: python3 generate_application.py <application_folder>
"""

import sys, os, re
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph,
    Spacer, HRFlowable, Table, TableStyle, KeepTogether, FrameBreak
)
from reportlab.platypus.flowables import Flowable
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ── Palette ───────────────────────────────────────────────────────────────────
C_NAVY  = colors.HexColor("#0D1B2A")
C_TEAL  = colors.HexColor("#1B7A8C")
C_LTEAL = colors.HexColor("#E8F4F7")
C_GOLD  = colors.HexColor("#C9A84C")
C_GRAY  = colors.HexColor("#2D3748")
C_LGRAY = colors.HexColor("#718096")
C_RULE  = colors.HexColor("#CBD5E0")
C_WHITE = colors.white
C_SNOW  = colors.HexColor("#F0F4F8")
C_SIDEBG = colors.HexColor("#E8F4F7")  # very light teal for sidebar text bg

W, H = letter
HEADER_H  = 1.05 * inch   # height of the navy top bar
SIDEBAR_W = 2.1  * inch   # width of the left sidebar column
GOLD_BAR  = 2              # gold accent rule width in points
MX        = 0.28 * inch   # horizontal margin inside sidebar/main
MY        = 0.30 * inch   # vertical bottom margin
CONTENT_H = H - HEADER_H - MY * 2
MAIN_X    = SIDEBAR_W + GOLD_BAR + 4
MAIN_W    = W - MAIN_X - MX * 0.8


# ── Page background ───────────────────────────────────────────────────────────
def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_NAVY)
    canvas.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)
    canvas.setFillColor(C_NAVY)
    canvas.rect(0, 0, SIDEBAR_W, H - HEADER_H, fill=1, stroke=0)
    canvas.setFillColor(C_GOLD)
    canvas.rect(SIDEBAR_W, 0, GOLD_BAR, H - HEADER_H, fill=1, stroke=0)
    canvas.restoreState()


# ── Style factory ─────────────────────────────────────────────────────────────
def S(name, **kw):
    defaults = dict(fontName="Helvetica", fontSize=9, leading=13,
                    textColor=C_GRAY, spaceAfter=0, spaceBefore=0)
    defaults.update(kw)
    return ParagraphStyle(name, **defaults)

# Header styles (full-width navy bar at top)
s_hdr_name    = S("hName", fontName="Helvetica-Bold", fontSize=22,
                   textColor=C_WHITE, leading=24, spaceAfter=1)
s_hdr_sub     = S("hSub",  fontName="Helvetica",     fontSize=9,
                   textColor=C_GOLD,  leading=12, spaceAfter=0)
s_hdr_contact = S("hCont", fontName="Helvetica",     fontSize=8,
                   textColor=colors.HexColor("#A0AEC0"), leading=11,
                   spaceAfter=0, alignment=TA_RIGHT)

# Sidebar styles
s_sec_side = S("sSecS", fontName="Helvetica-Bold", fontSize=7,
                textColor=C_GOLD,  leading=9, spaceAfter=3, spaceBefore=10,
                letterSpacing=0.8)
s_side_body = S("sSB", fontName="Helvetica", fontSize=7.8,
                 textColor=colors.HexColor("#B2C5D8"), leading=11)
s_side_bull = S("sSBull", fontName="Helvetica", fontSize=7.8,
                 textColor=colors.HexColor("#CBD5E0"), leading=11,
                 leftIndent=9, firstLineIndent=-7, spaceAfter=1.5)

# Main content styles
s_sec_main  = S("sMSec", fontName="Helvetica-Bold", fontSize=7.5,
                 textColor=C_TEAL, leading=9, spaceBefore=9, spaceAfter=2,
                 letterSpacing=0.8)
s_job_title = S("sJT",  fontName="Helvetica-Bold", fontSize=9.5,
                 textColor=C_NAVY, leading=12)
s_company   = S("sCo",  fontName="Helvetica-Oblique", fontSize=8.5,
                 textColor=C_TEAL, leading=11, spaceAfter=1)
s_dates     = S("sDt",  fontName="Helvetica", fontSize=8,
                 textColor=C_LGRAY, leading=12, alignment=TA_RIGHT)
s_bullet    = S("sBull", fontName="Helvetica", fontSize=8.8,
                 textColor=C_GRAY,  leading=12.5,
                 leftIndent=11, firstLineIndent=-8, spaceAfter=2)
s_summary   = S("sSum", fontName="Helvetica", fontSize=9,
                 textColor=C_GRAY,  leading=13.5, spaceAfter=3)
s_italic    = S("sItal", fontName="Helvetica-Oblique", fontSize=8,
                 textColor=C_LGRAY, leading=11, leftIndent=10)
s_skill_cat = S("sSCat", fontName="Helvetica-Bold", fontSize=8.5,
                 textColor=C_TEAL, leading=11)
s_skill_val = S("sSVal", fontName="Helvetica", fontSize=8.5,
                 textColor=C_GRAY,  leading=11)


def teal_rule():
    return HRFlowable(width="100%", thickness=1.0, color=C_TEAL,
                      spaceAfter=2, spaceBefore=0)

def section_heading(text):
    return KeepTogether([
        Paragraph(text.upper(), s_sec_main),
        teal_rule(),
    ])

def sidebar_section(text):
    return Paragraph(text.upper(), s_sec_side)

def bold(t):
    return re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', t)

def strip_md(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'\1', t)
    return re.sub(r'\*(.*?)\*', r'\1', t)


# ── Markdown parser ───────────────────────────────────────────────────────────
def parse_resume(md: str) -> dict:
    """Parse resume markdown into structured dict."""
    lines = md.strip().split("\n")
    data = dict(name="", subtitle="", contact="", sections=[])
    current_sec = None
    current_job = None

    for raw in lines:
        ln = raw.strip()

        if ln.startswith("# "):
            data["name"] = ln[2:].strip(); continue

        if ln.startswith("**") and ln.endswith("**") and not current_sec:
            data["subtitle"] = ln.strip("*"); continue

        if not current_sec and ("@" in ln or "(" in ln) and "|" in ln:
            data["contact"] = ln; continue

        if ln.startswith("## "):
            current_sec = {"name": ln[3:].strip(), "items": [], "jobs": []}
            data["sections"].append(current_sec)
            current_job = None
            continue

        if current_sec is None:
            continue

        if ln.startswith("### "):
            parts = ln[4:].split("|")
            current_job = {
                "title":   parts[0].strip() if len(parts) > 0 else "",
                "company": parts[1].strip() if len(parts) > 1 else "",
                "dates":   parts[2].strip() if len(parts) > 2 else "",
                "bullets": []
            }
            current_sec["jobs"].append(current_job)
            continue

        if current_job and ln.startswith("- "):
            current_job["bullets"].append(ln[2:].strip())
            continue

        current_sec["items"].append(raw)

    return data


# ── Story builders ────────────────────────────────────────────────────────────
def build_header_story(data: dict) -> list:
    story = []
    story.append(Spacer(1, 0.12 * inch))
    story.append(Paragraph(data["name"], s_hdr_name))
    if data["subtitle"]:
        story.append(Paragraph(data["subtitle"], s_hdr_sub))

    if data["contact"]:
        parts = [p.strip() for p in data["contact"].split("|") if p.strip()]
        contact_str = "  ·  ".join(parts)
        story.append(Paragraph(contact_str, s_hdr_contact))
    return story


def build_sidebar_story(data: dict, compact=False) -> list:
    story = []
    story.append(Spacer(1, 0.14 * inch))

    SB = 8 if not compact else 6

    for sec in data["sections"]:
        sname = sec["name"]

        if sname in ("Core Skills", "Technical Skills", "Skills"):
            story.append(sidebar_section("Skills"))
            for ln in sec["items"]:
                ln = ln.strip()
                if ln.startswith("- "):
                    skill = strip_md(ln[2:]).strip()
                    if len(skill) > 40:
                        skill = skill[:38] + "…"
                    story.append(Paragraph(f"• {skill}", s_side_bull))
            # Also handle table format (Category | Tools)
            for ln in sec["items"]:
                ln = ln.strip()
                if ln.startswith("|") and "---" not in ln:
                    cells = [c.strip() for c in ln.split("|")[1:-1]]
                    if cells:
                        cat  = strip_md(cells[0]) if len(cells) > 0 else ""
                        vals = strip_md(cells[1]) if len(cells) > 1 else ""
                        if cat and cat.lower() != "category":
                            story.append(Paragraph(f"<b>{cat}</b>", s_side_bull))
                            story.append(Paragraph(f"  {vals}", s_side_bull))

        elif sname == "Education":
            story.append(sidebar_section("Education"))
            for ln in sec["items"]:
                ln = ln.strip()
                if not ln or ln.startswith("|"): continue
                story.append(Paragraph(strip_md(ln), s_side_body))

        elif sname == "Certifications":
            story.append(sidebar_section("Certifications"))
            for ln in sec["items"]:
                ln = ln.strip()
                if ln.startswith("- "):
                    story.append(Paragraph(f"• {strip_md(ln[2:])}", s_side_bull))

    return story


def build_main_story(data: dict, compact=False, max_bullets: dict = None) -> list:
    """
    max_bullets: {job_global_index: max_n} — cap bullets per job for auto-trim.
    """
    story = []
    story.append(Spacer(1, 0.08 * inch))

    sp_sec  = 9 if not compact else 6
    sp_bull = 2 if not compact else 1
    sp_lead = 12.5 if not compact else 11.5

    sidebar_sections = {"Core Skills", "Technical Skills", "Skills",
                        "Education", "Certifications"}
    job_idx = 0

    for sec in data["sections"]:
        sname = sec["name"]
        if sname in sidebar_sections:
            continue

        story.append(section_heading(sname))

        # Plain-text section items (summary, non-job content)
        table_rows = []
        for ln in sec["items"]:
            stripped = ln.strip()
            if not stripped:
                continue

            # Markdown table row
            if stripped.startswith("|") and "---" not in stripped:
                table_rows.append(stripped)
                continue

            # Flush accumulated table
            if table_rows:
                _flush_table(story, table_rows)
                table_rows = []

            # Regular paragraph / summary text
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', stripped)
            text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
            story.append(Paragraph(text, s_summary))

        if table_rows:
            _flush_table(story, table_rows)

        # Jobs
        for job in sec["jobs"]:
            cap = (max_bullets or {}).get(job_idx, None)

            left  = Paragraph(f"<b>{job['title']}</b>", s_job_title)
            right = Paragraph(job["dates"], s_dates)
            t = Table([[left, right]], colWidths=[MAIN_W * 0.72, MAIN_W * 0.28])
            t.setStyle(TableStyle([
                ("VALIGN",        (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING",   (0, 0), (-1, -1), 0),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
                ("TOPPADDING",    (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]))
            block = [t]
            if job["company"]:
                block.append(Paragraph(job["company"], s_company))

            bullets = job["bullets"] if cap is None else job["bullets"][:cap]
            bullet_style = ParagraphStyle("sBullD", parent=s_bullet,
                                          spaceAfter=sp_bull, leading=sp_lead)
            for b in bullets:
                text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', b)
                block.append(Paragraph(
                    f"<font color='#1B7A8C'>▸</font>  {text}", bullet_style))

            story.append(KeepTogether(block[:2]))  # title + company together
            for item in block[2:]:
                story.append(item)

            job_idx += 1

        story.append(Spacer(1, 2))

    return story


def _flush_table(story, table_rows):
    rows = []
    for row_ln in table_rows:
        cells = [c.strip() for c in row_ln.split("|")[1:-1]]
        if not cells: continue
        styled = []
        for c_i, cell in enumerate(cells):
            cell = strip_md(cell)
            st = ParagraphStyle("TC", fontName=(
                "Helvetica-Bold" if c_i == 0 else "Helvetica"),
                fontSize=8.5, leading=12,
                textColor=(C_TEAL if c_i == 0 else C_GRAY))
            styled.append(Paragraph(cell, st))
        rows.append(styled)
    if not rows:
        return
    col_w = [MAIN_W * 0.34, MAIN_W * 0.66]
    t = Table(rows, colWidths=col_w)
    t.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [C_LTEAL, C_WHITE]),
        ("BOX",           (0, 0), (-1, -1), 0.5, C_RULE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.25, C_RULE),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t)
    story.append(Spacer(1, 4))
    table_rows.clear()


# ── Frame / doc helpers ───────────────────────────────────────────────────────
def make_frames():
    header_frame = Frame(
        0, H - HEADER_H,
        W, HEADER_H * 0.88,
        leftPadding=MX, rightPadding=MX,
        topPadding=0, bottomPadding=0,
        id="header", showBoundary=0
    )
    sidebar_frame = Frame(
        MX * 0.4, MY,
        SIDEBAR_W - MX * 0.4, CONTENT_H,
        leftPadding=8, rightPadding=6,
        topPadding=0, bottomPadding=0,
        id="sidebar", showBoundary=0
    )
    main_frame = Frame(
        MAIN_X + MX * 0.3, MY,
        MAIN_W, CONTENT_H,
        leftPadding=3, rightPadding=3,
        topPadding=0, bottomPadding=0,
        id="main", showBoundary=0
    )
    return header_frame, sidebar_frame, main_frame


def test_page_count(hdr, sidebar, main):
    buf = BytesIO()
    hf, sf, mf = make_frames()
    doc = BaseDocTemplate(buf, pagesize=letter,
                          pageTemplates=[PageTemplate(
                              id="T", frames=[hf, sf, mf], onPage=draw_page)],
                          leftMargin=0, rightMargin=0,
                          topMargin=0, bottomMargin=0)
    doc.build(hdr + [FrameBreak()] + sidebar + [FrameBreak()] + main)
    return doc.page


# ── Auto-fit: trim until 1 page ───────────────────────────────────────────────
def count_jobs(data):
    total = 0
    for sec in data["sections"]:
        total += len(sec.get("jobs", []))
    return total


def auto_fit_story(data):
    """Return (compact, max_bullets) that makes the resume fit 1 page."""
    hdr = build_header_story(data)

    for compact in (False, True):
        sidebar = build_sidebar_story(data, compact=compact)
        main = build_main_story(data, compact=compact)
        pages = test_page_count(hdr, sidebar, main)
        if pages == 1:
            return compact, None

    # Still overflowing — start trimming bullets from oldest jobs forward
    n_jobs = count_jobs(data)
    max_bullets = {}  # job_idx → max bullets

    # Initialize caps to current bullet counts
    idx = 0
    for sec in data["sections"]:
        for job in sec.get("jobs", []):
            max_bullets[idx] = len(job["bullets"])
            idx += 1

    compact = True
    for _ in range(50):  # safety limit
        # Find the oldest job with remaining bullets to trim
        trimmed = False
        for ji in range(n_jobs - 1, -1, -1):  # oldest first = highest index
            if max_bullets.get(ji, 0) > 0:
                max_bullets[ji] -= 1
                trimmed = True
                break
        if not trimmed:
            break

        sidebar = build_sidebar_story(data, compact=True)
        main = build_main_story(data, compact=True, max_bullets=max_bullets)
        pages = test_page_count(hdr, sidebar, main)
        if pages == 1:
            return True, max_bullets

    return True, max_bullets


# ── PDF builder ───────────────────────────────────────────────────────────────
def build_pdf_resume(md: str, out_path: str):
    data = parse_resume(md)

    compact, max_bullets = auto_fit_story(data)

    hdr     = build_header_story(data)
    sidebar = build_sidebar_story(data, compact=compact)
    main    = build_main_story(data, compact=compact, max_bullets=max_bullets)

    hf, sf, mf = make_frames()
    doc = BaseDocTemplate(
        out_path, pagesize=letter,
        pageTemplates=[PageTemplate(id="T", frames=[hf, sf, mf], onPage=draw_page)],
        leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0
    )
    doc.build(hdr + [FrameBreak()] + sidebar + [FrameBreak()] + main)
    pages = doc.page
    tag = "(1p)" if pages == 1 else f"({pages}p ⚠️)"
    print(f"✓ PDF {tag}: {out_path}")


# ── Word Cover Letter ─────────────────────────────────────────────────────────
def build_word_cover_letter(md: str, out_path: str):
    doc = Document()

    for sec in doc.sections:
        sec.top_margin    = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin   = Inches(1.1)
        sec.right_margin  = Inches(1.1)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    def add_para(text="", bold=False, size=11, color=None,
                 align=WD_ALIGN_PARAGRAPH.LEFT, space_after=6):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after  = Pt(space_after)
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
        pPr  = p._p.get_or_add_pPr()
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

    while i < len(lines) and not lines[i].strip().startswith("# "):
        i += 1
    i += 1  # skip title line

    name_line = lines[i].strip() if i < len(lines) else ""
    add_para(name_line, bold=True, size=18,
             color=RGBColor(0x0D, 0x1B, 0x2A), space_after=2)
    i += 1

    while i < len(lines) and lines[i].strip():
        add_para(lines[i].strip(), size=10,
                 color=RGBColor(0x71, 0x80, 0x96), space_after=0)
        i += 1

    add_rule("1B7A8C", 16)

    while i < len(lines) and not lines[i].strip():
        i += 1

    while i < len(lines) and lines[i].strip() \
          and not lines[i].strip().startswith("Dear"):
        add_para(lines[i].strip(), size=10.5,
                 color=RGBColor(0x0D, 0x1B, 0x2A), space_after=0)
        i += 1

    add_para()

    while i < len(lines):
        ln = lines[i].strip()
        if not ln:
            add_para(space_after=4)
            i += 1; continue

        if ln.startswith("Dear"):
            add_para(ln, bold=True, size=11,
                     color=RGBColor(0x0D, 0x1B, 0x2A), space_after=10)
            i += 1; continue

        if ln.startswith("Sincerely"):
            add_para()
            add_para(ln, size=11, color=RGBColor(0x0D, 0x1B, 0x2A), space_after=0)
            i += 1; continue

        add_para(ln, size=11, color=RGBColor(0x0D, 0x1B, 0x2A), space_after=8)
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

    build_pdf_resume(resume_md,       os.path.join(folder, "resume.pdf"))
    build_word_cover_letter(cover_md, os.path.join(folder, "cover_letter.docx"))
