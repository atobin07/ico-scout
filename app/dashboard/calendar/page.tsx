'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

interface Account {
  id: string;
  provider: 'google' | 'microsoft';
  account_email: string;
  display_name: string;
  is_primary: boolean;
  calendar_ids: string[];
}

interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  attendees: { email: string; name: string; responseStatus?: string }[];
  video_link: string | null;
  organizer_email: string | null;
  organizer_name: string | null;
  status: string;
  is_all_day: boolean;
  source_account_id: string;
}

interface NewEventForm {
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  video_link: string;
}

const EMPTY_FORM: NewEventForm = {
  title: '', start_time: '', end_time: '',
  location: '', description: '', video_link: '',
};

export default function CalendarPage() {
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [form, setForm] = useState<NewEventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const load = useCallback(async () => {
    const [accRes, evRes] = await Promise.all([
      fetch('/api/calendar/accounts'),
      fetch('/api/calendar/events?days=30'),
    ]);
    setAccounts(await accRes.json());
    setEvents(await evRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) setSyncMsg(`✓ Connected ${connected} account`);
    if (error) setSyncMsg(`✗ Connection failed: ${error}`);
  }, [params]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('Syncing…');
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(`✓ Synced ${data.synced} account(s)${data.errors?.length ? ` — ${data.errors.length} error(s)` : ''}`);
      await load();
    } catch {
      setSyncMsg('✗ Sync failed');
    }
    setSyncing(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/calendar/accounts/${id}`, { method: 'DELETE' });
    setAccounts((a) => a.filter((acc) => acc.id !== id));
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!accounts.length) return;
    setSaving(true);
    await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, source_account_id: accounts[0].id }),
    });
    setForm(EMPTY_FORM);
    setShowNewEvent(false);
    setSaving(false);
    await load();
  }

  function groupByDay(evs: CalEvent[]) {
    const groups: Record<string, CalEvent[]> = {};
    for (const ev of evs) {
      const day = new Date(ev.start_time).toDateString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(ev);
    }
    return groups;
  }

  const grouped = groupByDay(events);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar Sync</h1>
          <p className="text-slate-400 text-sm mt-1">All calendars unified · busy blocks auto-managed</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewEvent(true)}
            className="bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2 rounded-lg text-sm"
          >
            + New Event
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm"
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="mb-6 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">
          {syncMsg}
        </div>
      )}

      {/* Connect accounts */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Connected Accounts</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {loading ? (
            <span className="text-slate-500 text-sm">Loading…</span>
          ) : accounts.length === 0 ? (
            <span className="text-slate-500 text-sm">No accounts connected yet</span>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                <span className="text-lg">{acc.provider === 'google' ? '🔴' : '🔵'}</span>
                <div>
                  <p className="text-sm font-medium text-white">{acc.display_name}</p>
                  <p className="text-xs text-slate-400">{acc.account_email}</p>
                </div>
                <span className="text-xs text-slate-500 ml-1">{acc.calendar_ids?.length ?? 0} calendars</span>
                <button
                  onClick={() => handleDelete(acc.id)}
                  className="text-slate-600 hover:text-red-400 text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <a
            href="/api/calendar/google/connect"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm text-white px-3 py-2 rounded-lg"
          >
            <span>🔴</span> Connect Google
          </a>
          <a
            href="/api/calendar/microsoft/connect"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm text-white px-3 py-2 rounded-lg"
          >
            <span>🔵</span> Connect Microsoft
          </a>
        </div>
      </div>

      {/* Events */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Upcoming Events (30 days)</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-slate-500 text-sm">No upcoming events. Sync your calendars to see events here.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, dayEvents]) => (
              <div key={day}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{day}</p>
                <div className="space-y-2">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full text-left bg-slate-800 border border-slate-700 hover:border-sky-600 rounded-lg px-4 py-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{ev.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {ev.is_all_day ? 'All day' : formatTime(ev.start_time, ev.end_time)}
                            {ev.location ? ` · ${ev.location}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {ev.video_link && (
                            <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Video</span>
                          )}
                          {ev.attendees?.length > 0 && (
                            <span className="text-xs bg-sky-900 text-sky-300 px-2 py-0.5 rounded">
                              {ev.attendees.length} attendees
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-sky-700 px-5 py-4 rounded-t-xl">
              <p className="font-semibold text-white text-lg">{selectedEvent.title}</p>
              <p className="text-sky-200 text-sm mt-1">
                {selectedEvent.is_all_day ? 'All day' : formatTime(selectedEvent.start_time, selectedEvent.end_time)}
              </p>
            </div>
            <div className="p-5 space-y-4">
              {selectedEvent.location && <p className="text-slate-300 text-sm">📍 {selectedEvent.location}</p>}
              {selectedEvent.video_link && (
                <a href={selectedEvent.video_link} target="_blank" rel="noreferrer"
                  className="inline-block bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2 rounded-lg text-sm">
                  Join Meeting →
                </a>
              )}
              {selectedEvent.organizer_name && (
                <p className="text-slate-400 text-sm">Organizer: {selectedEvent.organizer_name}</p>
              )}
              {selectedEvent.attendees?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Attendees</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvent.attendees.map((a, i) => (
                      <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
                        {a.name ?? a.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedEvent.description.substring(0, 600)}</p>
                </div>
              )}
              <button onClick={() => setSelectedEvent(null)} className="text-sm text-slate-500 hover:text-slate-300">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New event modal */}
      {showNewEvent && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowNewEvent(false)}>
          <form
            onSubmit={handleSaveEvent}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-white text-lg">New Event</h2>
            {[
              { label: 'Title *', key: 'title', type: 'text', required: true },
              { label: 'Start', key: 'start_time', type: 'datetime-local', required: true },
              { label: 'End', key: 'end_time', type: 'datetime-local', required: true },
              { label: 'Location', key: 'location', type: 'text' },
              { label: 'Video Link', key: 'video_link', type: 'url' },
            ].map(({ label, key, type, required }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type={type}
                  required={required}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
                {saving ? 'Saving…' : 'Save Event'}
              </button>
              <button type="button" onClick={() => setShowNewEvent(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function formatTime(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${s.toLocaleTimeString('en-US', opts)} – ${e.toLocaleTimeString('en-US', opts)}`;
}
