# PrimeLayer Contract Intel

Automated federal + state + RFP + grant opportunity discovery for your AI consulting firm. Scores opportunities against your ICP using Claude, surfaces top picks in a daily Slack digest, and provides a Next.js dashboard for tracking the full pipeline.

```
┌─────────────────────────────────────────────────────────────┐
│                    PrimeLayer Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SAM.gov API ──┐                                            │
│                ├─► pipeline/main.py (Railway cron 6AM UTC) │
│  Grants.gov ───┘         │                                  │
│                           ├─► score_batch (Claude API)      │
│                           ├─► upsert → Supabase Postgres    │
│                           └─► Slack digest (Block Kit)      │
│                                                             │
│  Supabase ──► Next.js 16 dashboard (Vercel)                │
│              ├─ /hot        Hot List (composite ≥ 70)       │
│              ├─ /opportunities  All opps + filters          │
│              ├─ /analytics   Charts & source health         │
│              └─ /config      Edit ICP & weights             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup Order

Follow these steps exactly — database must be ready before the pipeline runs.

### 1. Supabase

The project `primelayer-contract-intel` (`mpytznwblmezkwinwcmu`) has been created and the schema + seed data applied via MCP. If you need to recreate it:

1. Go to [supabase.com](https://supabase.com) → New project
2. Open **SQL Editor** → run `pipeline/db/schema.sql`
3. Run `pipeline/db/seed.sql`
4. **Authentication → Providers → Email** — enable **Magic Link** (disable email confirmation for dev)
5. **Authentication → URL Configuration** → add your Vercel domain to Redirect URLs:
   ```
   https://your-domain.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
6. Grab credentials from **Project Settings → API**:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_KEY` = `service_role` secret key (pipeline only — never expose)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `anon` public key

**This project's credentials (already applied):**
- URL: `https://mpytznwblmezkwinwcmu.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (see Supabase dashboard)

Regenerate TypeScript types after schema changes:
```bash
npx supabase gen types typescript --project-id mpytznwblmezkwinwcmu > dashboard/lib/types.ts
```

---

### 2. Environment Variables

**Pipeline (`pipeline/.env`):**
```
SAM_GOV_API_KEY=your_sam_gov_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=https://mpytznwblmezkwinwcmu.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
CLAUDE_MODEL=claude-opus-4-7
```

Get your SAM.gov API key: https://sam.gov/profile/details (free, instant)

**Dashboard (`dashboard/.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=https://mpytznwblmezkwinwcmu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Run the Pipeline Locally

```bash
cd pipeline
pip install -r requirements.txt
cp .env.example .env   # fill in values
python main.py
```

Expected output:
```json
{
  "sam_gov": { "fetched": 47, "upserted": 47, "skipped": 0 },
  "rss": { "fetched": 12, "upserted": 12, "skipped": 0 },
  "scoring": { "scored": 59, "errors": 0 },
  "digest": { "sent": true, "opportunity_count": 8 },
  "elapsed_seconds": 42.3
}
```

Run tests:
```bash
cd pipeline
python -m pytest tests/ -v
```

---

### 4. Deploy the Pipeline to Railway

1. Go to [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo**
2. Select this repo → set **Root Directory** to `pipeline`
3. Add all env vars from `pipeline/.env.example` under **Variables**
4. Railway will detect `Procfile` and `railway.json` — the cron `0 6 * * *` schedules a daily 6AM UTC run
5. Trigger a manual run to verify: **Deployments → Run**

The `railway.json` configures the cron. Railway runs `python main.py` as a one-shot worker (not a long-running server).

---

### 5. Deploy the Dashboard to Vercel

```bash
cd dashboard
npm install
npm run dev   # verify locally at http://localhost:3000
```

Deploy:
1. Go to [vercel.com](https://vercel.com) → New Project → import GitHub repo
2. Set **Root Directory** to `dashboard`
3. Add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy → visit `/hot`

Sign in with magic link (your email) — first user is automatically the only user since RLS restricts access to authenticated sessions.

---

## Tuning the Scoring Config

Visit `/config` in the dashboard to edit live. Changes take effect on the next pipeline run (no redeployment needed).

### Weights

Default: `fit=0.5, urgency=0.2, effort=0.2, competition=0.1`

Weights must sum to 1.0. The composite formula:

```
composite = fit * fit_w
          + urgency * urgency_w
          + effort * effort_w
          + (100 - competition) * competition_w
```

**Tuning ideas:**
- Chasing tight deadlines → increase `urgency_weight` to 0.3
- Avoiding federal low-value work → increase `effort_weight`, ICP already penalizes low value
- Too many false positives → raise `hot_threshold` from 70 to 75-80
- Slim pipeline → lower `min_days_deadline` from 7 to 3

### Deterministic Sub-Score Reference

**Urgency** (days to deadline):

| Days | Score |
|------|-------|
| None | 30 |
| Past | 0 |
| < 7 | 20 |
| 7–20 | 90 |
| 21–59 | 100 |
| 60–119 | 70 |
| 120+ | 40 |

**Effort** (ROI proxy, base by type):

| Type | Base |
|------|------|
| Federal | 30 |
| Grant | 40 |
| Enterprise | 55 |
| State | 60 |
| Local | 65 |
| Marketplace | 85 |

+20 if value ≥ $500K · +10 if ≥ $100K · -30 if 0 < value < $10K

**Competition** (base by type, lower = better):

| Type | Base |
|------|------|
| Local | 55 |
| State | 60 |
| Enterprise | 65 |
| Federal | 70 |
| Grant | 75 |
| Marketplace | 90 |

-20 if small-business set-aside

---

## Adding New Sources

RSS feeds: insert a row into `sources` — no code change needed:

```sql
INSERT INTO sources (name, source_type, url, active)
VALUES ('DoD SBIR', 'rss', 'https://www.dodsbirsttr.mil/rss/opportunities', TRUE);
```

The pipeline reads active RSS sources from the DB on every run.

For new API sources: add a scraper module under `pipeline/scrapers/`, call it from `main.py`. Follow the `sam_gov.py` pattern: paginate → keyword pre-filter → normalize → return list of dicts matching the `opportunities` schema.

---

## Cost Estimate

| Service | Free tier | Paid |
|---------|-----------|------|
| SAM.gov API | Free, unlimited | — |
| Grants.gov RSS | Free | — |
| Supabase | Free (500MB, 50K MAU) | $25/mo Pro |
| Railway | $5 credit/mo (likely covers cron) | ~$5/mo |
| Vercel | Free (hobby) | $20/mo Pro |
| **Anthropic** | — | **$30–75/mo** (Opus 4.7, ~60 opps/day) |
| **Anthropic** | — | **$5–10/mo** (Haiku 4.5, same volume) |

Switch to Haiku for scoring by setting `CLAUDE_MODEL=claude-haiku-4-5-20251001` in Railway env vars. Fit scores stay accurate; rationale is slightly terser.

**Total: ~$35–100/mo depending on model choice.**

---

## Phase 2: USASpending.gov Enrichment

The `awarded_contracts` table is pre-built for this. Planned additions:

1. Scraper hitting `https://api.usaspending.gov/api/v2/search/spending_by_award/` for past awards to agencies surfaced in your pipeline — shows who else got money, award amounts, competition history
2. Enrichment step after scoring: join on `agency_or_company` to surface "Agency X awarded $2.4M to CompetitorY last cycle" as context for competition scoring
3. Adjust `competition_score` based on historical award density

USASpending.gov is public domain, API-friendly, no key required.

---

## Legal Notes

- **SAM.gov**: Public API, free, authorized for business use. API key required but no ToS restrictions on automated queries.
- **Grants.gov RSS**: Public feed, no restrictions.
- **USASpending.gov**: Public domain data, API-friendly.
- **Upwork / LinkedIn scraping**: Violates their ToS. Use Upwork's official API (requires partner approval) or Indeed/LinkedIn Talent Solutions APIs (licensed). Do not scrape.

---

## Project Structure

```
primelayer-contract-intel/
├── pipeline/                  # Railway cron worker
│   ├── main.py               # Orchestrator
│   ├── scrapers/
│   │   ├── sam_gov.py        # SAM.gov API + keyword pre-filter
│   │   └── rss_fetcher.py    # Generic feedparser RSS
│   ├── scoring/
│   │   └── engine.py         # Deterministic sub-scores + Claude fit
│   ├── dashboard/
│   │   └── slack_digest.py   # Slack Block Kit digest
│   ├── db/
│   │   ├── schema.sql        # Full schema, RLS, views, triggers
│   │   └── seed.sql          # Default ICP config + starter sources
│   ├── tests/                # 40 pytest unit tests (no LLM calls)
│   ├── requirements.txt
│   ├── railway.json          # Cron: 0 6 * * *
│   └── Procfile
└── dashboard/                 # Vercel Next.js 16 app
    ├── app/
    │   ├── (auth)/           # Login + magic link callback
    │   ├── (dashboard)/      # Hot, Opportunities, Analytics, Config
    │   └── api/              # Status/notes update endpoint
    ├── components/
    │   ├── opportunity-table.tsx  # TanStack Table
    │   ├── score-badge.tsx        # Color-coded score pill
    │   ├── status-dropdown.tsx    # Inline status update
    │   ├── filters.tsx            # Multi-select + score slider
    │   ├── sidebar.tsx            # Nav
    │   └── realtime-toast.tsx     # Supabase Realtime new-opp toast
    ├── lib/
    │   ├── supabase/         # Browser + server clients
    │   └── types.ts          # TypeScript types matching DB
    └── proxy.ts              # Auth guard (Next.js 16 convention)
```
