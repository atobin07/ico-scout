import type { Metadata } from 'next';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { QuoteSection } from '@/components/marketing/QuoteSection';

export const metadata: Metadata = {
  title: 'Get a quote · CallCatch',
  description:
    'Tell us your call volume and we’ll send a custom quote — a one-time install fee and a flat monthly price for your AI receptionist.',
};

export default function QuotePage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute inset-0 glow-signal" />
        <div className="relative mx-auto max-w-2xl px-5 pb-4 pt-14 text-center">
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sky">
            Get a quote
          </div>
          <h1 className="mt-3 text-4xl font-900 tracking-tightest text-ink-1 sm:text-5xl">
            Let’s size your price
          </h1>
          <p className="mt-4 text-lg text-ink-2">
            Share a few details and we’ll come back with your install fee and monthly
            price — built around your call volume, usually within one business day.
          </p>
        </div>
        <div className="relative">
          <QuoteSection heading={false} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
