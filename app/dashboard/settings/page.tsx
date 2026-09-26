import type { Metadata } from "next";
import Link from "next/link";
import DashboardNavbar from "../../components/DashboardNavbar";
import SettingsCards from "../../components/SettingsCards";

export const metadata: Metadata = {
  title: "Account & Settings — SabaiBiz",
};

// The cards depend on the signed-in user's role, which is known in the browser (see SettingsCards).
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

        <SettingsCards />
      </main>
    </div>
  );
}
