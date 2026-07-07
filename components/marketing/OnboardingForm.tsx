'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { TRADE_OPTIONS } from '@/types';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const initial = {
  businessName: '',
  ownerName: '',
  cellPhone: '',
  email: '',
  trade: '',
  services: '',
  serviceArea: '',
  hours: '',
  voiceGender: '',
  tone: '',
  greeting: '',
  specialInstructions: '',
  availability: '',
  pricing: '',
  alertsTo: 'Text',
  businessNumber: '',
};

export function OnboardingForm() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof initial) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.businessName || !form.ownerName || !form.cellPhone || !form.email || !form.businessNumber) {
      setError('Please fill in your business name, your name, cell, email, and business number.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
        <h3 className="mt-4 text-xl font-800 text-ink-1">You’re all set, {form.ownerName.split(' ')[0]}!</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
          We’ve got everything we need. Our team is building your AI receptionist now —
          we’ll email you within 48 hours to set up your quick preview call. Sit tight,
          there’s nothing else for you to do.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="About you" step="1">
        <Field label="Business name" required>
          <Input value={form.businessName} onChange={set('businessName')} placeholder="Bell Comfort HVAC" />
        </Field>
        <Field label="Your name" required>
          <Input value={form.ownerName} onChange={set('ownerName')} placeholder="Marcus Bell" />
        </Field>
        <Field label="Best cell for job alerts" required>
          <Input type="tel" value={form.cellPhone} onChange={set('cellPhone')} placeholder="(512) 555-0148" />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="you@business.com" />
        </Field>
      </Section>

      <Section title="Your work" step="2">
        <Field label="Trade">
          <Select value={form.trade} onChange={set('trade')} placeholder="Select…" options={TRADE_OPTIONS} />
        </Field>
        <Field label="Services you offer">
          <Input value={form.services} onChange={set('services')} placeholder="Repairs, installs, maintenance…" />
        </Field>
        <Field label="Areas / cities you serve">
          <Input value={form.serviceArea} onChange={set('serviceArea')} placeholder="Austin & surrounding" />
        </Field>
        <Field label="Typical hours (we answer 24/7)">
          <Input value={form.hours} onChange={set('hours')} placeholder="Mon–Sat 7a–6p" />
        </Field>
      </Section>

      <Section title="How it should sound" step="3">
        <Field label="Voice">
          <Select
            value={form.voiceGender}
            onChange={set('voiceGender')}
            placeholder="No preference"
            options={['Female', 'Male']}
          />
        </Field>
        <Field label="Personality / tone">
          <Select
            value={form.tone}
            onChange={set('tone')}
            placeholder="Select…"
            options={['Warm & friendly', 'Professional & polished', 'Casual & down-to-earth', 'Energetic & upbeat']}
          />
        </Field>
        <Field label="How should it greet callers?" full>
          <Input
            value={form.greeting}
            onChange={set('greeting')}
            placeholder="Thanks for calling Bell Comfort, this is Sarah…"
          />
        </Field>
        <Field label="Anything specific it should say or ask?" full>
          <Textarea
            value={form.specialInstructions}
            onChange={set('specialInstructions')}
            placeholder="e.g. always ask if it's an emergency; mention our $59 service call…"
          />
        </Field>
      </Section>

      <Section title="Booking rules" step="4">
        <Field label="How soon can you usually get out?">
          <Input value={form.availability} onChange={set('availability')} placeholder="Same-day / next-day / emergencies" />
        </Field>
        <Field label="Pricing to mention?">
          <Input value={form.pricing} onChange={set('pricing')} placeholder="Or leave blank — tech quotes on-site" />
        </Field>
        <Field label="Send job alerts via">
          <Select value={form.alertsTo} onChange={set('alertsTo')} options={['Text', 'Email', 'Both']} />
        </Field>
        <Field label="Business number to answer" required>
          <Input type="tel" value={form.businessNumber} onChange={set('businessNumber')} placeholder="(512) 555-0100" />
        </Field>
      </Section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Submit & start setup →'}
        </Button>
        <p className="mt-3 text-xs text-ink-3">
          That’s everything we need. We build it, test it with you, and turn it on — usually within 48 hours.
        </p>
      </div>
    </form>
  );
}

/* ---- primitives ---- */
const inputCls =
  'h-11 w-full rounded-lg border border-border bg-navy-mid px-3 text-sm text-ink-1 placeholder:text-ink-3 focus:border-sky focus:outline-none';

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
  return <input {...props} className={inputCls} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={3} className={cn(inputCls, 'h-auto py-2 resize-none')} />;
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
    <select value={value} onChange={onChange} className={cn(inputCls, !value && placeholder ? 'text-ink-3' : 'text-ink-1')}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o} className="text-ink-1">
          {o}
        </option>
      ))}
    </select>
  );
}
