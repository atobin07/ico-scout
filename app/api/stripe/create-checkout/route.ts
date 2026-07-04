import { NextResponse } from 'next/server';

/**
 * Create a Stripe Checkout session.
 * Phase 1: stub. Phase 10: builds a subscription checkout for the
 * selected plan and returns the hosted checkout URL.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { ok: true, note: 'Checkout creation is implemented in Phase 10.' },
    { status: 200 },
  );
}
