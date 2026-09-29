"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  bangkokToday,
  fetchCostsForPeriod,
  fetchCostsScannedToday,
  fetchInvoices,
  fetchPriceAlerts,
  fromIsoDate,
  type InvoiceRow,
  type PriceAlertRow,
} from "../../lib/invoices";
import { isPeriodId, PERIODS, resolvePeriod, type PeriodId, type ResolvedPeriod } from "../../lib/periods";
import { countIngredientsNeedingReview } from "../../lib/ingredients";
import { fetchPeriodSales, type PeriodSales } from "../../lib/sales";
import { useUser } from "../context/UserContext";
import { inputClass, labelClass } from "./FormField";
import PriceAlertsCard from "./PriceAlertsCard";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      recent: InvoiceRow[];
      today: { total: number; count: number };
      alerts: PriceAlertRow[];
    };

// Keeps the satang (2,418.25 ฿) rather than rounding to whole baht.
const fmtBaht = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ฿`;
const fmtDate = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Loadable<T> = T | "loading" | "error";
type Costs = { total: number; count: number };

/** Value and note of the Revenue card. */
function revenueCard(sales: Loadable<PeriodSales>, period: ResolvedPeriod): { value: string; note: string } {
  if (sales === "loading") return { value: "…", note: "Loading" };
  if (sales === "error") return { value: "—", note: "Sales are unavailable right now" };
  if (!sales.connected) return { value: "—", note: "Connect Loyverse in Settings to see your sales" };
  if (!sales.synced) return { value: "—", note: "Not synced yet for this period. Use “Sync sales now” in Settings." };

  let comparison = `nothing to compare ${period.comparisonLabel}`;
  if (sales.previousRevenue > 0) {
    const pct = Math.round(((sales.revenue - sales.previousRevenue) / sales.previousRevenue) * 100);
    comparison = `${pct >= 0 ? "+" : ""}${pct}% ${period.comparisonLabel}`;
  }
  const until = sales.until ? ` · until ${fmtTime(sales.until)}` : "";
  return { value: fmtBaht(sales.revenue), note: `${plural(sales.tickets, "ticket")} · ${comparison}${until}` };
}

/** Result = Revenue − Costs, only when both are known. */
function resultCard(sales: Loadable<PeriodSales>, costs: Loadable<Costs>): { value: string; note: string } {
  if (sales === "loading" || costs === "loading") return { value: "…", note: "Loading" };
  if (costs === "error" || sales === "error" || !sales.connected || !sales.synced) {
    return { value: "—", note: "Needs your Loyverse sales for this period" };
  }
  return { value: fmtBaht(Math.round((sales.revenue - costs.total) * 100) / 100), note: "Revenue − invoice costs" };
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconAlertCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 17h.01" />
    </svg>
  );
}

function IconCamera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

function StatusBadge({ status }: { status: InvoiceRow["status"] }) {
  if (status === "processed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
        <IconCheck className="h-3.5 w-3.5" />
        Processed
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-600">
        <IconClock className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
      <IconAlertCircle className="h-3.5 w-3.5" />
      Error
    </span>
  );
}

export default function DashboardContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });

  // The period lives in the URL (?period=yesterday, or ?period=custom&from=…&to=…), Today by default.
  const periodParam = searchParams.get("period");
  const periodId: PeriodId = isPeriodId(periodParam) ? periodParam : "today";
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const period = useMemo(
    () => resolvePeriod(periodId, { from: customFrom, to: customTo }),
    [periodId, customFrom, customTo],
  );
  const periodKey = `${period.from}|${period.to}`;

  function setPeriod(id: PeriodId, custom?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (id !== "today") params.set("period", id);
    if (id === "custom") {
      const range = custom ?? { from: period.from, to: period.to };
      params.set("from", range.from);
      params.set("to", range.to);
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }

  // Loaded on their own and per period, so a Loyverse problem never hides the invoices.
  // Tagged with the period they belong to, so a slow answer never shows under another period.
  const [figures, setFigures] = useState<{ key: string; sales: Loadable<PeriodSales>; costs: Loadable<Costs> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `${period.from}|${period.to}`;
    fetchPeriodSales(period)
      .then((sales) => !cancelled && setFigures((f) => ({ key, costs: f?.key === key ? f.costs : "loading", sales })))
      .catch(() => !cancelled && setFigures((f) => ({ key, costs: f?.key === key ? f.costs : "loading", sales: "error" })));
    fetchCostsForPeriod(period)
      .then((costs) => !cancelled && setFigures((f) => ({ key, sales: f?.key === key ? f.sales : "loading", costs })))
      .catch(() => !cancelled && setFigures((f) => ({ key, sales: f?.key === key ? f.sales : "loading", costs: "error" })));
    return () => {
      cancelled = true;
    };
  }, [period]);

  // "5 products need review" (Ingredients): shown only when there are some.
  const [toReview, setToReview] = useState(0);
  useEffect(() => {
    let cancelled = false;
    countIngredientsNeedingReview()
      .then((n) => !cancelled && setToReview(n))
      .catch(() => {}); // a convenience: the dashboard works without it
    return () => {
      cancelled = true;
    };
  }, []);

  const sales: Loadable<PeriodSales> = figures?.key === periodKey ? figures.sales : "loading";
  const costs: Loadable<Costs> = figures?.key === periodKey ? figures.costs : "loading";

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchInvoices({ limit: 5, orderBy: "added" }),
      fetchCostsScannedToday(),
      fetchPriceAlerts(),
    ])
      .then(([recent, today, alerts]) => {
        if (!cancelled) setState({ status: "ready", recent, today, alerts });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Your data could not be loaded.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = state.status === "ready" ? state : null;
  const costsNote =
    costs === "loading"
      ? "Loading"
      : costs === "error"
        ? "Invoices are unavailable right now"
        : `${plural(costs.count, "invoice")} dated in this period` +
          // For Today, what was scanned today (whatever date is printed on it) stays useful.
          (periodId === "today" && ready ? ` · ${fmtBaht(ready.today.total)} scanned today` : "");
  const kpis = [
    { label: "Revenue", ...revenueCard(sales, period) },
    {
      label: "Costs",
      value: costs === "loading" ? "…" : costs === "error" ? "—" : fmtBaht(costs.total),
      note: costsNote,
    },
    { label: "Result", ...resultCard(sales, costs) },
  ];

  return (
    <div className="pb-32">
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Welcome to SabaiBiz</h1>
          <p className="mt-1 text-sm text-teal-900/65">
            Here&apos;s how {user.businessName} is doing{" "}
            {periodId === "custom"
              ? `from ${fmtDate(period.from)} to ${fmtDate(period.to)}`
              : PERIODS.find((p) => p.id === periodId)!.label.toLowerCase()}
            .
          </p>
        </div>

        <section aria-label="Period">
          <div role="radiogroup" aria-label="Period" className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={periodId === p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  periodId === p.id
                    ? "bg-teal-700 text-white shadow-card"
                    : "border border-teal-200 bg-white text-teal-800 hover:bg-teal-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {periodId === "custom" && (
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="period-from" className={labelClass}>
                  From
                </label>
                <input
                  id="period-from"
                  type="date"
                  autoComplete="off"
                  max={bangkokToday()}
                  value={period.from}
                  onChange={(e) => e.target.value && setPeriod("custom", { from: e.target.value, to: period.to })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="period-to" className={labelClass}>
                  To
                </label>
                <input
                  id="period-to"
                  type="date"
                  autoComplete="off"
                  max={bangkokToday()}
                  value={period.to}
                  onChange={(e) => e.target.value && setPeriod("custom", { from: period.from, to: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </section>

        {state.status === "error" && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            We couldn&apos;t load your data: {state.message}
          </p>
        )}

        {toReview > 0 && (
          <Link
            href="/dashboard/ingredients"
            className="flex items-center justify-between gap-3 rounded-xl border border-gold-500/40 bg-gold-50 px-5 py-3 text-sm font-medium text-gold-800 transition hover:bg-gold-100"
          >
            <span>
              {toReview} product{toReview === 1 ? " needs" : "s need"} review before they can be used in your recipes.
            </span>
            <span className="font-semibold">Review →</span>
          </Link>
        )}

        {/* KPI cards */}
        <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(({ label, value, note }) => (
            <div key={label} className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
              <p className="text-sm font-medium text-teal-900/65">{label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-teal-950">{value}</p>
              <p className="mt-1 text-xs text-gray-500">{note}</p>
            </div>
          ))}
          <PriceAlertsCard alerts={ready?.alerts ?? []} />
        </section>

        {/* Recent invoices */}
        <section className="rounded-2xl border border-teal-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-teal-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-teal-950">Recent Invoices</h2>
            {ready && ready.recent.length > 0 && (
              <Link href="/dashboard/invoices" className="text-sm font-semibold text-teal-700 transition hover:text-teal-900">
                View all →
              </Link>
            )}
          </div>

          {!ready ? (
            <p className="px-6 py-12 text-center text-sm text-teal-900/60">
              {state.status === "loading" ? "Loading your invoices…" : "Invoices are unavailable right now."}
            </p>
          ) : ready.recent.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="relative h-40 w-56 max-w-full">
                <Image
                  src="/Snap%20Photo.png"
                  alt="Mascot ready to photograph your first invoice"
                  fill
                  sizes="224px"
                  className="object-contain"
                />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-teal-950">No invoices yet</h3>
              <p className="mt-2 max-w-sm text-sm text-teal-900/65">
                Scan your first invoice to see your costs and profit here.
              </p>
              <Link
                href="/dashboard/invoices/scan"
                className="mt-6 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
              >
                Scan your first invoice
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                    <th className="px-6 py-3">Supplier</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {ready.recent.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-teal-50/60">
                      <td className="px-6 py-4 font-medium text-teal-950">{inv.supplier}</td>
                      <td className="px-6 py-4 text-teal-900/70">{fmtDate(inv.date)}</td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">{fmtBaht(inv.total)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Price trends */}
        <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-teal-950">Price Trends</h2>
          <p className="mt-1 text-sm text-teal-900/65">Monthly ingredient costs will appear here.</p>
          <div className="mt-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-100">
            <p className="text-sm font-medium text-gray-500">No data yet</p>
          </div>
        </section>
      </main>

      {/* Floating action button */}
      <Link
        href="/dashboard/invoices/scan"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2.5 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
      >
        <IconCamera className="h-6 w-6" />
        Scan a new invoice
      </Link>
    </div>
  );
}
