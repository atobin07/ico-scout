import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import type { CallOutcome, CallSentiment } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Retell webhook — the core of the product.
 * On each call event, writes to Supabase (service role, bypasses RLS):
 *   - call_started   → create a calls row (in_progress)
 *   - call_ended     → mark completed/missed, duration, recording
 *   - call_analyzed  → transcript, summary, sentiment, outcome; if booked,
 *                      upsert the customer, create the appointment, and email
 *                      the business owner a summary.
 */

interface RetellAnalysis {
  call_summary?: string;
  user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown';
  call_successful?: boolean;
  custom_analysis_data?: Record<string, unknown>;
}

interface RetellCall {
  call_id: string;
  agent_id?: string;
  direction?: 'inbound' | 'outbound';
  from_number?: string;
  to_number?: string;
  call_status?: string;
  disconnection_reason?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  recording_url?: string;
  transcript?: string;
  transcript_object?: Array<{ role: string; content: string }>;
  call_analysis?: RetellAnalysis;
}

interface RetellWebhookBody {
  event: 'call_started' | 'call_ended' | 'call_analyzed';
  call: RetellCall;
}

/** Verify Retell's HMAC signature over the raw body using the API key. */
function verify(raw: string, signature: string | null): boolean {
  const key = process.env.RETELL_API_KEY;
  const strict = process.env.RETELL_WEBHOOK_STRICT === 'true';
  if (!key || !signature) return !strict;
  try {
    const expected = crypto.createHmac('sha256', key).update(raw).digest('hex');
    const provided = signature.replace(/^.*=/, '').trim();
    const ok =
      expected.length === provided.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
    if (!ok && !strict) {
      console.warn('[retell/webhook] signature mismatch (non-strict, processing anyway)');
      return true;
    }
    return ok;
  } catch {
    return !strict;
  }
}

const iso = (ms?: number) => (ms ? new Date(ms).toISOString() : null);

function mapSentiment(s?: string): CallSentiment | null {
  switch (s) {
    case 'Positive': return 'positive';
    case 'Negative': return 'negative';
    case 'Neutral': return 'neutral';
    default: return null;
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}
function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'yes';
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-retell-signature');
  if (!verify(raw, signature)) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
  }

  let body: RetellWebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const { event, call } = body;
  if (!call?.call_id) return NextResponse.json({ ok: true });

  const db = createServiceSupabase();

  // Map the call to a business via its Retell agent id. No match (e.g. the
  // public demo agent) → acknowledge and ignore.
  const { data: business } = await db
    .from('businesses')
    .select('id, name, owner_email')
    .eq('retell_agent_id', call.agent_id ?? '')
    .maybeSingle();

  if (!business) return NextResponse.json({ ok: true, note: 'no matching business' });

  const durationSeconds =
    call.duration_ms != null
      ? Math.round(call.duration_ms / 1000)
      : call.start_timestamp && call.end_timestamp
        ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
        : null;

  const transcript = call.transcript_object?.length
    ? call.transcript_object
    : call.transcript
      ? [{ role: 'transcript', content: call.transcript }]
      : null;

  try {
    if (event === 'call_started') {
      await db.from('calls').upsert(
        {
          business_id: business.id,
          retell_call_id: call.call_id,
          direction: call.direction ?? 'inbound',
          status: 'in_progress',
          caller_phone: call.from_number ?? null,
          started_at: iso(call.start_timestamp),
        },
        { onConflict: 'retell_call_id' },
      );
      return NextResponse.json({ ok: true });
    }

    if (event === 'call_ended') {
      const missed = ['voicemail_reached', 'dial_no_answer', 'dial_busy', 'dial_failed'].includes(
        call.disconnection_reason ?? '',
      );
      await db
        .from('calls')
        .update({
          status: missed ? 'missed' : 'completed',
          duration_seconds: durationSeconds,
          recording_url: call.recording_url ?? null,
          ended_at: iso(call.end_timestamp),
          transcript,
        })
        .eq('retell_call_id', call.call_id);
      return NextResponse.json({ ok: true });
    }

    if (event === 'call_analyzed') {
      const analysis = call.call_analysis ?? {};
      const cad = (analysis.custom_analysis_data ?? {}) as Record<string, unknown>;

      const booked = bool(cad.booked) || bool(cad.appointment_booked);
      const outcome: CallOutcome = booked
        ? 'booked'
        : (str(cad.outcome) as CallOutcome | undefined) ??
          (analysis.call_successful ? 'quoted' : 'no_action');
      const estValue = num(cad.estimated_value) ?? null;

      // Update the call record with the analysis.
      const { data: callRow } = await db
        .from('calls')
        .update({
          status: 'completed',
          summary: analysis.call_summary ?? null,
          sentiment: mapSentiment(analysis.user_sentiment),
          outcome,
          estimated_value: estValue,
          duration_seconds: durationSeconds,
          recording_url: call.recording_url ?? null,
          transcript,
          ended_at: iso(call.end_timestamp),
        })
        .eq('retell_call_id', call.call_id)
        .select('id')
        .maybeSingle();

      if (booked) {
        await handleBooking(db, business, call, cad, callRow?.id ?? null, estValue);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, note: 'unhandled event' });
  } catch (err) {
    console.error('[retell/webhook] error handling', event, err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function handleBooking(
  db: ReturnType<typeof createServiceSupabase>,
  business: { id: string; name: string; owner_email: string },
  call: RetellCall,
  cad: Record<string, unknown>,
  callId: string | null,
  estValue: number | null,
) {
  const phone = str(cad.customer_phone) ?? call.from_number ?? 'unknown';
  const name = str(cad.customer_name) ?? null;
  const jobType = str(cad.job_type) ?? str(cad.issue) ?? 'Service call';
  const address = str(cad.address) ?? null;
  const requestedTime = str(cad.appointment_time) ?? str(cad.requested_time);

  // Upsert customer by (business_id, phone).
  const { data: existing } = await db
    .from('customers')
    .select('id, call_count')
    .eq('business_id', business.id)
    .eq('phone', phone)
    .maybeSingle();

  let customerId: string;
  if (existing) {
    customerId = existing.id;
    await db
      .from('customers')
      .update({
        name: name ?? undefined,
        call_count: (existing.call_count ?? 0) + 1,
        last_contact_at: new Date().toISOString(),
      })
      .eq('id', customerId);
  } else {
    const { data: created } = await db
      .from('customers')
      .insert({
        business_id: business.id,
        name,
        phone,
        address,
        source: 'ai_call',
        call_count: 1,
        last_contact_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    customerId = created!.id;
  }

  // Link the call to the customer.
  if (callId) await db.from('calls').update({ customer_id: customerId }).eq('id', callId);

  // Parse the requested time; fall back to +1 day and keep the raw text in notes.
  let scheduledAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  if (requestedTime) {
    const parsed = new Date(requestedTime);
    if (!Number.isNaN(parsed.getTime())) scheduledAt = parsed.toISOString();
  }

  await db.from('appointments').insert({
    business_id: business.id,
    customer_id: customerId,
    call_id: callId,
    scheduled_at: scheduledAt,
    job_type: jobType,
    address,
    estimated_value: estValue,
    booked_by: 'ai',
    status: 'scheduled',
    notes: requestedTime ? `Requested: ${requestedTime}` : null,
  });

  // Email the owner a summary.
  if (process.env.RESEND_API_KEY && business.owner_email) {
    const rows: [string, string][] = [
      ['Customer', name ?? '—'],
      ['Phone', phone],
      ['Job', jobType],
      ['Address', address ?? '—'],
      ['Requested time', requestedTime ?? '—'],
      ['Est. value', estValue != null ? `$${estValue}` : '—'],
    ];
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: business.owner_email,
        subject: `📞 New job booked by CallCatch — ${name ?? phone}`,
        html: `<h2 style="font-family:sans-serif">CallCatch booked a job for ${business.name}</h2>
          <table style="font-family:sans-serif;border-collapse:collapse">${rows
            .map(([k, v]) => `<tr><td style="padding:5px 12px;color:#667"><b>${k}</b></td><td style="padding:5px 12px">${v}</td></tr>`)
            .join('')}</table>
          ${call.call_analysis?.call_summary ? `<p style="font-family:sans-serif;margin-top:16px">${call.call_analysis.call_summary}</p>` : ''}`,
      });
    } catch (err) {
      console.error('[retell/webhook] owner email failed', err);
    }
  }
}
