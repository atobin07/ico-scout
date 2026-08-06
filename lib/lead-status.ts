/**
 * Lead pipeline stages, shared by the ops feed UI and the update API so the
 * allowed values, labels, and colors never drift apart.
 */

export type LeadStatus =
  | 'new'
  | 'seen'
  | 'followed_up'
  | 'call_scheduled'
  | 'sale_made'
  | 'work_in_progress'
  | 'archived';

export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'seen',
  'followed_up',
  'call_scheduled',
  'sale_made',
  'work_in_progress',
  'archived',
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  seen: 'Seen',
  followed_up: 'Followed up',
  call_scheduled: 'Call scheduled',
  sale_made: 'Sale made',
  work_in_progress: 'Work in progress',
  archived: 'Archived',
};

/** The stages you click a lead through. Archive is handled separately. */
export const PIPELINE_STAGES: LeadStatus[] = [
  'seen',
  'followed_up',
  'call_scheduled',
  'sale_made',
  'work_in_progress',
];

export type BadgeTone = 'live' | 'signal' | 'sky' | 'warn' | 'danger' | 'neutral';

export const LEAD_STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  new: 'sky',
  seen: 'neutral',
  followed_up: 'warn',
  call_scheduled: 'signal',
  sale_made: 'live',
  work_in_progress: 'signal',
  archived: 'neutral',
};

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === 'string' && (LEAD_STATUSES as string[]).includes(v);
}
