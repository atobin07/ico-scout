import { NextResponse } from 'next/server';

/**
 * Retell AI webhook.
 * Phase 1: stub that acknowledges POSTs.
 * Phase 3: signature verification + call_started / call_analyzed / call_ended
 *          handling, customer upsert, appointment creation, owner email.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { ok: true, note: 'Retell webhook handler is implemented in Phase 3.' },
    { status: 200 },
  );
}
