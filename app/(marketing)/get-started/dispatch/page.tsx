import type { Metadata } from 'next';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { DispatchSetupForm } from '@/components/marketing/DispatchSetupForm';

export const metadata: Metadata = {
  title: 'Add live dispatch & analytics · CallCatch',
  description:
    'Turn on live technician tracking, smart ETAs, and revenue analytics. See your crew and your money in real time.',
};

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Live technician map',
    body: 'See exactly where every tech is in real time on a live map — powered by Mapbox.',
  },
  {
    icon: '⏱️',
    title: 'Smart ETAs',
    body: 'Automatic arrival times for every job, so customers always know when you’ll be there.',
  },
  {
    icon: '📈',
    title: 'Revenue analytics',
    body: 'Recovered revenue, call-to-booking rate, and jobs per tech — all tracked automatically.',
  },
  {
    icon: '👤',
    title: 'Customer CRM',
    body: 'Every caller saved with their history, jobs, and lifetime value. No more sticky notes.',
  },
];

export default function DispatchSetupPage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute inset-0 glow-signal" />

        <div className="relative mx-auto max-w-3xl px-5 pb-4 pt-14 text-center">
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sky">
            Step 2 · Now that you’re live
          </div>
          <h1 className="mt-3 text-4xl font-900 tracking-tightest text-ink-1 sm:text-5xl">
            See your crew and your
            <br />
            money in real time.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-2">
            Your AI is answering calls — now turn on live dispatch tracking and analytics.
            Fill this out and we set the whole thing up for you.
          </p>
        </div>

        {/* Feature explainer */}
        <div className="relative mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-sheen rounded-2xl border border-border bg-navy p-6">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-4 text-base font-700 text-ink-1">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="relative mx-auto max-w-3xl px-5 py-14">
          <DispatchSetupForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
