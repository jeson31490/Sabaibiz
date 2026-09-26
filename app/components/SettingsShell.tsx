import Link from "next/link";
import type { ReactNode } from "react";
import DashboardNavbar from "./DashboardNavbar";

export default function SettingsShell({
  title,
  maxWidth = "max-w-3xl",
  children,
}: {
  title: string;
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />
      <main className={`mx-auto px-6 py-8 ${maxWidth}`}>
        <Link
          href="/dashboard/settings"
          aria-label="Back to Account & Settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
