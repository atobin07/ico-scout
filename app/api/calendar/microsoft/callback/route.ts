import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, listCalendars } from '@/lib/calendar/microsoft';
import { createServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/calendar?error=${error ?? 'no_code'}`);
  }

  try {
    const { accessToken, refreshToken, expiresOn, email, name } = await exchangeCode(code);
    const calendars = await listCalendars(accessToken);
    const calendarIds = calendars.map((c: any) => c.id);

    const db = createServiceSupabase();
    await db.from('calendar_accounts').upsert(
      {
        provider: 'microsoft',
        account_email: email,
        display_name: name,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: expiresOn,
        calendar_ids: calendarIds,
        is_primary: true,
      },
      { onConflict: 'provider,account_email' },
    );

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/calendar?connected=microsoft`);
  } catch (err: any) {
    console.error('Microsoft callback error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/calendar?error=microsoft_failed`);
  }
}
