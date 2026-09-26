import type { Metadata } from "next";
import SettingsShell from "../../../components/SettingsShell";

export const metadata: Metadata = {
  title: "Subscription Plan — SabaiBiz",
};

const CURRENT_PLAN = "Solo";

const PLANS = [
  {
    name: "Solo",
    price: "490",
    icon: IconSolo,
    features: [
      "10 invoices per day",
      "1 manager account",
      "Price tracking",
      "Daily profit margin",
      "Email alerts",
    ],
  },
  {
    name: "Team",
    price: "990",
    popular: true,
    icon: IconTeam,
    features: [
      "25 invoices per day",
      "3 manager accounts",
      "Everything in Solo",
      "Voice AI assistant",
      "Price inflation alerts",
      "Supplier comparison",
      "Weekly profit report",
    ],
  },
  {
    name: "Empire",
    price: "1990",
    icon: IconEmpire,
    features: [
      "Unlimited invoices",
      "Unlimited managers",
      "Everything in Team",
      "POS connection: Loyverse and Ocha",
      "Multi-business support",
      "Priority support",
      "Monthly business analysis report",
      "Custom alerts",
    ],
  },
];

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconSolo() {
  return (
    <svg {...iconProps} className="h-7 w-7">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg {...iconProps} className="h-7 w-7">
      <circle cx="12" cy="7" r="3" />
      <circle cx="5" cy="9" r="2.5" />
      <circle cx="19" cy="9" r="2.5" />
      <path d="M7 20v-1a5 5 0 0 1 5-5 5 5 0 0 1 5 5v1" />
      <path d="M1 19v-.5a4 4 0 0 1 4-4M23 19v-.5a4 4 0 0 0-4-4" />
    </svg>
  );
}

function IconEmpire() {
  return (
    <svg {...iconProps} className="h-7 w-7">
      <path d="M6 21V7l6-4 6 4v14" />
      <path d="M3 21h18M10 9h4M10 13h4M10 17h4" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-none" aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export default function SubscriptionPlanPage() {
  return (
    <SettingsShell title="Subscription Plan" maxWidth="max-w-6xl">
      <p className="mt-1 text-sm text-teal-900/65">
        Choose the plan that fits your business. You can change it anytime.
      </p>

      <div className="mt-8 grid items-stretch gap-6 md:grid-cols-3">
        {PLANS.map(({ name, price, features, popular, icon: Icon }) => {
          const current = name === CURRENT_PLAN;
          return (
            <div
              key={name}
              className={`relative flex flex-col rounded-2xl border p-8 shadow-card ${
                current
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-teal-100 bg-white text-teal-950"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-teal-950">
                  Most popular
                </span>
              )}
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-teal-700 ${current ? "bg-white" : "bg-teal-50"}`}>
                <Icon />
              </span>
              <h2 className="mt-4 text-xl font-bold">{name}</h2>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{price} ฿</span>
                <span className={`text-sm ${current ? "text-teal-100" : "text-teal-900/60"}`}>/month</span>
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className={current ? "text-gold-300" : "text-teal-600"}>
                      <IconCheck />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {current ? (
                <p className="mt-8 rounded-full bg-white/15 px-6 py-3 text-center text-base font-semibold">
                  Current plan
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-8 rounded-full bg-gold-500 px-6 py-3 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
                >
                  Upgrade
                </button>
              )}
            </div>
          );
        })}
      </div>
    </SettingsShell>
  );
}
