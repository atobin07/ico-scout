import type { Metadata } from 'next';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { DemoExperience } from '@/components/marketing/demo/DemoExperience';

export const metadata: Metadata = {
  title: 'Talk to the AI · CallCatch Live Demo',
  description:
    'Talk to the CallCatch AI receptionist with your voice or by typing. Watch it qualify the lead and book the job in real time.',
};

export default function DemoPage({
  searchParams,
}: {
  searchParams: { scenario?: string };
}) {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute inset-0 glow-signal" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-12">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sky">
              Live demo
            </div>
            <h1 className="mt-3 text-4xl font-900 tracking-tightest text-ink-1 sm:text-5xl">
              Talk to the AI receptionist
            </h1>
            <p className="mt-4 text-lg text-ink-2">
              This is the real thing, running in your browser. Pick a scenario, start
              the call, and answer its questions — with your voice or by typing.
            </p>
          </div>

          <DemoExperience initialScenarioId={searchParams.scenario} />

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-ink-3">
            This public demo runs entirely on-device using your browser’s speech
            engine — no call is placed and no data leaves your device. In production,
            CallCatch answers your real phone number with a natural AI voice via
            Retell AI.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
