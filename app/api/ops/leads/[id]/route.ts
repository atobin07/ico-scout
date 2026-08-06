import { NextResponse } from 'next/server';
import { isOpsAuthed } from '@/lib/ops-auth';
import { createServiceSupabase } from '@/lib/supabase';
import { isLeadStatus } from '@/lib/lead-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Move a lead to a new pipeline stage (ops console only). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isOpsAuthed()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let status: unknown;
  try {
    status = (await req.json())?.status;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
  if (!isLeadStatus(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  }

  try {
    const db = createServiceSupabase();
    const { error } = await db.from('leads').update({ status }).eq('id', params.id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
