'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const SALES_VOLUME = [
  'Under $10k / month',
  '$10k – $50k / month',
  '$50k – $150k / month',
  '$150k – $500k / month',
  '$500k+ / month',
];

const CALL_VOLUME = [
  'Under 100 / month',
  '100 – 500 / month',
  '500 – 1,500 / month',
  '1,500 – 5,000 / month',
  '5,000+ / month',
];

const TRADES = ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Other'];

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function QuoteForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    trade: '',
    salesVolume: '',
    callsPerMonth: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.phone || !form.salesVolume) {
      setError('Please fill in your name, email, phone, and sales volume.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again, or email us directly.');
    }
  }

  if (status === 'success') {
    return (
      <div className="tape tape-live rounded-2xl border border-live/40 bg-live/10 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-live/40 bg-live/15 text-2xl">
          ✓
        </div>
        <h3 className="mt-4 text-xl font-800 text-ink-1">Thanks, {form.name.split(' ')[0]}!</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
          We’ve got your details and we’ll reach out with a custom quote — the install
          fee and monthly price sized to your call volume — usually within one business day.
        </p>
      </div>
    );
  }

  const inputCls =
    'h-11 w-full rounded-lg border border-border bg-navy-mid px-3 text-sm text-ink-1 placeholder:text-ink-3 focus:border-sky focus:outline-none';

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-navy p-6 sm:p-7"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Jordan Blake" />
        </Field>
        <Field label="Business name">
          <input className={inputCls} value={form.businessName} onChange={set('businessName')} placeholder="Blake Comfort HVAC" />
        </Field>
        <Field label="Email" required>
          <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="you@business.com" />
        </Field>
        <Field label="Phone" required>
          <input className={inputCls} type="tel" value={form.phone} onChange={set('phone')} placeholder="(512) 555-0148" />
        </Field>
        <Field label="Trade">
          <select className={cn(inputCls, !form.trade && 'text-ink-3')} value={form.trade} onChange={set('trade')}>
            <option value="">Select…</option>
            {TRADES.map((t) => (
              <option key={t} value={t} className="text-ink-1">{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Monthly sales volume" required>
          <select className={cn(inputCls, !form.salesVolume && 'text-ink-3')} value={form.salesVolume} onChange={set('salesVolume')}>
            <option value="">Select…</option>
            {SALES_VOLUME.map((v) => (
              <option key={v} value={v} className="text-ink-1">{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Estimated calls per month" className="sm:col-span-2">
          <select className={cn(inputCls, !form.callsPerMonth && 'text-ink-3')} value={form.callsPerMonth} onChange={set('callsPerMonth')}>
            <option value="">Select… (helps us size your quote)</option>
            {CALL_VOLUME.map((v) => (
              <option key={v} value={v} className="text-ink-1">{v}</option>
            ))}
          </select>
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Sending…' : 'Get my custom quote →'}
      </Button>
      <p className="mt-3 text-center text-xs text-ink-3">
        No obligation. We’ll reply with your install fee and monthly price, usually
        within one business day.
      </p>
    </form>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-2">
        {label} {required && <span className="text-sky">*</span>}
      </span>
      {children}
    </label>
  );
}
