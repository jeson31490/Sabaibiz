"use client";

import { useState } from "react";
import SettingsShell from "../../../components/SettingsShell";

const PLAN_NAME = "Solo";
const MONTHLY_PRICE = 490;
// Fixed "today" for the placeholder data; real dates come from billing later.
const LAST_BILLED = new Date(2026, 8, 26);

const CYCLES = [
  { id: "monthly", label: "Monthly", months: 1 },
  { id: "6months", label: "6 months", months: 6 },
  { id: "yearly", label: "Yearly", months: 12 },
] as const;

const INVOICES = [
  { date: "26 Sep 2026", number: "INV-2026-009", amount: "490 ฿", status: "Paid" },
  { date: "26 Aug 2026", number: "INV-2026-008", amount: "490 ฿", status: "Paid" },
  { date: "26 Jul 2026", number: "INV-2026-007", amount: "490 ฿", status: "Paid" },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function SubscriptionDetailsPage() {
  const [cycleId, setCycleId] = useState<(typeof CYCLES)[number]["id"]>("monthly");
  const cycle = CYCLES.find((c) => c.id === cycleId)!;

  const nextBilling = new Date(LAST_BILLED);
  nextBilling.setMonth(nextBilling.getMonth() + cycle.months);
  // List price with no cycle discount; discounts can be added once decided.
  const amount = (MONTHLY_PRICE * cycle.months).toLocaleString("en-US");

  return (
    <SettingsShell ownerOnly title="Subscription Details">
      <section className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8">
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-teal-900/65">Current plan</dt>
            <dd className="mt-1 text-xl font-bold text-teal-950">{PLAN_NAME}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-teal-900/65">Next billing date</dt>
            <dd className="mt-1 text-xl font-bold text-teal-950">{formatDate(nextBilling)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-teal-900/65">Next charge</dt>
            <dd className="mt-1 text-xl font-bold text-teal-950">{amount} ฿</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-teal-900/65">Payment method</dt>
            <dd className="mt-1 flex items-center gap-2 text-xl font-bold text-teal-950">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-teal-700" aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              Card ending in 4242
            </dd>
          </div>
        </dl>

        <div className="mt-8">
          <p id="cycle-label" className="text-sm font-medium text-teal-900/65">
            Billing cycle
          </p>
          <div role="radiogroup" aria-labelledby="cycle-label" className="mt-2 inline-flex rounded-full border border-teal-200 bg-teal-50 p-1">
            {CYCLES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === cycleId}
                onClick={() => setCycleId(c.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  c.id === cycleId
                    ? "bg-teal-700 text-white shadow-card"
                    : "text-teal-800 hover:bg-teal-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-teal-100 bg-white shadow-card">
        <div className="border-b border-teal-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-teal-950">Invoice history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100">
              {INVOICES.map((inv) => (
                <tr key={inv.number}>
                  <td className="px-6 py-4 text-teal-900/70">{inv.date}</td>
                  <td className="px-6 py-4 font-medium text-teal-950">{inv.number}</td>
                  <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 text-center">
        <button
          type="button"
          className="text-sm font-semibold text-red-600 underline-offset-2 transition hover:text-red-700 hover:underline"
        >
          Cancel subscription
        </button>
      </div>
    </SettingsShell>
  );
}
