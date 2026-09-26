import type { Metadata } from "next";
import Link from "next/link";
import DashboardNavbar from "../../../../components/DashboardNavbar";
import TodayDate from "../../../../components/TodayDate";

export const metadata: Metadata = {
  title: "Invoice confirmed — SabaiBiz",
};

// Placeholder result until the invoice is actually read by the Claude API.
const INVOICE = {
  supplier: "Chaweng Fresh Market",
  number: "INV-2026-0892",
  products: [
    { name: "Chicken breast", quantity: 5, unit: "kg", unitPrice: 147 },
    { name: "Cooking oil", quantity: 10, unit: "L", unitPrice: 61 },
    { name: "Rice", quantity: 25, unit: "kg", unitPrice: 28 },
    { name: "Tiger shrimp", quantity: 3, unit: "kg", unitPrice: 508 },
  ],
};

const ALERTS = [
  "Chicken breast is 12% more expensive than last month",
  "Tiger shrimp is 8% more expensive than last month",
];

const lineTotal = (p: { quantity: number; unitPrice: number }) => p.quantity * p.unitPrice;
const SUBTOTAL = INVOICE.products.reduce((s, p) => s + lineTotal(p), 0);
const fmt = (n: number) => n.toLocaleString("en-US");

// The invoice date chosen on the scan page arrives as ?date=YYYY-MM-DD.
function parseInvoiceDate(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== m - 1) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function InvoiceConfirmedPage({ searchParams }: PageProps<"/dashboard/invoices/scan/confirm">) {
  const invoiceDate = parseInvoiceDate((await searchParams).date);

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-green-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
              <path d="m5 12 5 5L20 7" />
            </svg>
          </span>
          Invoice confirmed
        </h1>

        <div className="mt-8 grid items-start gap-6 md:grid-cols-[2fr_3fr]">
          {/* Invoice image placeholder */}
          <section
            aria-label="Invoice image"
            className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 text-gray-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="h-20 w-20" aria-hidden>
              <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
              <path d="M14 3v4h4M9 12h6M9 16h6" />
            </svg>
            <span className="sr-only">Invoice image placeholder</span>
          </section>

          {/* Extracted data */}
          <section aria-label="Extracted data" className="rounded-2xl border-2 border-teal-600 bg-white p-6 shadow-card">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-medium text-teal-900/60">Supplier</dt>
                <dd className="mt-0.5 font-semibold text-teal-950">{INVOICE.supplier}</dd>
              </div>
              <div>
                <dt className="font-medium text-teal-900/60">Invoice date</dt>
                <dd className="mt-0.5 font-semibold text-teal-950">
                  {invoiceDate ?? <TodayDate />}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-teal-900/60">Invoice number</dt>
                <dd className="mt-0.5 font-semibold text-teal-950">{INVOICE.number}</dd>
              </div>
            </dl>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead>
                  <tr className="border-b border-teal-100 text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3 text-right">Quantity</th>
                    <th className="py-2 pr-3">Unit</th>
                    <th className="py-2 pr-3 text-right">Unit price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {INVOICE.products.map((p) => (
                    <tr key={p.name}>
                      <td className="py-3 pr-3 font-medium text-teal-950">{p.name}</td>
                      <td className="py-3 pr-3 text-right tabular-nums text-teal-900/80">{p.quantity}</td>
                      <td className="py-3 pr-3 text-teal-900/70">{p.unit}</td>
                      <td className="py-3 pr-3 text-right tabular-nums text-teal-950">{fmt(p.unitPrice)} ฿</td>
                      <td className="py-3 text-right font-semibold tabular-nums text-teal-950">{fmt(lineTotal(p))} ฿</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 space-y-2 border-t border-teal-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <dt className="font-medium text-teal-900/70">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-teal-950">{fmt(SUBTOTAL)} ฿</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-base font-bold text-teal-950">Grand total</dt>
                <dd className="text-2xl font-bold tabular-nums text-teal-700">{fmt(SUBTOTAL)} ฿</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Price alerts */}
        <section
          aria-label="Price alerts detected"
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            Price alerts detected
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-red-900">
            {ALERTS.map((a) => (
              <li key={a} className="flex gap-2.5">
                <span aria-hidden className="mt-1.5 h-2 w-2 flex-none rounded-full bg-red-500" />
                {a}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
          >
            Save invoice
          </Link>
          <Link
            href="/dashboard/invoices/scan"
            className="rounded-full border-2 border-teal-700 px-8 py-3.5 text-lg font-semibold text-teal-700 transition hover:bg-teal-700 hover:text-white"
          >
            Scan another
          </Link>
        </div>
      </main>
    </div>
  );
}
