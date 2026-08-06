/**
 * The scheduling-guardrail "layer under the voice agent".
 * Decides whether a caller's address is inside the service area and returns
 * only realistic open slots — so the AI can't book jobs the client can't make.
 */
import { haversineMiles, type LatLng } from '@/lib/geo';

export interface SchedulingConfig {
  baseLat?: number;
  baseLng?: number;
  serviceRadiusMiles?: number;
  workDays: number[]; // 0=Sun … 6=Sat
  openHour: number; // local, 24h
  closeHour: number;
  jobDurationMinutes: number;
  bufferMinutes: number; // prep/drive padding between jobs
  maxPerDay: number;
  timezone: string;
}

const DEFAULTS: Omit<SchedulingConfig, 'baseLat' | 'baseLng' | 'serviceRadiusMiles' | 'timezone'> = {
  workDays: [1, 2, 3, 4, 5, 6],
  openHour: 8,
  closeHour: 18,
  jobDurationMinutes: 90,
  bufferMinutes: 30,
  maxPerDay: 8,
};

/** Read a business's scheduling config from settings.scheduling, filling defaults. */
export function getSchedulingConfig(business: {
  settings?: Record<string, unknown> | null;
  timezone?: string | null;
}): SchedulingConfig {
  const s = (business.settings?.scheduling ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : undefined;
  return {
    baseLat: num(s.base_lat),
    baseLng: num(s.base_lng),
    serviceRadiusMiles: num(s.service_radius_miles),
    workDays: Array.isArray(s.work_days) ? (s.work_days as number[]) : DEFAULTS.workDays,
    openHour: num(s.open_hour) ?? DEFAULTS.openHour,
    closeHour: num(s.close_hour) ?? DEFAULTS.closeHour,
    jobDurationMinutes: num(s.job_duration_minutes) ?? DEFAULTS.jobDurationMinutes,
    bufferMinutes: num(s.buffer_minutes) ?? DEFAULTS.bufferMinutes,
    maxPerDay: num(s.max_per_day) ?? DEFAULTS.maxPerDay,
    timezone: (s.timezone as string) || business.timezone || 'America/Chicago',
  };
}

/** Service-area verdict. If no base/radius configured, area isn't enforced. */
export function checkServiceArea(
  cfg: SchedulingConfig,
  point: LatLng,
): { configured: boolean; within: boolean; distanceMiles: number | null } {
  if (cfg.baseLat == null || cfg.baseLng == null || cfg.serviceRadiusMiles == null) {
    return { configured: false, within: true, distanceMiles: null };
  }
  const d = haversineMiles({ lat: cfg.baseLat, lng: cfg.baseLng }, point);
  return { configured: true, within: d <= cfg.serviceRadiusMiles, distanceMiles: Math.round(d * 10) / 10 };
}

/* ---- timezone helpers ---- */
function tzOffsetMs(tz: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) map[p.type] = p.value;
  const asIfUtc = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
  return asIfUtc - utcMs;
}
/** Build a UTC epoch for a local wall-clock time in a timezone. */
function zonedToUtc(tz: string, y: number, m: number, d: number, h: number, min: number): number {
  const guess = Date.UTC(y, m, d, h, min);
  return guess - tzOffsetMs(tz, guess);
}
/** Y/M/D parts of an instant in a timezone. */
function partsInTz(tz: string, utcMs: number) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) map[p.type] = p.value;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday);
  return { y: +map.year, m: +map.month - 1, d: +map.day, dow: wd };
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Resolve a caller's "preferred day" to a target date (in the business tz). */
export function resolveTargetDate(cfg: SchedulingConfig, preferredDay: string | undefined, nowMs: number) {
  const p = (preferredDay ?? '').toLowerCase().trim();
  const today = partsInTz(cfg.timezone, nowMs);
  const addDays = (base: { y: number; m: number; d: number }, n: number) =>
    partsInTz(cfg.timezone, zonedToUtc(cfg.timezone, base.y, base.m, base.d + n, 12, 0));

  let target = today;
  if (/tomorrow/.test(p)) target = addDays(today, 1);
  else if (/today|asap|now|emergency/.test(p) || !p) target = today;
  else if (/^\d{4}-\d{2}-\d{2}/.test(p)) {
    const [yy, mm, dd] = p.slice(0, 10).split('-').map(Number);
    target = { y: yy, m: mm - 1, d: dd, dow: partsInTz(cfg.timezone, Date.UTC(yy, mm - 1, dd, 12)).dow };
  } else {
    const wd = WEEKDAYS.findIndex((w) => p.includes(w));
    if (wd >= 0) {
      let n = (wd - today.dow + 7) % 7;
      if (n === 0) n = 7;
      target = addDays(today, n);
    }
  }
  // Roll forward to the next working day.
  let guard = 0;
  while (!cfg.workDays.includes(target.dow) && guard++ < 8) target = addDays(target, 1);
  return target;
}

/** Suggest up to `limit` realistic open slots for the target day. */
export function suggestSlots(
  cfg: SchedulingConfig,
  target: { y: number; m: number; d: number },
  existingStartsMs: number[],
  nowMs: number,
  window?: string,
  limit = 3,
): { slots: { iso: string; label: string }[]; full: boolean } {
  const step = cfg.jobDurationMinutes + cfg.bufferMinutes;
  const dayStarts = existingStartsMs.filter((ms) => {
    const p = partsInTz(cfg.timezone, ms);
    return p.y === target.y && p.m === target.m && p.d === target.d;
  });
  if (dayStarts.length >= cfg.maxPerDay) return { slots: [], full: true };

  const win = (window ?? '').toLowerCase();
  const winOk = (h: number) =>
    /morning/.test(win) ? h < 12 : /afternoon/.test(win) ? h >= 12 && h < 17 : /evening/.test(win) ? h >= 17 : true;

  const out: { iso: string; label: string }[] = [];
  for (let mins = cfg.openHour * 60; mins + cfg.jobDurationMinutes <= cfg.closeHour * 60; mins += step) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!winOk(h)) continue;
    const startMs = zonedToUtc(cfg.timezone, target.y, target.m, target.d, h, m);
    if (startMs < nowMs + 60 * 60 * 1000) continue; // need >=1h lead time
    const collides = dayStarts.some((s) => Math.abs(s - startMs) < step * 60 * 1000);
    if (collides) continue;
    out.push({ iso: new Date(startMs).toISOString(), label: labelFor(cfg.timezone, startMs) });
    if (out.length >= limit) break;
  }
  return { slots: out, full: false };
}

function labelFor(tz: string, ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));
}
