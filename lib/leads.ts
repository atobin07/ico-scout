import 'server-only';
import { createServiceSupabase } from './supabase';

export type LeadKind = 'quote' | 'onboarding';

export interface LeadInput {
  kind: LeadKind;
  name?: string | null;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
  trade?: string | null;
  message?: string | null;
  /** Full raw submission — kept verbatim so nothing is lost as forms evolve. */
  payload: Record<string, unknown>;
}

/**
 * Durably record a lead. Best-effort: if Supabase isn't configured or the
 * insert fails, we log and return false rather than throwing, so a DB hiccup
 * never blocks the form's success response (the email path still runs).
 */
export async function saveLead(input: LeadInput): Promise<boolean> {
  try {
    const db = createServiceSupabase();
    const { error } = await db.from('leads').insert({
      kind: input.kind,
      name: input.name ?? null,
      business_name: input.businessName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      trade: input.trade ?? null,
      message: input.message ?? null,
      payload: input.payload,
    });
    if (error) {
      console.error('[leads] insert failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[leads] save error:', err);
    return false;
  }
}
