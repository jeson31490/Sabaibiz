import { PLAN_ORDER, PLANS } from "../../../lib/plans";
import type { Lang, LandingCopy } from "../../../lib/landingCopy";

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-4 w-4 flex-none text-teal-600" aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

/**
 * The price list, laid out like a menu board: plans are columns separated by the dashed
 * perforation of a receipt rather than boxed into cards.
 */
export default function PricingBoard({ copy, lang }: { copy: LandingCopy["pricing"]; lang: Lang }) {
  return (
    <div className="mt-12 grid gap-y-12 sm:grid-cols-2 lg:-mx-7 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-dashed lg:divide-teal-300">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        return (
          <div key={id} className="relative flex flex-col lg:px-7">
            {plan.popular && <div aria-hidden className="absolute -top-4 left-0 h-1 w-12 rounded-full bg-gold-500 lg:left-7" />}
            <h3 className="flex items-center gap-3 text-xl font-semibold">
              {plan.name}
              {plan.popular && (
                <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-800">{copy.recommended}</span>
              )}
            </h3>
            <p className="mt-1 min-h-12 text-sm text-teal-900/70">{lang === "th" ? plan.taglineTh : plan.tagline}</p>

            <p className="num mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight">
                {plan.priceMonthly.toLocaleString("en-US")}
                <span className="ml-1 text-2xl">฿</span>
              </span>
              <span className="text-sm text-teal-900/60">{copy.perMonth}</span>
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              {plan.features.map((f) => (
                <li key={f.text} className="flex gap-2.5">
                  <Check />
                  <span>
                    {lang === "th" ? f.th : f.text}
                    {f.soon && (
                      <span className="ml-2 whitespace-nowrap rounded-full bg-teal-100 px-2 py-0.5 align-middle text-[11px] font-semibold text-teal-800">
                        {copy.soon}
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
  );
}
