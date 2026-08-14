import { NextResponse } from 'next/server';
import { getResend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DispatchPayload {
  businessName?: string;
  ownerName?: string;
  email?: string;
  technicians?: string;
  baseAddress?: string;
  liveTracking?: string;
  trackingHours?: string;
  alertsTo?: string;
  notes?: string;
  metrics?: string[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function POST(req: Request) {
  let body: DispatchPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!body.businessName?.trim() || !body.email?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  const rows: [string, string][] = [
    ['Business', body.businessName ?? '—'],
    ['Owner', body.ownerName ?? '—'],
    ['Email', body.email ?? '—'],
    ['Technicians', body.technicians ?? '—'],
    ['Base address (map center)', body.baseAddress ?? '—'],
    ['Live tracking', body.liveTracking ?? '—'],
    ['Tracking hours', body.trackingHours ?? '—'],
    ['Metrics wanted', (body.metrics ?? []).join(', ') || '—'],
    ['Dispatch alerts via', body.alertsTo ?? '—'],
    ['Notes', body.notes ?? '—'],
  ];

  console.log('[onboarding/dispatch] setup request:', JSON.stringify(Object.fromEntries(rows)));

  const to = NOTIFY_EMAIL;
  if (process.env.RESEND_API_KEY && to) {
    const html = `
      <h2 style="font-family:sans-serif">Dispatch & analytics setup request</h2>
      <table style="font-family:sans-serif;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px;color:#667;vertical-align:top"><b>${escapeHtml(k)}</b></td><td style="padding:6px 12px;white-space:pre-line">${escapeHtml(v)}</td></tr>`,
          )
          .join('')}
      </table>`;
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to,
        replyTo: body.email,
        subject: `Dispatch setup — ${body.businessName}`,
        html,
      });
    } catch (err) {
      console.error('[onboarding/dispatch] email failed', err);
    }
  } else {
    console.warn('[onboarding/dispatch] RESEND_API_KEY / QUOTE_NOTIFY_EMAIL not set — request only logged.');
  }

  return NextResponse.json({ ok: true });
}
