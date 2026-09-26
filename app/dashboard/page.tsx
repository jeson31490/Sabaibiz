import type { Metadata } from "next";
import Link from "next/link";
import DashboardNavbar from "../components/DashboardNavbar";
import PriceAlertsCard from "../components/PriceAlertsCard";
import { BUSINESS_NAME } from "../lib/business";

export const metadata: Metadata = {
  title: "Dashboard — SabaiBiz",
};

const KPIS = [
  { label: "Today's Revenue", value: "12,400 ฿", tone: "default" },
  { label: "Today's Costs", value: "8,200 ฿", tone: "default" },
  { label: "Today's Profit", value: "4,200 ฿", tone: "profit" },
  { label: "Price Alerts", value: "3 alerts", tone: "alert" },
] as const;

const INVOICES = [
  { supplier: "Makro Samui", date: "26 Sep 2026", total: "3,480 ฿", status: "processed" },
  { supplier: "Chaweng Fresh Market", date: "25 Sep 2026", total: "2,150 ฿", status: "pending" },
  { supplier: "Samui Seafood Co.", date: "24 Sep 2026", total: "5,920 ฿", status: "processed" },
] as const;

// Monthly ingredient costs, in thousands of baht.
const COST_TREND = [
  { month: "Apr", value: 182 },
  { month: "May", value: 191 },
  { month: "Jun", value: 204 },
  { month: "Jul", value: 198 },
  { month: "Aug", value: 226 },
  { month: "Sep", value: 241 },
];
const CHART_MAX = 300;
const GRIDLINES = [300, 200, 100, 0];

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

function IconCamera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-teal-50/60 pb-32">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
            Good morning
          </h1>
          <p className="mt-1 text-sm text-teal-900/65">
            Here&apos;s how {BUSINESS_NAME} is doing today.
          </p>
        </div>

        {/* KPI cards */}
        <section aria-label="Today's numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map(({ label, value, tone }) => tone === "alert" ? (
            <PriceAlertsCard key={label} />
          ) : (
            <div
              key={label}
              className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card"
            >
              <p className="text-sm font-medium text-teal-900/65">{label}</p>
              <p
                className={`mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight ${
                  tone === "profit" ? "text-teal-700" : "text-teal-950"
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </section>

        {/* Recent invoices */}
        <section className="rounded-2xl border border-teal-100 bg-white shadow-card">
          <div className="border-b border-teal-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-teal-950">Recent Invoices</h2>
          </div>
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
                {INVOICES.map((inv) => (
                  <tr key={inv.supplier} className="transition hover:bg-teal-50/60">
                    <td className="px-6 py-4 font-medium text-teal-950">{inv.supplier}</td>
                    <td className="px-6 py-4 text-teal-900/70">{inv.date}</td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">
                      {inv.total}
                    </td>
                    <td className="px-6 py-4">
                      {inv.status === "processed" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                          <IconCheck className="h-3.5 w-3.5" />
                          Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-600">
                          <IconClock className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Price trends */}
        <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-teal-950">Price Trends</h2>
          <p className="mt-1 text-sm text-teal-900/65">
            Monthly ingredient costs, last 6 months (thousand ฿)
          </p>

          <div className="mt-6 flex" role="img" aria-label={`Monthly costs in thousand baht: ${COST_TREND.map((d) => `${d.month} ${d.value}`).join(", ")}`}>
            {/* Y axis labels */}
            <div className="relative mr-3 h-56 w-8 flex-none text-right text-xs tabular-nums text-teal-900/55">
              {GRIDLINES.map((g) => (
                <span
                  key={g}
                  className="absolute right-0 -translate-y-1/2"
                  style={{ top: `${100 - (g / CHART_MAX) * 100}%` }}
                >
                  {g}
                </span>
              ))}
            </div>

            <div className="flex-1">
              <div className="relative h-56">
                {GRIDLINES.map((g) => (
                  <div
                    key={g}
                    className="absolute inset-x-0 border-t border-teal-100"
                    style={{ top: `${100 - (g / CHART_MAX) * 100}%` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-end gap-3 px-2 sm:gap-6 sm:px-6">
                  {COST_TREND.map((d, i) => {
                    const isLatest = i === COST_TREND.length - 1;
                    return (
                      <div
                        key={d.month}
                        className="group relative flex h-full flex-1 items-end justify-center"
                      >
                        <div
                          className={`w-full max-w-14 rounded-t-[4px] transition ${
                            isLatest ? "bg-teal-700" : "bg-teal-600/70 group-hover:bg-teal-700"
                          }`}
                          style={{ height: `${(d.value / CHART_MAX) * 100}%` }}
                        />
                        <span
                          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-teal-950 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-soft transition group-hover:opacity-100"
                          style={{ bottom: `calc(${(d.value / CHART_MAX) * 100}% + 4px)` }}
                        >
                          {d.month}: {d.value},000 ฿
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 flex gap-3 px-2 text-center text-xs font-medium text-teal-900/65 sm:gap-6 sm:px-6">
                {COST_TREND.map((d) => (
                  <span key={d.month} className="flex-1">
                    {d.month}
                  </span>
                ))}
              </div>
            </div>
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
