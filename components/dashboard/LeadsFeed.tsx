'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui';
import {
  LeadStatus,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONE,
  PIPELINE_STAGES,
} from '@/lib/lead-status';

export interface LeadRow {
  id: string;
  created_at: string;
  kind: 'quote' | 'onboarding';
  name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  trade: string | null;
  message: string | null;
  status: LeadStatus;
  payload: Record<string, any> | null;
}

/** Pretty labels for the raw form fields stored in payload. */
const FIELD_LABELS: Record<string, string> = {
  businessName: 'Business',
  ownerName: 'Owner',
  cellPhone: 'Cell (job alerts)',
  businessNumber: 'Business number',
  serviceArea: 'Service area',
  services: 'Services',
  hours: 'Hours',
  voiceGender: 'Voice preference',
  tone: 'Tone',
  greeting: 'Greeting',
  specialInstructions: 'Special instructions',
  availability: 'Availability',
  pricing: 'Pricing',
  alertsTo: 'Send alerts via',
  callsPerMonth: 'Calls / month',
  missedPct: '% missed',
  avgJobValue: 'Avg job value',
  closeRate: 'Close rate',
  estRecoveredAnnual: 'Est. recovered / yr',
};

// Shown in the header/contact block already — don't repeat in the detail grid.
const SKIP_IN_DETAIL = new Set(['businessName', 'ownerName', 'name', 'email', 'phone', 'cellPhone']);

function labelFor(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function fmtDateTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function detailEntries(lead: LeadRow): [string, string][] {
  const p = lead.payload ?? {};
  return Object.entries(p)
    .filter(([k, v]) => !SKIP_IN_DETAIL.has(k) && v != null && String(v).trim() !== '')
    .map(([k, v]) => [labelFor(k), String(v)]);
}

export function LeadsFeed({ leads: initial }: { leads: LeadRow[] }) {
  const [leads, setLeads] = useState<LeadRow[]>(initial);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = useMemo(() => leads.filter((l) => l.status !== 'archived'), [leads]);
  const archived = useMemo(() => leads.filter((l) => l.status === 'archived'), [leads]);
  const visible = showArchived ? archived : active;
  const newCount = active.filter((l) => l.status === 'new').length;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function setStatus(id: string, status: LeadStatus) {
    setBusyId(id);
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l))); // optimistic
    try {
      const res = await fetch(`/api/ops/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setLeads(prev); // roll back on failure
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* Summary + archived toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-ink-2">
          <span className="font-mono text-ink-1">{active.length}</span> active
          {newCount > 0 && (
            <>
              {' · '}
              <span className="font-mono text-sky">{newCount}</span> new
            </>
          )}
          {archived.length > 0 && (
            <>
              {' · '}
              <span className="font-mono text-ink-3">{archived.length}</span> archived
            </>
          )}
        </div>
        {archived.length > 0 && (
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-2 transition-colors hover:text-ink-1"
          >
            {showArchived ? '← Back to active' : `View archived (${archived.length})`}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-navy/50 px-4 py-14 text-center text-sm text-ink-3">
          {showArchived
            ? 'Nothing archived.'
            : 'No leads yet. Every “Get a quote” and “Get started” submission lands here the moment it comes in.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((lead) => {
            const isOpen = expanded.has(lead.id);
            const details = detailEntries(lead);
            const title = lead.name || lead.business_name || 'New lead';
            return (
              <li
                key={lead.id}
                className="overflow-hidden rounded-xl border border-border bg-navy transition-colors hover:border-border-2"
              >
                {/* Collapsed header — click to expand */}
                <button
                  onClick={() => toggle(lead.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Chevron open={isOpen} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {lead.status === 'new' && <span className="h-2 w-2 shrink-0 rounded-full bg-sky" />}
                      <span className="truncate font-medium text-ink-1">{title}</span>
                      {lead.business_name && lead.business_name !== title && (
                        <span className="truncate text-sm text-ink-3">· {lead.business_name}</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-ink-3">
                      {[lead.trade, lead.message].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="text-xs text-ink-3">{fmtDateTime(lead.created_at)}</div>
                  </div>
                  <Badge tone={lead.kind === 'onboarding' ? 'live' : 'sky'} className="hidden shrink-0 md:inline-flex">
                    {lead.kind === 'onboarding' ? 'intake' : 'quote'}
                  </Badge>
                  <Badge tone={LEAD_STATUS_TONE[lead.status]} className="shrink-0">
                    {LEAD_STATUS_LABELS[lead.status]}
                  </Badge>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="border-t border-border px-4 py-4">
                    {/* Contact */}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="text-sky hover:underline">
                          ✉ {lead.email}
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="text-ink-1 hover:underline">
                          ☎ {lead.phone}
                        </a>
                      )}
                      <span className="text-ink-3 sm:hidden">{fmtDateTime(lead.created_at)}</span>
                    </div>

                    {/* All form fields */}
                    {details.length > 0 && (
                      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                        {details.map(([k, v]) => (
                          <div key={k} className="flex flex-col">
                            <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-3">{k}</dt>
                            <dd className="text-sm text-ink-1">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {/* Pipeline control */}
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-3">
                        Where is this lead?
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {PIPELINE_STAGES.map((stage) => {
                          const on = lead.status === stage;
                          return (
                            <button
                              key={stage}
                              disabled={busyId === lead.id}
                              onClick={() => setStatus(lead.id, stage)}
                              className={[
                                'rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50',
                                on
                                  ? 'border-signal bg-signal/15 text-sky'
                                  : 'border-border text-ink-2 hover:border-border-2 hover:text-ink-1',
                              ].join(' ')}
                            >
                              {LEAD_STATUS_LABELS[stage]}
                            </button>
                          );
                        })}
                        <span className="mx-1 h-4 w-px bg-border" />
                        <button
                          disabled={busyId === lead.id}
                          onClick={() => setStatus(lead.id, 'archived')}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-3 transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Archived footer — quick restore */}
                {lead.status === 'archived' && showArchived && (
                  <div className="border-t border-border px-4 py-2 text-right">
                    <button
                      disabled={busyId === lead.id}
                      onClick={() => setStatus(lead.id, 'seen')}
                      className="text-xs text-ink-3 transition-colors hover:text-ink-1 disabled:opacity-50"
                    >
                      Restore to active
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
