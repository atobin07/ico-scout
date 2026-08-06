import type { Metadata } from 'next';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { OnboardingForm } from '@/components/marketing/OnboardingForm';

export const metadata: Metadata = {
  title: 'Get started · CallCatch',
  description:
    'Done-for-you setup. Fill out one short form and your AI receptionist is answering your calls within 48 hours. We build it, test it with you, and turn it on.',
};

const STEPS = [
  { n: '1', title: 'Tell us about your business', body: 'One short form — about 10 minutes. That’s the only thing you do.' },
  { n: '2', title: 'We build & test it', body: 'Our team sets up your AI receptionist in 48 hours. You hear it before it goes live.' },
  { n: '3', title: 'We turn it on', body: 'A quick 2-minute step (we do it with you) and your phone catches every call.' },
];

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute inset-0 glow-signal" />

        <div className="relative mx-auto max-w-3xl px-5 pb-4 pt-14 text-center">
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sky">
            Done-for-you setup
          </div>
          <h1 className="mt-3 text-4xl font-900 tracking-tightest text-ink-1 sm:text-5xl">
            You fill out one form.
            <br />
            We do the rest.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-2">
            No tech, no setup, no headaches. Your AI receptionist is answering your calls
            within 48 hours — we build it, test it with you, and flip it on.
          </p>
        </div>

        {/* 3 steps */}
        <div className="relative mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 px-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="tape tape-signal rounded-2xl border border-border bg-navy p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-live/15 font-mono text-sm font-700 text-live">
                {s.n}
              </span>
              <h3 className="mt-4 text-base font-700 text-ink-1">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="relative mx-auto max-w-3xl px-5 py-14">
          <OnboardingForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
