import 'server-only';

/**
 * Instant text-message alerts for new leads (Twilio). Best-effort: if the
 * Twilio env vars aren't set or the send fails, we log and move on — the lead
 * is already saved to Supabase + emailed, so a texting hiccup never loses it.
 *
 *   TWILIO_ACCOUNT_SID   your Twilio account SID (starts with "AC…")
 *   TWILIO_AUTH_TOKEN    your Twilio auth token
 *   TWILIO_FROM          the Twilio phone number to send from (E.164, +1…)
 *   ALERT_SMS_TO         where to text you (E.164). Comma-separate for several.
 */

export interface LeadAlert {
  kind: 'quote' | 'onboarding';
  name?: string | null;
  businessName?: string | null;
  trade?: string | null;
  phone?: string | null;
  email?: string | null;
}

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM &&
      process.env.ALERT_SMS_TO,
  );
}

function buildMessage(a: LeadAlert): string {
  const who = a.name || a.businessName || 'Someone';
  const biz = a.businessName && a.businessName !== a.name ? ` (${a.businessName})` : '';
  const bits = [a.trade, a.phone].filter(Boolean).join(' · ');
  const label = a.kind === 'onboarding' ? 'New get-started intake' : 'New quote request';
  return `🔔 ${label}: ${who}${biz}${bits ? ` — ${bits}` : ''}. Open your CallCatch leads to follow up.`;
}

export async function sendLeadSms(alert: LeadAlert): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const toRaw = process.env.ALERT_SMS_TO;
  if (!sid || !token || !from || !toRaw) return false;

  const recipients = toRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return false;

  const body = buildMessage(alert);
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const results = await Promise.all(
    recipients.map(async (to) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: from, To: to, Body: body }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          console.error(`[notify] sms to ${to} failed ${res.status}: ${t.slice(0, 300)}`);
          return false;
        }
        return true;
      } catch (err) {
        console.error(`[notify] sms to ${to} error:`, err);
        return false;
      }
    }),
  );
  return results.some(Boolean);
}
