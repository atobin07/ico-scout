import { NextRequest, NextResponse } from 'next/server';
import { syncAll } from '@/lib/calendar/sync-engine';
import { checkAndSendNotifications } from '@/lib/calendar/notifications';

// Vercel Cron Job endpoint — secured with CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [syncResult] = await Promise.allSettled([syncAll(), checkAndSendNotifications()]);
  const sync = syncResult.status === 'fulfilled' ? syncResult.value : { error: (syncResult as any).reason?.message };

  return NextResponse.json({ ok: true, sync, timestamp: new Date().toISOString() });
}
