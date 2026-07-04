import { NextResponse } from 'next/server';
import { estimatePricing, type VoiceTier } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Internal-only pricing calculator API. Returns full cost/margin data, so it's
 * gated behind ADMIN_PASSCODE. Without a matching passcode it reveals nothing.
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_PASSCODE is not set on the server.' },
      { status: 503 },
    );
  }

  let body: { passcode?: string; callsPerMonth?: number; avgCallMinutes?: number; voiceTier?: VoiceTier };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!body.passcode || body.passcode !== expected) {
    return NextResponse.json({ ok: false, error: 'Wrong passcode' }, { status: 401 });
  }

  const pricing = estimatePricing({
    callsPerMonth: Number(body.callsPerMonth) || 0,
    avgCallMinutes: body.avgCallMinutes ? Number(body.avgCallMinutes) : undefined,
    voiceTier: body.voiceTier === 'standard' ? 'standard' : 'premium',
  });

  return NextResponse.json({ ok: true, pricing });
}
