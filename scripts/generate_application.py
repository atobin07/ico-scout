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
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ── Font registration ─────────────────────────────────────────────────────────
_FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fonts")

def _reg(name, filename):
    path = os.path.join(_FONT_DIR, filename)
    if os.path.exists(path):
        pdfmetrics.registerFont(TTFont(name, path))
        return True
    return False

_inter = (
    _reg("Inter",            "Inter-Regular.ttf") and
    _reg("Inter-Bold",       "Inter-Bold.ttf")    and
    _reg("Inter-SemiBold",   "Inter-SemiBold.ttf") and
    _reg("Inter-Italic",     "Inter-Italic.ttf")
)

if _inter:
    pdfmetrics.registerFontFamily(
        "Inter",
        normal="Inter",
        bold="Inter-Bold",
        italic="Inter-Italic",
        boldItalic="Inter-Bold",
    )
    F_REG    = "Inter"
    F_BOLD   = "Inter-Bold"
    F_SEMI   = "Inter-SemiBold"
    F_ITALIC = "Inter-Italic"
else:
    F_REG    = "Helvetica"
    F_BOLD   = "Helvetica-Bold"
    F_SEMI   = "Helvetica-Bold"
    F_ITALIC = "Helvetica-Oblique"

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
    """Modern minimal: small gold diamond + tracked label + extending hairline."""
    def __init__(self, text, w, bar=None, txt=None):
        super().__init__()
        self.text = text.upper()
        self._w   = w
        self.bar  = bar or C_GOLD
        self.txt  = txt or C_TEAL
        self._h   = 22

    def wrap(self, aw, ah): return self._w, self._h

    def draw(self):
        c = self.canv
        c.saveState()

        # Small gold diamond prefix
        c.setFillColor(self.bar)
        c.translate(4, 11)
        c.rotate(45)
        c.rect(-3, -3, 6, 6, fill=1, stroke=0)
        c.rotate(-45)
        c.translate(-4, -11)

        # Section label
        c.setFont(F_BOLD, 8)
        c.setFillColor(self.txt)
        c.drawString(14, 7.5, self.text)

        # Thin rule extending right from after the label text
        tw = c.stringWidth(self.text, F_BOLD, 8)
        rule_x = 16 + tw
        c.setStrokeColor(colors.Color(
            self.txt.red, self.txt.green, self.txt.blue, alpha=0.30))
        c.setLineWidth(0.5)
        c.line(rule_x + 6, 10.5, self._w, 10.5)

        # Very faint full-width bottom rule
        c.setStrokeColor(colors.Color(
            self.txt.red, self.txt.green, self.txt.blue, alpha=0.10))
        c.setLineWidth(0.3)
        c.line(0, 2, self._w, 2)

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
        # Full-width background bar (gold-tinted, slightly taller)
        c.setFillColor(colors.Color(0.79, 0.66, 0.30, alpha=0.16))
        c.rect(-SF_LP, 0, self._w + SF_LP + SF_RP, 15, fill=1, stroke=0)
        # Gold left accent bar (taller, more prominent)
        c.setFillColor(C_GOLD)
        c.rect(0, 2, 4, 11, fill=1, stroke=0)
        # Diamond accent
        c.setFillColor(C_GOLD2)
        c.translate(7, 7.5)
        c.rotate(45)
        c.rect(-2, -2, 4, 4, fill=1, stroke=0)
        c.rotate(-45)
        c.translate(-7, -7.5)
        # Label
        c.setFont(F_BOLD, 7)
        c.setFillColor(C_GOLD)
        c.drawString(14, 4.5, self.text)
        c.restoreState()


class SkillBar(Flowable):
    """Skill label (wrapping) + filled progress track. Layout bottom-up:
       [2pt pad] [4pt bar] [5pt gap] [text lines @ 11pt each] [2pt pad]
    """
    _FONT  = F_REG
    _SIZE  = 7.5
    _BOT   = 2    # padding below bar
    _BARH  = 4    # bar height
    _GAP   = 5    # gap between bar and text
    _LH    = 11   # line height per text row
    _TPAD  = 2    # padding above last text line
    _IND   = 6    # left indent

    def __init__(self, label, w, fill=0.82, color=None):
        super().__init__()
        self.label = label
        self._w    = w
        self.fill  = fill
        self.color = color or C_TEAL
        usable     = w - self._IND
        cpl        = max(8, int(usable / 3.9))
        self._lines = self._wrap(label, cpl)
        n           = len(self._lines)
        self._h     = self._BOT + self._BARH + self._GAP + n * self._LH + self._TPAD

    @staticmethod
    def _wrap(text, cpl):
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
        c  = self.canv
        bw = self._w - self._IND
        c.saveState()

        # Track (dark background)
        c.setFillColor(colors.HexColor("#0A1F35"))
        c.roundRect(self._IND, self._BOT, bw, self._BARH, 2, fill=1, stroke=0)
        # Fill (gold)
        fill_w = bw * self.fill
        c.setFillColor(self.color)
        c.roundRect(self._IND, self._BOT, fill_w, self._BARH, 2, fill=1, stroke=0)
        # Shimmer highlight on top edge of fill
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.22))
        c.roundRect(self._IND, self._BOT + self._BARH - 1.5,
                    fill_w * 0.75, 1.5, 1, fill=1, stroke=0)

        # Text lines above bar (draw bottom-up)
        c.setFont(self._FONT, self._SIZE)
        c.setFillColor(colors.HexColor("#B8CFDF"))
        text_base = self._BOT + self._BARH + self._GAP
        for i, line in enumerate(reversed(self._lines)):
            c.drawString(self._IND, text_base + i * self._LH, line)

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
    d = dict(fontName=F_REG, fontSize=9, leading=13,
             textColor=C_GRAY, spaceAfter=0, spaceBefore=0)
    d.update(kw)
    return ParagraphStyle(name, **d)

def strip_md(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'\1', t)
    return re.sub(r'\*(.*?)\*', r'\1', t)

def rich(t):
    t = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'\*(.*?)\*', r'<i>\1</i>', t)

def _skill_fill(label: str) -> float:
    """Return a 0–1 fill level based on skill keyword priority tiers."""
    t = label.lower()
    # Tier 1 — core technical (expert-level tools, primary resume keywords)
    T1 = ["sql", "python", "excel", "airtable", "power bi", "tableau",
          "azure", "ms sql", "sql server", "data integrat", "data analyt",
          "project manag", "api", "airtable", "ecommerce"]
    # Tier 2 — strong secondary skills
    T2 = ["cloud", "aws", "google cloud", "devops", "containeriz", "json",
          "xml", "visualization", "statistical", "index/match", "xlookup",
          "array formula", "kpi", "otif", "supply chain", "sop", "bi"]
    # Tier 3 — soft / general skills
    T3 = ["attention", "integrity", "time manag", "data entry", "communication",
          "collaborat", "cross-functional", "detail"]
    for kw in T1:
        if kw in t:
            # vary within 0.88–0.97 using a stable hash offset
            return round(0.88 + (hash(label) % 9) * 0.01, 2)
    for kw in T2:
        if kw in t:
            return round(0.72 + (hash(label) % 11) * 0.01, 2)
    for kw in T3:
        if kw in t:
            return round(0.52 + (hash(label) % 13) * 0.01, 2)
    # Fallback: mid-range with label-based variance
    return round(0.65 + (hash(label) % 15) * 0.01, 2)


def _hex(c):
    return f"#{int(c.red*255):02X}{int(c.green*255):02X}{int(c.blue*255):02X}"


# ══════════════════════════════════════════════════════════════════════════════
#  MARKDOWN PARSER
# ══════════════════════════════════════════════════════════════════════════════

def parse_resume(md: str) -> dict:
    lines = md.strip().split("\n")
    data  = dict(name="", subtitle="", tags=[], contact="", sections=[])
    cur_sec = cur_job = None

    for raw in lines:
        ln = raw.strip()
        if ln.startswith("# "):
            data["name"] = ln[2:].strip(); continue
        if ln.startswith("**") and ln.endswith("**") and not cur_sec:
            val = ln.strip("*")
            if val.lower().startswith("tags:"):
                data["tags"] = [t.strip() for t in val[5:].split("·") if t.strip()]
            else:
                data["subtitle"] = val
            continue
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

        # ── Header base (full navy) ───────────────────────────────────────────
        canvas.setFillColor(C_NAVY)
        canvas.rect(0, H - HDR_H, W, HDR_H, fill=1, stroke=0)

        # ── Clip entire header region for all decorative work ─────────────────
        canvas.saveState()
        clip = canvas.beginPath()
        clip.rect(0, H - HDR_H, W, HDR_H)
        canvas.clipPath(clip, stroke=0)

        # Diagonal teal block — left edge angled at ~20° for dynamic look
        diag_top = SPLIT_X + 30          # where the diagonal meets the top edge
        diag_bot = SPLIT_X - 22          # where the diagonal meets the contact strip
        tp = canvas.beginPath()
        tp.moveTo(diag_bot, H - HDR_H + CTX_H)
        tp.lineTo(diag_top, H)
        tp.lineTo(W, H)
        tp.lineTo(W, H - HDR_H + CTX_H)
        tp.close()
        canvas.setFillColor(C_TEAL2)
        canvas.drawPath(tp, fill=1, stroke=0)

        # Darker teal edge shadow on right
        canvas.setFillColor(C_TEAL3)
        canvas.rect(W - 26, H - HDR_H + CTX_H, 26, HDR_H - CTX_H, fill=1, stroke=0)

        # ── Decorative layer ─────────────────────────────────────────────────

        # Translucent initials watermark — big, anchored right
        canvas.setFont(F_BOLD, 90)
        canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.055))
        iw = canvas.stringWidth(initials, F_BOLD, 90)
        canvas.drawString(W - iw - 10, H - HDR_H + CTX_H + 2, initials)

        # Concentric rings (centered in right teal zone)
        ring_cx = diag_bot + (W - diag_bot) * 0.38
        ring_cy = H - HDR_H + CTX_H + (HDR_H - CTX_H) * 0.52
        for r, lw, a in [(56, 1.8, 0.18), (40, 1.1, 0.12), (26, 0.7, 0.08)]:
            canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=a))
            canvas.setLineWidth(lw)
            canvas.circle(ring_cx, ring_cy, r, fill=0, stroke=1)

        # 4×4 dot grid in teal transition zone
        canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.14))
        gx0 = diag_bot + 14
        gy0 = H - HDR_H + CTX_H + 8
        for col in range(4):
            for row in range(4):
                canvas.circle(gx0 + col * 11, gy0 + row * 11, 1.4, fill=1, stroke=0)

        # Tech-stack pill badges floating in teal zone
        if data.get("tags"):
            pill_font_size = 6.8
            pill_pad_x = 5
            pill_pad_y = 2.5
            pill_h = pill_font_size + pill_pad_y * 2
            pill_y = H - HDR_H + CTX_H + 5
            pill_x = diag_bot + 18
            canvas.setFont(F_BOLD, pill_font_size)
            for tag in data["tags"][:8]:
                tw = canvas.stringWidth(tag, F_BOLD, pill_font_size)
                pw = tw + pill_pad_x * 2
                if pill_x + pw > W - 10:
                    break
                # Pill background
                canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.14))
                canvas.roundRect(pill_x, pill_y, pw, pill_h, pill_h / 2, fill=1, stroke=0)
                # Pill border
                canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=0.28))
                canvas.setLineWidth(0.5)
                canvas.roundRect(pill_x, pill_y, pw, pill_h, pill_h / 2, fill=0, stroke=1)
                # Pill text
                canvas.setFillColor(C_WHITE)
                canvas.drawString(pill_x + pill_pad_x, pill_y + pill_pad_y + 0.5, tag)
                pill_x += pw + 5

        # Sweeping gold Bezier arc behind name (navy side)
        canvas.setStrokeColor(colors.Color(0.79, 0.66, 0.30, alpha=0.12))
        canvas.setLineWidth(32)
        p = canvas.beginPath()
        p.moveTo(-8, H - HDR_H + CTX_H + 4)
        p.curveTo(60,  H - HDR_H + CTX_H + 58,
                  190, H - HDR_H + CTX_H + 78,
                  diag_bot + 8, H - HDR_H + CTX_H + 82)
        canvas.drawPath(p, fill=0, stroke=1)

        # Thin horizontal accent lines on navy side (subtle grid feel)
        canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=0.04))
        canvas.setLineWidth(0.5)
        for offset in range(8, 56, 14):
            y = H - HDR_H + CTX_H + offset
            canvas.line(0, y, diag_bot - 4, y)

        # Gold diagonal accent line (echoes the teal split)
        canvas.setStrokeColor(colors.Color(0.79, 0.66, 0.30, alpha=0.55))
        canvas.setLineWidth(1.8)
        canvas.line(diag_bot - 6, H - HDR_H + CTX_H,
                    diag_top - 6, H)

        canvas.restoreState()  # end clip

        # ── Contact strip (dark overlay, full width) ──────────────────────────
        canvas.setFillColor(colors.Color(0, 0, 0, alpha=0.30))
        canvas.rect(0, H - HDR_H, W, CTX_H, fill=1, stroke=0)
        # Gold micro-rule above contact strip
        canvas.setFillColor(C_GOLD)
        canvas.rect(0, H - HDR_H + CTX_H - 0.5, W, 1.5, fill=1, stroke=0)
        # Second thinner rule 4pt above
        canvas.setFillColor(colors.Color(0.79, 0.66, 0.30, alpha=0.30))
        canvas.rect(0, H - HDR_H + CTX_H + 3, W, 0.5, fill=1, stroke=0)

        # ── Header text ───────────────────────────────────────────────────────
        # Contact line
        parts = [p.strip() for p in data["contact"].split("|") if p.strip()]
        contact_str = "   ◆   ".join(parts)
        canvas.setFont(F_REG, 7.5)
        canvas.setFillColor(colors.HexColor("#8AADCC"))
        canvas.drawString(16, H - HDR_H + 6, contact_str)

        # Name
        name_y = H - HDR_H + CTX_H + 34
        canvas.setFont(F_BOLD, 36)
        canvas.setFillColor(C_WHITE)
        canvas.drawString(16, name_y, data["name"])

        # Gold underline — wider, two-stroke (thick + thin)
        canvas.setFillColor(C_GOLD)
        canvas.rect(16, name_y - 5, 80, 3, fill=1, stroke=0)
        canvas.setFillColor(colors.Color(0.79, 0.66, 0.30, alpha=0.40))
        canvas.rect(16, name_y - 9, 44, 1.2, fill=1, stroke=0)

        # Subtitle / tagline
        if data["subtitle"]:
            canvas.setFont(F_REG, 9.5)
            canvas.setFillColor(C_GOLD2)
            canvas.drawString(18, H - HDR_H + CTX_H + 14, data["subtitle"])

        # ── Sidebar background ────────────────────────────────────────────────
        # Gold left strip
        canvas.setFillColor(C_GOLD)
        canvas.rect(0, 0, LSTRIP, H - HDR_H, fill=1, stroke=0)

        # Three navy gradient bands (bottom=dark, top=medium)
        body_h = H - HDR_H
        for y_bot, y_top, col in [
            (0,          body_h * 0.35, colors.HexColor("#070F1F")),
            (body_h*0.35, body_h * 0.70, C_NAVY),
            (body_h*0.70, body_h,        C_NAVY2),
        ]:
            canvas.setFillColor(col)
            canvas.rect(LSTRIP, y_bot, SB_W - LSTRIP, y_top - y_bot, fill=1, stroke=0)

        # Subtle horizontal texture lines in sidebar
        canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=0.025))
        canvas.setLineWidth(0.4)
        for ty in range(20, int(body_h), 18):
            canvas.line(LSTRIP + 4, ty, SB_W - 4, ty)

        # Gold divider
        canvas.setFillColor(C_GOLD)
        canvas.rect(SB_W, 0, GOLD_DIV, H - HDR_H, fill=1, stroke=0)
        # Softer echo line
        canvas.setFillColor(colors.Color(0.79, 0.66, 0.30, alpha=0.18))
        canvas.rect(SB_W + GOLD_DIV, 0, 3, H - HDR_H, fill=1, stroke=0)

        canvas.restoreState()

    return draw


# ══════════════════════════════════════════════════════════════════════════════
#  SIDEBAR STORY
# ══════════════════════════════════════════════════════════════════════════════

def build_sidebar(data, compact=False):
    s_body = S("sb", fontName=F_REG, fontSize=7.6,
                textColor=colors.HexColor("#A0BBCF"), leading=11, spaceAfter=1,
                leftIndent=6)
    s_bull = S("sbu", fontName=F_REG, fontSize=7.6,
                textColor=colors.HexColor("#A0BBCF"), leading=11, spaceAfter=2,
                leftIndent=14, firstLineIndent=-8)

    story = [Spacer(1, 10)]

    for sec in data["sections"]:
        sn = sec["name"]
        if sn not in SIDEBAR_SECTIONS: continue

        story.append(SidebarSecHeader(sn, SF_AVAIL))

        if sn in ("Core Skills", "Technical Skills", "Skills"):
            skill_count = 0
            max_skills = 6 if compact else 12
            for ln in sec["items"]:
                if skill_count >= max_skills: break
                ls = ln.strip()
                if ls.startswith("- "):
                    sk = strip_md(ls[2:]).strip()
                    story.append(SkillBar(sk, SF_AVAIL, fill=_skill_fill(sk), color=C_GOLD))
                    story.append(Spacer(1, 5))
                    skill_count += 1
                elif ls.startswith("|") and "---" not in ls:
                    cells = [c.strip() for c in ls.split("|")[1:-1]]
                    if not cells: continue
                    cat  = strip_md(cells[0])
                    vals = strip_md(cells[1]) if len(cells) > 1 else ""
                    if cat.lower() in ("category", ""): continue
                    story.append(Paragraph(f"<b>{cat}</b>", s_body))
                    story.append(Spacer(1, 2))
                    for v in vals.split(","):
                        v = v.strip()
                        if v:
                            story.append(SkillBar(v, SF_AVAIL, fill=_skill_fill(v), color=C_GOLD))
                            story.append(Spacer(1, 5))

        elif sn == "Education":
            s_edu_bold = S("edu_b", fontName=F_BOLD, fontSize=7.6,
                            textColor=colors.HexColor("#C8DCEC"), leading=11,
                            spaceAfter=1, leftIndent=6)
            s_edu_body = S("edu_n", fontName=F_REG, fontSize=7.4,
                            textColor=colors.HexColor("#8AADCC"), leading=11,
                            spaceAfter=1, leftIndent=6)
            for ln in sec["items"]:
                ls = ln.strip()
                if not ls:
                    story.append(Spacer(1, 5)); continue
                if ls.startswith("|"): continue
                # Render bold markers; first line of each entry is bold
                text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', ls)
                text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
                st = s_edu_bold if "<b>" in text else s_edu_body
                story.append(Paragraph(text, st))

        elif sn == "Certifications":
            for ln in sec["items"]:
                ls = ln.strip()
                if ls.startswith("- "):
                    story.append(Paragraph(f"◆  {strip_md(ls[2:])}", s_bull))
                    story.append(Spacer(1, 2))

        story.append(Spacer(1, 10))

    return story


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN STORY
# ══════════════════════════════════════════════════════════════════════════════

def build_main(data, compact=False, max_bullets=None, stretch=1.0):
    # stretch > 1.0 inflates spacers/leading to fill the page
    def sp(n): return Spacer(1, n * stretch)

    s_job  = S("jt",  fontName=F_BOLD, fontSize=10.5,
                textColor=colors.HexColor("#09152A"),  leading=14 * stretch)
    s_co   = S("co",  fontName=F_ITALIC, fontSize=8.5,
                textColor=C_TEAL,  leading=12 * stretch, spaceAfter=2 * stretch)
    s_date = S("dt",  fontName=F_BOLD, fontSize=8,
                textColor=C_GOLD,  leading=11 * stretch, alignment=TA_RIGHT)
    s_bull = S("bu",  fontName=F_REG, fontSize=9 if not compact else 8.5,
                textColor=C_GRAY,  leading=(14 if not compact else 12) * stretch,
                leftIndent=10, firstLineIndent=-8,
                spaceAfter=(4 if not compact else 2) * stretch)
    s_sum  = S("su",  fontName=F_REG, fontSize=10 if not compact else 8.5,
                textColor=colors.HexColor("#C8D8E8"),
                leading=(15.5 if not compact else 12) * stretch,
                spaceAfter=(6 if not compact else 2) * stretch,
                leftIndent=8, rightIndent=8)

    story   = [sp(10)]
    job_idx = 0
    first_sec = True

    for sec in data["sections"]:
        if sec["name"] in SIDEBAR_SECTIONS: continue

        if not first_sec:
            story.append(sp(14 if not compact else 6))
        first_sec = False
        story.append(SectionHeading(sec["name"], MF_AVAIL))
        story.append(sp(6 if not compact else 3))

        # Text items / tables
        table_rows = []
        for ln in sec["items"]:
            ls = ln.strip()
            if not ls: continue
            if ls == "---": continue  # skip markdown horizontal rules
            if ls.startswith("|") and "---" not in ls:
                table_rows.append(ls); continue
            if table_rows:
                story.append(_skills_table(table_rows)); table_rows = []
            # In compact mode cap summary to 2 sentences
            if compact:
                sentences = [s.strip().rstrip('.') for s in ls.replace(". ", ".|").split("|") if s.strip()]
                ls = ". ".join(sentences[:2]) + "."
            story.append(Paragraph(rich(ls), s_sum))
        if table_rows:
            story.append(_skills_table(table_rows))

        # Jobs — in compact mode cap to 4 most recent
        job_list = sec["jobs"][:4] if compact else sec["jobs"]
        for job in job_list:
            cap      = (max_bullets or {}).get(job_idx)
            CARD_LP  = 9
            INNER_W  = MF_AVAIL - CARD_LP   # actual usable width inside the card

            title    = Paragraph(f"<b>{job['title']}</b>", s_job)
            is_current = any(w in job["dates"].lower() for w in ("current", "present", "now"))
            # Concise date — gold for current, standard for past
            date_color = _hex(C_GOLD) if is_current else _hex(C_LGRAY)
            date_label = job["dates"].replace("– Current", "– Present")
            date     = Paragraph(f'<font color="{date_color}">{date_label}</font>', s_date)

            hdr_t = Table([[title, date]],
                          colWidths=[INNER_W * 0.62, INNER_W * 0.38])
            hdr_t.setStyle(TableStyle([
                ("VALIGN",        (0,0),(-1,-1),"BOTTOM"),
                ("LEFTPADDING",   (0,0),(-1,-1),0),
                ("RIGHTPADDING",  (0,0),(-1,-1),0),
                ("TOPPADDING",    (0,0),(-1,-1),0),
                ("BOTTOMPADDING", (0,0),(-1,-1),2),
            ]))

            # Cap bullets: always apply DEFAULT_B, further trimmed by max_bullets
            DEFAULT_B = 4 if not compact else 2
            effective_cap = DEFAULT_B if cap is None else min(DEFAULT_B, cap)
            bullets = job["bullets"][:effective_cap]
            bullet_items = []
            for b in bullets:
                bullet_items.append(Paragraph(
                    f"<font color='{_hex(C_GOLD)}'>◆</font>  {rich(b)}", s_bull))

            # Wrap job block in a left-bordered card
            block_inner = [hdr_t]
            if job["company"]:
                block_inner.append(Paragraph(job["company"], s_co))
            block_inner.extend(bullet_items)

            card = Table([[block_inner]], colWidths=[MF_AVAIL])
            card.setStyle(TableStyle([
                ("VALIGN",        (0,0),(-1,-1),"TOP"),
                ("LEFTPADDING",   (0,0),(-1,-1),CARD_LP),
                ("RIGHTPADDING",  (0,0),(-1,-1),4),
                ("TOPPADDING",    (0,0),(-1,-1),int(5 * stretch)),
                ("BOTTOMPADDING", (0,0),(-1,-1),int(6 * stretch)),
                ("LINEBEFORE",    (0,0),(0,-1), 3, C_TEAL),
                ("BACKGROUND",    (0,0),(-1,-1), colors.Color(0.10, 0.48, 0.54, alpha=0.03)),
            ]))
            story.append(card)
            story.append(sp(10 if not compact else 4))
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
                fontName=F_BOLD if i == 0 else F_REG,
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

    for _ in range(200):
        trimmed = False
        for ji in range(n_jobs - 1, -1, -1):
            if max_b.get(ji, 0) > 0:
                max_b[ji] -= 1; trimmed = True; break
        if not trimmed:
            break
        sb = build_sidebar(data, compact=True)
        mn = build_main(data, compact=True, max_bullets=max_b)
        if _test_pages(sb, mn, draw_fn) == 1:
            return True, max_b

    # Bullets exhausted — trim summary sentences one at a time
    for sec in data["sections"]:
        if sec["name"] in SIDEBAR_SECTIONS: continue
        if sec["items"]:
            while sec["items"]:
                # Remove last sentence from last summary item
                last = sec["items"][-1]
                sentences = [s.strip() for s in last.replace(". ", ".|").split("|") if s.strip()]
                if len(sentences) > 1:
                    sec["items"][-1] = ". ".join(sentences[:-1]) + "."
                else:
                    sec["items"].pop()
                sb = build_sidebar(data, compact=True)
                mn = build_main(data, compact=True, max_bullets=max_b)
                if _test_pages(sb, mn, draw_fn) == 1:
                    return True, max_b

    return True, max_b


# ══════════════════════════════════════════════════════════════════════════════
#  PDF BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _measure_story_height(story, frame_w, frame_h):
    """Estimate total height of a story by wrapping each flowable."""
    total = 0
    for item in story:
        try:
            w, h = item.wrap(frame_w, frame_h)
            total += h
            if hasattr(item, 'getSpaceAfter'):
                total += item.getSpaceAfter()
        except Exception:
            total += 10
    return total


def build_pdf_resume(md: str, out_path: str, style: str = "signature"):
    data    = parse_resume(md)
    draw_fn = make_draw(data)

    compact, max_b = auto_fit(data, draw_fn)

    # Find the stretch factor that best fills the page
    stretch = 1.0
    for trial in [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]:
        sb = build_sidebar(data, compact=compact)
        mn = build_main(data, compact=compact, max_bullets=max_b, stretch=trial)
        if _test_pages(sb, mn, draw_fn) > 1:
            break
        stretch = trial

    sb = build_sidebar(data, compact=compact)
    mn = build_main(data, compact=compact, max_bullets=max_b, stretch=stretch)

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


def build_pdf_cover_letter(md: str, out_path: str):
    """Generate a PDF cover letter using the same visual design as the resume."""
    from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer

    # Cover letter uses same header canvas as resume but no sidebar —
    # content starts below the header and spans the full page width.
    CL_ML   = 36          # left margin (pts) for body text
    CL_MR   = 36          # right margin
    CL_MT   = HDR_H + 18  # top margin = header height + gap
    CL_MB   = 28
    CL_AW   = W - CL_ML - CL_MR

    # Parse out name + contact from the markdown header
    lines = md.strip().split("\n")
    i = 0
    while i < len(lines) and not lines[i].strip().startswith("Alexander"): i += 1
    cl_name    = lines[i].strip() if i < len(lines) else "Alexander Tobin"
    i += 1
    cl_contact = ""
    while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith("---"):
        cl_contact = lines[i].strip(); i += 1

    # Build a data-like dict so make_draw can render the header identically
    cl_data = {
        "name":     cl_name,
        "subtitle": "Cover Letter",
        "contact":  cl_contact,
        "tags":     [],
        "sections": [],
    }
    draw_fn = make_draw(cl_data)

    def draw_page(canvas, doc):
        canvas.saveState()

        # ── Identical header (navy + teal diagonal + gold accents) ───────────
        draw_fn(canvas, doc)

        # ── Cover sidebar elements with clean white ──────────────────────────
        canvas.setFillColor(colors.white)
        canvas.rect(0, 0, SB_W + GOLD_DIV + 2, H - HDR_H, fill=1, stroke=0)

        # ── Gradient wash: navy at top fading to nothing by ~40% down ────────
        body_h = H - HDR_H
        steps = 60
        for k in range(steps):
            t      = k / steps                          # 0 = top of body, 1 = bottom
            alpha  = max(0.0, 0.13 * (1 - t / 0.40))  # fade out by 40% of page height
            band_y = body_h - (k + 1) * body_h / steps
            band_h = body_h / steps + 1
            canvas.setFillColor(colors.Color(0.035, 0.082, 0.165, alpha=alpha))
            canvas.rect(SB_W + GOLD_DIV + 2, band_y, W - SB_W - GOLD_DIV - 2, band_h,
                        fill=1, stroke=0)

        canvas.restoreState()

    frame = Frame(CL_ML, CL_MB, CL_AW, H - CL_MT - CL_MB, id="body")
    pt    = PageTemplate(id="cover", frames=[frame], onPage=draw_page)
    doc   = BaseDocTemplate(out_path, pagesize=letter, pageTemplates=[pt])

    def S(name, **kw):
        from reportlab.lib.styles import ParagraphStyle
        return ParagraphStyle(name, **kw)

    s_meta = S("cl_meta", fontName=F_REG,    fontSize=10,
                textColor=C_LGRAY, leading=14, spaceAfter=2)
    s_dear = S("cl_dear", fontName=F_BOLD,   fontSize=11,
                textColor=C_GRAY,  leading=15, spaceAfter=10)
    s_body = S("cl_body", fontName=F_REG,    fontSize=10.5,
                textColor=C_GRAY,  leading=17, spaceAfter=10)
    s_sign = S("cl_sign", fontName=F_REG,    fontSize=10.5,
                textColor=C_LGRAY, leading=14, spaceAfter=0)
    s_snam = S("cl_snam", fontName=F_BOLD,   fontSize=11,
                textColor=C_GRAY,  leading=15)

    story = []

    # Skip blank / --- after contact block
    while i < len(lines) and (not lines[i].strip() or lines[i].strip() == "---"): i += 1

    # Date + addressee lines (up to "Dear")
    while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith("Dear"):
        story.append(Paragraph(lines[i].strip(), s_meta))
        i += 1
    story.append(Spacer(1, 10))

    # Body
    while i < len(lines):
        ln = lines[i].strip(); i += 1
        if not ln:
            story.append(Spacer(1, 4)); continue
        if ln == "---": continue
        if ln.startswith("Dear"):
            story.append(Paragraph(ln, s_dear)); continue
        if ln.startswith("Sincerely"):
            story.append(Spacer(1, 22))
            story.append(Paragraph(ln + ",", s_sign)); continue
        if ln.startswith("Alexander"):
            story.append(Paragraph(ln, s_snam)); continue
        story.append(Paragraph(rich(ln), s_body))

    doc.build(story)
    print(f"✓ Cover Letter PDF: {out_path}")


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

    build_pdf_resume(resume_md,    os.path.join(folder, "resume.pdf"), style=style)
    build_pdf_cover_letter(cover_md, os.path.join(folder, "cover_letter.pdf"))
