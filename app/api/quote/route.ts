import { NextResponse } from 'next/server';
import { getResend, FROM_EMAIL } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QuotePayload {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  trade?: string;
  salesVolume?: string;
  callsPerMonth?: string;
}

/** Where quote requests are emailed. Set QUOTE_NOTIFY_EMAIL in the environment. */
function notifyEmail(): string | undefined {
  return process.env.QUOTE_NOTIFY_EMAIL || undefined;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: Request) {
  let body: QuotePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const phone = body.phone?.trim();
  const salesVolume = body.salesVolume?.trim();

  if (!name || !email || !phone || !salesVolume) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const rows: [string, string][] = [
    ['Name', name],
    ['Business', body.businessName?.trim() || '—'],
    ['Email', email],
    ['Phone', phone],
    ['Trade', body.trade?.trim() || '—'],
    ['Monthly sales volume', salesVolume],
    ['Estimated calls / month', body.callsPerMonth?.trim() || '—'],
  ];

  // Always log so the lead is recoverable from function logs even without email.
  console.log('[quote] new lead:', JSON.stringify(Object.fromEntries(rows)));

  const to = notifyEmail();
  if (process.env.RESEND_API_KEY && to) {
    const html = `
      <h2 style="font-family:sans-serif">New CallCatch quote request</h2>
      <table style="font-family:sans-serif;border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px;color:#555"><b>${escapeHtml(k)}</b></td><td style="padding:6px 12px">${escapeHtml(v)}</td></tr>`,
          )
          .join('')}
      </table>
    `;
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to,
        replyTo: email,
        subject: `New quote request — ${name}${body.businessName ? ` (${body.businessName})` : ''}`,
        html,
      });
    } catch (err) {
      // Don't fail the user's submission if email delivery hiccups — it's logged.
      console.error('[quote] email send failed', err);
    }
  } else {
    console.warn(
      '[quote] RESEND_API_KEY or QUOTE_NOTIFY_EMAIL not set — lead only logged, not emailed.',
    );
  }

  return NextResponse.json({ ok: true });
}
