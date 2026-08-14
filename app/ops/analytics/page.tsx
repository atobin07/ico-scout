import { redirect } from 'next/navigation';
import { isOpsAuthed } from '@/lib/ops-auth';
import { getBusinessAnalytics } from '@/lib/analytics';
import { OpsNav } from '@/components/dashboard/OpsNav';
import { StatBlock, Card, CardHeader } from '@/components/ui';
import {
  RevenueBar,
  CallsByHour,
  OutcomeDonut,
  TrendArea,
  CategoryBars,
} from '@/components/dashboard/AnalyticsCharts';
import { formatUsd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function OpsAnalyticsPage() {
  if (!isOpsAuthed()) redirect('/ops/login');

  const a = await getBusinessAnalytics();

  return (
    <div className="min-h-screen bg-midnight">
      <OpsNav active="/ops/analytics" />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-800 text-ink-1">Analytics</h1>
          <p className="mt-1 text-sm text-ink-2">Everything happening across your leads, calls, and revenue.</p>
        </div>

        {!a.ok && (
          <div className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
            Couldn’t reach the database. Check the Supabase environment variables.
          </div>
        )}

        {/* Headline KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Total leads" value={a.totalLeads} tone="signal" />
          <StatBlock label="Lead → sale rate" value={`${a.conversionPct}%`} tone="live" />
          <StatBlock label="Booked revenue (30d)" value={formatUsd(a.bookedRevenue)} tone="live" />
          <StatBlock label="Calls answered (30d)" value={a.callsAnswered} tone="signal" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="New / unworked" value={a.newLeads} tone="warn" />
          <StatBlock label="Leads this week" value={a.leads7d} tone="signal" />
          <StatBlock label="Call → booking rate" value={`${a.bookingRatePct}%`} tone="live" />
          <StatBlock label="Clients live" value={a.clients} tone="default" />
        </div>

        {/* Leads over time */}
        <Card className="mt-6 p-5">
          <CardHeader title="Leads over time · last 30 days" className="border-0 px-0 pt-0" />
          {a.totalLeads === 0 ? <Empty label="leads" /> : <TrendArea data={a.leadsByDay} color="#4FA3FF" label="Leads" />}
        </Card>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pipeline */}
          <Card className="p-5">
            <CardHeader title="Lead pipeline · where they stand" className="border-0 px-0 pt-0" />
            {a.totalLeads === 0 ? <Empty label="leads" /> : (
              <CategoryBars data={a.pipeline.map((p) => ({ name: p.label, value: p.count }))} color="#1B54E8" />
            )}
          </Card>

          {/* By channel */}
          <Card className="p-5">
            <CardHeader title="Leads by channel" className="border-0 px-0 pt-0" />
            {a.leadsByKind.length === 0 ? <Empty label="leads" /> : <OutcomeDonut data={a.leadsByKind} />}
          </Card>

          {/* By trade */}
          <Card className="p-5">
            <CardHeader title="Leads by trade" className="border-0 px-0 pt-0" />
            {a.leadsByTrade.length === 0 ? <Empty label="leads" /> : <CategoryBars data={a.leadsByTrade} color="#00A768" />}
          </Card>

          {/* Call outcomes */}
          <Card className="p-5">
            <CardHeader title="Call outcomes" className="border-0 px-0 pt-0" />
            {a.callOutcomes.length === 0 ? <Empty label="calls" /> : <OutcomeDonut data={a.callOutcomes} />}
          </Card>

          {/* Revenue */}
          <Card className="p-5">
            <CardHeader title="Recovered revenue · last 14 days" className="border-0 px-0 pt-0" />
            {a.callsAnswered === 0 ? <Empty label="calls" /> : <RevenueBar data={a.revenueByDay} />}
          </Card>

          {/* Calls by hour */}
          <Card className="p-5">
            <CardHeader title="Calls by hour of day" className="border-0 px-0 pt-0" />
            {a.callsAnswered === 0 ? <Empty label="calls" /> : <CallsByHour data={a.callsByHour} />}
          </Card>
        </div>

        {a.appointmentsByType.length > 0 && (
          <Card className="mt-6 p-5">
            <CardHeader title="Appointments by job type" className="border-0 px-0 pt-0" />
            <CategoryBars data={a.appointmentsByType} color="#4FA3FF" />
          </Card>
        )}
      </main>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid h-[200px] place-items-center text-center text-sm text-ink-3">
      No {label} yet — this fills in as your {label} come in.
    </div>
  );
}
