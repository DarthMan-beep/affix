/*
 * Date ranges for the dashboards, read from the page's query string:
 * ?range=7|30|90 (default 30), or a custom ?from=2026-09-01&to=2026-09-30.
 * Days are calendar days in the server's time zone.
 */

export const RANGE_PRESETS = [7, 30, 90] as const;
const MAX_DAYS = 366;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export type DateRange = {
  /** Start of the first day. */
  from: Date;
  /** End of the last day (or now, for a range that ends today). */
  to: Date;
  days: number;
  /** The preset in use, or null for a custom range. */
  preset: (typeof RANGE_PRESETS)[number] | null;
  /** Query string that reproduces this range, e.g. "range=30". */
  query: string;
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const pad = (n: number) => String(n).padStart(2, "0");
/** "2026-10-02" in the server's time zone. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseDay(value: string | undefined) {
  if (!value || !ISO_DAY.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseRange(params: { range?: string; from?: string; to?: string }, now = new Date()): DateRange {
  const today = startOfDay(now);

  const from = parseDay(params.from);
  const to = parseDay(params.to);
  if (from && to && from <= to && to <= today) {
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days <= MAX_DAYS) {
      const end = to.getTime() === today.getTime() ? now : new Date(addDays(to, 1).getTime() - 1);
      return { from, to: end, days, preset: null, query: `from=${dayKey(from)}&to=${dayKey(to)}` };
    }
  }

  const preset = RANGE_PRESETS.find((p) => String(p) === params.range) ?? 30;
  return { from: addDays(today, -(preset - 1)), to: now, days: preset, preset, query: `range=${preset}` };
}

/** Every calendar day in the range, oldest first. */
export function daysIn(range: DateRange) {
  return Array.from({ length: range.days }, (_, i) => addDays(range.from, i));
}
