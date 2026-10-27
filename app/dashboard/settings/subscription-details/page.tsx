"use client";

import Link from "next/link";
import SettingsShell from "../../../components/SettingsShell";
import { usePlanUsage } from "../../../components/usePlanUsage";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
}

export default function SubscriptionDetailsPage() {
  const { usage } = usePlanUsage();

  const used = usage?.scansUsed ?? 0;
  const limit = usage?.plan.scansPerMonth ?? 0;
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = percent >= 80;

  return (
    <SettingsShell ownerOnly title="Subscription Details">
      <section className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8">
        {usage ? (
          <>
            <dl className="grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-teal-900/65">Current plan</dt>
                <dd className="mt-1 text-xl font-bold text-teal-950">{usage.plan.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-teal-900/65">Price</dt>
                <dd className="mt-1 text-xl font-bold text-teal-950">
                  {usage.plan.priceMonthly === 0 ? "Free" : `${usage.plan.priceMonthly.toLocaleString("en-US")} ฿ / month`}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-teal-900/65">Invoice scans this month</p>
                <p className="text-sm font-semibold tabular-nums text-teal-950">
                  {used} / {limit}
                </p>
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full bg-teal-100"
                role="progressbar"
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-label="Invoice scans used this month"
              >
                <div
                  className={`h-full rounded-full transition-all ${nearLimit ? "bg-gold-500" : "bg-teal-600"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-teal-900/65">
                {usage.scansLeft === 0
                  ? `You've used all your scans. They come back on ${formatDate(usage.resetsAt)}.`
                  : `${usage.scansLeft} left. Your scans reset on ${formatDate(usage.resetsAt)}.`}
              </p>
            </div>

            <div className="mt-8">
              <Link
                href="/dashboard/settings/subscription-plan"
                className="inline-block rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-teal-800"
              >
                Compare plans
              </Link>
            </div>
          </>
        ) : (
          <p role="status" className="text-sm text-teal-900/70">
            Loading…
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-teal-100 bg-white shadow-card">
        <div className="border-b border-teal-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-teal-950">Payments</h2>
        </div>
        <p className="px-6 py-8 text-sm text-teal-900/65">
          No payments yet. Your billing history and receipts will appear here once online payment is available.
        </p>
      </section>
    </SettingsShell>
  );
}
