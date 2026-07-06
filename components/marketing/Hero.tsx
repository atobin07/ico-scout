import Link from 'next/link';
import { Button } from '@/components/ui';
import { LiveCallCard } from './LiveCallCard';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Backdrop layers */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 glow-signal" />
      <div className="pointer-events-none absolute inset-0 glow-live" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        {/* Left column */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border-2 bg-navy/60 px-3 py-1 text-xs text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
            Answering calls live for home &amp; outdoor service pros
          </div>

          <h1 className="mt-5 text-[2.75rem] font-900 leading-[1.02] tracking-tightest text-ink-1 sm:text-6xl">
            Your phone
            <br />
            answers itself.
            <br />
            <span className="bg-gradient-to-r from-sky to-signal bg-clip-text text-transparent">
              Every call. Every time.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
            The average service business misses{' '}
            <span className="font-mono font-semibold text-warn">$120K</span> a year in
            revenue from unanswered calls. CallCatch picks up in under a second,
            qualifies the lead, and books the job — while you’re still on the roof
            or on the mower.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/quote">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Get a quote →
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto">
                ▶ Talk to the AI
              </Button>
            </Link>
          </div>

          {/* Inline stat row */}
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {[
              { v: '$120K', l: 'Avg missed / yr', tone: 'text-warn' },
              { v: '<1s', l: 'Answer time', tone: 'text-live' },
              { v: '24/7', l: 'Never voicemail', tone: 'text-sky' },
            ].map((s) => (
              <div key={s.l} className="bg-navy px-4 py-4">
                <div className={`font-mono text-2xl font-700 ${s.tone}`}>{s.v}</div>
                <div className="mt-1 text-xs text-ink-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — live call card */}
        <div className="flex justify-center lg:justify-end">
          <LiveCallCard />
        </div>
      </div>
    </section>
  );
}
