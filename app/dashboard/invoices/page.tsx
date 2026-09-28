"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "../../components/DashboardNavbar";
import { inputClass, labelClass } from "../../components/FormField";
import {
  DATE_FILTERS,
  customRangeFrom,
  dayStart,
  matchesDate,
  type CustomRange,
  type DateFilter,
} from "../../../lib/dateFilters";
import { fetchInvoices, fromIsoDate, toIsoDate, type InvoiceRow } from "../../../lib/invoices";

const TODAY = dayStart(new Date());

const fmtDate = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtBaht = (n: number) => `${Math.round(n).toLocaleString("en-US")} ฿`;

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

function StatusBadge({ status }: { status: InvoiceRow["status"] }) {
  if (status === "processed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
        <svg {...svgProps}>
          <path d="m5 12 5 5L20 7" />
        </svg>
        Processed
      </span>
    );
  if (status === "pending")
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

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; invoices: InvoiceRow[] };

export default function InvoicesPage() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [draftFrom, setDraftFrom] = useState(toIsoDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)));
  const [draftTo, setDraftTo] = useState(toIsoDate(TODAY));
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [supplier, setSupplier] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;
    fetchInvoices()
      .then((invoices) => {
        if (!cancelled) setLoad({ status: "ready", invoices });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLoad({ status: "error", message: err instanceof Error ? err.message : "Your invoices could not be loaded." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const invoices = useMemo(() => (load.status === "ready" ? load.invoices : []), [load]);
  const suppliers = useMemo(() => Array.from(new Set(invoices.map((i) => i.supplier))).sort(), [invoices]);

  // Summary bar: this calendar month. Invoices that failed to read don't count as spend.
  const summary = useMemo(() => {
    const month = invoices.filter((i) => {
      const d = fromIsoDate(i.date);
      return d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear();
    });
    return [
      { label: "Invoices this month", value: String(month.length) },
      { label: "Spent this month", value: fmtBaht(month.filter((i) => i.status !== "error").reduce((s, i) => s + i.total, 0)) },
      { label: "Pending invoices", value: String(invoices.filter((i) => i.status === "pending").length) },
    ];
  }, [invoices]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((i) => {
      if (q && !i.number.toLowerCase().includes(q) && !i.supplier.toLowerCase().includes(q)) return false;
      if (supplier !== "all" && i.supplier !== supplier) return false;
      if (status !== "all" && i.status !== status) return false;
      return matchesDate(fromIsoDate(i.date), dateFilter, customRange, TODAY);
    });
  }, [invoices, query, dateFilter, customRange, supplier, status]);

  // Period summary for the applied range. Invoices that failed to read (status "error") are not spend.
  const period = useMemo(() => {
    const counted = rows.filter((i) => i.status !== "error");
    const total = counted.reduce((s, i) => s + i.total, 0);
    return {
      total,
      count: counted.length,
      average: counted.length ? total / counted.length : 0,
      excluded: rows.length - counted.length,
    };
  }, [rows]);

  // Apply only needs both dates; a reversed pair is put in order rather than rejected.
  const draftIncomplete = !draftFrom || !draftTo;

  function applyCustomRange() {
    if (draftIncomplete) return;
    const range = customRangeFrom(draftFrom, draftTo, fromIsoDate);
    setDraftFrom(toIsoDate(range.from));
    setDraftTo(toIsoDate(range.to));
    setCustomRange(range);
  }

  const selectClass = `${inputClass} mt-0`;
  const isEmpty = load.status === "ready" && invoices.length === 0;

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

        {load.status === "loading" && (
          <p role="status" className="py-16 text-center text-sm font-medium text-teal-900/60">
            Loading your invoices…
          </p>
        )}

        {load.status === "error" && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            We couldn&apos;t load your invoices: {load.message}
          </p>
        )}

        {isEmpty && (
          <section className="flex flex-col items-center rounded-2xl border border-teal-100 bg-white px-6 py-14 text-center shadow-card">
            <div className="relative h-40 w-56 max-w-full">
              <Image
                src="/Snap%20Photo.png"
                alt="Mascot ready to photograph your first invoice"
                fill
                sizes="224px"
                className="object-contain"
              />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-teal-950">No invoices yet</h2>
            <p className="mt-2 max-w-sm text-sm text-teal-900/65">
              Scan your first invoice to see your costs and profit here.
            </p>
            <Link
              href="/dashboard/invoices/scan"
              className="mt-6 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
            >
              Scan your first invoice
            </Link>
          </section>
        )}

        {load.status === "ready" && !isEmpty && (
          <>
            {/* Summary bar */}
            <section aria-label="This month" className="grid gap-4 sm:grid-cols-3">
              {summary.map(({ label, value }) => (
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
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectClass}>
                <option value="all">All statuses</option>
                <option value="processed">Processed</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
              </select>
            </section>

            {dateFilter === "custom" && (
              <section
                aria-label="Custom date range"
                className="-mt-4 grid gap-6 rounded-2xl border border-teal-100 bg-white p-4 shadow-card lg:grid-cols-[1fr_auto]"
              >
                <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="range-from" className={labelClass}>
                    From
                  </label>
                  <input
                    id="range-from"
                    type="date"
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
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                    className={`${inputClass} w-44`}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={draftIncomplete}
                  className="rounded-full bg-gold-500 px-8 py-3 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gold-500"
                >
                  Apply
                </button>
                {/* Visible confirmation: a range that covers every invoice would otherwise look like nothing happened. */}
                <p role="status" className="w-full text-sm font-medium text-teal-800">
                  {customRange
                    ? `Showing ${rows.length} of ${invoices.length} invoices from ${fmtDate(toIsoDate(customRange.from))} to ${fmtDate(toIsoDate(customRange.to))}.`
                    : "Pick a From and a To date, then click Apply."}
                </p>
                </div>

                {/* Period summary, shown on the right once a range has been applied */}
                <div
                  aria-label="Period summary"
                  className="rounded-xl bg-teal-50 p-5 lg:min-w-[260px] lg:text-right"
                >
                  {customRange ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-teal-800/70">Total spent</dt>
                        <dd className="mt-0.5 text-3xl font-bold tabular-nums text-gold-600">{fmtBaht(period.total)}</dd>
                      </div>
                      <div className="flex justify-between gap-6 text-sm lg:justify-end">
                        <dt className="text-teal-800/75">Number of invoices</dt>
                        <dd className="font-semibold tabular-nums text-teal-950">{period.count}</dd>
                      </div>
                      <div className="flex justify-between gap-6 text-sm lg:justify-end">
                        <dt className="text-teal-800/75">Average per invoice</dt>
                        <dd className="font-semibold tabular-nums text-teal-950">{fmtBaht(period.average)}</dd>
                      </div>
                      {period.excluded > 0 && (
                        <p className="text-xs text-teal-800/60">
                          {period.excluded} invoice{period.excluded > 1 ? "s" : ""} with an error not counted.
                        </p>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm text-teal-800/70">Apply a range to see the total spent in that period.</p>
                  )}
                </div>
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
                      <tr key={i.id} className="transition hover:bg-teal-50/60">
                        <td className="px-6 py-4">
                          {i.generatedNumber ? (
                            <span title="This invoice has no number. SabaiBiz made this reference.">
                              <span className="font-medium text-teal-900/60">{i.number}</span>
                              <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                                No number
                              </span>
                            </span>
                          ) : (
                            <span className="font-semibold text-teal-950">{i.number}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-teal-950">{i.supplier}</td>
                        <td className="px-6 py-4 text-teal-900/70">{fmtDate(i.date)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-teal-900/80">{i.products}</td>
                        <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">{fmtBaht(i.total)}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/invoices/${i.id}`}
                            aria-label={`View invoice ${i.number}`}
                            className="rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-700 hover:text-white"
                          >
                            View
                          </Link>
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
          </>
        )}
      </main>
    </div>
  );
}
