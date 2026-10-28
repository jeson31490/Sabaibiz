import type { Metadata } from "next";
import DashboardNavbar from "../../components/DashboardNavbar";
import RecipesManager from "../../components/RecipesManager";

export const metadata: Metadata = { title: "Recipes — SabaiBiz" };

export default function RecipesPage() {
  return (
    <div className="min-h-screen pb-16">
      <DashboardNavbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Recipes and margins</h1>
        <p className="mt-1 text-sm text-teal-900/65">
          What each dish really costs, from the latest prices on your invoices, and what you keep on each sale.
        </p>
        <div className="mt-6">
          <RecipesManager />
        </div>
      </main>
    </div>
  );
}
