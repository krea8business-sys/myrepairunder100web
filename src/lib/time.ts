/** Asia/Kolkata date/time helpers. India has no DST, so IST = UTC+05:30 always. */

export const TZ = "Asia/Kolkata";
const IST_OFFSET_MIN = 330;

export type ISTNow = { date: string; minutes: number; weekday: number };

/** Current date (YYYY-MM-DD), minutes since midnight and weekday (0=Sun) in IST. */
export function nowIST(now: Date = new Date()): ISTNow {
  const shifted = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const date = shifted.toISOString().slice(0, 10);
  return { date, minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(), weekday: shifted.getUTCDay() };
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function parseHHMM(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

export function formatHHMM(t: string): string {
  const mins = parseHHMM(t);
  if (Number.isNaN(mins)) return t;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** UTC Date for an IST wall-clock date + HH:mm. */
export function istToDate(isoDate: string, hhmm: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const mins = parseHHMM(hhmm);
  return new Date(Date.UTC(y, m - 1, d, 0, mins) - IST_OFFSET_MIN * 60_000);
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
