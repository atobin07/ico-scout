import { RoiQuote } from './RoiQuote';

const PRICING_STEPS = [
  {
    icon: '🔧',
    title: 'One-time install',
    body: 'We build and configure your AI receptionist — custom greeting, your services, your booking rules — and connect it to your business number.',
  },
  {
    icon: '📈',
    title: 'Monthly service',
    body: 'A flat monthly fee that covers running the bot at your call volume. Priced from real usage, so it always covers your costs with margin.',
  },
];

/**
 * Replaces the old public pricing table. Explains the two-part model
 * (install + monthly, sized to volume) and captures a quote request.
 */
export function QuoteSection({
  id = 'pricing',
  heading = true,
}: {
  id?: string;
  heading?: boolean;
}) {
  return (
    <section id={id} className="border-t border-border bg-navy/40 py-20">
      <div className="mx-auto max-w-6xl px-5">
        {heading && (
          <div className="mx-auto max-w-2xl text-center">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sky">
              Pricing
            </div>
            <h2 className="mt-3 text-3xl font-800 tracking-tight text-ink-1 sm:text-4xl">
              Priced to your volume
            </h2>
            <p className="mt-4 text-lg text-ink-2">
              No one-size-fits-all plans. You get a one-time install fee and a flat
              monthly price, sized to how many calls you actually do — so it pays for
              itself on the jobs it books.
            </p>
          </div>
        )}

        {/* Two-part model explainer */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRICING_STEPS.map((s) => (
            <div key={s.title} className="tape tape-signal rounded-2xl border border-border bg-navy p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <h3 className="text-lg font-700 text-ink-1">{s.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-dashed border-border-2 bg-navy/50 p-6">
            <p className="text-sm leading-relaxed text-ink-2">
              Most customers recover the whole cost with the first one or two jobs the
              AI books. Run your numbers below.
            </p>
          </div>
        </div>

        {/* Calculator + quote request */}
        <div className="mt-8">
          <RoiQuote />
        </div>
      </div>
    </section>
  );
}
