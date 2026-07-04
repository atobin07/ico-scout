'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { cn, formatUsd } from '@/lib/utils';

const TRADES = ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Other'];

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Dual-purpose lead tool.
 *  Front end (this component): shows the PROSPECT their recovered-revenue upside.
 *  Back end (server, on submit): /api/quote uses the same inputs to compute OUR
 *  cost, recommended price, and margin — emailed to us, never shown here.
 * No cost/margin math lives in this client file.
 */
export function RoiQuote() {
  const [calls, setCalls] = useState(300);
  const [missedPct, setMissedPct] = useState(30);
  const [jobValue, setJobValue] = useState(400);
  const [closeRate, setCloseRate] = useState(35);

  const [contact, setContact] = useState({ name: '', email: '', phone: '', businessName: '', trade: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const roi = useMemo(() => {
    const missed = Math.round((calls * missedPct) / 100);
    const booked = (missed * closeRate) / 100;
    const monthly = booked * jobValue;
    return {
      missed,
      bookedPerMonth: Math.round(booked),
      monthly: Math.round(monthly),
      annual: Math.round(monthly * 12),
    };
  }, [calls, missedPct, jobValue, closeRate]);

  const setC = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setContact((c) => ({ ...c, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contact.name || !contact.email || !contact.phone) {
      setError('Please add your name, email, and phone so we can send your quote.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contact,
          callsPerMonth: calls,
          missedPct,
          avgJobValue: jobValue,
          closeRate,
          estRecoveredAnnual: roi.annual,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
    } catch {
      setStatus('error');
      setError('Something went wrong — please try again.');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ---------- Calculator (public value) ---------- */}
      <div className="rounded-2xl border border-border bg-navy p-6 sm:p-7">
        <div className="font-mono text-xs uppercase tracking-wider text-sky">
          Revenue calculator
        </div>
        <h3 className="mt-2 text-lg font-700 text-ink-1">
          See what missed calls are costing you
        </h3>

        <div className="mt-6 space-y-5">
          <Slider label="Calls you get per month" value={calls} min={20} max={2000} step={10}
            display={calls.toLocaleString()} onChange={setCalls} />
          <Slider label="% you currently miss" value={missedPct} min={5} max={70} step={1}
            display={`${missedPct}%`} onChange={setMissedPct} />
          <Slider label="Average job value" value={jobValue} min={100} max={3000} step={50}
            display={formatUsd(jobValue)} onChange={setJobValue} />
          <Slider label="% of answered calls that book" value={closeRate} min={5} max={80} step={1}
            display={`${closeRate}%`} onChange={setCloseRate} />
        </div>

        {/* Result */}
        <div className="tape tape-live mt-7 rounded-xl border border-live/40 bg-live/10 p-5">
          <div className="text-xs uppercase tracking-wider text-ink-2">
            Revenue CallCatch could recover
          </div>
          <div className="mt-1 font-mono text-4xl font-800 text-live">
            {formatUsd(roi.annual)}<span className="text-lg text-ink-2">/yr</span>
          </div>
          <div className="mt-1 font-mono text-sm text-ink-2">
            {formatUsd(roi.monthly)}/mo · ~{roi.bookedPerMonth} jobs booked from the{' '}
            {roi.missed} calls you miss today
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Estimate only, based on the numbers you enter. Your custom price is a small
          fraction of this — request it on the right.
        </p>
      </div>

      {/* ---------- Contact / quote request ---------- */}
      <div>
        {status === 'success' ? (
          <div className="tape tape-live flex h-full flex-col justify-center rounded-2xl border border-live/40 bg-live/10 p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-live/40 bg-live/15 text-2xl">
              ✓
            </div>
            <h3 className="mt-4 text-xl font-800 text-ink-1">
              Thanks, {contact.name.split(' ')[0]}!
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
              We’ll send your custom quote — install fee and monthly price sized to
              your volume — usually within one business day.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-navy p-6 sm:p-7">
            <h3 className="text-lg font-700 text-ink-1">Get your custom quote</h3>
            <p className="mt-1 text-sm text-ink-2">
              We’ll price it to the volume above and get back to you fast.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" required value={contact.name} onChange={setC('name')} placeholder="Jordan Blake" />
              <Input label="Business" value={contact.businessName} onChange={setC('businessName')} placeholder="Blake Comfort HVAC" />
              <Input label="Email" required type="email" value={contact.email} onChange={setC('email')} placeholder="you@business.com" />
              <Input label="Phone" required type="tel" value={contact.phone} onChange={setC('phone')} placeholder="(512) 555-0148" />
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-2">Trade</span>
                <select
                  value={contact.trade}
                  onChange={setC('trade')}
                  className={cn(
                    'h-11 w-full rounded-lg border border-border bg-navy-mid px-3 text-sm focus:border-sky focus:outline-none',
                    contact.trade ? 'text-ink-1' : 'text-ink-3',
                  )}
                >
                  <option value="">Select…</option>
                  {TRADES.map((t) => (
                    <option key={t} value={t} className="text-ink-1">{t}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <Button type="submit" variant="primary" size="lg" className="mt-6 w-full" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending…' : 'Get my custom quote →'}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-3">
              No obligation. One-time install + flat monthly, sized to your volume.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, display, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-2">{label}</span>
        <span className="font-mono text-sm font-600 text-ink-1">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border-2 accent-[#1B54E8]"
      />
    </div>
  );
}

function Input({
  label, required, ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-2">
        {label} {required && <span className="text-sky">*</span>}
      </span>
      <input
        {...props}
        className="h-11 w-full rounded-lg border border-border bg-navy-mid px-3 text-sm text-ink-1 placeholder:text-ink-3 focus:border-sky focus:outline-none"
      />
    </label>
  );
}
