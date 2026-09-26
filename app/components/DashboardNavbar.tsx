"use client";

import Image from "next/image";
import Link from "next/link";
import { getInitials, useUser } from "../context/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { supabase } from "../../lib/supabase";

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

function IconGear({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

const NAV_ITEMS: {
  label: string;
  href: string;
  icon: (props: IconProps) => ReactElement;
  exact?: boolean;
}[] = [
  { label: "Dashboard", href: "/dashboard", icon: IconHome, exact: true },
  { label: "Invoices", href: "/dashboard/invoices", icon: IconDocument },
  { label: "Price Analysis", href: "/dashboard/price-analysis", icon: IconChart },
  { label: "Settings", href: "/dashboard/settings", icon: IconGear },
];

export default function DashboardNavbar() {
  const { user } = useUser();
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
    <header className="sticky top-0 z-40 border-b border-teal-100/80 bg-white/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-2">
        <Link href="/dashboard" className="flex items-center gap-1 justify-self-start">
          <Image
            src="/Thaimen1.png"
            alt="Sabai mascot"
            width={1380}
            height={1349}
            sizes="66px"
            className="h-12 w-auto object-contain"
            priority
          />
          <Image
            src="/sabaibiz-logo.png"
            alt="SabaiBiz logo"
            width={2816}
            height={1536}
            sizes="240px"
            className="hidden h-14 w-auto object-contain sm:block"
            priority
          />
        </Link>

        <p className="truncate text-center text-base font-semibold text-teal-950 sm:text-lg">
          {user.businessName}
        </p>

        <div className="flex items-center gap-3 justify-self-end">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              title={user.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white"
              title={user.name}
            >
              {getInitials(user.name)}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-full border border-teal-200 px-4 py-1.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>

      <nav aria-label="Dashboard" className="border-t border-teal-100/80">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-700 text-white"
                      : "text-teal-800 hover:bg-teal-50 hover:text-teal-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
