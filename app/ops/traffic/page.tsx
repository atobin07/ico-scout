import { redirect } from 'next/navigation';
import { isOpsAuthed } from '@/lib/ops-auth';
import { getTrafficAnalytics } from '@/lib/traffic';
import { OpsNav } from '@/components/dashboard/OpsNav';
import { StatBlock, Card, CardHeader } from '@/components/ui';
import { TrendArea, CategoryBars, OutcomeDonut } from '@/components/dashboard/AnalyticsCharts';

export const dynamic = 'force-dynamic';

export default async function OpsTrafficPage() {
  if (!isOpsAuthed()) redirect('/ops/login');

  const t = await getTrafficAnalytics();

  return (
    <div className="min-h-screen bg-midnight">
      <OpsNav active="/ops/traffic" />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-800 text-ink-1">Traffic</h1>
          <p className="mt-1 text-sm text-ink-2">
            First-party visitor analytics — tracked by your own site, owned by you. Newest 30 days.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Page views (30d)" value={t.views30d} tone="signal" />
          <StatBlock label="Unique visitors (30d)" value={t.visitors30d} tone="live" />
          <StatBlock label="Views this week" value={t.views7d} tone="signal" />
          <StatBlock label="Top page" value={t.topPages[0]?.name ?? '—'} tone="default" />
        </div>

        {!t.hasData ? (
          <Card className="mt-6 p-6">
            <CardHeader title="Waiting for your first visitors" className="border-0 px-0 pt-0" />
            <p className="max-w-2xl text-sm text-ink-2">
              Traffic tracking is live. Every visit to your public site now records here automatically —
              page views, unique visitors, top pages, and where they came from. Data appears within a minute
              of your first visitor after this deploys.
            </p>
            <p className="mt-3 max-w-2xl text-sm text-ink-3">
              This is <span className="text-ink-2">first-party</span> tracking you own outright. Google
              Analytics and PostHog can plug in alongside it later for deeper session and funnel analysis.
            </p>
          </Card>
        ) : (
          <>
            <Card className="mt-6 p-5">
              <CardHeader title="Page views · last 30 days" className="border-0 px-0 pt-0" />
              <TrendArea data={t.viewsByDay} color="#00D97E" label="Views" />
            </Card>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <CardHeader title="Top pages" className="border-0 px-0 pt-0" />
                <CategoryBars data={t.topPages} color="#1B54E8" />
              </Card>
              <Card className="p-5">
                <CardHeader title="Where visitors come from" className="border-0 px-0 pt-0" />
                <CategoryBars data={t.topReferrers} color="#4FA3FF" />
              </Card>
              <Card className="p-5 lg:col-span-2">
                <CardHeader title="Devices" className="border-0 px-0 pt-0" />
                <OutcomeDonut data={t.devices.map((d) => ({ ...d, name: d.name[0].toUpperCase() + d.name.slice(1) }))} />
              </Card>
            </div>
          </>
        )}

        {/* Other sources */}
        <Card className="mt-6 p-5">
          <CardHeader title="Other analytics sources" className="border-0 px-0 pt-0" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Source name="Vercel Web Analytics" status="Live on Vercel" note="Aggregate traffic lives in the Vercel dashboard (no public data API to pull it here)." />
            <Source name="Google Analytics" status="Connect later" note="Add your GA4 measurement ID to feed sessions & conversions." />
            <Source name="PostHog" status="Connect later" note="Add your PostHog key for funnels, session replay & events." />
          </div>
        </Card>
      </main>
    </div>
  );
}

function Source({ name, status, note }: { name: string; status: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-navy-mid/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-1">{name}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">{status}</span>
      </div>
      <p className="mt-1.5 text-xs text-ink-3">{note}</p>
    </div>
  );
}
