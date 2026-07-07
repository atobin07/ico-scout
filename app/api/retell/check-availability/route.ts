import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/geo';
import {
  getSchedulingConfig,
  checkServiceArea,
  resolveTargetDate,
  suggestSlots,
} from '@/lib/scheduling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Scheduling guardrail — the layer under the voice agent.
 * Retell calls this custom function before the agent confirms a booking. It
 * geocodes the caller's address, checks it's inside the service area, and
 * returns only realistic open slots. The agent may only offer what comes back.
 *
 * Retell posts: { call: { agent_id, ... }, name, args: { address, preferred_day, preferred_window } }
 */
export async function POST(req: Request) {
  let body: {
    call?: { agent_id?: string };
    args?: { address?: string; preferred_day?: string; preferred_window?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const args = body.args ?? {};
  const address = args.address?.trim() ?? '';
  const now = Date.now();

  interface Biz {
    id: string;
    name: string;
    settings: Record<string, unknown> | null;
    timezone: string | null;
  }
  const agentId = body.call?.agent_id ?? '';
  const db = createServiceSupabase();
  let business: Biz | null = null;
  try {
    const { data } = await db
      .from('businesses')
      .select('id, name, settings, timezone')
      .eq('retell_agent_id', agentId)
      .maybeSingle();
    business = (data as Biz | null) ?? null;
  } catch {
    business = null;
  }

  // Unknown agent (e.g. the public demo) — never block; return a soft default.
  if (!business) {
    return NextResponse.json({
      serviceable: true,
      within_service_area: true,
      message:
        'Looks good — go ahead and offer the caller a same-day or next-morning window, then confirm the booking.',
    });
  }

  const cfg = getSchedulingConfig(business);

  // 1) Service-area check (only if the caller gave an address and area is configured).
  if (address) {
    const point = await geocodeAddress(address);
    if (point) {
      const area = checkServiceArea(cfg, point);
      if (area.configured && !area.within) {
        return NextResponse.json({
          serviceable: false,
          within_service_area: false,
          distance_miles: area.distanceMiles,
          message: `${address} is outside ${business.name}'s service area (about ${area.distanceMiles} miles from base; the limit is ${cfg.serviceRadiusMiles} miles). Politely let the caller know it's just outside the area we cover and do NOT book. Offer to take their info in case that changes.`,
        });
      }
    }
  }

  // 2) Timing — realistic open slots for the requested day.
  const target = resolveTargetDate(cfg, args.preferred_day, now);
  const { data: appts } = await db
    .from('appointments')
    .select('scheduled_at, status')
    .eq('business_id', business.id)
    .gte('scheduled_at', new Date(now - 12 * 3600 * 1000).toISOString())
    .neq('status', 'cancelled')
    .limit(200);
  const existing = (appts ?? [])
    .map((a) => new Date(a.scheduled_at as string).getTime())
    .filter((n) => Number.isFinite(n));

  const { slots, full } = suggestSlots(cfg, target, existing, now, args.preferred_window);

  if (full || slots.length === 0) {
    // Try the next working day.
    const next = resolveTargetDate(cfg, undefined, now + 24 * 3600 * 1000);
    const alt = suggestSlots(cfg, next, existing, now);
    if (alt.slots.length) {
      return NextResponse.json({
        serviceable: true,
        within_service_area: true,
        message: `That day is fully booked. The soonest realistic openings are: ${alt.slots
          .map((s) => s.label)
          .join('; ')}. Offer one of these and confirm — don't promise other times.`,
        available_slots: alt.slots,
      });
    }
    return NextResponse.json({
      serviceable: true,
      within_service_area: true,
      message:
        "The schedule is tight right now. Take the caller's details and let them know the team will call back to lock in the soonest time — don't promise a specific slot.",
      available_slots: [],
    });
  }

  return NextResponse.json({
    serviceable: true,
    within_service_area: true,
    message: `Good to book. Realistic open times: ${slots
      .map((s) => s.label)
      .join('; ')}. Offer one of these and confirm it — only promise times in this list.`,
    available_slots: slots,
  });
}
