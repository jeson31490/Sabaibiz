import type { Metadata } from "next";
import Link from "next/link";
import DashboardNavbar from "../../components/DashboardNavbar";
import IngredientsManager from "../../components/IngredientsManager";

export const metadata: Metadata = {
  title: "Ingredients — SabaiBiz",
};

export default function IngredientsPage() {
  return (
    <div className="min-h-screen pb-16">
      <DashboardNavbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Ingredients</h1>
        <p className="mt-1 text-sm text-teal-900/65">
          Ready to cost your dishes?{" "}
          <Link href="/dashboard/recipes" className="font-semibold text-teal-700 underline">
            Open recipes and margins
          </Link>
        </p>
        <div className="mt-2">
          <IngredientsManager />
        </div>
      </main>
    </div>
  );
}
