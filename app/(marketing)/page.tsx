import Link from 'next/link';
import { Logo, Button, StatBlock } from '@/components/ui';

/**
 * Marketing homepage.
 * Phase 1: minimal branded hero so the route renders.
 * Phase 4: full landing page (hero, voice demo, how-it-works, social proof).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-midnight">
      <nav className="flex items-center justify-between px-6 py-4">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-ink-2 hover:text-ink-1">
            Pricing
          </Link>
          <Link href="/auth/signup">
            <Button variant="primary" size="sm">
              Start free trial
            </Button>
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1
          className="mx-auto max-w-3xl text-5xl font-900 leading-[1.05] tracking-tightest text-ink-1 md:text-6xl"
        >
          Your phone answers itself.
          <br />
          Every call. Every time.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink-2">
          The AI receptionist for home service businesses. Full landing experience
          ships in Phase 4.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/auth/signup">
            <Button variant="primary" size="lg">
              Start catching calls →
            </Button>
          </Link>
          <Button variant="ghost" size="lg">
            ▶ Hear the AI
          </Button>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBlock label="Avg annual missed revenue" value="$120K" tone="warn" />
          <StatBlock label="Answer time" value="<1" unit="sec" tone="live" />
          <StatBlock label="Coverage" value="24/7" tone="signal" />
        </div>
      </section>
    </main>
  );
}
