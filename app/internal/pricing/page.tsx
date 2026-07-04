'use client';

import { useState } from 'react';
import { Button, StatBlock, Logo } from '@/components/ui';

interface Pricing {
  callsPerMonth: number;
  costPerMin: number;
  voiceTier: string;
  tier: { name: string; monthly: number; includedCalls: number; overagePerCall: number; installFee: number };
  recommendedByOverage: boolean;
  estMonthlyCogs: number;
  monthlyRevenue: number;
  grossProfit: number;
  marginPct: number;
  installFee: number;
  perCallCost: number;
  perCallPrice: number;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * Private internal pricing tool (passcode-gated). Not linked anywhere public.
 * All cost/margin math happens server-side in /api/internal/pricing.
 */
export default function InternalPricingPage() {
  const [passcode, setPasscode] = useState('');
  const [calls, setCalls] = useState(300);
  const [minutes, setMinutes] = useState(3);
  const [voice, setVoice] = useState<'premium' | 'standard'>('premium');
  const [result, setResult] = useState<Pricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/internal/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, callsPerMonth: calls, avgCallMinutes: minutes, voiceTier: voice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed');
        setResult(null);
      } else {
        setResult(data.pricing);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'h-10 w-full rounded-lg border border-border bg-navy-mid px-3 text-sm text-ink-1 focus:border-sky focus:outline-none';

  return (
    <main className="min-h-screen bg-midnight px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="font-mono text-xs uppercase tracking-wider text-warn">Internal · private</span>
        </div>

        <h1 className="mt-8 text-2xl font-800 text-ink-1">Pricing &amp; margin calculator</h1>
        <p className="mt-1 text-sm text-ink-2">
          Model any customer’s volume to see your cost, recommended plan, and margin.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-navy p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-2">Passcode</span>
              <input className={inputCls} type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="ADMIN_PASSCODE" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-2">Voice / LLM tier</span>
              <select className={inputCls} value={voice} onChange={(e) => setVoice(e.target.value as 'premium' | 'standard')}>
                <option value="premium">Premium (ElevenLabs + GPT-4.1) ~$0.18/min</option>
                <option value="standard">Standard (platform voice) ~$0.125/min</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-2">Calls / month</span>
              <input className={inputCls} type="number" value={calls} onChange={(e) => setCalls(Number(e.target.value))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-2">Avg call minutes</span>
              <input className={inputCls} type="number" step="0.5" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </label>
          </div>
          <Button variant="signal" className="mt-5" onClick={run} disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate'}
          </Button>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-signal/40 bg-signal/5 p-5">
              <div className="text-xs uppercase tracking-wider text-sky">Recommended</div>
              <div className="mt-1 text-xl font-800 text-ink-1">
                {result.tier.name} — {usd(result.tier.monthly)}/mo + {usd(result.installFee)} install
              </div>
              <div className="mt-1 font-mono text-sm text-ink-2">
                {result.tier.includedCalls} calls incl · {usd(result.tier.overagePerCall)}/call overage
                {result.recommendedByOverage && <span className="text-warn"> · volume exceeds bucket</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBlock label="Your cost / mo" value={usd(result.estMonthlyCogs)} tone="warn" />
              <StatBlock label="Revenue / mo" value={usd(result.monthlyRevenue)} tone="signal" />
              <StatBlock label="Gross profit / mo" value={usd(result.grossProfit)} tone="live" />
              <StatBlock label="Margin" value={`${Math.round(result.marginPct * 100)}%`} tone={result.marginPct >= 0.6 ? 'live' : result.marginPct >= 0.4 ? 'warn' : 'default'} />
            </div>
            <div className="rounded-xl border border-border bg-navy px-4 py-3 font-mono text-xs text-ink-2">
              per-call cost {usd(result.perCallCost)} · per-call price {usd(result.perCallPrice)} · {result.voiceTier} voice @ ${result.costPerMin}/min
            </div>
          </div>
        )}

        <p className="mt-8 text-center font-mono text-[11px] text-ink-3">
          This page is not linked publicly. Set <span className="text-sky">ADMIN_PASSCODE</span> to enable it.
        </p>
      </div>
    </main>
  );
}
