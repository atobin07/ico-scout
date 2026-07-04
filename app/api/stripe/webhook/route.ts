import { NextResponse } from 'next/server';

/**
 * Stripe webhook.
 * Phase 1: stub. Phase 10: checkout.session.completed,
 * customer.subscription.deleted, invoice.payment_failed.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { ok: true, note: 'Stripe webhook handler is implemented in Phase 10.' },
    { status: 200 },
  );
}
