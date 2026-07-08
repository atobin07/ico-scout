import { redirect } from 'next/navigation';
import { isOpsAuthed } from '@/lib/ops-auth';
import { createServiceSupabase } from '@/lib/supabase';
import { OpsNav } from '@/components/dashboard/OpsNav';
import { DispatchMap, type MapTech } from '@/components/dashboard/DispatchMap';
import { Card, CardHeader, Badge } from '@/components/ui';
import { formatUsd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Row = Record<string, any>;

const STATUS_TONE: Record<string, 'live' | 'warn' | 'signal' | 'neutral'> = {
  available: 'live',
  en_route: 'warn',
  on_job: 'signal',
  offline: 'neutral',
};

function fmtTime(ts?: string) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default async function OpsDispatchPage() {
  if (!isOpsAuthed()) redirect('/ops/login');

  let technicians: Row[] = [];
  let appts: Row[] = [];
  try {
    const db = createServiceSupabase();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const [t, a] = await Promise.all([
      db.from('technicians').select('id, name, status, current_lat, current_lng, business:businesses(name)'),
      db
        .from('appointments')
        .select('id, scheduled_at, job_type, status, estimated_value, address, customer:customers(name), technician:technicians(name), business:businesses(name)')
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString())
        .order('scheduled_at', { ascending: true }),
    ]);
    technicians = t.data ?? [];
    appts = a.data ?? [];
  } catch {
    /* renders empty */
  }

  const mapTechs: MapTech[] = technicians
    .filter((t) => t.current_lat != null && t.current_lng != null)
    .map((t) => ({ id: t.id, name: t.name, status: t.status, lat: Number(t.current_lat), lng: Number(t.current_lng) }));

  return (
    <div className="min-h-screen bg-midnight">
      <OpsNav active="/ops/dispatch" />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="h-[460px]">
            <DispatchMap technicians={mapTechs} />
          </div>

          <Card>
            <CardHeader title="Technicians" action={<span className="font-mono text-xs text-ink-3">{technicians.length}</span>} />
            <div className="divide-y divide-border/60">
              {technicians.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-ink-3">
                  No technicians yet. They appear here once added to a client’s account.
                </div>
              )}
              {technicians.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-ink-1">{t.name}</div>
                    <div className="text-xs text-ink-3">{t.business?.name ?? ''}</div>
                  </div>
                  <Badge tone={STATUS_TONE[t.status] ?? 'neutral'} dot>
                    {String(t.status).replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader title="Today’s schedule" action={<span className="font-mono text-xs text-ink-3">{appts.length} jobs</span>} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Job</th>
                  <th className="px-4 py-2.5">Tech</th>
                  <th className="px-4 py-2.5">Value</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {appts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-3">
                      No jobs scheduled for today.
                    </td>
                  </tr>
                )}
                {appts.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-mono text-ink-1">{fmtTime(a.scheduled_at)}</td>
                    <td className="px-4 py-3 text-ink-1">{a.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-2">{a.job_type ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-2">{a.technician?.name ?? 'Unassigned'}</td>
                    <td className="px-4 py-3 font-mono text-ink-1">{a.estimated_value ? formatUsd(Number(a.estimated_value)) : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={a.status === 'complete' ? 'live' : a.status === 'cancelled' ? 'danger' : 'signal'}>
                        {a.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
