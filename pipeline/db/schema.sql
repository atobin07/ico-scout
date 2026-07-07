-- PrimeLayer Contract Intel — Database Schema
-- Run this in the Supabase SQL editor before anything else.

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for full-text search on title/description

-- ─── opportunities ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source                TEXT NOT NULL,
    source_id             TEXT NOT NULL,
    url                   TEXT,
    title                 TEXT,
    description           TEXT,
    agency_or_company     TEXT,
    contract_type         TEXT,
    posted_date           DATE,
    response_deadline     TIMESTAMPTZ,
    contract_start_date   DATE,
    contract_end_date     DATE,
    estimated_value_min   NUMERIC,
    estimated_value_max   NUMERIC,
    naics_codes           TEXT[],
    set_aside_type        TEXT,
    solicitation_number   TEXT,
    keywords_matched      TEXT[],
    categories            TEXT[],
    fit_score             INT,
    fit_rationale         TEXT,
    urgency_score         INT,
    effort_score          INT,
    competition_score     INT,
    composite_score       INT,
    red_flags             TEXT[],
    status                TEXT NOT NULL DEFAULT 'new',
    notes                 TEXT,
    assigned_to           TEXT,
    raw_content           JSONB,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scored_at             TIMESTAMPTZ,

    CONSTRAINT opportunities_source_id_unique UNIQUE (source, source_id),
    CONSTRAINT opportunities_status_check CHECK (
        status IN ('new', 'reviewing', 'pursuing', 'submitted', 'won', 'lost', 'skipped')
    )
);

CREATE INDEX IF NOT EXISTS idx_opportunities_composite_score ON opportunities (composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_response_deadline ON opportunities (response_deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities (status);
CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities (source);
CREATE INDEX IF NOT EXISTS idx_opportunities_posted_date ON opportunities (posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_title_trgm ON opportunities USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opportunities_description_trgm ON opportunities USING gin (description gin_trgm_ops);

-- ─── sources ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL UNIQUE,
    source_type     TEXT NOT NULL,  -- 'api', 'rss'
    url             TEXT NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    config          JSONB,          -- extra params (api keys refs, headers, etc.)
    last_fetched_at TIMESTAMPTZ,
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── scoring_config ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scoring_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    icp                 TEXT NOT NULL,
    capabilities        TEXT NOT NULL,
    case_studies        TEXT,
    avoid_list          TEXT,
    fit_weight          NUMERIC NOT NULL DEFAULT 0.5,
    urgency_weight      NUMERIC NOT NULL DEFAULT 0.2,
    effort_weight       NUMERIC NOT NULL DEFAULT 0.2,
    competition_weight  NUMERIC NOT NULL DEFAULT 0.1,
    hot_threshold       INT NOT NULL DEFAULT 70,
    min_days_deadline   INT NOT NULL DEFAULT 7,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT weights_sum CHECK (
        ABS((fit_weight + urgency_weight + effort_weight + competition_weight) - 1.0) < 0.001
    )
);

-- Only one active config at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_scoring_config_active ON scoring_config (active) WHERE active = TRUE;

-- ─── awarded_contracts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS awarded_contracts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency        TEXT,
    awardee       TEXT,
    award_amount  NUMERIC,
    award_date    DATE,
    naics_code    TEXT,
    description   TEXT,
    source        TEXT NOT NULL,
    source_id     TEXT NOT NULL,
    raw_content   JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT awarded_contracts_source_id_unique UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_awarded_contracts_agency ON awarded_contracts (agency);
CREATE INDEX IF NOT EXISTS idx_awarded_contracts_naics ON awarded_contracts (naics_code);
CREATE INDEX IF NOT EXISTS idx_awarded_contracts_award_date ON awarded_contracts (award_date DESC);

-- ─── Views ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW hot_opportunities AS
SELECT *
FROM opportunities
WHERE
    composite_score >= 70
    AND status IN ('new', 'reviewing', 'pursuing')
    AND (response_deadline IS NULL OR response_deadline > NOW() + INTERVAL '7 days')
ORDER BY composite_score DESC;

CREATE OR REPLACE VIEW weekly_pipeline AS
SELECT
    DATE_TRUNC('week', posted_date)  AS week_start,
    source,
    contract_type,
    COUNT(*)                          AS opportunity_count,
    AVG(composite_score)              AS avg_composite_score,
    AVG(fit_score)                    AS avg_fit_score,
    SUM(estimated_value_max)          AS total_estimated_value
FROM opportunities
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

-- ─── Triggers ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_scoring_config_updated_at
    BEFORE UPDATE ON scoring_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE opportunities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE awarded_contracts  ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read everything
CREATE POLICY "auth_read_opportunities"     ON opportunities      FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read_sources"           ON sources            FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read_scoring_config"    ON scoring_config     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read_awarded_contracts" ON awarded_contracts  FOR SELECT TO authenticated USING (TRUE);

-- Authenticated users can update workflow fields on opportunities
CREATE POLICY "auth_update_opportunities" ON opportunities
    FOR UPDATE TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- Authenticated users can update scoring_config
CREATE POLICY "auth_update_scoring_config" ON scoring_config
    FOR UPDATE TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- service_role bypasses RLS by default in Supabase (no policy needed)
