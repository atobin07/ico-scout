import Link from 'next/link';
import { Logo, Button, Card } from '@/components/ui';

/**
 * Pricing page.
 * Phase 1: two branded plan cards.
 * Phase 4/10: polished tiers wired to Stripe checkout.
 */
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$199',
    cadence: '/mo',
    blurb: '200 calls / month',
    features: ['200 answered calls', 'AI booking + summaries', 'Dispatch map', '14-day free trial'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$349',
    cadence: '/mo',
    blurb: 'Unlimited calls',
    features: ['Unlimited calls', 'Everything in Starter', 'Priority support', '14-day free trial'],
    featured: true,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-midnight">
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/auth/signup">
          <Button variant="primary" size="sm">
            Start free trial
          </Button>
        </Link>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-center text-4xl font-900 tracking-tightest text-ink-1">
          Simple, honest pricing
        </h1>
        <p className="mt-3 text-center text-ink-2">
          Every plan includes a 14-day free trial. No card required to start.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              tape={plan.featured ? 'live' : 'signal'}
              className="p-6"
            >
              <div className="text-sm font-semibold uppercase tracking-wide text-ink-2">
                {plan.name}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-700 text-ink-1">
                  {plan.price}
                </span>
                <span className="font-mono text-ink-3">{plan.cadence}</span>
              </div>
              <div className="mt-1 text-sm text-ink-2">{plan.blurb}</div>
              <ul className="mt-5 space-y-2 text-sm text-ink-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-live">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="mt-6 block">
                <Button
                  variant={plan.featured ? 'primary' : 'signal'}
                  className="w-full"
                >
                  Start free trial
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
