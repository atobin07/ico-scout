const ITEMS = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Garage Doors',
  'Appliance Repair', 'Landscaping', 'Pest Control', 'Locksmith', 'Pool Service',
];

export function TrustStrip() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <section className="border-y border-border bg-navy/40 py-5">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
          Built for every trade that answers the phone
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="marquee-track flex w-max gap-3">
            {doubled.map((item, i) => (
              <span
                key={i}
                className="whitespace-nowrap rounded-full border border-border bg-navy px-4 py-1.5 font-mono text-xs text-ink-2"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
