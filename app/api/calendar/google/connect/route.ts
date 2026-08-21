import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/calendar/google';
import { randomBytes } from 'crypto';

const pendingStates = new Map<string, number>();

export function GET() {
  const state = randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now());
  // Prune old states
  pendingStates.forEach((t, k) => {
    if (Date.now() - t > 10 * 60 * 1000) pendingStates.delete(k);
  });
  return NextResponse.redirect(buildAuthUrl(state));
}

export { pendingStates as googlePendingStates };
