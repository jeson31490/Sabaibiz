"use client";

import Link from "next/link";
import { useState } from "react";
import type { L2 } from "../../../lib/landing2";
import type { Lang } from "../../../lib/landingCopy";
import { PLAN_ORDER, PLANS, monthlyPriceOnCycle, type PlanId } from "../../../lib/plans";

const THEME: Record<PlanId, { bg: string; fg: string; chip: string }> = {
  free: { bg: "#F4EBD8", fg: "#031B1C", chip: "rgba(3,27,28,.1)" },
  solo: { bg: "#19D3B5", fg: "#031B1C", chip: "rgba(3,27,28,.12)" },
  team: { bg: "#E8B94A", fg: "#031B1C", chip: "rgba(3,27,28,.12)" },
  tracker: { bg: "#FF5A36", fg: "#031B1C", chip: "rgba(3,27,28,.14)" },
};

const PAY = ["PromptPay QR", "Card", "TrueMoney Wallet", "Google Pay"];

export default function PlanSection({ t, lang, signup }: { t: L2["pricing"]; lang: Lang; signup: string }) {
  const [yearly, setYearly] = useState(false);
  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-[#072A2B] p-1 text-sm font-semibold">
          {[false, true].map((y) => (
            <button
              key={String(y)}
              type="button"
              aria-pressed={yearly === y}
              onClick={() => setYearly(y)}
              className={`rounded-full px-5 py-2 transition ${yearly === y ? "bg-[#E8B94A] text-[#031B1C]" : "text-[#F4EBD8]"}`}
            >
              {y ? `${t.yearly} ${t.save}` : t.monthly}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const th = THEME[id];
          const price = monthlyPriceOnCycle(plan, yearly ? "yearly" : "monthly");
          return (
            <div key={id} className="relative flex flex-col rounded-3xl p-6" style={{ background: th.bg, color: th.fg }}>
              {plan.popular && (
                <span className="absolute -top-3 right-5 rounded-full bg-[#031B1C] px-3 py-1 font-plex text-[11px] font-bold text-[#E8B94A]">{t.popular}</span>
              )}
              <h3 className="font-display text-2xl font-extrabold">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm opacity-80">{plan.tag[lang]}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-extrabold tracking-tight">{price.toLocaleString("en-US")}</span>
                <span className="text-xl font-bold">฿</span>
                <span className="text-sm opacity-70">{t.perMonth}</span>
              </p>
              <p className="h-5 text-xs opacity-70">{yearly && price > 0 ? t.yearlyNote : ""}</p>
              <Link
                href={signup}
                className="mt-4 block rounded-full bg-[#031B1C] px-5 py-3 text-center text-sm font-bold text-[#F4EBD8] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#031B1C] focus-visible:ring-offset-2"
              >
                {t.cta}
              </Link>
              <ul className="mt-6 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li
                    key={f.t.en}
                    className={`flex gap-2 ${f.kind === "head" ? "mt-3 font-bold" : ""} ${f.kind === "sub" ? "pl-5 opacity-80" : ""}`}
                  >
                    {f.kind !== "head" && <span aria-hidden>✓</span>}
                    <span>
                      {f.t[lang]}
                      {f.soon && (
                        <span className="ml-2 whitespace-nowrap rounded-full px-2 py-0.5 align-middle font-plex text-[10px] font-bold" style={{ background: th.chip }}>
                          {t.soon}
                        </span>
                      )}
                      {f.isNew && (
                        <span className="ml-2 whitespace-nowrap rounded-full bg-[#031B1C] px-2 py-0.5 align-middle font-plex text-[10px] font-bold text-[#E8B94A]">
                          {t.newTag}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 font-plex text-xs text-[#F4EBD8]/70">{t.pay}</span>
        {PAY.map((p) => (
          <span key={p} className="rounded-full border border-[#F4EBD8]/25 px-3 py-1 text-xs text-[#F4EBD8]">
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
