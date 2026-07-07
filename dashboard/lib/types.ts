// TypeScript types matching the Supabase DB schema.
// Regenerate with: supabase gen types typescript --project-id <id> > lib/types.ts

export type OpportunityStatus =
  | "new"
  | "reviewing"
  | "pursuing"
  | "submitted"
  | "won"
  | "lost"
  | "skipped";

export type OpportunityCategory =
  | "voice_ai"
  | "automation"
  | "llm_impl"
  | "data_pipeline"
  | "telephony"
  | "trading"
  | "saas_build"
  | "other";

export interface Opportunity {
  id: string;
  source: string;
  source_id: string;
  url: string | null;
  title: string | null;
  description: string | null;
  agency_or_company: string | null;
  contract_type: string | null;
  posted_date: string | null;
  response_deadline: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  naics_codes: string[] | null;
  set_aside_type: string | null;
  solicitation_number: string | null;
  keywords_matched: string[] | null;
  categories: OpportunityCategory[] | null;
  fit_score: number | null;
  fit_rationale: string | null;
  urgency_score: number | null;
  effort_score: number | null;
  competition_score: number | null;
  composite_score: number | null;
  red_flags: string[] | null;
  status: OpportunityStatus;
  notes: string | null;
  assigned_to: string | null;
  raw_content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  scored_at: string | null;
}

export interface Source {
  id: string;
  name: string;
  source_type: string;
  url: string;
  active: boolean;
  config: Record<string, unknown> | null;
  last_fetched_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoringConfig {
  id: string;
  active: boolean;
  icp: string;
  capabilities: string;
  case_studies: string | null;
  avoid_list: string | null;
  fit_weight: number;
  urgency_weight: number;
  effort_weight: number;
  competition_weight: number;
  hot_threshold: number;
  min_days_deadline: number;
  created_at: string;
  updated_at: string;
}

export interface AwardedContract {
  id: string;
  agency: string | null;
  awardee: string | null;
  award_amount: number | null;
  award_date: string | null;
  naics_code: string | null;
  description: string | null;
  source: string;
  source_id: string;
  raw_content: Record<string, unknown> | null;
  created_at: string;
}
