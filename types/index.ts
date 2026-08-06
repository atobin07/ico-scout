/**
 * CallCatch shared types.
 * These mirror the Supabase schema defined in
 * /supabase/migrations/001_initial_schema.sql
 */

/**
 * Curated trade options for the UI. `trade_type` in the DB is stored as free
 * text (no CHECK constraint) so new verticals can be added without a migration.
 */
export type TradeType =
  | 'HVAC'
  | 'Plumbing'
  | 'Electrical'
  | 'Roofing'
  | 'Landscaping'
  | 'Lawn Care'
  | 'Tree Service'
  | 'Pest Control'
  | 'Pool Service'
  | 'Cleaning'
  | 'General';

/** Trade options shown in dropdowns across the app. */
export const TRADE_OPTIONS: string[] = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Roofing',
  'Landscaping',
  'Lawn Care',
  'Tree Service',
  'Pest Control',
  'Pool Service',
  'Cleaning',
  'Other',
];

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export type CustomerSource = 'ai_call' | 'manual' | 'referral' | 'walk_in';
export type CustomerStatus = 'active' | 'inactive' | 'vip';

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'completed' | 'missed' | 'in_progress' | 'failed';
export type CallSentiment = 'positive' | 'neutral' | 'negative';
export type CallOutcome = 'booked' | 'quoted' | 'callback' | 'no_action' | 'missed';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'complete'
  | 'cancelled';
export type BookedBy = 'ai' | 'manual';

export type TechnicianStatus = 'available' | 'en_route' | 'on_job' | 'offline';

export interface Business {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  trade_type: TradeType | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  owner_name: string | null;
  owner_email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  retell_agent_id: string | null;
  retell_phone_number: string | null;
  ai_script: string | null;
  timezone: string;
  settings: Record<string, unknown>;
}

export interface Customer {
  id: string;
  created_at: string;
  business_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  source: CustomerSource | null;
  lifetime_value: number;
  call_count: number;
  last_contact_at: string | null;
  tags: string[] | null;
  status: CustomerStatus;
}

export interface TranscriptTurn {
  role: 'agent' | 'user';
  content: string;
  timestamp?: number;
}

export interface Call {
  id: string;
  created_at: string;
  business_id: string;
  customer_id: string | null;
  retell_call_id: string | null;
  direction: CallDirection | null;
  status: CallStatus | null;
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: TranscriptTurn[] | null;
  summary: string | null;
  sentiment: CallSentiment | null;
  outcome: CallOutcome | null;
  estimated_value: number | null;
  caller_phone: string | null;
  started_at: string | null;
  ended_at: string | null;
}

export interface Appointment {
  id: string;
  created_at: string;
  business_id: string;
  customer_id: string | null;
  call_id: string | null;
  technician_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  job_type: string | null;
  address: string | null;
  status: AppointmentStatus;
  estimated_value: number | null;
  actual_value: number | null;
  notes: string | null;
  booked_by: BookedBy;
}

export interface Technician {
  id: string;
  created_at: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  trade_type: TradeType | null;
  status: TechnicianStatus;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  color: string | null;
}

/** Convenience joined shapes used by dashboard views. */
export interface CallWithCustomer extends Call {
  customer: Customer | null;
}

export interface AppointmentWithRelations extends Appointment {
  customer: Customer | null;
  technician: Technician | null;
}
