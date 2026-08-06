'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const METRICS = [
  'Recovered revenue',
  'Call-to-booking rate',
  'Jobs per technician',
  'Response & ETA times',
  'Customer lifetime value',
  'Peak call hours',
];

const initial = {
  businessName: '',
  ownerName: '',
  email: '',
  technicians: '',
  baseAddress: '',
  liveTracking: 'Yes — track my crew live',
  trackingHours: '',
  alertsTo: 'Text',
  notes: '',
};

export function DispatchSetupForm() {
  const [form, setForm] = useState(initial);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof initial) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleMetric = (m: string) =>
    setMetrics((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.businessName || !form.email) {
      setError('Please add your business name and email so we can match your account.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/onboarding/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, metrics }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
    } catch {
      setStatus('error');
      setError('Something went wrong — please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="tape tape-live rounded-2xl border border-live/40 bg-live/10 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-live/40 bg-live/15 text-2xl">
          ✓
        </div>
        <h3 className="mt-4 text-xl font-800 text-ink-1">Got it, {form.ownerName.split(' ')[0] || 'thanks'}!</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
          We’ll set up your live dispatch map and analytics and email you when your
          upgraded dashboard is ready — usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="Confirm your account" step="1">
        <Field label="Business name" required>
          <Input value={form.businessName} onChange={set('businessName')} placeholder="Bell Comfort HVAC" />
        </Field>
        <Field label="Your name">
          <Input value={form.ownerName} onChange={set('ownerName')} placeholder="Marcus Bell" />
        </Field>
        <Field label="Account email" required full>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="you@business.com" />
        </Field>
      </Section>

      <Section title="Your crew" step="2">
        <Field label="Your technicians — one per line (name · cell · trade)" full>
          <Textarea
            value={form.technicians}
            onChange={set('technicians')}
            placeholder={'Jordan Blake · (512) 555-0148 · HVAC\nSam Rivera · (512) 555-0199 · Install'}
            rows={4}
          />
        </Field>
        <Field label="Office / base address (map center)" full>
          <Input value={form.baseAddress} onChange={set('baseAddress')} placeholder="1200 Trade St, Austin, TX" />
        </Field>
      </Section>

      <Section title="Live tracking" step="3">
        <Field label="Track technician locations live?">
          <Select
            value={form.liveTracking}
            onChange={set('liveTracking')}
            options={['Yes — track my crew live', 'No — schedule view only']}
          />
        </Field>
        <Field label="During which hours?">
          <Input value={form.trackingHours} onChange={set('trackingHours')} placeholder="Business hours only" />
        </Field>
        <p className="text-xs leading-relaxed text-ink-3 sm:col-span-2">
          Live tracking uses your technicians’ phones (with their consent) to show their
          location on your Mapbox dispatch map and auto-calculate customer ETAs.
        </p>
      </Section>

      <Section title="What you want to track" step="4">
        <div className="sm:col-span-2">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-2">
            Pick what matters most (we’ll surface it on your dashboard)
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {METRICS.map((m) => {
              const on = metrics.includes(m);
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => toggleMetric(m)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    on
                      ? 'border-live/50 bg-live/10 text-ink-1'
                      : 'border-border bg-navy-mid text-ink-2 hover:border-border-2',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-4 w-4 place-items-center rounded border text-[10px]',
                      on ? 'border-live bg-live text-midnight' : 'border-border-2',
                    )}
                  >
                    {on ? '✓' : ''}
                  </span>
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Send dispatch alerts via">
          <Select value={form.alertsTo} onChange={set('alertsTo')} options={['Text', 'Email', 'Both']} />
        </Field>
        <Field label="Anything else?" full>
          <Textarea value={form.notes} onChange={set('notes')} placeholder="Zones, crews, special requests…" rows={3} />
        </Field>
      </Section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Turn on dispatch & analytics →'}
        </Button>
        <p className="mt-3 text-xs text-ink-3">
          We handle the setup — your upgraded dashboard is usually ready within one business day.
        </p>
      </div>
    </form>
  );
}

/* ---- primitives ---- */
const inputCls =
  'w-full rounded-lg border border-border bg-navy-mid px-3 text-sm text-ink-1 placeholder:text-ink-3 focus:border-sky focus:outline-none';

function Section({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-navy p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-signal/20 font-mono text-xs font-600 text-sky">
          {step}
        </span>
        <h3 className="text-base font-700 text-ink-1">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block', full && 'sm:col-span-2')}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-2">
        {label} {required && <span className="text-sky">*</span>}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, 'h-11')} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, 'resize-none py-2')} />;
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={onChange} className={cn(inputCls, 'h-11', !value && placeholder ? 'text-ink-3' : 'text-ink-1')}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o} className="text-ink-1">
          {o}
        </option>
      ))}
    </select>
  );
}
