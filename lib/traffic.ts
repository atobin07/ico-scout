import 'server-only';
import { createServiceSupabase } from './supabase';

type Row = Record<string, any>;

export interface TrafficAnalytics {
  ok: boolean;
  hasData: boolean;
  views30d: number;
  visitors30d: number;
  views7d: number;
  viewsByDay: { day: string; count: number }[];
  topPages: { name: string; value: number }[];
  topReferrers: { name: string; value: number }[];
  devices: { name: string; value: number; color: string }[];
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#4FA3FF',
  mobile: '#00D97E',
  tablet: '#F5A623',
  unknown: '#3A5A7A',
};

function hostOf(ref?: string | null): string {
  if (!ref) return 'Direct / none';
  try {
    return new URL(ref).hostname.replace(/^www\./, '');
  } catch {
    return 'Direct / none';
  }
}

export async function getTrafficAnalytics(): Promise<TrafficAnalytics> {
  const empty: TrafficAnalytics = {
    ok: false, hasData: false, views30d: 0, visitors30d: 0, views7d: 0,
    viewsByDay: [], topPages: [], topReferrers: [], devices: [],
  };

  try {
    const db = createServiceSupabase();
    const since30 = new Date(); since30.setDate(since30.getDate() - 30);
    const { data, error } = await db
      .from('page_views')
      .select('created_at, path, referrer, visitor_id, device')
      .gte('created_at', since30.toISOString())
      .limit(50000);
    if (error) return empty;

    const views: Row[] = data ?? [];
    const views30d = views.length;
    const visitors30d = new Set(views.map((v) => v.visitor_id).filter(Boolean)).size;
    const weekAgo = Date.now() - 7 * 864e5;
    const views7d = views.filter((v) => new Date(v.created_at).getTime() >= weekAgo).length;

    const viewsByDay: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      viewsByDay.push({ day: dayLabel(d), count: views.filter((v) => String(v.created_at).slice(0, 10) === k).length });
    }

    const pageMap: Record<string, number> = {};
    views.forEach((v) => { const p = v.path || '/'; pageMap[p] = (pageMap[p] ?? 0) + 1; });
    const topPages = Object.entries(pageMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    const refMap: Record<string, number> = {};
    views.forEach((v) => { const h = hostOf(v.referrer); refMap[h] = (refMap[h] ?? 0) + 1; });
    const topReferrers = Object.entries(refMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    const devMap: Record<string, number> = {};
    views.forEach((v) => { const d = v.device || 'unknown'; devMap[d] = (devMap[d] ?? 0) + 1; });
    const devices = Object.entries(devMap)
      .map(([name, value]) => ({ name, value, color: DEVICE_COLORS[name] ?? DEVICE_COLORS.unknown }))
      .sort((a, b) => b.value - a.value);

    return { ok: true, hasData: views30d > 0, views30d, visitors30d, views7d, viewsByDay, topPages, topReferrers, devices };
  } catch {
    return empty;
  }
}
