export const DATE_FILTERS = [
  { id: "any", label: "Any date" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "custom", label: "Custom range" },
] as const;

export type DateFilter = (typeof DATE_FILTERS)[number]["id"];
export type CustomRange = { from: Date; to: Date };

export const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Builds a custom range from two YYYY-MM-DD strings; a reversed pair is put in order. */
export function customRangeFrom(a: string, b: string, parse: (iso: string) => Date): CustomRange {
  const first = parse(a);
  const second = parse(b);
  return first <= second ? { from: first, to: second } : { from: second, to: first };
}

export function matchesDate(date: Date, filter: DateFilter, custom: CustomRange | null, today: Date) {
  const d = dayStart(date);
  const daysAgo = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
  const monthsAgo = (n: number) => new Date(today.getFullYear(), today.getMonth() - n, today.getDate());
  const last = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  switch (filter) {
    case "any":
      return true;
    case "today":
      return d.getTime() === today.getTime();
    case "7d":
      return d >= daysAgo(7) && d <= today;
    case "30d":
      return d >= daysAgo(30) && d <= today;
    case "month":
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    case "lastMonth":
      return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
    case "3m":
      return d >= monthsAgo(3) && d <= today;
    case "6m":
      return d >= monthsAgo(6) && d <= today;
    case "custom":
      // Until a range is applied, don't hide anything. Both ends are included.
      return !custom || (d >= dayStart(custom.from) && d <= dayStart(custom.to));
  }
}
