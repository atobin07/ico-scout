import { NextResponse } from 'next/server';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import { buildPromptFromIntake } from '@/lib/prompt-builder';

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
  voiceGender?: string;
  tone?: string;
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
    ['Voice preference', body.voiceGender || 'No preference'],
    ['Tone', body.tone ?? '—'],
    ['Greeting', body.greeting ?? '—'],
    ['Special instructions', body.specialInstructions ?? '—'],
    ['Availability', body.availability ?? '—'],
    ['Pricing', body.pricing ?? '—'],
    ['Send alerts via', body.alertsTo ?? '—'],
    ['Business number to answer', body.businessNumber ?? '—'],
  ];

  // Build the ready-to-paste Retell setup from the intake answers.
  const built = buildPromptFromIntake(body);

  console.log('[onboarding] new intake:', JSON.stringify(Object.fromEntries(rows)));
  console.log('[onboarding] retell begin message:', built.beginMessage);
  console.log('[onboarding] retell prompt:\n' + built.generalPrompt);

  const to = process.env.QUOTE_NOTIFY_EMAIL;
  if (process.env.RESEND_API_KEY && to) {
    const pre = 'style="white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;background:#0C1525;color:#E8F0FF;padding:14px 16px;border-radius:10px;line-height:1.5"';
    const html = `
      <h2 style="font-family:sans-serif">New CallCatch onboarding intake</h2>
      <table style="font-family:sans-serif;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px;color:#667;vertical-align:top"><b>${escapeHtml(k)}</b></td><td style="padding:6px 12px">${escapeHtml(v)}</td></tr>`,
          )
          .join('')}
      </table>

      <h3 style="font-family:sans-serif;margin-top:24px;color:#1B54E8">Ready-to-paste Retell setup</h3>
      <p style="font-family:sans-serif;font-size:13px;color:#555;margin:4px 0 10px">${escapeHtml(built.voiceSuggestion)}</p>

      <div style="font-family:sans-serif;font-size:12px;color:#667;margin-bottom:4px"><b>Begin Message</b></div>
      <pre ${pre}>${escapeHtml(built.beginMessage)}</pre>

      <div style="font-family:sans-serif;font-size:12px;color:#667;margin:14px 0 4px"><b>Prompt</b> (paste into the agent's Prompt / General Prompt)</div>
      <pre ${pre}>${escapeHtml(built.generalPrompt)}</pre>`;
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
