import Link from 'next/link';
import { Button } from '@/components/ui';
import { SCENARIOS } from '@/lib/demo-engine';

/* --------------------------------- shared -------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  sub,
  center = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sky">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl font-800 tracking-tight text-ink-1 sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-lg text-ink-2">{sub}</p>}
    </div>
  );
}

/* -------------------------------- problem -------------------------------- */

const PROBLEM_STATS = [
  { value: '62%', label: 'of calls to service businesses go unanswered', tone: 'text-danger' },
  { value: '85%', label: 'of callers never leave a voicemail — they just hang up', tone: 'text-warn' },
  { value: '78%', label: 'of customers hire the first business that answers', tone: 'text-live' },
];

export function ProblemSection() {
  return (
    <section id="problem" className="border-t border-border bg-midnight py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="The problem"
          title="Every missed call is a job your competitor books"
          sub="You're on a roof, behind a mower, up a tree, or driving between jobs. The phone rings. Nobody answers. That customer calls the next guy."
        />
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PROBLEM_STATS.map((s) => (
            <div
              key={s.value}
              className="card-sheen rounded-2xl border border-border bg-navy p-7"
            >
              <div className={`font-mono text-5xl font-800 ${s.tone}`}>{s.value}</div>
              <p className="mt-4 text-sm leading-relaxed text-ink-2">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- how it works ---------------------------- */

const STEPS = [
  {
    n: '01',
    title: 'CallCatch answers in under a second',
    body: 'A warm, natural AI voice picks up every call — day, night, weekends, holidays. No hold music, no voicemail, no missed leads.',
    icon: '📞',
  },
  {
    n: '02',
    title: 'The AI qualifies the lead and books the job',
    body: 'It asks the right questions, captures name and address, gauges urgency, and drops the appointment straight onto your schedule.',
    icon: '🗓️',
  },
  {
    n: '03',
    title: 'You get a summary text while you’re still on the job',
    body: 'Job type, customer details, estimated value, and a recording — texted to you the moment the call ends. Zero admin.',
    icon: '💬',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border bg-navy/40 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="How it works"
          title="From ring to booked in three steps"
        />
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="tape tape-signal h-full rounded-2xl border border-border bg-navy p-7">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="font-mono text-sm font-700 text-ink-3">{s.n}</span>
                </div>
                <h3 className="mt-5 text-lg font-700 text-ink-1">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{s.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-border-2 md:block">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- demo teaser ----------------------------- */

const ACCENT_RING: Record<string, string> = {
  danger: 'hover:border-danger/60',
  warn: 'hover:border-warn/60',
  signal: 'hover:border-signal/60',
  live: 'hover:border-live/60',
};
const ACCENT_TEXT: Record<string, string> = {
  danger: 'text-danger',
  warn: 'text-warn',
  signal: 'text-sky',
  live: 'text-live',
};

export function DemoTeaser() {
  return (
    <section id="demo" className="relative overflow-hidden border-t border-border py-20">
      <div className="pointer-events-none absolute inset-0 glow-signal opacity-70" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Try it yourself"
          title="Hear it handle a real call"
          sub="Pick a scenario and actually talk to the AI receptionist — with your voice or by typing. It'll qualify you and book the job, live."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SCENARIOS.map((s) => (
            <Link
              key={s.id}
              href={`/demo?scenario=${s.id}`}
              className={`group card-sheen rounded-2xl border border-border bg-navy p-6 transition-colors ${ACCENT_RING[s.accent]}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs uppercase tracking-wider ${ACCENT_TEXT[s.accent]}`}>
                  {s.trade}
                </span>
                <span className="font-mono text-xs text-ink-3">
                  ~${s.estValue}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-700 text-ink-1">{s.label}</h3>
              <p className="mt-1.5 text-sm text-ink-2">{s.blurb}</p>
              <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-sky group-hover:gap-2.5 transition-all">
                Start this call
                <span aria-hidden>→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/demo">
            <Button variant="primary" size="lg">
              ▶ Talk to the AI now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- final CTA ------------------------------ */

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-border py-24">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0 glow-live" />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <h2 className="text-4xl font-900 tracking-tightest text-ink-1 sm:text-5xl">
          Stop losing jobs to voicemail.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-2">
          Tell us your call volume and we’ll send a custom quote — a one-time install
          and a flat monthly price that pays for itself.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/quote">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Get a quote →
            </Button>
          </Link>
          <Link href="/demo">
            <Button variant="ghost" size="lg" className="w-full sm:w-auto">
              ▶ Talk to the AI first
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
