import Link from 'next/link';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 199,
    blurb: 'For solo operators and small crews',
    calls: '200 calls / month',
    features: [
      '200 AI-answered calls',
      'Lead qualification & booking',
      'Call summaries + recordings',
      'Dispatch map & CRM',
      'SMS confirmations',
    ],
    accent: 'signal' as const,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 349,
    blurb: 'For growing multi-tech businesses',
    calls: 'Unlimited calls',
    features: [
      'Unlimited AI-answered calls',
      'Everything in Starter',
      'Technician geo-tracking & ETAs',
      'Revenue analytics',
      'Priority support',
    ],
    accent: 'live' as const,
    featured: true,
  },
];

export function PricingSection({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="pricing" className="border-t border-border bg-midnight py-20">
      <div className="mx-auto max-w-5xl px-5">
        {showHeading && (
          <div className="mx-auto max-w-2xl text-center">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sky">
              Pricing
            </div>
            <h2 className="mt-3 text-3xl font-800 tracking-tight text-ink-1 sm:text-4xl">
              Simple pricing that pays for itself
            </h2>
            <p className="mt-4 text-lg text-ink-2">
              One booked job usually covers the month. Every plan includes a 14-day
              free trial — no card required.
            </p>
          </div>
        )}

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border bg-navy p-7',
                plan.featured ? 'border-live/50 shadow-xl shadow-live/5' : 'border-border',
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 right-6 rounded-full border border-live/40 bg-live/15 px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider text-live">
                  Most popular
                </div>
              )}
              <div className="text-sm font-semibold uppercase tracking-wide text-ink-2">
                {plan.name}
              </div>
              <p className="mt-1 text-sm text-ink-3">{plan.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-mono text-5xl font-800 text-ink-1">
                  ${plan.price}
                </span>
                <span className="font-mono text-ink-3">/mo</span>
              </div>
              <div className="mt-1 font-mono text-xs text-sky">{plan.calls}</div>

              <ul className="mt-6 space-y-2.5 text-sm text-ink-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className={plan.featured ? 'text-live' : 'text-sky'}>✓</span>
                    <span className="text-ink-2">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/auth/signup" className="mt-7 block">
                <Button
                  variant={plan.featured ? 'primary' : 'signal'}
                  className="w-full"
                >
                  Start 14-day free trial
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
