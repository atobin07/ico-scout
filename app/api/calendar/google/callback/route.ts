import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, listCalendars, buildClient } from '@/lib/calendar/google';
import { createServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/calendar?error=${error ?? 'no_code'}`);
  }

  try {
    const { tokens, email, name } = await exchangeCode(code);
    const auth = buildClient(tokens.access_token!, tokens.refresh_token!);
    const calendars = await listCalendars(auth);
    const calendarIds = calendars.map((c) => c.id);

    const db = createServiceSupabase();
    await db.from('calendar_accounts').upsert(
      {
        provider: 'google',
        account_email: email,
        display_name: name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        calendar_ids: calendarIds,
        is_primary: true,
      },
      { onConflict: 'provider,account_email' },
    );

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/calendar?connected=google`);
  } catch (err: any) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/calendar?error=google_failed`);
  }
}
