import { redirect } from 'next/navigation';
import { isOpsAuthed } from '@/lib/ops-auth';
import { createServiceSupabase } from '@/lib/supabase';
import { StatBlock, Card, CardHeader, Badge } from '@/components/ui';
import { OpsNav } from '@/components/dashboard/OpsNav';

export const dynamic = 'force-dynamic';

type Row = Record<string, any>;

const STATUS_TONE: Record<string, 'live' | 'sky' | 'warn' | 'neutral'> = {
  new: 'sky',
  contacted: 'warn',
  won: 'live',
  lost: 'neutral',
};

function fmt(ts?: string) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function OpsLeadsPage() {
  if (!isOpsAuthed()) redirect('/ops/login');

  let leads: Row[] = [];
  let configError = false;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db
      .from('leads')
      .select('id, created_at, kind, name, business_name, email, phone, trade, message, status')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) configError = true;
    leads = data ?? [];
  } catch {
    configError = true;
  }

  const quotes = leads.filter((l) => l.kind === 'quote').length;
  const intakes = leads.filter((l) => l.kind === 'onboarding').length;
  const isNew = leads.filter((l) => l.status === 'new').length;

  return (
    <div className="min-h-screen bg-midnight">
      <OpsNav active="/ops/leads" />

      <main className="mx-auto max-w-6xl px-6 py-6">
        {configError && (
          <div className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
            Couldn’t reach the leads table. Make sure migration{' '}
            <code className="font-mono">003_leads.sql</code> is applied and the Supabase env vars are set.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Total leads" value={leads.length} tone="signal" />
          <StatBlock label="New / unworked" value={isNew} tone="live" />
          <StatBlock label="Quote inquiries" value={quotes} tone="signal" />
          <StatBlock label="Onboarding intakes" value={intakes} tone="signal" />
        </div>

        <Card className="mt-6">
          <CardHeader
            title="Everyone who's reached out"
            action={<span className="font-mono text-xs text-ink-3">{leads.length}</span>}
          />
          {leads.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-ink-3">
              No leads yet. Every “Get a quote” inquiry and /get-started intake lands here the moment
              it’s submitted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-3">
                    <th className="px-4 py-2 font-medium">Received</th>
                    <th className="px-4 py-2 font-medium">Name / Business</th>
                    <th className="px-4 py-2 font-medium">Contact</th>
                    <th className="px-4 py-2 font-medium">Trade</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b border-border/50 align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-3">{fmt(l.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-1">{l.name || '—'}</div>
                        {l.business_name && <div className="text-ink-3">{l.business_name}</div>}
                        {l.message && (
                          <div className="mt-1 max-w-[280px] truncate text-xs text-ink-3">{l.message}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {l.email && (
                          <a href={`mailto:${l.email}`} className="block text-sky hover:underline">
                            {l.email}
                          </a>
                        )}
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="block text-ink-2 hover:underline">
                            {l.phone}
                          </a>
                        )}
                        {!l.email && !l.phone && <span className="text-ink-3">—</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{l.trade || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={l.kind === 'onboarding' ? 'live' : 'sky'}>
                          {l.kind === 'onboarding' ? 'intake' : 'quote'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
