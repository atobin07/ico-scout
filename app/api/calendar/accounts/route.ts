import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const db = createServiceSupabase();
  const { data, error } = await db
    .from('calendar_accounts')
    .select('id,provider,account_email,display_name,is_primary,calendar_ids,created_at')
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
