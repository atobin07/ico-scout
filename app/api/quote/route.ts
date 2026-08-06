import { NextResponse } from 'next/server';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import { estimatePricing, pricingSummary } from '@/lib/pricing';
import { saveLead } from '@/lib/leads';
import { pushLeadToAirtable } from '@/lib/airtable';
import { sendLeadSms } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QuotePayload {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  trade?: string;
  callsPerMonth?: number;
  missedPct?: number;
  avgJobValue?: number;
  closeRate?: number;
  estRecoveredAnnual?: number;
}

function notifyEmail(): string | undefined {
  return process.env.QUOTE_NOTIFY_EMAIL || undefined;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

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
  if (!name || !email || !phone) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  // ---- SERVER-ONLY: compute our cost, recommended price, and margin. ----
  const callsPerMonth = Number(body.callsPerMonth) || 0;
  const pricing = estimatePricing({ callsPerMonth });

  // Prospect-facing context (safe) for the record.
  const leadRows: [string, string][] = [
    ['Name', name],
    ['Business', body.businessName?.trim() || '—'],
    ['Email', email],
    ['Phone', phone],
    ['Trade', body.trade?.trim() || '—'],
    ['Calls / month', callsPerMonth ? callsPerMonth.toLocaleString() : '—'],
    ['% missed', body.missedPct != null ? `${body.missedPct}%` : '—'],
    ['Avg job value', body.avgJobValue != null ? usd(body.avgJobValue) : '—'],
    ['Close rate', body.closeRate != null ? `${body.closeRate}%` : '—'],
    ['Their est. recovered / yr', body.estRecoveredAnnual != null ? usd(body.estRecoveredAnnual) : '—'],
  ];

  // Internal pricing recommendation — NEVER returned to the client.
  const priceRows: [string, string][] = [
    ['Recommended plan', `${pricing.tier.name} — ${usd(pricing.tier.monthly)}/mo`],
    ['Install fee', usd(pricing.installFee)],
    ['Calls included', `${pricing.tier.includedCalls} (then ${usd(pricing.tier.overagePerCall)}/call)`],
    ['Est. Retell cost', `${usd(pricing.estMonthlyCogs)}/mo (${usd(pricing.perCallCost)}/call)`],
    ['Projected revenue', `${usd(pricing.monthlyRevenue)}/mo`],
    ['Gross profit', `${usd(pricing.grossProfit)}/mo`],
    ['Margin', `${Math.round(pricing.marginPct * 100)}%`],
    pricing.recommendedByOverage ? ['⚠ Volume', 'Exceeds Scale bucket — expect overage'] : ['', ''],
  ].filter(([k]) => k) as [string, string][];

  console.log('[quote] lead:', JSON.stringify(Object.fromEntries(leadRows)));
  console.log('[quote] pricing:', pricingSummary(pricing));

  // Durably record the lead — never depends on email being configured. We store
  // only the prospect-facing fields, never our internal pricing. Supabase is the
  // source of truth; Airtable is an optional friendly working surface. Both are
  // best-effort and run together so neither slows the response.
  await Promise.all([
    saveLead({
      kind: 'quote',
      name,
      businessName: body.businessName?.trim() || null,
      email,
      phone,
      trade: body.trade?.trim() || null,
      message: body.callsPerMonth ? `${body.callsPerMonth} calls/mo` : null,
      payload: {
        businessName: body.businessName?.trim() || null,
        callsPerMonth,
        missedPct: body.missedPct ?? null,
        avgJobValue: body.avgJobValue ?? null,
        closeRate: body.closeRate ?? null,
        estRecoveredAnnual: body.estRecoveredAnnual ?? null,
      },
    }),
    pushLeadToAirtable({
      type: 'quote',
      name,
      businessName: body.businessName?.trim() || null,
      email,
      phone,
      trade: body.trade?.trim() || null,
      notes: body.callsPerMonth ? `${body.callsPerMonth} calls/mo` : null,
    }),
    sendLeadSms({
      kind: 'quote',
      name,
      businessName: body.businessName?.trim() || null,
      trade: body.trade?.trim() || null,
      phone,
      email,
    }),
  ]);

  const to = notifyEmail();
  if (process.env.RESEND_API_KEY && to) {
    const table = (rows: [string, string][]) =>
      `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:5px 12px;color:#667"><b>${escapeHtml(k)}</b></td><td style="padding:5px 12px">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}</table>`;

    const html = `
      <h2 style="font-family:sans-serif">New CallCatch quote request</h2>
      ${table(leadRows)}
      <h3 style="font-family:sans-serif;margin-top:20px;color:#1B54E8">Internal pricing (do not forward)</h3>
      ${table(priceRows)}
    `;
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to,
        replyTo: email,
        subject: `Quote: ${name}${body.businessName ? ` (${body.businessName})` : ''} — rec. ${pricing.tier.name}, ${Math.round(pricing.marginPct * 100)}% margin`,
        html,
      });
    } catch (err) {
      console.error('[quote] email send failed', err);
    }
  } else {
    console.warn('[quote] RESEND_API_KEY / QUOTE_NOTIFY_EMAIL not set — lead + pricing only logged.');
  }

  // Client gets acknowledgement ONLY — no cost/margin/plan data.
  return NextResponse.json({ ok: true });
}
