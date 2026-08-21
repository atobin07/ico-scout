import { NextResponse } from 'next/server';
import { syncAll } from '@/lib/calendar/sync-engine';

export async function POST() {
  try {
    const result = await syncAll();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
