import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import DashboardNavbar from "../../components/DashboardNavbar";

export const metadata: Metadata = {
  title: "Account & Settings — SabaiBiz",
};

type IconProps = { className?: string };

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconPerson({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function IconBuilding({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
      <path d="M15 10h4a1 1 0 0 1 1 1v10M2 21h20" />
      <path d="M8 8h3M8 12h3M8 16h3" />
    </svg>
  );
}

function IconStar({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
    </svg>
  );
}

function IconDocument({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}

function IconGroup({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a5 5 0 0 1 4 4.7v1" />
    </svg>
  );
}

function IconPlug({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
      <path d="M12 17v4" />
    </svg>
  );
}

const SETTINGS: {
  title: string;
  description: string;
  href: string;
  icon: (props: IconProps) => ReactElement;
}[] = [
  {
    title: "Owner Profile",
    description: "Your name, email, password and personal preferences.",
    href: "/dashboard/settings/owner-profile",
    icon: IconPerson,
  },
  {
    title: "Business Details",
    description: "Business name, address, tax ID and opening hours.",
    href: "/dashboard/settings/business-details",
    icon: IconBuilding,
  },
  {
    title: "Subscription Plan",
    description: "Compare plans and upgrade or downgrade anytime.",
    href: "/dashboard/settings/subscription-plan",
    icon: IconStar,
  },
  {
    title: "Subscription Details",
    description: "Billing history, invoices and your payment method.",
    href: "/dashboard/settings/subscription-details",
    icon: IconDocument,
  },
  {
    title: "Team Access",
    description: "Invite managers and control what each person can see.",
    href: "/dashboard/settings/team-access",
    icon: IconGroup,
  },
  {
    title: "Connection & POS",
    description: "Connect Loyverse and other POS systems to SabaiBiz.",
    href: "/dashboard/settings/pos-connection",
    icon: IconPlug,
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-teal-700 transition hover:text-teal-900"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
          Account &amp; Settings
        </h1>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SETTINGS.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col items-center rounded-2xl border border-teal-100 bg-white px-6 py-10 text-center shadow-card transition hover:-translate-y-0.5 hover:border-teal-600 hover:bg-teal-50 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700 text-white transition group-hover:bg-teal-800">
                <Icon className="h-8 w-8" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-teal-950">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-teal-900/65">{description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
