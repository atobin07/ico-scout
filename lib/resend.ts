/**
 * Resend transactional email client. Templates wired in Phases 3 & 10.
 */
import 'server-only'; // RESEND_API_KEY must never reach the browser bundle
import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? '');
  }
  return _resend;
}

/** The address all CallCatch email is sent from. */
export const FROM_EMAIL = 'CallCatch <sales@callcatchai.online>';

/** Where lead / booking notifications land. Defaults to sales@, overridable via env. */
export const NOTIFY_EMAIL = process.env.QUOTE_NOTIFY_EMAIL || 'sales@callcatchai.online';
