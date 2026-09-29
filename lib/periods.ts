import { bangkokToday, isIsoDate } from "./invoices";

// Dashboard periods, as whole Bangkok days (YYYY-MM-DD, both ends included).

export const PERIODS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "custom", label: "Custom" },
] as const;

export type PeriodId = (typeof PERIODS)[number]["id"];
export type DayRange = { from: string; to: string };
export type ResolvedPeriod = DayRange & {
  /** The period the numbers are compared with. */
  previous: DayRange;
  /** "vs last Monday", "vs previous 7 days"… */
  comparisonLabel: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Plain calendar arithmetic on YYYY-MM-DD (UTC is only used as a neutral calendar here).
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => toIso(new Date(toDate(iso).getTime() + n * DAY_MS));
const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
const monthStart = (iso: string, monthsBack = 0) => {
  const d = toDate(iso);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsBack, 1)));
};
const monthEnd = (iso: string) => addDays(monthStart(addDays(monthStart(iso), 40)), -1);
const weekday = (iso: string) => toDate(iso).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

export function isPeriodId(v: string | null): v is PeriodId {
  return PERIODS.some((p) => p.id === v);
}

/**
 * The days of a period and of the period it is compared with. A single day is compared with the
 * same weekday a week before (restaurants follow the week); longer periods with the one just before.
 */
export function resolvePeriod(id: PeriodId, custom?: Partial<DayRange>, today: string = bangkokToday()): ResolvedPeriod {
  let range: DayRange;
  switch (id) {
    case "today":
      range = { from: today, to: today };
      break;
    case "yesterday":
      range = { from: addDays(today, -1), to: addDays(today, -1) };
      break;
    case "last7":
      range = { from: addDays(today, -6), to: today };
      break;
    case "thisMonth": {
      const from = monthStart(today);
      // Same days of last month (1st → today's day number, cut at the end of that month).
      const prevFrom = monthStart(today, 1);
      const prevTo = [addDays(prevFrom, daysBetween(from, today)), monthEnd(prevFrom)].sort()[0];
      return { from, to: today, previous: { from: prevFrom, to: prevTo }, comparisonLabel: "vs same days last month" };
    }
    case "lastMonth": {
      const from = monthStart(today, 1);
      const before = monthStart(today, 2);
      return { from, to: monthEnd(from), previous: { from: before, to: monthEnd(before) }, comparisonLabel: "vs the month before" };
    }
    case "custom": {
      const a = isIsoDate(custom?.from) ? custom!.from! : today;
      const b = isIsoDate(custom?.to) ? custom!.to! : a;
      range = a <= b ? { from: a, to: b } : { from: b, to: a };
      break;
    }
  }
  const length = daysBetween(range.from, range.to) + 1;
  if (length === 1) {
    return {
      ...range,
      previous: { from: addDays(range.from, -7), to: addDays(range.to, -7) },
      comparisonLabel: `vs last ${weekday(range.from)}`,
    };
  }
  return {
    ...range,
    previous: { from: addDays(range.from, -length), to: addDays(range.to, -length) },
    comparisonLabel: `vs previous ${length} days`,
  };
}

/** The first and last moment of a range of Bangkok days (Thailand has no daylight saving time). */
export function bangkokInstants({ from, to }: DayRange): { start: Date; end: Date } {
  return { start: new Date(`${from}T00:00:00+07:00`), end: new Date(new Date(`${to}T00:00:00+07:00`).getTime() + DAY_MS) };
}
