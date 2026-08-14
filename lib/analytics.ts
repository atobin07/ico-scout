import 'server-only';
import { createServiceSupabase } from './supabase';
import { PIPELINE_STAGES, LEAD_STATUS_LABELS, type LeadStatus } from './lead-status';

type Row = Record<string, any>;

export interface BusinessAnalytics {
  ok: boolean;
  // headline KPIs
  totalLeads: number;
  newLeads: number;
  leads7d: number;
  wonLeads: number;
  conversionPct: number;
  callsAnswered: number;
  callsMissed: number;
  bookingRatePct: number;
  bookedRevenue: number;
  upcomingAppointments: number;
  clients: number;
  // breakdowns
  pipeline: { label: string; count: number }[];
  leadsByDay: { day: string; count: number }[];
  leadsByTrade: { name: string; value: number }[];
  leadsByKind: { name: string; value: number; color: string }[];
  revenueByDay: { day: string; revenue: number }[];
  callOutcomes: { name: string; value: number; color: string }[];
  callsByHour: { hour: string; count: number }[];
  appointmentsByType: { name: string; value: number }[];
}

const OUTCOME_COLORS: Record<string, string> = {
  booked: '#00D97E',
  quoted: '#4FA3FF',
  callback: '#F5A623',
  missed: '#E24B4A',
  no_action: '#3A5A7A',
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

export async function getBusinessAnalytics(): Promise<BusinessAnalytics> {
  const empty: BusinessAnalytics = {
    ok: false,
    totalLeads: 0, newLeads: 0, leads7d: 0, wonLeads: 0, conversionPct: 0,
    callsAnswered: 0, callsMissed: 0, bookingRatePct: 0, bookedRevenue: 0,
    upcomingAppointments: 0, clients: 0,
    pipeline: [], leadsByDay: [], leadsByTrade: [], leadsByKind: [],
    revenueByDay: [], callOutcomes: [], callsByHour: [], appointmentsByType: [],
  };

  try {
    const db = createServiceSupabase();
    const since30 = new Date(); since30.setDate(since30.getDate() - 30);

    const [leadsRes, callsRes, apptRes, bizRes] = await Promise.all([
      db.from('leads').select('created_at, kind, trade, status').limit(5000),
      db.from('calls').select('created_at, outcome, status, estimated_value, duration_seconds').gte('created_at', since30.toISOString()).limit(5000),
      db.from('appointments').select('scheduled_at, job_type, status, estimated_value').limit(5000),
      db.from('businesses').select('id').limit(5000),
    ]);

    const leads: Row[] = leadsRes.data ?? [];
    const calls: Row[] = callsRes.data ?? [];
    const appts: Row[] = apptRes.data ?? [];
    const clients = (bizRes.data ?? []).length;

    // ---- Leads ----
    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === 'new').length;
    const wonLeads = leads.filter((l) => l.status === 'sale_made').length;
    const weekAgo = Date.now() - 7 * 864e5;
    const leads7d = leads.filter((l) => new Date(l.created_at).getTime() >= weekAgo).length;
    const conversionPct = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const statusCount = (s: LeadStatus) => leads.filter((l) => l.status === s).length;
    const pipeline = (['new', ...PIPELINE_STAGES] as LeadStatus[]).map((s) => ({
      label: LEAD_STATUS_LABELS[s], count: statusCount(s),
    }));

    const leadsByDay: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      leadsByDay.push({ day: dayLabel(d), count: leads.filter((l) => String(l.created_at).slice(0, 10) === k).length });
    }

    const tradeMap: Record<string, number> = {};
    leads.forEach((l) => { const t = (l.trade || 'Unspecified').trim(); tradeMap[t] = (tradeMap[t] ?? 0) + 1; });
    const leadsByTrade = Object.entries(tradeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    const quotes = leads.filter((l) => l.kind === 'quote').length;
    const intakes = leads.filter((l) => l.kind === 'onboarding').length;
    const leadsByKind = [
      { name: 'Quote requests', value: quotes, color: '#4FA3FF' },
      { name: 'Get-started intakes', value: intakes, color: '#00D97E' },
    ].filter((d) => d.value > 0);

    // ---- Calls ----
    const answered = calls.filter((c) => c.status !== 'missed');
    const booked = calls.filter((c) => c.outcome === 'booked');
    const callsAnswered = answered.length;
    const callsMissed = calls.filter((c) => c.status === 'missed' || c.outcome === 'missed').length;
    const bookingRatePct = callsAnswered ? Math.round((booked.length / callsAnswered) * 100) : 0;
    const bookedRevenue = booked.reduce((s, c) => s + (Number(c.estimated_value) || 0), 0);

    const revenueByDay: { day: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      revenueByDay.push({
        day: dayLabel(d),
        revenue: booked.filter((c) => String(c.created_at).slice(0, 10) === k).reduce((s, c) => s + (Number(c.estimated_value) || 0), 0),
      });
    }

    const outcomeMap: Record<string, number> = {};
    calls.forEach((c) => { const o = c.outcome ?? 'no_action'; outcomeMap[o] = (outcomeMap[o] ?? 0) + 1; });
    const callOutcomes = Object.entries(outcomeMap)
      .map(([name, value]) => ({ name: name.replace('_', ' '), value, color: OUTCOME_COLORS[name] ?? '#7A9ABE' }))
      .sort((a, b) => b.value - a.value);

    const callsByHour = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}`, count: 0 }));
    calls.forEach((c) => { const h = new Date(c.created_at).getHours(); if (callsByHour[h]) callsByHour[h].count += 1; });

    // ---- Appointments ----
    const now = Date.now();
    const upcomingAppointments = appts.filter((a) => new Date(a.scheduled_at).getTime() >= now).length;
    const typeMap: Record<string, number> = {};
    appts.forEach((a) => { const t = (a.job_type || 'Other').trim(); typeMap[t] = (typeMap[t] ?? 0) + 1; });
    const appointmentsByType = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    return {
      ok: true,
      totalLeads, newLeads, leads7d, wonLeads, conversionPct,
      callsAnswered, callsMissed, bookingRatePct, bookedRevenue,
      upcomingAppointments, clients,
      pipeline, leadsByDay, leadsByTrade, leadsByKind,
      revenueByDay, callOutcomes, callsByHour, appointmentsByType,
    };
  } catch {
    return empty;
  }
}
