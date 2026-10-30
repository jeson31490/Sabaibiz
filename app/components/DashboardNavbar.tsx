"use client";

import Link from "next/link";
import { getInitials, useUser, type UserRole } from "../context/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { useCanScanPayments } from "../../lib/useCanScanPayments";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "./landing/SabaiMark";
import { useNotifications } from "../../lib/useNotifications";

type IconProps = { className?: string };

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconHome({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
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

function IconChart({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function IconBasket({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M3 9h18l-2 11H5L3 9Z" />
      <path d="m8 9 4-6 4 6M9 13v4M15 13v4" />
    </svg>
  );
}

function IconPeople({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a5 5 0 0 1 4 4.7v1" />
    </svg>
  );
}

function IconGear({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export type NavItem = {
  label: string;
  href: string;
  icon: (props: IconProps) => ReactElement;
  exact?: boolean;
};

const ITEM = {
  dashboard: { label: "Dashboard", href: "/dashboard", icon: IconHome, exact: true },
  today: { label: "Today", href: "/dashboard", icon: IconHome, exact: true },
  myDay: { label: "My day", href: "/dashboard", icon: IconHome, exact: true },
  invoices: { label: "Invoices", href: "/dashboard/invoices", icon: IconDocument },
  transfers: { label: "Transfers", href: "/dashboard/transfers", icon: IconDocument },
  ingredients: { label: "Ingredients", href: "/dashboard/ingredients", icon: IconBasket },
  recipes: { label: "Recipes", href: "/dashboard/recipes", icon: IconDocument },
  prices: { label: "Price Analysis", href: "/dashboard/price-analysis", icon: IconChart },
  team: { label: "Team", href: "/dashboard/team", icon: IconPeople },
  settings: { label: "Settings", href: "/dashboard/settings", icon: IconGear },
} satisfies Record<string, NavItem>;

// The owner sees everything. A manager has "Today" instead of the profit dashboard. An employee gets a
// short menu, and invoices only if allowed.
export function navItemsFor(role: UserRole | null, canScan: boolean | null, canScanPayments: boolean | null): NavItem[] {
  if (role === "employee") {
    return [ITEM.myDay, ...(canScan ? [ITEM.invoices] : []), ...(canScanPayments ? [ITEM.transfers] : []), ITEM.settings];
  }
  const home = role === "manager" ? ITEM.today : ITEM.dashboard;
  return [home, ITEM.invoices, ITEM.transfers, ITEM.ingredients, ...(role === "manager" ? [] : [ITEM.recipes]), ITEM.prices, ITEM.team, ITEM.settings];
}

export default function DashboardNavbar() {
  const { user, role, canScan } = useUser();
  const canScanPayments = useCanScanPayments(role === "employee");
  const navItems = navItemsFor(role, canScan, canScanPayments);
  // New absence declarations: only the owner and managers get them.
  const { unread } = useNotifications(role === "owner" || role === "manager");
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    // Ends the Supabase session; the user context resets itself on the sign-out event.
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-teal-400/15 bg-[#031b1c]/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/dashboard" aria-label="SabaiBiz dashboard" className="justify-self-start">
          <Wordmark size={34} id="nav" className="text-xl sm:text-2xl" />
        </Link>

        <p className="truncate text-center font-display text-base font-bold text-teal-950 sm:text-lg">
          {user.businessName}
        </p>

        <div className="flex items-center gap-3 justify-self-end">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              title={user.name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-gold-500/60"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-[#031b1c]"
              title={user.name}
            >
              {getInitials(user.name)}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="whitespace-nowrap rounded-full border border-teal-950/30 px-3 sm:px-4 py-1.5 text-sm font-semibold text-teal-950 transition hover:border-teal-950/60 hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>

      <nav aria-label="Dashboard">
        <ul className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3">
          {navItems.map(({ label, href, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-teal-400 bg-teal-400 text-[#031b1c]"
                      : "border-transparent text-teal-900 hover:border-teal-400/30 hover:bg-teal-400/10 hover:text-teal-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {href === ITEM.team.href && unread > 0 && (
                    <span
                      aria-label={`${unread} new`}
                      className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 text-xs font-bold text-[#031b1c]"
                    >
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
