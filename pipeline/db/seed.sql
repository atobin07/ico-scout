-- PrimeLayer Contract Intel — Seed Data
-- Run after schema.sql. Inserts the default ICP scoring configuration and starter sources.

INSERT INTO scoring_config (
    active,
    icp,
    capabilities,
    case_studies,
    avoid_list,
    fit_weight,
    urgency_weight,
    effort_weight,
    competition_weight,
    hot_threshold,
    min_days_deadline
) VALUES (
    TRUE,
    'Mid-market to enterprise businesses ($5M-$100M revenue) needing custom AI implementation. Strong fits: home services (voice AI/receptionist automation), trading firms/prop shops (analytics/execution), operations-heavy businesses (Airtable/no-code automation), SMB and mid-market wanting custom LLM work rather than off-the-shelf tools.',
    'Voice AI and telephony automation (Vapi, Retell, Bland). Full-stack LLM implementation (Claude, GPT, custom RAG). Airtable/no-code automation. Python trading systems and financial data pipelines. Custom SaaS builds (Next.js, Supabase, Stripe). AI receptionist products and business process automation.',
    'CallCatch (AI receptionist SaaS for home services). Signalyx (AI trading/investor hub). Airtable UPC barcode generation pipeline for legacy Excel migration. 37-file Python trading system with broker adapters, position sizing, kill switches.',
    'Pure marketing/growth agencies. Generic web dev. Anything requiring on-site presence outside Texas. Security clearance required work. Federal contracts requiring past federal performance not yet held.',
    0.5,
    0.2,
    0.2,
    0.1,
    70,
    7
);

-- Starter sources
INSERT INTO sources (name, source_type, url, active, config) VALUES
    (
        'SAM.gov Opportunities',
        'api',
        'https://api.sam.gov/opportunities/v2/search',
        TRUE,
        '{"naics_codes": ["541511","541512","541513","541519","541611","541618","541690","541715"]}'::jsonb
    ),
    (
        'Grants.gov New Opportunities',
        'rss',
        'https://www.grants.gov/rss/GG_NewOppByAgency.xml',
        TRUE,
        '{}'::jsonb
    );
