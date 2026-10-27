"use client";

import { useState } from "react";
import {
  CYCLES,
  cycleTotal,
  monthlyPriceOnCycle,
  PAYMENTS_ENABLED,
  PLAN_ORDER,
  PLANS,
  type CycleId,
  type PlanId,
} from "../../lib/plans";
import { usePlanUsage } from "./usePlanUsage";

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-none" aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

/** The four plans side by side, with the billing cycle switch. Marks the business's current plan. */
export default function PlanCards({ showCycleSwitch = true }: { showCycleSwitch?: boolean }) {
  const { usage } = usePlanUsage();
  const [cycle, setCycle] = useState<CycleId>("monthly");
  const currentId: PlanId | null = usage?.plan.id ?? null;
  const currentIndex = currentId ? PLAN_ORDER.indexOf(currentId) : -1;

  return (
    <div>
      {showCycleSwitch && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Billing cycle" className="inline-flex rounded-full border border-teal-200 bg-white p-1">
            {CYCLES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === cycle}
                onClick={() => setCycle(c.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  c.id === cycle ? "bg-teal-700 text-white shadow-card" : "text-teal-800 hover:bg-teal-50"
                }`}
              >
                {c.label}
                {c.discount > 0 && (
                  <span className={`ml-1.5 text-xs ${c.id === cycle ? "text-gold-200" : "text-gold-600"}`}>
                    −{Math.round(c.discount * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id, index) => {
          const plan = PLANS[id];
          const current = id === currentId;
          const perMonth = monthlyPriceOnCycle(plan, cycle);
          const months = CYCLES.find((c) => c.id === cycle)?.months ?? 1;
          return (
            <div
              key={id}
              className={`relative flex flex-col rounded-2xl border p-7 shadow-card ${
                current ? "border-teal-700 bg-teal-700 text-white" : "border-teal-100 bg-white text-teal-950"
              }`}
            >
              {plan.popular && !current && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-teal-950">
                  Recommended
                </span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className={`mt-1 text-sm ${current ? "text-teal-100" : "text-teal-900/65"}`}>{plan.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{perMonth === 0 ? "0" : perMonth.toLocaleString("en-US")} ฿</span>
                <span className={`text-sm ${current ? "text-teal-100" : "text-teal-900/60"}`}>/month</span>
              </p>
              <p className={`mt-1 h-5 text-xs ${current ? "text-teal-100" : "text-teal-900/55"}`}>
                {perMonth > 0 && months > 1 ? `${cycleTotal(plan, cycle).toLocaleString("en-US")} ฿ billed every ${months} months` : ""}
              </p>

              <ul className="mt-5 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex gap-2.5">
                    <span className={current ? "text-gold-300" : "text-teal-600"}>
                      <IconCheck />
                    </span>
                    <span>
                      {f.text}
                      {f.soon && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide ${
                            current ? "bg-white/20 text-white" : "bg-gold-100 text-gold-700"
                          }`}
                        >
                          Soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {current ? (
                <p className="mt-7 rounded-full bg-white/15 px-6 py-3 text-center text-base font-semibold">Current plan</p>
              ) : (
                <button
                  type="button"
                  disabled={!PAYMENTS_ENABLED}
                  className="mt-7 rounded-full bg-gold-500 px-6 py-3 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:bg-teal-100 disabled:text-teal-800/60 disabled:shadow-none"
                >
                  {PAYMENTS_ENABLED
                    ? index > currentIndex
                      ? `Upgrade to ${plan.name}`
                      : `Switch to ${plan.name}`
                    : "Online payment opens soon"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
