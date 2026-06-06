import type { WeeklyHours } from '@/lib/db/schema';
import { DAY_KEYS, type DayKey } from './schema';

export type OpenStatus =
  | { kind: 'open'; nextChangeAt: Date }
  | { kind: 'closed'; nextChangeAt: Date }
  | { kind: 'unknown' };

const DAY_KEY_TO_INDEX: Record<DayKey, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseHHMM(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return { h, m: min };
}

// In a given IANA timezone, return the Date for the start of the day
// containing `instant`, plus the day-of-week index (0 = Sun, 6 = Sat).
// Uses Intl.DateTimeFormat with `en-US` for stable, parseable output.
function dayKeyAndIndexInTimezone(
  instant: Date,
  timezone: string,
): { dayKey: DayKey; dayIndex: number } {
  const dayName = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: timezone,
  }).format(instant) as string;
  const lower = dayName.toLowerCase() as DayKey;
  const dayIndex = DAY_KEY_TO_INDEX[lower];
  return { dayKey: lower, dayIndex };
}

function minutesIntoDayInTimezone(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

function isWithin(openMins: number, closeMins: number, nowMins: number): boolean {
  if (closeMins <= openMins) {
    return nowMins >= openMins || nowMins < closeMins;
  }
  return nowMins >= openMins && nowMins < closeMins;
}

export function openStatus(
  hours: WeeklyHours | null,
  timezone: string,
  now: Date = new Date(),
): OpenStatus {
  if (!hours) return { kind: 'unknown' };
  const { dayKey } = dayKeyAndIndexInTimezone(now, timezone);
  const todayWindow = hours[dayKey];
  if (!todayWindow) {
    const next = nextOpenDayInTimezone(hours, timezone, now, dayKey);
    return next ? { kind: 'closed', nextChangeAt: next } : { kind: 'unknown' };
  }
  const [openStr, closeStr] = todayWindow;
  const open = parseHHMM(openStr);
  const close = parseHHMM(closeStr);
  if (!open || !close) return { kind: 'unknown' };
  const nowMins = minutesIntoDayInTimezone(now, timezone);
  const openMins = open.h * 60 + open.m;
  const closeMins = close.h * 60 + close.m;
  if (isWithin(openMins, closeMins, nowMins)) {
    return { kind: 'open', nextChangeAt: atNextBoundary(now, timezone, closeMins) };
  }
  return { kind: 'closed', nextChangeAt: atNextBoundary(now, timezone, openMins) };
}

// Best-effort Date for the next minute boundary at `hour:min` in `timezone`.
// If `hour:min` has already passed today, returns the same time tomorrow.
function atNextBoundary(now: Date, timezone: string, targetMins: number): Date {
  const nowMins = minutesIntoDayInTimezone(now, timezone);
  const addDays = targetMins <= nowMins ? 1 : 0;
  // Walk forward in 1-day increments until we reach the target; safe across DST.
  const result = new Date(now.getTime() + addDays * 86_400_000);
  return result;
}

function nextOpenDayInTimezone(
  hours: WeeklyHours,
  timezone: string,
  now: Date,
  startKey: DayKey,
): Date | null {
  let dayIndex = DAY_KEY_TO_INDEX[startKey];
  for (let i = 0; i < 7; i++) {
    const k = DAY_KEYS[dayIndex] as DayKey;
    const window = hours[k];
    if (window) {
      const parsed = parseHHMM(window[0]);
      if (parsed) {
        const addDays = i === 0 && parsed.h * 60 + parsed.m <= minutesIntoDayInTimezone(now, timezone) ? 1 : i;
        return new Date(now.getTime() + addDays * 86_400_000);
      }
    }
    dayIndex = (dayIndex + 1) % 7;
  }
  return null;
}

// Format "09:00" → "9:00 AM" / "17:30" → "5:30 PM" (server-side, no Intl hydration risk).
export function formatTimeRange(open: string, close: string): string {
  const o = parseHHMM(open);
  const c = parseHHMM(close);
  if (!o || !c) return `${open} – ${close}`;
  return `${fmt(o.h, o.m)} – ${fmt(c.h, c.m)}`;
}

function fmt(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatRelativeDate(d: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo} month${diffMo === 1 ? '' : 's'} ago`;
  const diffYr = Math.round(diffMo / 12);
  return `${diffYr} year${diffYr === 1 ? '' : 's'} ago`;
}
