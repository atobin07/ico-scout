"""
PDF resume + Word cover letter generator — executive & asymmetric themes.
Usage: python3 generate_application.py <folder> [--style executive|asymmetric]
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

W, H = letter   # 612 × 792 pts

# ── Palette ───────────────────────────────────────────────────────────────────
C_NAVY  = colors.HexColor("#0A1628")
C_NAVY2 = colors.HexColor("#0D2040")
C_TEAL  = colors.HexColor("#1A7A8A")
C_TEAL2 = colors.HexColor("#12616E")
C_LTEAL = colors.HexColor("#E0F2F5")
C_GOLD  = colors.HexColor("#C9A84C")
C_GOLD2 = colors.HexColor("#E8C96A")
C_GRAY  = colors.HexColor("#1A202C")
C_LGRAY = colors.HexColor("#718096")
C_RULE  = colors.HexColor("#CBD5E0")
C_WHITE = colors.white


# ── Shared helpers ────────────────────────────────────────────────────────────
def S(name, **kw):
    d = dict(fontName="Helvetica", fontSize=9, leading=13,
             textColor=C_GRAY, spaceAfter=0, spaceBefore=0)
    d.update(kw)
    return ParagraphStyle(name, **d)

def strip_md(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'\1', t)
    return re.sub(r'\*(.*?)\*',   r'\1', t)

def rich(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'\*(.*?)\*',   r'<i>\1</i>', t)


# ── Custom Flowables ──────────────────────────────────────────────────────────
class SectionHeading(Flowable):
    """Left accent bar + all-caps label + thin rule below."""
    def __init__(self, text, avail_w, bar_color, text_color):
        super().__init__()
        self.text       = text.upper()
        self._w         = avail_w
        self.bar_color  = bar_color
        self.text_color = text_color
        self._h         = 17

    def wrap(self, aw, ah):
        return self._w, self._h

    def draw(self):
        c = self.canv
        c.saveState()
        # 3.5pt accent bar
        c.setFillColor(self.bar_color)
        c.rect(0, 3, 3.5, 10, fill=1, stroke=0)
        # Label
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(self.text_color)
        c.drawString(9, 4.5, self.text)
        # Thin rule underneath
        c.setStrokeColor(self.text_color)
        c.setLineWidth(0.6)
        c.line(0, 1, self._w, 1)
        c.restoreState()


class SkillBar(Flowable):
    """Label + thin progress bar — used in sidebar."""
    def __init__(self, label, avail_w, fill=0.82, bar_color=None):
        super().__init__()
        self.label     = label
        self._w        = avail_w
        self.fill      = fill
        self.bar_color = bar_color or C_TEAL
        self._h        = 18

    def wrap(self, aw, ah):
        return self._w, self._h

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFont("Helvetica", 7.5)
        c.setFillColor(colors.HexColor("#B2C5D8"))
        c.drawString(0, 8, self.label)
        bar_w = self._w - 2
        c.setFillColor(colors.HexColor("#1A3050"))
        c.roundRect(0, 2, bar_w, 4, 1.5, fill=1, stroke=0)
        c.setFillColor(self.bar_color)
        c.roundRect(0, 2, bar_w * self.fill, 4, 1.5, fill=1, stroke=0)
        c.restoreState()


# ── Markdown parser ───────────────────────────────────────────────────────────
def parse_resume(md: str) -> dict:
    lines = md.strip().split("\n")
    data  = dict(name="", subtitle="", contact="", sections=[])
    cur_sec = None
    cur_job = None

    for raw in lines:
        ln = raw.strip()
        if ln.startswith("# "):
            data["name"] = ln[2:].strip(); continue
        if ln.startswith("**") and ln.endswith("**") and not cur_sec:
            data["subtitle"] = ln.strip("*"); continue
        if not cur_sec and ("@" in ln or "(" in ln) and "|" in ln:
            data["contact"] = ln; continue
        if ln.startswith("## "):
            cur_sec = {"name": ln[3:].strip(), "items": [], "jobs": []}
            data["sections"].append(cur_sec)
            cur_job = None; continue
        if cur_sec is None: continue
        if ln.startswith("### "):
            parts   = ln[4:].split("|")
            cur_job = {
                "title":   parts[0].strip() if len(parts) > 0 else "",
                "company": parts[1].strip() if len(parts) > 1 else "",
                "dates":   parts[2].strip() if len(parts) > 2 else "",
                "bullets": [],
            }
            cur_sec["jobs"].append(cur_job); continue
        if cur_job and ln.startswith("- "):
            cur_job["bullets"].append(ln[2:].strip()); continue
        cur_sec["items"].append(raw)

    return data


SIDEBAR_SECTIONS = {"Core Skills", "Technical Skills", "Skills",
                    "Education", "Certifications"}


# ══════════════════════════════════════════════════════════════════════════════
#  THEME LAYOUT CONSTANTS
#  All dimensions in points. "AVAIL" = usable content width inside frame.
# ══════════════════════════════════════════════════════════════════════════════

# ── Executive ─────────────────────────────────────────────────────────────────
E_HDR_H   = 1.08 * inch   # header height (canvas-drawn, no frame)
E_SB_W    = 152            # sidebar column width (pts) ≈ 2.11"
E_GOLD_W  = 3              # gold divider bar
E_LSTRIP  = 4              # left gold strip width

# Sidebar frame geometry
E_SF_X    = E_LSTRIP
E_SF_FW   = E_SB_W - E_LSTRIP           # frame width
E_SF_LP   = 10                           # frame left padding
E_SF_RP   = 8                            # frame right padding
E_SF_AVAIL = E_SF_FW - E_SF_LP - E_SF_RP  # usable content width

# Main frame geometry
E_MF_X    = E_SB_W + E_GOLD_W + 6       # left edge
E_MF_FW   = W - E_MF_X - 16             # frame width (16 = right page margin)
E_MF_LP   = 4
E_MF_RP   = 6
E_MF_AVAIL = E_MF_FW - E_MF_LP - E_MF_RP  # usable content width

E_MY       = 20            # bottom margin
E_CONT_H   = H - E_HDR_H - E_MY


# ── Asymmetric ────────────────────────────────────────────────────────────────
A_HDR_H   = 1.08 * inch
A_SB_W    = 155
A_GOLD_W  = 3
A_LSTRIP  = 4

A_SF_X    = A_LSTRIP
A_SF_FW   = A_SB_W - A_LSTRIP
A_SF_LP   = 12
A_SF_RP   = 8
A_SF_AVAIL = A_SF_FW - A_SF_LP - A_SF_RP

A_MF_X    = A_SB_W + A_GOLD_W + 6
A_MF_FW   = W - A_MF_X - 16
A_MF_LP   = 4
A_MF_RP   = 6
A_MF_AVAIL = A_MF_FW - A_MF_LP - A_MF_RP

A_MY       = 20
A_CONT_H   = H - A_HDR_H - A_MY


# ══════════════════════════════════════════════════════════════════════════════
#  CANVAS DRAW FUNCTIONS (header + background drawn per page)
# ══════════════════════════════════════════════════════════════════════════════

def make_draw_signature(data):
    """
    Signature theme header layers (bottom to top):
      1. Navy base
      2. Translucent bezier sweep curve (gold) — movement/depth behind name
      3. Subtle teal glow box behind the name text
      4. Triple diagonal stripes (teal → dark teal → gold) on right half
      5. Dot-grid texture patch (translucent gold) in mid-header
      6. Decorative stroke circles in the stripe zone
      7. Gold bottom rule + darker contact strip
      8. Name, gold underline, subtitle, contact text
    """
    hdr_h  = E_HDR_H
    STRIP_H = 18  # height of contact strip at bottom of header

    def draw(canvas, doc):
        canvas.saveState()

        # ── 1. Navy base ──────────────────────────────────────────────────────
        canvas.setFillColor(C_NAVY)
        canvas.rect(0, H - hdr_h, W, hdr_h, fill=1, stroke=0)

        # Clip all header decoration to the header rectangle
        canvas.saveState()
        clip = canvas.beginPath()
        clip.rect(0, H - hdr_h, W, hdr_h)
        canvas.clipPath(clip, stroke=0)

        # ── 2. Bezier sweep curve (gold, very translucent) ────────────────────
        # A thick sweeping arc from bottom-left to upper-right behind the name.
        # Creates a sense of motion without competing with text.
        canvas.setStrokeColor(colors.Color(0.79, 0.66, 0.30, alpha=0.12))
        canvas.setLineWidth(30)
        sweep = canvas.beginPath()
        sweep.moveTo(-8, H - hdr_h + 10)
        sweep.curveTo(50,  H - hdr_h + 52,
                      140, H - hdr_h + 70,
                      310, H - hdr_h + 74)
        canvas.drawPath(sweep, fill=0, stroke=1)

        # A second, thinner sweep slightly offset for depth
        canvas.setStrokeColor(colors.Color(0.79, 0.66, 0.30, alpha=0.07))
        canvas.setLineWidth(12)
        sweep2 = canvas.beginPath()
        sweep2.moveTo(-8, H - hdr_h + 22)
        sweep2.curveTo(60,  H - hdr_h + 62,
                       160, H - hdr_h + 76,
                       340, H - hdr_h + 78)
        canvas.drawPath(sweep2, fill=0, stroke=1)

        # ── 3. Teal glow block behind name ───────────────────────────────────
        nw = canvas.stringWidth(data["name"], "Helvetica-Bold", 27)
        canvas.setFillColor(colors.Color(0.10, 0.47, 0.54, alpha=0.18))
        canvas.roundRect(10, H - hdr_h + 38, nw + 18, 38, 4, fill=1, stroke=0)

        # ── 4. Triple diagonal stripes on right half ──────────────────────────
        def stripe(x_top, x_bot, col):
            p = canvas.beginPath()
            p.moveTo(x_top, H)
            p.lineTo(W,     H)
            p.lineTo(W,     H - hdr_h)
            p.lineTo(x_bot, H - hdr_h)
            p.close()
            canvas.setFillColor(col)
            canvas.drawPath(p, fill=1, stroke=0)

        stripe(W * 0.46, W * 0.60, C_TEAL2)                        # wide teal
        stripe(W * 0.62, W * 0.73, colors.HexColor("#0A4A58"))      # dark teal shadow
        stripe(W * 0.43, W * 0.46, C_GOLD)                          # thin gold wedge

        # ── 5. Dot-grid texture (gold, very subtle) ───────────────────────────
        # 6 × 3 grid of tiny circles in the transition zone between name and stripes
        canvas.setFillColor(colors.Color(0.79, 0.66, 0.30, alpha=0.22))
        for col in range(6):
            for row in range(3):
                dx = W * 0.36 + col * 11
                dy = H - hdr_h + STRIP_H + 8 + row * 11
                canvas.circle(dx, dy, 1.4, fill=1, stroke=0)

        # ── 6. Decorative stroke circles in the stripe zone ───────────────────
        for cx_, cy_, r_, lw_, a_ in [
            (W - 22,  H - 9,   42, 1.8, 0.22),   # large ring, top-right
            (W - 55,  H - 22,  26, 1.2, 0.16),   # medium ring
            (W * 0.70, H - hdr_h + 30, 18, 1.0, 0.14),  # small ring, lower
        ]:
            canvas.setStrokeColor(colors.Color(1.0, 1.0, 1.0, alpha=a_))
            canvas.setFillColor(colors.Color(1, 1, 1, alpha=0))
            canvas.setLineWidth(lw_)
            canvas.circle(cx_, cy_, r_, fill=0, stroke=1)

        canvas.restoreState()  # end header clip

        # ── 7. Contact strip + gold rule ──────────────────────────────────────
        # Slightly darker band at bottom of header for contact info
        canvas.setFillColor(colors.Color(0, 0, 0, alpha=0.28))
        canvas.rect(0, H - hdr_h, W, STRIP_H, fill=1, stroke=0)
        # Gold rule on top of contact strip
        canvas.setFillColor(C_GOLD)
        canvas.rect(0, H - hdr_h + STRIP_H - 0.5, W * 0.43, 1.5, fill=1, stroke=0)

        # ── 8. Header text ────────────────────────────────────────────────────
        contact_parts = [p.strip() for p in data["contact"].split("|") if p.strip()]
        contact_str   = "   ◆   ".join(contact_parts)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#8AADCC"))
        canvas.drawString(16, H - hdr_h + 5, contact_str)

        # Subtitle
        if data["subtitle"]:
            canvas.setFont("Helvetica", 9)
            canvas.setFillColor(C_GOLD)
            canvas.drawString(16, H - hdr_h + STRIP_H + 8, data["subtitle"])

        # Name
        canvas.setFont("Helvetica-Bold", 27)
        canvas.setFillColor(C_WHITE)
        canvas.drawString(16, H - hdr_h + STRIP_H + 26, data["name"])

        # Short gold underline accent beneath name
        canvas.setFillColor(C_GOLD)
        canvas.rect(16, H - hdr_h + STRIP_H + 23, 55, 2.5, fill=1, stroke=0)

        # ── Sidebar ───────────────────────────────────────────────────────────
        # Gold left accent strip
        canvas.setFillColor(C_GOLD)
        canvas.rect(0, 0, E_LSTRIP, H - hdr_h, fill=1, stroke=0)

        # Gradient sidebar (3 bands)
        for y_bot, y_top, col in [
            (0,                       (H - hdr_h) * 0.40, colors.HexColor("#0A1628")),
            ((H - hdr_h) * 0.40,     (H - hdr_h) * 0.75, colors.HexColor("#0C1C34")),
            ((H - hdr_h) * 0.75,      H - hdr_h,          colors.HexColor("#0F2040")),
        ]:
            canvas.setFillColor(col)
            canvas.rect(E_LSTRIP, y_bot, E_SB_W - E_LSTRIP, y_top - y_bot,
                        fill=1, stroke=0)

        # Gold divider
        canvas.setFillColor(C_GOLD)
        canvas.rect(E_SB_W, 0, E_GOLD_W, H - hdr_h, fill=1, stroke=0)

        canvas.restoreState()
    return draw


def make_draw_executive(data):  return make_draw_signature(data)
def make_draw_asymmetric(data): return make_draw_signature(data)


# ══════════════════════════════════════════════════════════════════════════════
#  SIDEBAR STORY
# ══════════════════════════════════════════════════════════════════════════════

def build_sidebar(data, sf_avail, bar_color, compact=False):
    s_sec  = S("sec", fontName="Helvetica-Bold", fontSize=6.8,
                textColor=C_GOLD, leading=9, spaceAfter=4,
                spaceBefore=11, letterSpacing=0.9)
    s_body = S("bd",  fontName="Helvetica", fontSize=7.6,
                textColor=colors.HexColor("#A8C0D8"), leading=11, spaceAfter=1)
    s_bull = S("bu",  fontName="Helvetica", fontSize=7.6,
                textColor=colors.HexColor("#A8C0D8"), leading=11, spaceAfter=1.5,
                leftIndent=8, firstLineIndent=-6)

    story = [Spacer(1, 8)]

    for sec in data["sections"]:
        sname = sec["name"]
        if sname not in SIDEBAR_SECTIONS:
            continue

        story.append(Paragraph(sname.upper(), s_sec))
        story.append(HRFlowable(width=sf_avail, thickness=0.5,
                                color=C_GOLD, spaceAfter=3, spaceBefore=0))

        if sname in ("Core Skills", "Technical Skills", "Skills"):
            for ln in sec["items"]:
                ls = ln.strip()
                if ls.startswith("- "):
                    sk = strip_md(ls[2:]).strip()
                    if len(sk) > 38: sk = sk[:36] + "…"
                    story.append(SkillBar(sk, sf_avail, bar_color=bar_color))
                elif ls.startswith("|") and "---" not in ls:
                    cells = [c.strip() for c in ls.split("|")[1:-1]]
                    if not cells: continue
                    cat  = strip_md(cells[0])
                    vals = strip_md(cells[1]) if len(cells) > 1 else ""
                    if cat.lower() in ("category", ""): continue
                    story.append(Paragraph(f"<b>{cat}</b>", s_body))
                    for v in vals.split(","):
                        v = v.strip()
                        if v:
                            story.append(SkillBar(v, sf_avail, fill=0.78,
                                                  bar_color=bar_color))

        elif sname == "Education":
            for ln in sec["items"]:
                ls = ln.strip()
                if not ls or ls.startswith("|"): continue
                story.append(Paragraph(strip_md(ls), s_body))

        elif sname == "Certifications":
            for ln in sec["items"]:
                ls = ln.strip()
                if ls.startswith("- "):
                    story.append(Paragraph(f"• {strip_md(ls[2:])}", s_bull))

    return story


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN STORY
# ══════════════════════════════════════════════════════════════════════════════

def build_main(data, mf_avail, bar_color, text_color,
               bullet_char, compact=False, max_bullets=None):

    s_sec  = SectionHeading   # used as a class, instantiated per call
    s_job  = S("jt", fontName="Helvetica-Bold", fontSize=9.8,
                textColor=C_NAVY, leading=12)
    s_co   = S("co", fontName="Helvetica-Oblique", fontSize=8.3,
                textColor=C_TEAL, leading=11, spaceAfter=1)
    s_date = S("dt", fontName="Helvetica", fontSize=7.8,
                textColor=bar_color, leading=11, alignment=TA_RIGHT)
    s_bull = S("bu", fontName="Helvetica", fontSize=8.7,
                textColor=C_GRAY, leading=12.5 if not compact else 11.5,
                leftIndent=11, firstLineIndent=-8,
                spaceAfter=2 if not compact else 1)
    s_sum  = S("su", fontName="Helvetica", fontSize=9,
                textColor=C_GRAY, leading=13.5, spaceAfter=3)

    story   = [Spacer(1, 6)]
    job_idx = 0

    for sec in data["sections"]:
        if sec["name"] in SIDEBAR_SECTIONS:
            continue

        story.append(SectionHeading(sec["name"], mf_avail, bar_color, text_color))

        # Plain-text items (summary paragraph, table rows)
        table_rows = []
        for ln in sec["items"]:
            ls = ln.strip()
            if not ls: continue
            if ls.startswith("|") and "---" not in ls:
                table_rows.append(ls); continue
            if table_rows:
                story.append(_build_skills_table(table_rows, mf_avail))
                table_rows = []
            story.append(Paragraph(rich(ls), s_sum))
        if table_rows:
            story.append(_build_skills_table(table_rows, mf_avail))

        # Job entries
        for job in sec["jobs"]:
            cap = (max_bullets or {}).get(job_idx)

            title_p = Paragraph(f"<b>{job['title']}</b>", s_job)
            date_p  = Paragraph(job["dates"], s_date)
            hdr_tbl = Table([[title_p, date_p]],
                            colWidths=[mf_avail * 0.68, mf_avail * 0.32])
            hdr_tbl.setStyle(TableStyle([
                ("VALIGN",       (0,0),(-1,-1),"BOTTOM"),
                ("LEFTPADDING",  (0,0),(-1,-1),0),
                ("RIGHTPADDING", (0,0),(-1,-1),0),
                ("TOPPADDING",   (0,0),(-1,-1),0),
                ("BOTTOMPADDING",(0,0),(-1,-1),1),
            ]))

            block = [hdr_tbl]
            if job["company"]:
                block.append(Paragraph(job["company"], s_co))

            bullets = job["bullets"] if cap is None else job["bullets"][:cap]
            for b in bullets:
                block.append(Paragraph(
                    f"<font color='{_hex(bar_color)}'>{bullet_char}</font>  {rich(b)}",
                    s_bull))

            story.append(KeepTogether(block[:2]))
            for item in block[2:]:
                story.append(item)
            story.append(Spacer(1, 4 if not compact else 2))
            job_idx += 1

    return story


def _hex(c):
    r, g, b = int(c.red * 255), int(c.green * 255), int(c.blue * 255)
    return f"#{r:02X}{g:02X}{b:02X}"


def _build_skills_table(rows_raw, avail_w):
    rows = []
    for ln in rows_raw:
        cells = [c.strip() for c in ln.split("|")[1:-1]]
        if not cells: continue
        styled = []
        for i, cell in enumerate(cells):
            cell = strip_md(cell)
            st = ParagraphStyle("TC",
                fontName="Helvetica-Bold" if i == 0 else "Helvetica",
                fontSize=8.3, leading=12,
                textColor=C_TEAL if i == 0 else C_GRAY)
            styled.append(Paragraph(cell, st))
        rows.append(styled)
    if not rows:
        return Spacer(1, 0)
    t = Table(rows, colWidths=[avail_w * 0.34, avail_w * 0.66])
    t.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0),(-1,-1), [colors.HexColor("#E8F4F7"), C_WHITE]),
        ("BOX",           (0,0),(-1,-1), 0.5, C_RULE),
        ("INNERGRID",     (0,0),(-1,-1), 0.25, C_RULE),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("LEFTPADDING",   (0,0),(-1,-1), 5),
        ("RIGHTPADDING",  (0,0),(-1,-1), 5),
        ("TOPPADDING",    (0,0),(-1,-1), 3),
        ("BOTTOMPADDING", (0,0),(-1,-1), 3),
    ]))
    return t


# ══════════════════════════════════════════════════════════════════════════════
#  FRAME FACTORIES
# ══════════════════════════════════════════════════════════════════════════════

def exec_frames():
    sf = Frame(E_SF_X, E_MY, E_SF_FW, E_CONT_H,
               leftPadding=E_SF_LP, rightPadding=E_SF_RP,
               topPadding=4, bottomPadding=0,
               id="side", showBoundary=0)
    mf = Frame(E_MF_X, E_MY, E_MF_FW, E_CONT_H,
               leftPadding=E_MF_LP, rightPadding=E_MF_RP,
               topPadding=4, bottomPadding=0,
               id="main", showBoundary=0)
    return sf, mf


def asy_frames():
    sf = Frame(A_SF_X, A_MY, A_SF_FW, A_CONT_H,
               leftPadding=A_SF_LP, rightPadding=A_SF_RP,
               topPadding=4, bottomPadding=0,
               id="side", showBoundary=0)
    mf = Frame(A_MF_X, A_MY, A_MF_FW, A_CONT_H,
               leftPadding=A_MF_LP, rightPadding=A_MF_RP,
               topPadding=4, bottomPadding=0,
               id="main", showBoundary=0)
    return sf, mf


# ══════════════════════════════════════════════════════════════════════════════
#  THEME CONFIGS
# ══════════════════════════════════════════════════════════════════════════════

_SIGNATURE = dict(
    sf_avail    = E_SF_AVAIL,
    mf_avail    = E_MF_AVAIL,
    bar_color   = C_GOLD,       # gold accent bars + skill bars
    text_color  = C_TEAL,       # teal section label text
    bullet_char = "◆",          # gold diamond bullets
    make_draw   = make_draw_signature,
    frames      = exec_frames,
)

THEMES = {
    "executive":  _SIGNATURE,
    "asymmetric": _SIGNATURE,
    "signature":  _SIGNATURE,
}


# ══════════════════════════════════════════════════════════════════════════════
#  AUTO-FIT
# ══════════════════════════════════════════════════════════════════════════════

def _test_pages(sidebar, main, draw_fn, frames_fn):
    sf, mf = frames_fn()
    buf = BytesIO()
    doc = BaseDocTemplate(buf, pagesize=letter,
                          pageTemplates=[PageTemplate(
                              id="T", frames=[sf, mf], onPage=draw_fn)],
                          leftMargin=0, rightMargin=0,
                          topMargin=0, bottomMargin=0)
    doc.build(sidebar + [FrameBreak()] + main)
    return doc.page


def auto_fit(data, theme_cfg):
    draw_fn  = theme_cfg["make_draw"](data)
    frames_fn = theme_cfg["frames"]

    def make_stories(compact, max_b):
        sb = build_sidebar(data, theme_cfg["sf_avail"],
                           theme_cfg["bar_color"], compact=compact)
        mn = build_main(data, theme_cfg["mf_avail"],
                        theme_cfg["bar_color"], theme_cfg["text_color"],
                        theme_cfg["bullet_char"], compact=compact,
                        max_bullets=max_b)
        return sb, mn

    for compact in (False, True):
        sb, mn = make_stories(compact, None)
        if _test_pages(sb, mn, draw_fn, frames_fn) == 1:
            return compact, None, draw_fn

    # Trim bullets from oldest jobs first
    n_jobs = sum(len(s.get("jobs", [])) for s in data["sections"])
    max_b  = {}
    idx    = 0
    for sec in data["sections"]:
        for job in sec.get("jobs", []):
            max_b[idx] = len(job["bullets"])
            idx += 1

    for _ in range(80):
        for ji in range(n_jobs - 1, -1, -1):
            if max_b.get(ji, 0) > 0:
                max_b[ji] -= 1; break
        sb, mn = make_stories(True, max_b)
        if _test_pages(sb, mn, draw_fn, frames_fn) == 1:
            return True, max_b, draw_fn

    return True, max_b, draw_fn


# ══════════════════════════════════════════════════════════════════════════════
#  PDF BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def build_pdf_resume(md: str, out_path: str, style: str = "executive"):
    if style not in THEMES:
        print(f"Unknown style '{style}'. Choose: {', '.join(THEMES)}")
        sys.exit(1)

    cfg  = THEMES[style]
    data = parse_resume(md)

    compact, max_b, draw_fn = auto_fit(data, cfg)

    sb = build_sidebar(data, cfg["sf_avail"], cfg["bar_color"], compact=compact)
    mn = build_main(data, cfg["mf_avail"], cfg["bar_color"], cfg["text_color"],
                    cfg["bullet_char"], compact=compact, max_bullets=max_b)

    sf, mf = cfg["frames"]()
    doc = BaseDocTemplate(
        out_path, pagesize=letter,
        pageTemplates=[PageTemplate(id="T", frames=[sf, mf], onPage=draw_fn)],
        leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0,
    )
    doc.build(sb + [FrameBreak()] + mn)
    pages = doc.page
    tag   = "(1p)" if pages == 1 else f"({pages}p ⚠️)"
    print(f"✓ PDF {tag} [{style}]: {out_path}")


# ══════════════════════════════════════════════════════════════════════════════
#  WORD COVER LETTER
# ══════════════════════════════════════════════════════════════════════════════

def build_word_cover_letter(md: str, out_path: str):
    doc = Document()
    for sec in doc.sections:
        sec.top_margin    = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin   = Inches(1.1)
        sec.right_margin  = Inches(1.1)

    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(11)

    def add_para(text="", bold=False, size=11, color=None,
                 align=WD_ALIGN_PARAGRAPH.LEFT, space_after=6):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after  = Pt(space_after)
        p.paragraph_format.space_before = Pt(0)
        if not text: return p
        for part in re.split(r'(\*\*.*?\*\*)', text):
            is_b = part.startswith("**") and part.endswith("**")
            run  = p.add_run(part[2:-2] if is_b else part)
            run.bold = bold or is_b
            run.font.size = Pt(size)
            run.font.name = "Calibri"
            if color: run.font.color.rgb = color
        return p

    def add_rule():
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(8)
        pPr  = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bot  = OxmlElement("w:bottom")
        bot.set(qn("w:val"),   "single")
        bot.set(qn("w:sz"),    "16")
        bot.set(qn("w:space"), "1")
        bot.set(qn("w:color"), "1B7A8C")
        pBdr.append(bot)
        pPr.append(pBdr)

    lines = md.strip().split("\n")
    i = 0
    while i < len(lines) and not lines[i].strip().startswith("# "): i += 1
    i += 1  # skip title

    name_line = lines[i].strip() if i < len(lines) else ""
    add_para(name_line, bold=True, size=18,
             color=RGBColor(0x0D, 0x1B, 0x2A), space_after=2)
    i += 1

    while i < len(lines) and lines[i].strip():
        add_para(lines[i].strip(), size=10,
                 color=RGBColor(0x71, 0x80, 0x96), space_after=0)
        i += 1
    add_rule()

    while i < len(lines) and not lines[i].strip(): i += 1
    while (i < len(lines) and lines[i].strip()
           and not lines[i].strip().startswith("Dear")):
        add_para(lines[i].strip(), size=10.5,
                 color=RGBColor(0x0D, 0x1B, 0x2A), space_after=0)
        i += 1
    add_para()

    while i < len(lines):
        ln = lines[i].strip()
        if not ln:
            add_para(space_after=4); i += 1; continue
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


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print("Usage: python3 generate_application.py <folder> [--style executive|asymmetric]")
        sys.exit(1)

    folder = args[0]
    style  = "executive"
    if "--style" in args:
        idx = args.index("--style")
        if idx + 1 < len(args):
            style = args[idx + 1]

    with open(os.path.join(folder, "resume.md"))       as f: resume_md = f.read()
    with open(os.path.join(folder, "cover_letter.md")) as f: cover_md  = f.read()

    build_pdf_resume(resume_md,       os.path.join(folder, "resume.pdf"), style=style)
    build_word_cover_letter(cover_md, os.path.join(folder, "cover_letter.docx"))
