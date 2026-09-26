"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchInvoices,
  fetchPriceAlerts,
  fromIsoDate,
  toIsoDate,
  type InvoiceRow,
  type PriceAlertRow,
} from "../../lib/invoices";
import { BUSINESS_NAME } from "../lib/business";
import PriceAlertsCard from "./PriceAlertsCard";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; recent: InvoiceRow[]; today: InvoiceRow[]; alerts: PriceAlertRow[] };

const fmtBaht = (n: number) => `${Math.round(n).toLocaleString("en-US")} ฿`;
const fmtDate = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchInvoices({ limit: 5 }),
      fetchInvoices({ date: toIsoDate(new Date()) }),
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
  // Invoices that failed to read don't count as a cost.
  const todayCounted = ready?.today.filter((i) => i.status !== "error") ?? [];
  const todayCosts = todayCounted.reduce((sum, i) => sum + i.total, 0);

  const kpis = [
    { label: "Today's Revenue", value: "—", note: "No data yet" },
    {
      label: "Today's Costs",
      value: ready ? fmtBaht(todayCosts) : "…",
      note: !ready
        ? "Loading"
        : todayCounted.length > 0
          ? `${todayCounted.length} invoice${todayCounted.length > 1 ? "s" : ""} today`
          : "No invoices today",
    },
    { label: "Today's Profit", value: "—", note: "No data yet" },
  ];

  return (
    <div className="pb-32">
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Welcome to SabaiBiz</h1>
          <p className="mt-1 text-sm text-teal-900/65">Here&apos;s how {BUSINESS_NAME} is doing today.</p>
        </div>

        {state.status === "error" && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            We couldn&apos;t load your data: {state.message}
          </p>
        )}

        {/* KPI cards */}
        <section aria-label="Today's numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
