"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "../context/UserContext";
import { useCanScanPayments } from "../../lib/useCanScanPayments";
import { navItemsFor } from "./DashboardNavbar";

// App-style tab bar at the bottom of the screen on phones (the top pills stay for tablets and computers).
const MAX_TABS = 5;
// What an owner or manager sees first; the rest stays one tap away in the top menu on bigger screens.
const PREFERRED = ["Dashboard", "Today", "Invoices", "Transfers", "Price Analysis", "Team", "Settings"];

export default function MobileTabBar() {
  const { role, canScan } = useUser();
  const canScanPayments = useCanScanPayments(role === "employee");
  const pathname = usePathname();
  const all = navItemsFor(role, canScan, canScanPayments);
  const items = (role === "employee" ? all : PREFERRED.map((l) => all.find((i) => i.label === l)).filter((i): i is (typeof all)[number] => !!i)).slice(0, MAX_TABS);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#19D3B5]/20 bg-[#052123]/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${active ? "text-[#19D3B5]" : "text-[#F4EBD8]/60"}`}
              >
                <Icon className="h-6 w-6" />
                {label === "Price Analysis" ? "Prices" : label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
