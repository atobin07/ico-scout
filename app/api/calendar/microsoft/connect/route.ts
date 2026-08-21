import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/calendar/microsoft';
import { randomBytes } from 'crypto';

export function GET() {
  const state = randomBytes(16).toString('hex');
  return NextResponse.redirect(buildAuthUrl(state));
}
