"""
Update all resume.md files:
1. Remove Maker City Pallet Works section entirely
2. Replace the Freelance section header + bullets with updated version
   that includes real client sites and primelayer.solutions showcase link
"""

import os, re, glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Files to update ──────────────────────────────────────────────────────────
files = (
    glob.glob(os.path.join(REPO, "resumes", "*.md")) +
    glob.glob(os.path.join(REPO, "applications", "**", "resume.md"), recursive=True)
)

# ── Maker City removal ────────────────────────────────────────────────────────
MAKER_CITY_PATTERN = re.compile(
    r'\n?###\s+Owner and Founder\s*\|\s*Maker City Pallet Works.*?(?=\n###|\n##|\Z)',
    re.DOTALL
)

# ── Freelance section replacement ─────────────────────────────────────────────
# Matches any "### Freelance ..." header line followed by its bullets
FREELANCE_PATTERN = re.compile(
    r'(###\s+(?:Freelance|AI Systems Developer &[^|]*|Web Developer[^|]*|Digital Contractor[^|]*)[^\n]*\|[^\n]*(?:callcat|primelayer|herera|Self-Employed|Freelance)[^\n]*\n)((?:[-•]\s+.+\n?)*)',
    re.MULTILINE
)

# Generic freelance header pattern — catch all variants
FREELANCE_HEADER_PATTERN = re.compile(
    r'(###\s+(?:Freelance[^|\n]*|AI Systems Developer[^|\n]*|Web Developer & Digital[^|\n]*)[^|\n]*\|[^\n]*(Jan 2026)[^\n]*\n)((?:[ \t]*[-•]\s+.+\n?)*)',
    re.MULTILINE
)

NEW_FREELANCE_BULLETS = """\
- Built and deployed production websites for four active clients: **primelayertrades.com**, **callcatchai.online**, **hereraspreadsheets.com**, and **kizunaperformance.com** — WordPress, Shopify, and custom builds with responsive design, SEO optimization, and post-launch maintenance. Portfolio: [primelayer.solutions/see-our-work](https://www.primelayer.solutions/see-our-work)
- Built **AdvisoryCloud 3.0** — full-stack SaaS platform (React 18, Supabase, Tailwind CSS, PWA) with real-time messaging, role-based dashboards, and 15+ database tables; from Figma wireframes to live production MVP in 7 days using Claude Code and Cursor.
- Built **Container Tracker** — production logistics web app (React, Supabase, Vercel) with live API integration, 6-stage status pipeline, and fleet-wide analytics dashboard; clean, responsive, fully deployed.
- Developed C-suite KPI dashboards and executive reporting frameworks for client organizations; multi-dimensional performance views integrating financial, operational, and sales metrics into real-time visualization layers for leadership decision-making.
- AI development workflow: Claude Code for architecture and scaffolding, Cursor for in-file editing, v0 for UI prototyping, Figma Dev Mode for design extraction — manually audit every output to production standard.
"""

updated = 0
skipped = 0

for fpath in files:
    with open(fpath, 'r') as f:
        original = f.read()

    content = original

    # 1. Remove Maker City
    content = MAKER_CITY_PATTERN.sub('', content)

    # 2. Replace freelance section bullets
    def replace_freelance(m):
        header = m.group(1)
        return header + NEW_FREELANCE_BULLETS

    new_content = FREELANCE_HEADER_PATTERN.sub(replace_freelance, content)
    if new_content == content:
        # Try broader fallback match
        FALLBACK = re.compile(
            r'(###\s+[^\n]*(Freelance|callcathai|primelayertrades|Self-Employed)[^\n]*Jan 2026[^\n]*\n)((?:[ \t]*[-•]\s+.+\n?)*)',
            re.MULTILINE
        )
        new_content = FALLBACK.sub(replace_freelance, content)
    content = new_content

    # Clean up double blank lines left by removal
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original:
        with open(fpath, 'w') as f:
            f.write(content)
        print(f"  Updated: {os.path.relpath(fpath, REPO)}")
        updated += 1
    else:
        skipped += 1

print(f"\nDone. Updated: {updated}  Skipped (no match): {skipped}")
