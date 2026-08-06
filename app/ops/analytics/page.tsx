import { redirect } from 'next/navigation';
import { isOpsAuthed } from '@/lib/ops-auth';
import { createServiceSupabase } from '@/lib/supabase';
import { OpsNav } from '@/components/dashboard/OpsNav';
import { StatBlock, Card, CardHeader } from '@/components/ui';
import { RevenueBar, CallsByHour, OutcomeDonut } from '@/components/dashboard/AnalyticsCharts';
import { formatUsd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Row = Record<string, any>;

const OUTCOME_COLORS: Record<string, string> = {
  booked: '#00D97E',
  quoted: '#4FA3FF',
  callback: '#F5A623',
  missed: '#E24B4A',
  no_action: '#3A5A7A',
};

export default async function OpsAnalyticsPage() {
  if (!isOpsAuthed()) redirect('/ops/login');

  let calls: Row[] = [];
  try {
    const db = createServiceSupabase();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await db
      .from('calls')
      .select('created_at, outcome, status, estimated_value')
      .gte('created_at', since.toISOString())
      .limit(2000);
    calls = data ?? [];
  } catch {
    /* renders empty */
  }

  const booked = calls.filter((c) => c.outcome === 'booked');
  const answered = calls.filter((c) => c.status !== 'missed');
  const recovered = booked.reduce((s, c) => s + (Number(c.estimated_value) || 0), 0);
  const bookingRate = answered.length ? Math.round((booked.length / answered.length) * 100) : 0;

  // Revenue by day (last 14 days)
  const days: { day: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const rev = booked
      .filter((c) => String(c.created_at).slice(0, 10) === key)
      .reduce((s, c) => s + (Number(c.estimated_value) || 0), 0);
    days.push({ day: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), revenue: rev });
  }

  // Outcome breakdown
  const outcomeCounts: Record<string, number> = {};
  calls.forEach((c) => {
    const o = c.outcome ?? 'no_action';
    outcomeCounts[o] = (outcomeCounts[o] ?? 0) + 1;
  });
  const outcomes = Object.entries(outcomeCounts)
    .map(([name, value]) => ({ name: name.replace('_', ' '), value, color: OUTCOME_COLORS[name] ?? '#7A9ABE' }))
    .sort((a, b) => b.value - a.value);

  // Calls by hour
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}`, count: 0 }));
  calls.forEach((c) => {
    const h = new Date(c.created_at).getHours();
    if (byHour[h]) byHour[h].count += 1;
  });

  return (
    <div className="min-h-screen bg-midnight">
      <OpsNav active="/ops/analytics" />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Recovered revenue (30d)" value={formatUsd(recovered)} tone="live" />
          <StatBlock label="Calls answered" value={answered.length} tone="signal" />
          <StatBlock label="Call→booking rate" value={`${bookingRate}%`} tone="live" />
          <StatBlock label="Jobs booked" value={booked.length} tone="signal" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <CardHeader title="Recovered revenue · last 14 days" className="border-0 px-0 pt-0" />
            {calls.length === 0 ? (
              <Empty />
            ) : (
              <RevenueBar data={days} />
            )}
          </Card>

          <Card className="p-5">
            <CardHeader title="Call outcomes" className="border-0 px-0 pt-0" />
            {calls.length === 0 ? <Empty /> : <OutcomeDonut data={outcomes} />}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <CardHeader title="Calls by hour of day" className="border-0 px-0 pt-0" />
            {calls.length === 0 ? <Empty /> : <CallsByHour data={byHour} />}
          </Card>
        </div>
      </main>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-[200px] place-items-center text-center text-sm text-ink-3">
      No call data yet — charts fill in as your AI answers calls.
    </div>
  );
}
