import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sets the ops-console session cookie when the passcode matches ADMIN_PASSCODE. */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'ADMIN_PASSCODE not set' }, { status: 503 });
  }
  let passcode = '';
  try {
    passcode = (await req.json())?.passcode ?? '';
  } catch {
    /* ignore */
  }
  if (passcode !== expected) {
    return NextResponse.json({ ok: false, error: 'Wrong passcode' }, { status: 401 });
  }
  cookies().set('ccops', passcode, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete('ccops');
  return NextResponse.json({ ok: true });
}
