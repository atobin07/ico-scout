'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RetellWebClient } from 'retell-client-js-sdk';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'unconfigured' | 'error';
type Turn = { role: 'agent' | 'user'; content: string };

/**
 * Real voice conversation with the CallCatch AI, powered by Retell's
 * browser SDK. Captures the mic, plays the AI voice, and renders the live
 * transcript streamed via the SDK's "update" event.
 *
 * Requires RETELL_API_KEY + RETELL_DEMO_AGENT_ID on the server. When those
 * aren't set, the /api/retell/web-call route returns 503 and this shows a
 * short setup card instead.
 */
export function LiveVoiceCall() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [agentTalking, setAgentTalking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientRef = useRef<RetellWebClient | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* timer */
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* autoscroll */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  const teardown = useCallback(() => {
    try {
      clientRef.current?.stopCall();
    } catch {
      /* noop */
    }
    clientRef.current = null;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const endCall = useCallback(() => {
    teardown();
    setAgentTalking(false);
    setPhase((p) => (p === 'live' || p === 'connecting' ? 'ended' : p));
  }, [teardown]);

  const startCall = useCallback(async () => {
    setErrorMsg(null);
    setTranscript([]);
    setSeconds(0);
    setPhase('connecting');

    // 1) Mint an access token from our server (keeps the API key secret).
    let accessToken: string;
    try {
      const res = await fetch('/api/retell/web-call', { method: 'POST' });
      if (res.status === 503) {
        setPhase('unconfigured');
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.accessToken) {
        setErrorMsg(data.error ?? 'Could not start the call.');
        setPhase('error');
        return;
      }
      accessToken = data.accessToken;
    } catch {
      setErrorMsg('Network error starting the call.');
      setPhase('error');
      return;
    }

    // 2) Connect the browser SDK (prompts for mic permission, plays AI audio).
    try {
      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();
      clientRef.current = client;

      client.on('call_started', () => setPhase('live'));
      client.on('call_ready', () => setPhase('live'));
      client.on('agent_start_talking', () => setAgentTalking(true));
      client.on('agent_stop_talking', () => setAgentTalking(false));
      client.on('update', (update: { transcript?: Turn[] }) => {
        if (Array.isArray(update?.transcript)) {
          setTranscript(update.transcript.filter((t) => t.content?.trim()));
        }
      });
      client.on('call_ended', () => {
        setAgentTalking(false);
        setPhase('ended');
      });
      client.on('error', (e: unknown) => {
        console.error('[retell] call error', e);
        setErrorMsg('The call ran into an error. Please try again.');
        teardown();
        setPhase('error');
      });

      await client.startCall({ accessToken });
    } catch (err) {
      console.error('[retell] failed to start', err);
      setErrorMsg(
        'Could not access your microphone. Check the browser mic permission and try again.',
      );
      teardown();
      setPhase('error');
    }
  }, [teardown]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border-2 bg-navy shadow-2xl shadow-black/40">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border bg-navy-mid px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-live/20 text-lg">
            🎙
          </div>
          <div>
            <div className="text-sm font-600 text-ink-1">CallCatch AI · Live voice</div>
            <div className="font-mono text-[11px] text-ink-3">Powered by Retell AI</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {phase === 'live' && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
              <span className="font-mono text-xs text-live">LIVE</span>
            </span>
          )}
          <span className="font-mono text-sm tabular-nums text-ink-2">
            {mm}:{ss}
          </span>
        </div>
      </div>

      {/* body */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {phase === 'idle' && (
          <IdleState onStart={startCall} />
        )}

        {phase === 'connecting' && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-6 items-end gap-1 text-live">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s`, height: '40%' }} />
              ))}
            </div>
            <p className="mt-4 font-mono text-sm text-ink-2">
              Connecting… allow microphone access when prompted
            </p>
          </div>
        )}

        {phase === 'unconfigured' && <UnconfiguredState />}

        {phase === 'error' && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-danger/40 bg-danger/10 text-2xl">
              ⚠
            </div>
            <p className="mt-4 max-w-sm text-sm text-ink-2">{errorMsg}</p>
            <Button variant="signal" className="mt-5" onClick={startCall}>
              Try again
            </Button>
          </div>
        )}

        {(phase === 'live' || phase === 'ended') &&
          (transcript.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-mono text-sm text-ink-3">
                {phase === 'live' ? 'Say hello — the AI is listening…' : 'Call ended.'}
              </p>
            </div>
          ) : (
            transcript.map((t, i) => (
              <div
                key={i}
                className={cn('flex', t.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug',
                    t.role === 'agent'
                      ? 'rounded-tl-sm bg-navy-mid text-ink-1'
                      : 'rounded-tr-sm bg-signal text-white',
                  )}
                >
                  {t.content}
                </div>
              </div>
            ))
          ))}
      </div>

      {/* status + controls */}
      {phase === 'live' && (
        <div className="flex items-center gap-2 border-t border-border px-5 py-2">
          {agentTalking ? (
            <span className="flex items-center gap-2 font-mono text-xs text-live">
              <span className="flex h-3.5 items-end gap-[2px]">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s`, height: '35%' }} />
                ))}
              </span>
              AI speaking…
            </span>
          ) : (
            <span className="flex items-center gap-2 font-mono text-xs text-sky">
              <span className="h-2 w-2 rounded-full bg-sky animate-pulse-live" />
              Listening — just talk
            </span>
          )}
        </div>
      )}

      <div className="border-t border-border bg-navy-mid px-4 py-3">
        {phase === 'live' ? (
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-ink-3">
              Your mic is on. Speak naturally.
            </span>
            <Button variant="danger" className="rounded-full px-5" onClick={endCall}>
              End call
            </Button>
          </div>
        ) : phase === 'ended' ? (
          <div className="flex flex-col items-center gap-3 py-1 sm:flex-row sm:justify-between">
            <span className="text-sm text-ink-2">
              That’s CallCatch answering your real phone — 24/7.
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhase('idle')}>
                Call again
              </Button>
              <Link href="/auth/signup">
                <Button variant="primary">Get this for my business →</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-1 text-center font-mono text-xs text-ink-3">
            {phase === 'connecting' ? 'Ringing…' : 'Press “Start voice call” to talk to the AI'}
          </div>
        )}
      </div>
    </div>
  );
}

function IdleState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="relative grid h-20 w-20 place-items-center rounded-full border border-live/40 bg-live/10 text-3xl">
        <span className="absolute inline-flex h-full w-full rounded-full bg-live/20 animate-pulse-ring" />
        🎙
      </div>
      <h3 className="mt-5 text-lg font-700 text-ink-1">Talk to the AI out loud</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-2">
        Start the call and speak into your mic — the AI receptionist answers in a
        natural voice and the conversation transcribes live below.
      </p>
      <Button variant="primary" size="lg" className="mt-6" onClick={onStart}>
        ▶ Start voice call
      </Button>
      <p className="mt-3 font-mono text-[11px] text-ink-3">
        Uses your microphone · best in Chrome, Edge, or Safari
      </p>
    </div>
  );
}

function UnconfiguredState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full border border-warn/40 bg-warn/10 text-2xl">
        🔌
      </div>
      <h3 className="mt-4 text-base font-700 text-ink-1">Live voice isn’t switched on yet</h3>
      <p className="mt-2 max-w-md text-sm text-ink-2">
        Add a Retell agent and set <code className="font-mono text-sky">RETELL_API_KEY</code>{' '}
        and <code className="font-mono text-sky">RETELL_DEMO_AGENT_ID</code> in your
        environment, then redeploy. Until then, use the guided demo tab — it runs the
        same booking flow without a live call.
      </p>
    </div>
  );
}
