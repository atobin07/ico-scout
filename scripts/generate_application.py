"""
Generate a polished PDF resume and Word cover letter from markdown application files.
Usage: python3 generate_application.py <application_folder>
"""

import sys
import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

# ── Brand colors ──────────────────────────────────────────────────────────────
TEAL   = colors.HexColor("#1B7A8C")
DARK   = colors.HexColor("#1A1A2E")
GRAY   = colors.HexColor("#555555")
LGRAY  = colors.HexColor("#AAAAAA")
WHITE  = colors.white

TEAL_DOCX  = RGBColor(0x1B, 0x7A, 0x8C)
DARK_DOCX  = RGBColor(0x1A, 0x1A, 0x2E)
GRAY_DOCX  = RGBColor(0x55, 0x55, 0x55)


# ── PDF Resume ────────────────────────────────────────────────────────────────

def build_pdf_resume(resume_md: str, out_path: str):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=letter,
        leftMargin=0.6*inch,
        rightMargin=0.6*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
    )

    # Styles
    styles = getSampleStyleSheet()

    name_style = ParagraphStyle("Name",
        fontSize=26, textColor=DARK, leading=30,
        fontName="Helvetica-Bold", alignment=TA_LEFT)

    title_style = ParagraphStyle("Title",
        fontSize=11, textColor=TEAL, leading=14,
        fontName="Helvetica", alignment=TA_LEFT)

    contact_style = ParagraphStyle("Contact",
        fontSize=9, textColor=GRAY, leading=13,
        fontName="Helvetica", alignment=TA_LEFT)

    section_style = ParagraphStyle("Section",
        fontSize=10, textColor=WHITE, leading=14,
        fontName="Helvetica-Bold", alignment=TA_LEFT,
        spaceAfter=4)

    job_title_style = ParagraphStyle("JobTitle",
        fontSize=10, textColor=DARK, leading=13,
        fontName="Helvetica-Bold")

    job_meta_style = ParagraphStyle("JobMeta",
        fontSize=9, textColor=TEAL, leading=12,
        fontName="Helvetica-Oblique")

    body_style = ParagraphStyle("Body",
        fontSize=9, textColor=DARK, leading=13,
        fontName="Helvetica", leftIndent=10)

    bullet_style = ParagraphStyle("Bullet",
        fontSize=9, textColor=DARK, leading=12.5,
        fontName="Helvetica", leftIndent=16, firstLineIndent=-8,
        spaceAfter=1)

    summary_style = ParagraphStyle("Summary",
        fontSize=9.5, textColor=DARK, leading=14,
        fontName="Helvetica")

    story = []

    lines = resume_md.strip().split("\n")
    i = 0

    def section_header(text):
        data = [[Paragraph(text.upper(), section_style)]]
        t = Table(data, colWidths=[7.3*inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), TEAL),
            ("LEFTPADDING", (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
            ("TOPPADDING", (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ]))
        return t

    def skip_blanks():
        nonlocal i
        while i < len(lines) and lines[i].strip() == "":
            i += 1

    # ── Header block ──────────────────────────────────────────────────────────
    # Name (first # heading)
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("# "):
            name = line[2:].strip()
            story.append(Paragraph(name, name_style))
            i += 1
            break
        i += 1

    # Subtitle (**...**)
    skip_blanks()
    if i < len(lines) and lines[i].strip().startswith("**") and lines[i].strip().endswith("**"):
        subtitle = lines[i].strip().strip("*")
        story.append(Paragraph(subtitle, title_style))
        i += 1

    # Contact line
    skip_blanks()
    if i < len(lines) and ("@" in lines[i] or "(" in lines[i]):
        contact = lines[i].strip()
        story.append(Spacer(1, 2))
        story.append(Paragraph(contact, contact_style))
        i += 1

    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=TEAL))
    story.append(Spacer(1, 6))

    # ── Body sections ─────────────────────────────────────────────────────────
    current_section = None

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # ## Section heading
        if stripped.startswith("## "):
            heading = stripped[3:].strip()
            story.append(Spacer(1, 6))
            story.append(section_header(heading))
            story.append(Spacer(1, 4))
            current_section = heading
            i += 1
            continue

        # ### Job / sub-heading
        if stripped.startswith("### "):
            parts = stripped[4:].strip().split("|")
            job_t = parts[0].strip() if len(parts) > 0 else ""
            company = parts[1].strip() if len(parts) > 1 else ""
            dates = parts[2].strip() if len(parts) > 2 else ""

            # Two-column: job title left, dates right
            left = Paragraph(f"<b>{job_t}</b>", job_title_style)
            right = Paragraph(dates, ParagraphStyle("Dates",
                fontSize=9, textColor=GRAY, fontName="Helvetica",
                alignment=TA_RIGHT))
            row = Table([[left, right]], colWidths=[5.2*inch, 2.1*inch])
            row.setStyle(TableStyle([
                ("VALIGN", (0,0), (-1,-1), "BOTTOM"),
                ("LEFTPADDING", (0,0), (-1,-1), 0),
                ("RIGHTPADDING", (0,0), (-1,-1), 0),
                ("TOPPADDING", (0,0), (-1,-1), 0),
                ("BOTTOMPADDING", (0,0), (-1,-1), 0),
            ]))
            story.append(row)
            if company:
                story.append(Paragraph(company, job_meta_style))
            story.append(Spacer(1, 2))
            i += 1
            continue

        # Markdown table (skills table)
        if stripped.startswith("|") and "---" not in stripped:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row_line = lines[i].strip()
                if "---" not in row_line:
                    cells = [c.strip() for c in row_line.split("|")[1:-1]]
                    table_lines.append(cells)
                i += 1
            if table_lines:
                col_w = [2.5*inch, 4.8*inch]
                tdata = []
                for r_idx, row in enumerate(table_lines):
                    styled_row = []
                    for c_idx, cell in enumerate(row):
                        cell_clean = re.sub(r'\*\*(.*?)\*\*', r'\1', cell)
                        s = ParagraphStyle("TC",
                            fontSize=9, leading=12,
                            fontName="Helvetica-Bold" if (r_idx == 0 or c_idx == 0) else "Helvetica",
                            textColor=TEAL if c_idx == 0 else DARK)
                        styled_row.append(Paragraph(cell_clean, s))
                    tdata.append(styled_row)
                t = Table(tdata, colWidths=col_w)
                t.setStyle(TableStyle([
                    ("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.HexColor("#F0F8FA"), WHITE]),
                    ("BOX", (0,0), (-1,-1), 0.5, LGRAY),
                    ("INNERGRID", (0,0), (-1,-1), 0.25, LGRAY),
                    ("VALIGN", (0,0), (-1,-1), "TOP"),
                    ("LEFTPADDING", (0,0), (-1,-1), 5),
                    ("RIGHTPADDING", (0,0), (-1,-1), 5),
                    ("TOPPADDING", (0,0), (-1,-1), 3),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
                ]))
                story.append(t)
                story.append(Spacer(1, 4))
            continue

        # Bullet points
        if stripped.startswith("- "):
            text = stripped[2:].strip()
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
            story.append(Paragraph(f"• {text}", bullet_style))
            i += 1
            continue

        # Italic metadata line (*...*)
        if stripped.startswith("*") and stripped.endswith("*") and not stripped.startswith("**"):
            text = stripped.strip("*")
            story.append(Paragraph(f"<i>{text}</i>",
                ParagraphStyle("Meta", fontSize=8.5, textColor=LGRAY,
                               fontName="Helvetica-Oblique", leftIndent=10)))
            i += 1
            continue

        # Bold label line (**...**)
        if stripped.startswith("**") and stripped.endswith("**"):
            text = stripped.strip("*")
            story.append(Paragraph(f"<b>{text}</b>",
                ParagraphStyle("Bold", fontSize=9.5, textColor=DARK,
                               fontName="Helvetica-Bold")))
            i += 1
            continue

        # Regular paragraph text
        if stripped:
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', stripped)
            text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
            story.append(Paragraph(text, summary_style))
            story.append(Spacer(1, 3))

        i += 1

    doc.build(story)
    print(f"✓ PDF saved: {out_path}")


# ── Word Cover Letter ─────────────────────────────────────────────────────────

def build_word_cover_letter(cover_md: str, out_path: str):
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.1)
        section.right_margin = Inches(1.1)

    lines = cover_md.strip().split("\n")
    i = 0

    # Skip H1 title line
    while i < len(lines):
        if lines[i].strip().startswith("# "):
            i += 1
            break
        i += 1

    # Name header
    if i < len(lines):
        name_line = lines[i].strip()
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(name_line)
        run.bold = True
        run.font.size = Pt(14)
        run.font.color.rgb = DARK_DOCX
        i += 1

    # Contact / date / address lines (next few non-blank lines before body)
    while i < len(lines) and lines[i].strip():
        p = doc.add_paragraph()
        run = p.add_run(lines[i].strip())
        run.font.size = Pt(10)
        run.font.color.rgb = GRAY_DOCX
        p.paragraph_format.space_after = Pt(0)
        i += 1

    doc.add_paragraph()  # spacer

    # Teal divider via a colored paragraph border hack — use a rule paragraph
    p = doc.add_paragraph()
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '1B7A8C')
    pBdr.append(bottom)
    pPr.append(pBdr)

    doc.add_paragraph()  # spacer

    # Skip blank lines
    while i < len(lines) and not lines[i].strip():
        i += 1

    # Hiring manager block
    while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith("Dear"):
        p = doc.add_paragraph()
        run = p.add_run(lines[i].strip())
        run.font.size = Pt(10)
        run.font.color.rgb = DARK_DOCX
        p.paragraph_format.space_after = Pt(0)
        i += 1

    doc.add_paragraph()

    # Body paragraphs
    while i < len(lines):
        line = lines[i].strip()

        if not line:
            doc.add_paragraph()
            i += 1
            continue

        # Salutation
        if line.startswith("Dear"):
            p = doc.add_paragraph()
            run = p.add_run(line)
            run.bold = True
            run.font.size = Pt(10.5)
            run.font.color.rgb = DARK_DOCX
            i += 1
            doc.add_paragraph()
            continue

        # Closing (Sincerely)
        if line.startswith("Sincerely"):
            doc.add_paragraph()
            p = doc.add_paragraph()
            run = p.add_run(line)
            run.font.size = Pt(10.5)
            run.font.color.rgb = DARK_DOCX
            i += 1
            continue

        # Body text — handle **bold** inline
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(8)
        # Parse inline bold
        parts = re.split(r'(\*\*.*?\*\*)', line)
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                run = p.add_run(part[2:-2])
                run.bold = True
            else:
                run = p.add_run(part)
            run.font.size = Pt(10.5)
            run.font.color.rgb = DARK_DOCX
        i += 1

    doc.save(out_path)
    print(f"✓ DOCX saved: {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 generate_application.py <application_folder>")
        sys.exit(1)

    folder = sys.argv[1]
    resume_path = os.path.join(folder, "resume.md")
    cover_path = os.path.join(folder, "cover_letter.md")
    pdf_out = os.path.join(folder, "resume.pdf")
    docx_out = os.path.join(folder, "cover_letter.docx")

    with open(resume_path) as f:
        resume_md = f.read()
    with open(cover_path) as f:
        cover_md = f.read()

    build_pdf_resume(resume_md, pdf_out)
    build_word_cover_letter(cover_md, docx_out)
