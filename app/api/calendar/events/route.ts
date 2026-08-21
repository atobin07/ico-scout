import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const daysAhead = parseInt(searchParams.get('days') ?? '30', 10);
  const db = createServiceSupabase();

  const now = new Date().toISOString();
  const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('events')
    .select('id,title,description,location,start_time,end_time,attendees,video_link,organizer_email,organizer_name,status,is_all_day,source_account_id')
    .gte('start_time', now)
    .lte('start_time', future)
    .neq('status', 'cancelled')
    .order('start_time');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = createServiceSupabase();
  const { data, error } = await db
    .from('events')
    .insert({
      source_account_id: body.source_account_id,
      source_calendar_id: 'manual',
      source_event_id: `manual_${Date.now()}`,
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      start_time: body.start_time,
      end_time: body.end_time,
      attendees: body.attendees ?? [],
      video_link: body.video_link ?? null,
      status: 'confirmed',
      is_all_day: body.is_all_day ?? false,
      last_synced_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
