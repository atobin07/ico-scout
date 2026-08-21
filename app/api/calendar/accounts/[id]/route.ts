import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServiceSupabase();
  const { error } = await db.from('calendar_accounts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = createServiceSupabase();
  const { data, error } = await db
    .from('calendar_accounts')
    .update({ is_primary: body.is_primary })
    .eq('id', params.id)
    .select('id,is_primary')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
