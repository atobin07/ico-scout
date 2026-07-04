'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { DemoExperience } from './DemoExperience';
import { LiveVoiceCall } from './LiveVoiceCall';

type Mode = 'live' | 'guided';

/**
 * Switches between the real Retell voice call and the guided (simulated) demo.
 * Defaults to live voice when the server reports it's configured.
 */
export function DemoTabs({ initialScenarioId }: { initialScenarioId?: string }) {
  const [mode, setMode] = useState<Mode>('guided');
  const [liveConfigured, setLiveConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/retell/web-call', { method: 'GET' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setLiveConfigured(Boolean(d?.configured));
        if (d?.configured) setMode('live');
      })
      .catch(() => !cancelled && setLiveConfigured(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* Segmented control */}
      <div className="mx-auto mb-6 flex w-full max-w-sm items-center gap-1 rounded-full border border-border bg-navy p-1">
        <TabButton active={mode === 'live'} onClick={() => setMode('live')}>
          <span className="flex items-center justify-center gap-2">
            🎙 Live voice
            {liveConfigured === true && (
              <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
            )}
          </span>
        </TabButton>
        <TabButton active={mode === 'guided'} onClick={() => setMode('guided')}>
          💬 Guided demo
        </TabButton>
      </div>

      {mode === 'live' ? (
        <div className="mx-auto max-w-3xl">
          <LiveVoiceCall />
          <p className="mt-4 text-center text-xs text-ink-3">
            Real two-way voice: your microphone streams to a Retell AI agent that
            answers out loud, and the dialogue transcribes live above.
          </p>
        </div>
      ) : (
        <DemoExperience initialScenarioId={initialScenarioId} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors',
        active ? 'bg-signal text-white' : 'text-ink-2 hover:text-ink-1',
      )}
    >
      {children}
    </button>
  );
}
