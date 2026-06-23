"""
PDF resume + Word cover letter generator — Signature theme.
Usage: python3 generate_application.py <folder> [--style signature]
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
C_NAVY   = colors.HexColor("#09152A")
C_NAVY2  = colors.HexColor("#0C1E3A")
C_TEAL   = colors.HexColor("#1A7A8A")
C_TEAL2  = colors.HexColor("#0E5A6A")
C_TEAL3  = colors.HexColor("#0B4A58")
C_LTEAL  = colors.HexColor("#E0F2F5")
C_GOLD   = colors.HexColor("#C9A84C")
C_GOLD2  = colors.HexColor("#E2C060")
C_GRAY   = colors.HexColor("#1A202C")
C_LGRAY  = colors.HexColor("#4A5568")
C_RULE   = colors.HexColor("#CBD5E0")
C_WHITE  = colors.white

# ── Layout constants ──────────────────────────────────────────────────────────
HDR_H     = 1.42 * inch   # taller header = more room for design
CTX_H     = 20             # contact strip height (pts) inside header
SPLIT_X   = W * 0.58       # navy / teal vertical split in header
GOLD_SEP  = 2.5            # gold rule between header sections

SB_W      = 152            # sidebar total width
GOLD_DIV  = 3              # gold divider bar between sidebar and main
LSTRIP    = 4              # left gold accent strip

SF_X      = LSTRIP
SF_FW     = SB_W - LSTRIP
SF_LP     = 10
SF_RP     = 8
SF_AVAIL  = SF_FW - SF_LP - SF_RP

MF_X      = SB_W + GOLD_DIV + 6
MF_FW     = W - MF_X - 14
MF_LP     = 4
MF_RP     = 6
MF_AVAIL  = MF_FW - MF_LP - MF_RP

MY        = 18
CONT_H    = H - HDR_H - MY

SIDEBAR_SECTIONS = {"Core Skills", "Technical Skills", "Skills",
                    "Education", "Certifications"}


# ══════════════════════════════════════════════════════════════════════════════
#  CUSTOM FLOWABLES
# ══════════════════════════════════════════════════════════════════════════════

class SectionHeading(Flowable):
    """Gold left-bar + teal label + hairline rule."""
    def __init__(self, text, w, bar=None, txt=None):
        super().__init__()
        self.text = text.upper()
        self._w   = w
        self.bar  = bar or C_GOLD
        self.txt  = txt or C_TEAL
        self._h   = 18

    def wrap(self, aw, ah): return self._w, self._h

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(self.bar)
        c.rect(0, 4, 4, 11, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(self.txt)
        c.drawString(10, 5.5, self.text)
        c.setStrokeColor(colors.Color(
            self.txt.red, self.txt.green, self.txt.blue, alpha=0.35))
        c.setLineWidth(0.5)
        c.line(0, 1.5, self._w, 1.5)
        c.restoreState()


class SidebarSecHeader(Flowable):
    """Sidebar section label with subtle gold-tinted background bar."""
    def __init__(self, text, w):
        super().__init__()
        self.text = text.upper()
        self._w   = w
        self._h   = 17

    def wrap(self, aw, ah): return self._w, self._h

    def draw(self):
        c = self.canv
        c.saveState()
        # Subtle background bar (gold-tinted)
        c.setFillColor(colors.Color(0.79, 0.66, 0.30, alpha=0.13))
        c.rect(-SF_LP, 1, self._w + SF_LP, 13, fill=1, stroke=0)
        # Gold left accent dot
        c.setFillColor(C_GOLD)
        c.rect(0, 4, 3, 7, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(C_GOLD)
        c.drawString(7, 5, self.text)
        c.restoreState()


class SkillBar(Flowable):
    """Skill label (wrapping) + filled progress track."""
    _FONT = "Helvetica"
    _SIZE = 7.5
    _BAR  = 4      # bar height
    _LH   = 10     # line height per text row
    _INDENT = 5    # left indent for text and bar

    def __init__(self, label, w, fill=0.82, color=None):
        super().__init__()
        self.label = label
        self._w    = w
        self.fill  = fill
        self.color = color or C_TEAL
        # Word-wrap at init time using char-width estimate
        # Helvetica 7.5pt ≈ 3.9pt average per character
        usable = w - self._INDENT
        cpl    = max(8, int(usable / 3.9))
        self._lines = self._wordwrap(label, cpl)
        self._h     = len(self._lines) * self._LH + self._BAR + 4

    @staticmethod
    def _wordwrap(text, cpl):
        words, lines, cur = text.split(), [], ""
        for word in words:
            test = (cur + " " + word).strip()
            if len(test) <= cpl:
                cur = test
            else:
                if cur: lines.append(cur)
                cur = word
        if cur: lines.append(cur)
        return lines or [text[:cpl]]

    def wrap(self, aw, ah): return self._w, self._h

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFont(self._FONT, self._SIZE)
        c.setFillColor(colors.HexColor("#A8C0D8"))
        for i, line in enumerate(self._lines):
            y = self._h - (i + 1) * self._LH + self._BAR + 1
            c.drawString(self._INDENT, y, line)
        bar_w = self._w - self._INDENT
        c.setFillColor(colors.HexColor("#112840"))
        c.roundRect(self._INDENT, 0, bar_w, self._BAR, 1.5, fill=1, stroke=0)
        c.setFillColor(self.color)
        c.roundRect(self._INDENT, 0, bar_w * self.fill, self._BAR, 1.5, fill=1, stroke=0)
        c.restoreState()


class JobCard(Flowable):
    """Thin teal left border that runs the height of a job block."""
    def __init__(self, height):
        super().__init__()
        self._h = height
        self._w = 0

    def wrap(self, aw, ah): return 0, 0

    def draw(self):
        c = self.canv
        c.setFillColor(C_TEAL)
        c.rect(-MF_LP, 0, 2.5, -self._h, fill=1, stroke=0)


# ── Helpers ───────────────────────────────────────────────────────────────────
def S(name, **kw):
    d = dict(fontName="Helvetica", fontSize=9, leading=13,
             textColor=C_GRAY, spaceAfter=0, spaceBefore=0)
    d.update(kw)
    return ParagraphStyle(name, **d)

def strip_md(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'\1', t)
    return re.sub(r'\*(.*?)\*', r'\1', t)

def rich(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'\*(.*?)\*', r'<i>\1</i>', t)

def _hex(c):
    return f"#{int(c.red*255):02X}{int(c.green*255):02X}{int(c.blue*255):02X}"


# ══════════════════════════════════════════════════════════════════════════════
#  MARKDOWN PARSER
# ══════════════════════════════════════════════════════════════════════════════

def parse_resume(md: str) -> dict:
    lines = md.strip().split("\n")
    data  = dict(name="", subtitle="", contact="", sections=[])
    cur_sec = cur_job = None

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
            data["sections"].append(cur_sec); cur_job = None; continue
        if cur_sec is None: continue
        if ln.startswith("### "):
            parts   = ln[4:].split("|")
            cur_job = {"title":   parts[0].strip() if parts else "",
                       "company": parts[1].strip() if len(parts) > 1 else "",
                       "dates":   parts[2].strip() if len(parts) > 2 else "",
                       "bullets": []}
            cur_sec["jobs"].append(cur_job); continue
        if cur_job and ln.startswith("- "):
            cur_job["bullets"].append(ln[2:].strip()); continue
        cur_sec["items"].append(raw)

    return data


# ══════════════════════════════════════════════════════════════════════════════
#  PAGE DRAW  (header + sidebar drawn fresh every page via onPage)
# ══════════════════════════════════════════════════════════════════════════════

def make_draw(data):
    initials = "".join(w[0].upper() for w in data["name"].split() if w)

    def draw(canvas, doc):
        canvas.saveState()

        # ── Header base ───────────────────────────────────────────────────────
        canvas.setFillColor(C_NAVY)
        canvas.rect(0, H - HDR_H, W, HDR_H, fill=1, stroke=0)

        # Teal block — right 42% of header (above contact strip)
        canvas.setFillColor(C_TEAL2)
        canvas.rect(SPLIT_X, H - HDR_H + CTX_H, W - SPLIT_X, HDR_H - CTX_H,
                    fill=1, stroke=0)

        # Darker teal inner shadow on right edge of teal block
        canvas.setFillColor(C_TEAL3)
        canvas.rect(W - 28, H - HDR_H + CTX_H, 28, HDR_H - CTX_H, fill=1, stroke=0)

        # ── Clip decorative elements to header ────────────────────────────────
        canvas.saveState()
        clip = canvas.beginPath()
        clip.rect(0, H - HDR_H, W, HDR_H)
        canvas.clipPath(clip, stroke=0)

        # Large translucent initials watermark inside teal block
        canvas.setFont("Helvetica-Bold", 78)
        canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.06))
        iw = canvas.stringWidth(initials, "Helvetica-Bold", 78)
        canvas.drawString(W - iw - 14, H - HDR_H + CTX_H + 4, initials)

        # Concentric rings centered in teal block
        ring_cx = SPLIT_X + (W - SPLIT_X) * 0.42
        ring_cy = H - HDR_H + CTX_H + (HDR_H - CTX_H) * 0.50
        for r, lw, a in [(52, 1.5, 0.18), (38, 1.0, 0.13), (24, 0.8, 0.09)]:
            canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=a))
            canvas.setLineWidth(lw)
            canvas.circle(ring_cx, ring_cy, r, fill=0, stroke=1)

        # Dot grid — 5×4 dots in teal block left zone
        canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.12))
        for col in range(5):
            for row in range(4):
                dx = SPLIT_X + 16 + col * 10
                dy = H - HDR_H + CTX_H + 10 + row * 10
                canvas.circle(dx, dy, 1.3, fill=1, stroke=0)

        # Bezier sweep on navy side (subtle gold arc behind name)
        canvas.setStrokeColor(colors.Color(0.79, 0.66, 0.30, alpha=0.10))
        canvas.setLineWidth(28)
        p = canvas.beginPath()
        p.moveTo(-6, H - HDR_H + CTX_H + 6)
        p.curveTo(55, H - HDR_H + CTX_H + 55,
                  170, H - HDR_H + CTX_H + 72,
                  SPLIT_X - 10, H - HDR_H + CTX_H + 76)
        canvas.drawPath(p, fill=0, stroke=1)

        canvas.restoreState()  # end clip

        # ── Gold vertical separator between navy and teal ─────────────────────
        canvas.setFillColor(C_GOLD)
        canvas.rect(SPLIT_X - GOLD_SEP / 2, H - HDR_H + CTX_H,
                    GOLD_SEP, HDR_H - CTX_H, fill=1, stroke=0)

        # ── Contact strip (full width, darker overlay) ────────────────────────
        canvas.setFillColor(colors.Color(0, 0, 0, alpha=0.32))
        canvas.rect(0, H - HDR_H, W, CTX_H, fill=1, stroke=0)
        # Gold micro-rule on top of contact strip
        canvas.setFillColor(C_GOLD)
        canvas.rect(0, H - HDR_H + CTX_H - 1, W, 1.5, fill=1, stroke=0)

        # ── Header text ───────────────────────────────────────────────────────
        # Contact
        parts = [p.strip() for p in data["contact"].split("|") if p.strip()]
        contact_str = "    ◆    ".join(parts)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#8AADCC"))
        canvas.drawString(16, H - HDR_H + 5.5, contact_str)

        # Name — large, white, positioned in navy zone
        name_y = H - HDR_H + CTX_H + 36
        canvas.setFont("Helvetica-Bold", 34)
        canvas.setFillColor(C_WHITE)
        canvas.drawString(16, name_y, data["name"])

        # Short gold underline beneath name
        canvas.setFillColor(C_GOLD)
        canvas.rect(16, name_y - 4, 64, 2.5, fill=1, stroke=0)

        # Subtitle
        if data["subtitle"]:
            canvas.setFont("Helvetica", 9.5)
            canvas.setFillColor(C_GOLD2)
            canvas.drawString(18, H - HDR_H + CTX_H + 16, data["subtitle"])

        # ── Sidebar ───────────────────────────────────────────────────────────
        # Gold left strip
        canvas.setFillColor(C_GOLD)
        canvas.rect(0, 0, LSTRIP, H - HDR_H, fill=1, stroke=0)

        # Gradient bands (top = lighter, bottom = darkest)
        for y_bot, y_top, col in [
            (0,                   (H-HDR_H)*0.38, C_NAVY),
            ((H-HDR_H)*0.38,      (H-HDR_H)*0.72, C_NAVY2),
            ((H-HDR_H)*0.72,       H - HDR_H,     colors.HexColor("#0F2040")),
        ]:
            canvas.setFillColor(col)
            canvas.rect(LSTRIP, y_bot, SB_W - LSTRIP, y_top - y_bot, fill=1, stroke=0)

        # Gold divider sidebar → main
        canvas.setFillColor(C_GOLD)
        canvas.rect(SB_W, 0, GOLD_DIV, H - HDR_H, fill=1, stroke=0)

        canvas.restoreState()

    return draw


# ══════════════════════════════════════════════════════════════════════════════
#  SIDEBAR STORY
# ══════════════════════════════════════════════════════════════════════════════

def build_sidebar(data, compact=False):
    s_body = S("sb", fontName="Helvetica", fontSize=7.6,
                textColor=colors.HexColor("#A0BBCF"), leading=11, spaceAfter=1,
                leftIndent=6)
    s_bull = S("sbu", fontName="Helvetica", fontSize=7.6,
                textColor=colors.HexColor("#A0BBCF"), leading=11, spaceAfter=2,
                leftIndent=14, firstLineIndent=-8)

    story = [Spacer(1, 10)]

    for sec in data["sections"]:
        sn = sec["name"]
        if sn not in SIDEBAR_SECTIONS: continue

        story.append(SidebarSecHeader(sn, SF_AVAIL))

        if sn in ("Core Skills", "Technical Skills", "Skills"):
            for ln in sec["items"]:
                ls = ln.strip()
                if ls.startswith("- "):
                    sk = strip_md(ls[2:]).strip()
                    story.append(SkillBar(sk, SF_AVAIL, color=C_GOLD))
                elif ls.startswith("|") and "---" not in ls:
                    cells = [c.strip() for c in ls.split("|")[1:-1]]
                    if not cells: continue
                    cat  = strip_md(cells[0])
                    vals = strip_md(cells[1]) if len(cells) > 1 else ""
                    if cat.lower() in ("category", ""): continue
                    story.append(Paragraph(f"<b>{cat}</b>", s_body))
                    for v in vals.split(","):
                        v = v.strip()
                        if v: story.append(SkillBar(v, SF_AVAIL, fill=0.76, color=C_GOLD))

        elif sn == "Education":
            for ln in sec["items"]:
                ls = ln.strip()
                if not ls or ls.startswith("|"): continue
                story.append(Paragraph(strip_md(ls), s_body))

        elif sn == "Certifications":
            for ln in sec["items"]:
                ls = ln.strip()
                if ls.startswith("- "):
                    story.append(Paragraph(f"◆  {strip_md(ls[2:])}", s_bull))

        story.append(Spacer(1, 4))

    return story


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN STORY
# ══════════════════════════════════════════════════════════════════════════════

def build_main(data, compact=False, max_bullets=None):
    s_job  = S("jt",  fontName="Helvetica-Bold", fontSize=10,
                textColor=C_NAVY,  leading=13)
    s_co   = S("co",  fontName="Helvetica-Oblique", fontSize=8.3,
                textColor=C_TEAL,  leading=11, spaceAfter=1)
    s_date = S("dt",  fontName="Helvetica-Bold", fontSize=8,
                textColor=C_GOLD,  leading=11, alignment=TA_RIGHT)
    s_bull = S("bu",  fontName="Helvetica", fontSize=8.8,
                textColor=C_GRAY,  leading=12.5 if not compact else 11.5,
                leftIndent=10, firstLineIndent=-8,
                spaceAfter=2.5 if not compact else 1)
    s_sum  = S("su",  fontName="Helvetica", fontSize=9,
                textColor=C_LGRAY, leading=13.5, spaceAfter=3)

    story   = [Spacer(1, 6)]
    job_idx = 0

    for sec in data["sections"]:
        if sec["name"] in SIDEBAR_SECTIONS: continue

        story.append(SectionHeading(sec["name"], MF_AVAIL))

        # Text items / tables
        table_rows = []
        for ln in sec["items"]:
            ls = ln.strip()
            if not ls: continue
            if ls.startswith("|") and "---" not in ls:
                table_rows.append(ls); continue
            if table_rows:
                story.append(_skills_table(table_rows)); table_rows = []
            story.append(Paragraph(rich(ls), s_sum))
        if table_rows:
            story.append(_skills_table(table_rows))

        # Jobs
        for job in sec["jobs"]:
            cap    = (max_bullets or {}).get(job_idx)
            title  = Paragraph(f"<b>{job['title']}</b>", s_job)
            date   = Paragraph(job["dates"], s_date)
            hdr_t  = Table([[title, date]],
                           colWidths=[MF_AVAIL * 0.68, MF_AVAIL * 0.32])
            hdr_t.setStyle(TableStyle([
                ("VALIGN",       (0,0),(-1,-1),"BOTTOM"),
                ("LEFTPADDING",  (0,0),(-1,-1),0),
                ("RIGHTPADDING", (0,0),(-1,-1),0),
                ("TOPPADDING",   (0,0),(-1,-1),0),
                ("BOTTOMPADDING",(0,0),(-1,-1),1),
            ]))

            bullets = job["bullets"] if cap is None else job["bullets"][:cap]
            bullet_items = []
            for b in bullets:
                bullet_items.append(Paragraph(
                    f"<font color='{_hex(C_GOLD)}'>◆</font>  {rich(b)}", s_bull))

            # Wrap job block in a left-bordered card
            block_inner = [hdr_t]
            if job["company"]:
                block_inner.append(Paragraph(job["company"], s_co))
            block_inner.extend(bullet_items)

            # Table with teal left border = timeline effect
            card = Table([[block_inner]], colWidths=[MF_AVAIL])
            card.setStyle(TableStyle([
                ("VALIGN",       (0,0),(-1,-1),"TOP"),
                ("LEFTPADDING",  (0,0),(-1,-1),8),
                ("RIGHTPADDING", (0,0),(-1,-1),0),
                ("TOPPADDING",   (0,0),(-1,-1),3),
                ("BOTTOMPADDING",(0,0),(-1,-1),3),
                ("LINEBEFORE",   (0,0),(0,-1), 2.5, C_TEAL),
            ]))
            story.append(card)
            story.append(Spacer(1, 5 if not compact else 2))
            job_idx += 1

    return story


def _skills_table(rows_raw):
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
    if not rows: return Spacer(1, 0)
    t = Table(rows, colWidths=[MF_AVAIL * 0.34, MF_AVAIL * 0.66])
    t.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0),(-1,-1), [C_LTEAL, C_WHITE]),
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
#  FRAME FACTORY
# ══════════════════════════════════════════════════════════════════════════════

def make_frames():
    sf = Frame(SF_X, MY, SF_FW, CONT_H,
               leftPadding=SF_LP, rightPadding=SF_RP,
               topPadding=4, bottomPadding=0,
               id="side", showBoundary=0)
    mf = Frame(MF_X, MY, MF_FW, CONT_H,
               leftPadding=MF_LP, rightPadding=MF_RP,
               topPadding=4, bottomPadding=0,
               id="main", showBoundary=0)
    return sf, mf


# ══════════════════════════════════════════════════════════════════════════════
#  AUTO-FIT  (compact spacing → bullet trimming)
# ══════════════════════════════════════════════════════════════════════════════

def _test_pages(sidebar, main, draw_fn):
    sf, mf = make_frames()
    buf = BytesIO()
    doc = BaseDocTemplate(buf, pagesize=letter,
                          pageTemplates=[PageTemplate(
                              id="T", frames=[sf, mf], onPage=draw_fn)],
                          leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0)
    doc.build(sidebar + [FrameBreak()] + main)
    return doc.page


def auto_fit(data, draw_fn):
    for compact in (False, True):
        sb = build_sidebar(data, compact=compact)
        mn = build_main(data, compact=compact)
        if _test_pages(sb, mn, draw_fn) == 1:
            return compact, None

    n_jobs = sum(len(s.get("jobs", [])) for s in data["sections"])
    max_b  = {i: len(job["bullets"])
              for i, job in enumerate(
                  j for s in data["sections"] for j in s.get("jobs", []))}

    for _ in range(80):
        for ji in range(n_jobs - 1, -1, -1):
            if max_b.get(ji, 0) > 0:
                max_b[ji] -= 1; break
        sb = build_sidebar(data, compact=True)
        mn = build_main(data, compact=True, max_bullets=max_b)
        if _test_pages(sb, mn, draw_fn) == 1:
            return True, max_b

    return True, max_b


# ══════════════════════════════════════════════════════════════════════════════
#  PDF BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def build_pdf_resume(md: str, out_path: str, style: str = "signature"):
    data    = parse_resume(md)
    draw_fn = make_draw(data)

    compact, max_b = auto_fit(data, draw_fn)
    sb = build_sidebar(data, compact=compact)
    mn = build_main(data, compact=compact, max_bullets=max_b)

    sf, mf = make_frames()
    doc = BaseDocTemplate(
        out_path, pagesize=letter,
        pageTemplates=[PageTemplate(id="T", frames=[sf, mf], onPage=draw_fn)],
        leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0,
    )
    doc.build(sb + [FrameBreak()] + mn)
    pages = doc.page
    print(f"✓ PDF ({'1p' if pages==1 else f'{pages}p ⚠️'}) [{style}]: {out_path}")


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
        p   = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(8)
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bot  = OxmlElement("w:bottom")
        bot.set(qn("w:val"),   "single")
        bot.set(qn("w:sz"),    "16")
        bot.set(qn("w:space"), "1")
        bot.set(qn("w:color"), "1B7A8C")
        pBdr.append(bot); pPr.append(pBdr)

    lines = md.strip().split("\n")
    i = 0
    while i < len(lines) and not lines[i].strip().startswith("# "): i += 1
    i += 1

    name_line = lines[i].strip() if i < len(lines) else ""
    add_para(name_line, bold=True, size=18,
             color=RGBColor(0x09, 0x15, 0x2A), space_after=2)
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
                 color=RGBColor(0x09, 0x15, 0x2A), space_after=0)
        i += 1
    add_para()

    while i < len(lines):
        ln = lines[i].strip()
        if not ln:
            add_para(space_after=4); i += 1; continue
        if ln.startswith("Dear"):
            add_para(ln, bold=True, size=11,
                     color=RGBColor(0x09, 0x15, 0x2A), space_after=10)
            i += 1; continue
        if ln.startswith("Sincerely"):
            add_para()
            add_para(ln, size=11, color=RGBColor(0x09, 0x15, 0x2A), space_after=0)
            i += 1; continue
        add_para(ln, size=11, color=RGBColor(0x09, 0x15, 0x2A), space_after=8)
        i += 1

    doc.save(out_path)
    print(f"✓ DOCX: {out_path}")


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print("Usage: python3 generate_application.py <folder> [--style signature]")
        sys.exit(1)

    folder = args[0]
    style  = "signature"
    if "--style" in args:
        idx = args.index("--style")
        if idx + 1 < len(args): style = args[idx + 1]

    with open(os.path.join(folder, "resume.md"))       as f: resume_md = f.read()
    with open(os.path.join(folder, "cover_letter.md")) as f: cover_md  = f.read()

    build_pdf_resume(resume_md,       os.path.join(folder, "resume.pdf"), style=style)
    build_word_cover_letter(cover_md, os.path.join(folder, "cover_letter.docx"))
