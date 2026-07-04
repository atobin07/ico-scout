'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_SCRIPT } from '@/lib/demo-engine';
import { cn } from '@/lib/utils';

/**
 * Auto-playing "live call" card used as the hero visual.
 * Reveals the scripted exchange line-by-line, shows a running call timer
 * and a voice waveform, then loops.
 */
export function LiveCallCard() {
  const [visible, setVisible] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reveal lines on a cadence, then pause and restart.
  useEffect(() => {
    const t = setTimeout(
      () => {
        setVisible((v) => (v >= HERO_SCRIPT.length ? 1 : v + 1));
        if (visible >= HERO_SCRIPT.length) setSeconds(0);
      },
      visible >= HERO_SCRIPT.length ? 3200 : 1700,
    );
    return () => clearTimeout(t);
  }, [visible]);

  // Call timer ticks while the "call" is in progress.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visible]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const booked = visible >= HERO_SCRIPT.length;

  return (
    <div className="animate-float">
      <div className="tape tape-live w-full max-w-md overflow-hidden rounded-2xl border border-border-2 bg-navy shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-navy-mid px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 animate-pulse-ring" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-live">
              Live call
            </span>
          </div>
          <span className="font-mono text-sm tabular-nums text-ink-2">
            {mm}:{ss}
          </span>
        </div>

        {/* Caller strip */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-signal/20 font-mono text-xs text-sky">
            MB
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm text-ink-1">Incoming · (512) 555-0148</div>
            <div className="font-mono text-[11px] text-ink-3">Austin, TX · HVAC</div>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="h-64 space-y-2.5 overflow-hidden px-4 py-3">
          {HERO_SCRIPT.slice(0, visible).map((line, i) => {
            const isResult = line.text.startsWith('✓');
            return (
              <div
                key={i}
                style={{ animation: 'convo-in 0.4s ease-out both' }}
                className={cn(
                  'flex',
                  line.role === 'caller' ? 'justify-end' : 'justify-start',
                )}
              >
                {isResult ? (
                  <div className="w-full rounded-lg border border-live/40 bg-live/10 px-3 py-2 text-center font-mono text-xs text-live">
                    {line.text}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-snug',
                      line.role === 'agent'
                        ? 'rounded-tl-sm bg-navy-mid text-ink-1'
                        : 'rounded-tr-sm bg-signal text-white',
                    )}
                  >
                    {line.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer: waveform + status */}
        <div className="flex items-center justify-between border-t border-border bg-navy-mid px-4 py-3">
          <div
            className={cn(
              'flex h-5 items-end gap-[3px]',
              booked ? 'text-ink-3' : 'text-live',
            )}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${i * 0.09}s`, height: '30%' }}
              />
            ))}
          </div>
          <span
            className={cn(
              'font-mono text-[11px] uppercase tracking-wider',
              booked ? 'text-live' : 'text-ink-2',
            )}
          >
            {booked ? 'Job booked' : 'AI speaking…'}
          </span>
        </div>
      </div>
    </div>
  );
}
