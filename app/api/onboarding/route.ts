import { NextResponse } from 'next/server';
import { getResend, FROM_EMAIL } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OnboardingPayload {
  businessName?: string;
  ownerName?: string;
  cellPhone?: string;
  email?: string;
  trade?: string;
  services?: string;
  serviceArea?: string;
  hours?: string;
  greeting?: string;
  specialInstructions?: string;
  availability?: string;
  pricing?: string;
  alertsTo?: string;
  businessNumber?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function POST(req: Request) {
  let body: OnboardingPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const required = ['businessName', 'ownerName', 'cellPhone', 'email', 'businessNumber'] as const;
  for (const key of required) {
    if (!body[key]?.trim()) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }
  }

  const rows: [string, string][] = [
    ['Business', body.businessName ?? '—'],
    ['Owner', body.ownerName ?? '—'],
    ['Cell (job alerts)', body.cellPhone ?? '—'],
    ['Email', body.email ?? '—'],
    ['Trade', body.trade ?? '—'],
    ['Services', body.services ?? '—'],
    ['Service area', body.serviceArea ?? '—'],
    ['Hours', body.hours ?? '—'],
    ['Greeting', body.greeting ?? '—'],
    ['Special instructions', body.specialInstructions ?? '—'],
    ['Availability', body.availability ?? '—'],
    ['Pricing', body.pricing ?? '—'],
    ['Send alerts via', body.alertsTo ?? '—'],
    ['Business number to answer', body.businessNumber ?? '—'],
  ];

  console.log('[onboarding] new intake:', JSON.stringify(Object.fromEntries(rows)));

  const to = process.env.QUOTE_NOTIFY_EMAIL;
  if (process.env.RESEND_API_KEY && to) {
    const html = `
      <h2 style="font-family:sans-serif">New CallCatch onboarding intake</h2>
      <p style="font-family:sans-serif;color:#555">Ready to run <code>npm run onboard:client</code>.</p>
      <table style="font-family:sans-serif;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px;color:#667;vertical-align:top"><b>${escapeHtml(k)}</b></td><td style="padding:6px 12px">${escapeHtml(v)}</td></tr>`,
          )
          .join('')}
      </table>`;
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to,
        replyTo: body.email,
        subject: `New client intake — ${body.businessName}`,
        html,
      });
    } catch (err) {
      console.error('[onboarding] email failed', err);
    }
  } else {
    console.warn('[onboarding] RESEND_API_KEY / QUOTE_NOTIFY_EMAIL not set — intake only logged.');
  }

  return NextResponse.json({ ok: true });
}
