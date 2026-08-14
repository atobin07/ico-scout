import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TrackPayload {
  path?: string;
  referrer?: string;
  visitorId?: string;
  device?: string;
}

/** Records a first-party page view. Public, best-effort, no PII. */
export async function POST(req: Request) {
  let body: TrackPayload;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = (body.path || '').slice(0, 512);
  if (!path || !path.startsWith('/')) return new NextResponse(null, { status: 204 });
  // Don't track the admin portal itself.
  if (path.startsWith('/ops')) return new NextResponse(null, { status: 204 });

  const device = ['mobile', 'tablet', 'desktop'].includes(body.device || '') ? body.device : null;

  try {
    const db = createServiceSupabase();
    await db.from('page_views').insert({
      path,
      referrer: body.referrer ? String(body.referrer).slice(0, 512) : null,
      visitor_id: body.visitorId ? String(body.visitorId).slice(0, 64) : null,
      device,
    });
  } catch {
    /* best-effort — never surface tracking errors to visitors */
  }
  return new NextResponse(null, { status: 204 });
}
