"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DashboardNavbar from "../../components/DashboardNavbar";
import { inputClass, labelClass } from "../../components/FormField";

type Status = "Processed" | "Pending" | "Error";
type Invoice = {
  number: string;
  supplier: string;
  date: Date;
  products: number;
  total: number;
  status: Status;
};

// Fixed "today" for the placeholder data; real dates come from Supabase later.
const TODAY = new Date(2026, 8, 26);

const INVOICES: Invoice[] = [
  { number: "INV-0142", supplier: "Makro Samui", date: new Date(2026, 8, 26), products: 12, total: 3480, status: "Processed" },
  { number: "INV-0141", supplier: "Chaweng Fresh Market", date: new Date(2026, 8, 25), products: 8, total: 2150, status: "Pending" },
  { number: "INV-0140", supplier: "Samui Seafood Co.", date: new Date(2026, 8, 24), products: 15, total: 5920, status: "Processed" },
  { number: "INV-0139", supplier: "Lamai Meat Supply", date: new Date(2026, 8, 19), products: 9, total: 4310, status: "Error" },
  { number: "INV-0138", supplier: "Makro Samui", date: new Date(2026, 7, 29), products: 11, total: 2890, status: "Processed" },
];

const SUPPLIERS = Array.from(new Set(INVOICES.map((i) => i.supplier))).sort();
const DATE_FILTERS = [
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
type DateFilter = (typeof DATE_FILTERS)[number]["id"];
type CustomRange = { from: Date; to: Date };

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthsAgo = (n: number) => new Date(TODAY.getFullYear(), TODAY.getMonth() - n, TODAY.getDate());
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function matchesDate(date: Date, filter: DateFilter, custom: CustomRange | null) {
  const d = dayStart(date);
  const last = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1);
  switch (filter) {
    case "any":
      return true;
    case "today":
      return d.getTime() === TODAY.getTime();
    case "7d":
      return d >= new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 7) && d <= TODAY;
    case "30d":
      return d >= new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 30) && d <= TODAY;
    case "month":
      return d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear();
    case "lastMonth":
      return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
    case "3m":
      return d >= monthsAgo(3) && d <= TODAY;
    case "6m":
      return d >= monthsAgo(6) && d <= TODAY;
    case "custom":
      // Until a range is applied, don't hide anything.
      return !custom || (d >= custom.from && d <= custom.to);
  }
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtBaht = (n: number) => `${n.toLocaleString("en-US")} ฿`;

const thisMonth = INVOICES.filter(
  (i) => i.date.getMonth() === TODAY.getMonth() && i.date.getFullYear() === TODAY.getFullYear(),
);
const SUMMARY = [
  { label: "Invoices this month", value: String(thisMonth.length) },
  { label: "Spent this month", value: fmtBaht(thisMonth.reduce((s, i) => s + i.total, 0)) },
  { label: "Pending invoices", value: String(INVOICES.filter((i) => i.status === "Pending").length) },
];

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-3.5 w-3.5",
  "aria-hidden": true,
};

function StatusBadge({ status }: { status: Status }) {
  if (status === "Processed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
        <svg {...svgProps}>
          <path d="m5 12 5 5L20 7" />
        </svg>
        Processed
      </span>
    );
  if (status === "Pending")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-600">
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
      <svg {...svgProps}>
        <path d="M12 8v5M12 17h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
      Error
    </span>
  );
}

export default function InvoicesPage() {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [draftFrom, setDraftFrom] = useState(toIso(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)));
  const [draftTo, setDraftTo] = useState(toIso(TODAY));
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [supplier, setSupplier] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INVOICES.filter((i) => {
      if (q && !i.number.toLowerCase().includes(q) && !i.supplier.toLowerCase().includes(q)) return false;
      if (supplier !== "all" && i.supplier !== supplier) return false;
      if (status !== "all" && i.status !== status) return false;
      return matchesDate(i.date, dateFilter, customRange);
    });
  }, [query, dateFilter, customRange, supplier, status]);

  const draftInvalid = !draftFrom || !draftTo || draftFrom > draftTo;

  function applyCustomRange() {
    if (draftInvalid) return;
    setCustomRange({ from: fromIso(draftFrom), to: fromIso(draftTo) });
  }

  const selectClass = `${inputClass} mt-0`;

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">My Invoices</h1>
          <Link href="/dashboard/invoices/scan" className="inline-flex items-center gap-2.5 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
              <circle cx="12" cy="13.5" r="3.5" />
            </svg>
            Scan new invoice
          </Link>
        </div>

        {/* Summary bar */}
        <section aria-label="This month" className="grid gap-4 sm:grid-cols-3">
          {SUMMARY.map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
              <p className="text-sm font-medium text-teal-900/65">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-teal-950">{value}</p>
            </div>
          ))}
        </section>

        {/* Filters */}
        <section aria-label="Search and filters" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by invoice number or supplier"
            aria-label="Search invoices"
            className={`${inputClass} mt-0 sm:col-span-2 lg:col-span-1`}
          />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            aria-label="Filter by date"
            className={selectClass}
          >
            {DATE_FILTERS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Filter by supplier" className={selectClass}>
            <option value="all">All suppliers</option>
            {SUPPLIERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectClass}>
            <option value="all">All statuses</option>
            <option value="Processed">Processed</option>
            <option value="Pending">Pending</option>
            <option value="Error">Error</option>
          </select>
        </section>

        {dateFilter === "custom" && (
          <section
            aria-label="Custom date range"
            className="-mt-4 flex flex-wrap items-end gap-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-card"
          >
            <div>
              <label htmlFor="range-from" className={labelClass}>
                From
              </label>
              <input
                id="range-from"
                type="date"
                max={draftTo || undefined}
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className={`${inputClass} w-44`}
              />
            </div>
            <div>
              <label htmlFor="range-to" className={labelClass}>
                To
              </label>
              <input
                id="range-to"
                type="date"
                min={draftFrom || undefined}
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className={`${inputClass} w-44`}
              />
            </div>
            <button
              type="button"
              onClick={applyCustomRange}
              disabled={draftInvalid}
              className="rounded-full bg-gold-500 px-8 py-3 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gold-500"
            >
              Apply
            </button>
            {draftFrom && draftTo && draftFrom > draftTo && (
              <p role="alert" className="text-sm font-medium text-red-600">
                The start date must be before the end date.
              </p>
            )}
          </section>
        )}

        {/* Table */}
        <section className="rounded-2xl border border-teal-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                  <th className="px-6 py-3">Invoice</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Products</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100">
                {rows.map((i) => (
                  <tr key={i.number} className="transition hover:bg-teal-50/60">
                    <td className="px-6 py-4 font-semibold text-teal-950">{i.number}</td>
                    <td className="px-6 py-4 text-teal-950">{i.supplier}</td>
                    <td className="px-6 py-4 text-teal-900/70">{fmtDate(i.date)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-teal-900/80">{i.products}</td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">{fmtBaht(i.total)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={i.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`View invoice ${i.number}`}
                        className="rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-700 hover:text-white"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-teal-900/60">
                      No invoices match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
