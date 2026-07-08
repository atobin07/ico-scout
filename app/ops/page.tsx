import { redirect } from 'next/navigation';
import { isOpsAuthed } from '@/lib/ops-auth';
import { createServiceSupabase } from '@/lib/supabase';
import { StatBlock, Card, CardHeader, Badge, FeedRow } from '@/components/ui';
import { OpsNav } from '@/components/dashboard/OpsNav';
import { formatUsd, formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Row = Record<string, any>;

const OUTCOME_TONE: Record<string, 'live' | 'sky' | 'warn' | 'danger' | 'neutral'> = {
  booked: 'live',
  quoted: 'sky',
  callback: 'warn',
  missed: 'danger',
  no_action: 'neutral',
};

function fmtTime(ts?: string) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function OpsPage() {
  if (!isOpsAuthed()) redirect('/ops/login');

  let calls: Row[] = [];
  let appts: Row[] = [];
  let businesses: Row[] = [];
  let configError = false;

  try {
    const db = createServiceSupabase();
    const [c, a, b] = await Promise.all([
      db
        .from('calls')
        .select('id, created_at, caller_phone, outcome, sentiment, status, duration_seconds, estimated_value, summary, business:businesses(name), customer:customers(name, phone)')
        .order('created_at', { ascending: false })
        .limit(30),
      db
        .from('appointments')
        .select('id, scheduled_at, job_type, status, estimated_value, business:businesses(name), customer:customers(name, phone)')
        .gte('scheduled_at', new Date(Date.now() - 3600_000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(15),
      db.from('businesses').select('id, name, retell_phone_number, retell_agent_id, subscription_status').order('created_at', { ascending: false }),
    ]);
    if (c.error || a.error || b.error) configError = true;
    calls = c.data ?? [];
    appts = a.data ?? [];
    businesses = b.data ?? [];
  } catch {
    configError = true;
  }

  const booked = calls.filter((c) => c.outcome === 'booked');
  const revenueBooked = booked.reduce((s, c) => s + (Number(c.estimated_value) || 0), 0);
  const missed = calls.filter((c) => c.status === 'missed' || c.outcome === 'missed').length;

  return (
    <div className="min-h-screen bg-midnight">
      <OpsNav active="/ops" />

      <main className="mx-auto max-w-6xl px-6 py-6">
        {configError && (
          <div className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
            Supabase isn’t reachable. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>,
            <code className="font-mono"> NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and
            <code className="font-mono"> SUPABASE_SERVICE_ROLE_KEY</code> in your environment, then redeploy.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Calls (recent)" value={calls.length} tone="signal" />
          <StatBlock label="Jobs booked" value={booked.length} tone="live" />
          <StatBlock label="Revenue booked" value={formatUsd(revenueBooked)} tone="live" />
          <StatBlock label="Missed" value={missed} tone="warn" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Recent calls */}
          <Card>
            <CardHeader title="Recent calls" action={<span className="font-mono text-xs text-ink-3">{calls.length}</span>} />
            <div className="px-1 py-1">
              {calls.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-ink-3">
                  No calls yet. They’ll appear here the moment your AI answers one.
                </div>
              )}
              {calls.map((c) => (
                <FeedRow
                  key={c.id}
                  tape={c.outcome === 'booked' ? 'live' : c.status === 'missed' ? 'danger' : 'signal'}
                  primary={
                    <span>
                      {c.customer?.name || c.caller_phone || 'Unknown caller'}
                      {c.business?.name ? <span className="text-ink-3"> · {c.business.name}</span> : null}
                    </span>
                  }
                  secondary={c.summary ? String(c.summary).slice(0, 90) : c.caller_phone ?? ''}
                  value={
                    <span className="flex items-center gap-2">
                      {c.outcome && <Badge tone={OUTCOME_TONE[c.outcome] ?? 'neutral'}>{c.outcome}</Badge>}
                      {c.estimated_value ? formatUsd(Number(c.estimated_value)) : ''}
                    </span>
                  }
                  timestamp={`${formatTimeShort(c.created_at)} · ${formatDuration(c.duration_seconds)}`}
                />
              ))}
            </div>
          </Card>

          {/* Upcoming appointments + clients */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader title="Upcoming appointments" />
              <div className="px-1 py-1">
                {appts.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-ink-3">No upcoming jobs.</div>
                )}
                {appts.map((a) => (
                  <FeedRow
                    key={a.id}
                    tape="signal"
                    primary={a.customer?.name || a.job_type || 'Appointment'}
                    secondary={`${a.job_type ?? ''}${a.business?.name ? ` · ${a.business.name}` : ''}`}
                    value={a.estimated_value ? formatUsd(Number(a.estimated_value)) : ''}
                    timestamp={fmtTime(a.scheduled_at)}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Clients" action={<span className="font-mono text-xs text-ink-3">{businesses.length}</span>} />
              <div className="px-1 py-1">
                {businesses.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-ink-3">
                    No clients yet. Onboard one with the setup script.
                  </div>
                )}
                {businesses.map((b) => (
                  <FeedRow
                    key={b.id}
                    tape={b.retell_agent_id ? 'live' : 'idle'}
                    primary={b.name}
                    secondary={b.retell_phone_number || (b.retell_agent_id ? 'Agent connected' : 'No agent yet')}
                    value={<Badge tone={b.subscription_status === 'active' ? 'live' : 'neutral'}>{b.subscription_status}</Badge>}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatTimeShort(ts?: string) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
