'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { cn, formatUsd } from '@/lib/utils';
import { primeVoices, speakText, cancelSpeech } from '@/lib/tts';
import {
  SCENARIOS,
  scenarioById,
  greeting,
  initialState,
  respond,
  type Booking,
  type BotState,
  type Scenario,
} from '@/lib/demo-engine';

type CallState = 'idle' | 'connecting' | 'active' | 'ended';
type Msg = { id: number; role: 'agent' | 'caller'; text: string };

const ACCENT_TEXT: Record<string, string> = {
  danger: 'text-danger',
  warn: 'text-warn',
  signal: 'text-sky',
  live: 'text-live',
};

export function DemoExperience({ initialScenarioId }: { initialScenarioId?: string }) {
  const [scenarioId, setScenarioId] = useState<string | undefined>(
    scenarioById(initialScenarioId)?.id,
  );
  const scenario = useMemo(() => scenarioById(scenarioId), [scenarioId]);

  const [callState, setCallState] = useState<CallState>('idle');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [input, setInput] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micSupported, setMicSupported] = useState(false);

  const botRef = useRef<BotState>(initialState(scenarioId));
  const idRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  /* ---- feature detection + preload TTS voices ---- */
  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setMicSupported(Boolean(Ctor));
    primeVoices();
  }, []);

  /* ---- call timer ---- */
  useEffect(() => {
    if (callState !== 'active') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callState]);

  /* ---- autoscroll ---- */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, booking]);

  /* ---- text-to-speech (best available natural voice) ---- */
  const speak = useCallback((text: string) => {
    if (!voiceOnRef.current) return;
    speakText(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, []);

  const pushMsg = useCallback((role: 'agent' | 'caller', text: string) => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: idRef.current, role, text }]);
  }, []);

  /* ---- core: caller says something ---- */
  const sendMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      pushMsg('caller', text);
      setInput('');

      const result = respond(botRef.current, text);
      botRef.current = result.state;

      // Small, human-feeling pause before the AI replies.
      window.setTimeout(() => {
        pushMsg('agent', result.reply);
        speak(result.reply);
        if (result.booking) setBooking(result.booking);
      }, 550);
    },
    [pushMsg, speak],
  );

  /* ---- start / end call ---- */
  const startCall = useCallback(() => {
    setCallState('connecting');
    setMessages([]);
    setBooking(null);
    setSeconds(0);
    botRef.current = initialState(scenarioId);
    window.setTimeout(() => {
      setCallState('active');
      const g = greeting(scenario);
      pushMsg('agent', g);
      speak(g);
    }, 900);
  }, [scenarioId, scenario, pushMsg, speak]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const endCall = useCallback(() => {
    stopListening();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setSpeaking(false);
    setCallState('ended');
  }, [stopListening]);

  const reset = useCallback(() => {
    setCallState('idle');
    setMessages([]);
    setBooking(null);
    setSeconds(0);
    botRef.current = initialState(scenarioId);
  }, [scenarioId]);

  /* ---- microphone (Web Speech API) ---- */
  const startListening = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (final) {
        setInput('');
        setListening(false);
        sendMessage(final);
      } else {
        setInput(interim);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    // Stop any TTS so the mic doesn't hear the AI.
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setInput('');
    setListening(true);
    rec.start();
  }, [sendMessage]);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  /* ---- cleanup ---- */
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const company = scenario?.company ?? 'Precision Home Services';

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      {/* ---------------- Left rail ---------------- */}
      <aside className="flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-navy p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-3">
            Choose a scenario
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {SCENARIOS.map((s: Scenario) => (
              <button
                key={s.id}
                disabled={callState === 'active' || callState === 'connecting'}
                onClick={() => {
                  setScenarioId(s.id);
                  botRef.current = initialState(s.id);
                }}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40',
                  scenarioId === s.id
                    ? 'border-signal bg-signal/10 text-ink-1'
                    : 'border-border bg-navy-mid text-ink-2 hover:border-border-2 hover:text-ink-1',
                )}
              >
                <span>
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-xs text-ink-3">{s.blurb}</span>
                </span>
                <span className={cn('font-mono text-xs', ACCENT_TEXT[s.accent])}>
                  {s.trade}
                </span>
              </button>
            ))}
            <button
              disabled={callState === 'active' || callState === 'connecting'}
              onClick={() => {
                setScenarioId(undefined);
                botRef.current = initialState(undefined);
              }}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40',
                scenarioId === undefined
                  ? 'border-signal bg-signal/10 text-ink-1'
                  : 'border-border bg-navy-mid text-ink-2 hover:border-border-2 hover:text-ink-1',
              )}
            >
              <span className="font-medium">Free chat</span>
              <span className="block text-xs text-ink-3">Say anything — make one up</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-navy p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Browser voice</span>
            <button
              onClick={() => {
                const next = !voiceOn;
                setVoiceOn(next);
                if (!next) cancelSpeech();
              }}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                voiceOn ? 'bg-live' : 'bg-border-2',
              )}
              aria-pressed={voiceOn}
              aria-label="Toggle AI voice"
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-midnight transition-all',
                  voiceOn ? 'left-[22px]' : 'left-0.5',
                )}
              />
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-3">
            {micSupported
              ? 'Tap the mic and talk, or type. This uses your browser’s built-in voice.'
              : 'Your browser doesn’t support voice input — type to chat.'}{' '}
            For the real, human-sounding AI voice, switch to the{' '}
            <span className="text-live">Live voice</span> tab.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-border-2 bg-navy/50 p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-3">
            Try saying
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
            <li>“My AC just stopped working.”</li>
            <li>“This is Jordan, 22 Oak Street.”</li>
            <li>“As soon as possible, please.”</li>
          </ul>
        </div>
      </aside>

      {/* ---------------- Call panel ---------------- */}
      <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border-2 bg-navy shadow-2xl shadow-black/40">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border bg-navy-mid px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-signal/20 font-mono text-xs font-600 text-sky">
              {company
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')}
            </div>
            <div>
              <div className="text-sm font-600 text-ink-1">{company}</div>
              <div className="font-mono text-[11px] text-ink-3">CallCatch AI receptionist</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {callState === 'active' && (
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

        {/* transcript */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {callState === 'idle' && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-border-2 bg-navy-mid text-2xl">
                📞
              </div>
              <h3 className="mt-5 text-lg font-700 text-ink-1">
                {scenario ? `${scenario.label} — ${scenario.trade}` : 'Ready when you are'}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-ink-2">
                Start the call and the AI receptionist will pick up. Answer its
                questions and watch it book the job in real time.
              </p>
              <Button variant="primary" size="lg" className="mt-6" onClick={startCall}>
                ▶ Start the call
              </Button>
            </div>
          )}

          {callState === 'connecting' && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-6 items-end gap-1 text-sky">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s`, height: '40%' }} />
                ))}
              </div>
              <p className="mt-4 font-mono text-sm text-ink-2">Connecting…</p>
            </div>
          )}

          {(callState === 'active' || callState === 'ended') &&
            messages.map((m) => (
              <div
                key={m.id}
                style={{ animation: 'convo-in 0.35s ease-out both' }}
                className={cn('flex', m.role === 'caller' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug',
                    m.role === 'agent'
                      ? 'rounded-tl-sm bg-navy-mid text-ink-1'
                      : 'rounded-tr-sm bg-signal text-white',
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}

          {/* inline booking confirmation */}
          {booking && (
            <div
              style={{ animation: 'convo-in 0.4s ease-out both' }}
              className="tape tape-live rounded-xl border border-live/40 bg-live/10 p-4"
            >
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-live">
                <span>✓ Job booked</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Field label="Customer" value={booking.name} />
                <Field label="Job" value={booking.jobType} />
                <Field label="Address" value={booking.address} />
                <Field label="Window" value={booking.window} />
                <Field label="Est. value" value={formatUsd(booking.estValue)} accent />
                <Field label="Confirmation" value="SMS sent ✓" accent />
              </div>
            </div>
          )}
        </div>

        {/* speaking / listening status bar */}
        {callState === 'active' && (
          <div className="flex items-center gap-2 border-t border-border px-5 py-2">
            {speaking ? (
              <span className="flex items-center gap-2 font-mono text-xs text-live">
                <span className="flex h-3.5 items-end gap-[2px] text-live">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s`, height: '35%' }} />
                  ))}
                </span>
                AI speaking…
              </span>
            ) : listening ? (
              <span className="flex items-center gap-2 font-mono text-xs text-sky">
                <span className="h-2 w-2 rounded-full bg-sky animate-pulse-live" />
                Listening…
              </span>
            ) : (
              <span className="font-mono text-xs text-ink-3">Your turn — talk or type</span>
            )}
          </div>
        )}

        {/* input bar */}
        <div className="border-t border-border bg-navy-mid px-4 py-3">
          {callState === 'active' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={listening ? 'Stop listening' : 'Start talking'}
                  className={cn(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors',
                    listening
                      ? 'border-live bg-live text-midnight animate-pulse-live'
                      : 'border-border-2 bg-navy text-ink-1 hover:border-sky hover:text-sky',
                  )}
                >
                  <span className="text-lg">🎙</span>
                </button>
              )}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? 'Listening…' : 'Type your reply…'}
                className="h-11 flex-1 rounded-full border border-border bg-navy px-4 text-sm text-ink-1 placeholder:text-ink-3 focus:border-sky focus:outline-none"
              />
              <Button type="submit" variant="signal" className="h-11 rounded-full px-5" disabled={!input.trim()}>
                Send
              </Button>
              <Button type="button" variant="danger" className="h-11 rounded-full px-4" onClick={endCall}>
                End
              </Button>
            </form>
          ) : callState === 'ended' ? (
            <div className="flex flex-col items-center gap-3 py-2 sm:flex-row sm:justify-between">
              <div className="text-sm text-ink-2">
                {booking
                  ? 'That’s exactly how CallCatch answers, qualifies, and books — 24/7.'
                  : 'Call ended. Start another to see the AI book a job.'}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={reset}>
                  Try again
                </Button>
                <Link href="/auth/signup">
                  <Button variant="primary">Get this for my business →</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center font-mono text-xs text-ink-3">
              {callState === 'connecting' ? 'Ringing…' : 'Press “Start the call” to begin'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={cn('mt-0.5 text-sm', accent ? 'font-mono text-live' : 'text-ink-1')}>
        {value}
      </div>
    </div>
  );
}
