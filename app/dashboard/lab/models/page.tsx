"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import DashboardNavbar from "../../../components/DashboardNavbar";
import type { ModelReading } from "../../../api/lab/compare-models/route";
import { ACCEPTED_TYPES, toInvoicePage, type InvoicePage } from "../../../../lib/invoicePages";
import { MAX_INVOICE_PAGES } from "../../../../lib/scanInvoice";
import { supabase } from "../../../../lib/supabase";

// Hidden test page (no link to it): reads one invoice with several models side by side.
// Only accounts listed in ADMIN_EMAILS can use it; nothing is saved.

type Access = "checking" | "allowed" | "denied";
type ReadInvoice = NonNullable<ModelReading["invoice"]>;
type Product = ReadInvoice["products"][number];

const fmtUsd = (n: number | null) => (n === null ? "—" : `$${n.toFixed(4)}`);
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v === undefined ? null : v);

/** True when the models don't all give the same value. */
function differs(values: unknown[]): boolean {
  return new Set(values.map((v) => JSON.stringify(norm(v)))).size > 1;
}

const HEADER_FIELDS: { label: string; key: keyof ReadInvoice }[] = [
  { label: "Supplier", key: "supplier_name" },
  { label: "Legal name", key: "supplier_legal_name" },
  { label: "Tax ID", key: "supplier_tax_id" },
  { label: "Date", key: "invoice_date" },
  { label: "Number", key: "invoice_number" },
  { label: "Subtotal excl. VAT", key: "subtotal_excl_vat" },
  { label: "VAT", key: "vat_amount" },
  { label: "Total", key: "invoice_total" },
  { label: "Total label", key: "invoice_total_label" },
];

const PRODUCT_FIELDS: { label: string; get: (p: Product) => unknown }[] = [
  { label: "name", get: (p) => p.name },
  { label: "printed", get: (p) => p.original_name },
  { label: "qty", get: (p) => p.quantity },
  { label: "unit", get: (p) => p.unit },
  { label: "unit price", get: (p) => p.unit_price },
  { label: "line total", get: (p) => p.line_total },
  { label: "size", get: (p) => (p.content_amount ? `${p.content_amount} ${p.content_unit} (${p.content_source})` : null) },
  { label: "category", get: (p) => p.category },
];

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

export default function CompareModelsPage() {
  const [access, setAccess] = useState<Access>("checking");
  const [pages, setPages] = useState<InvoicePage[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<ModelReading[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    authHeader()
      .then((headers) => fetch("/api/lab/compare-models", { headers }))
      .then((res) => !cancelled && setAccess(res.ok ? "allowed" : "denied"))
      .catch(() => !cancelled && setAccess("denied"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => ACCEPTED_TYPES.includes(f.type));
    e.target.value = "";
    try {
      const added = await Promise.all(files.map(toInvoicePage));
      setPages((prev) => [...prev, ...added].slice(0, MAX_INVOICE_PAGES));
      setReadings(null);
    } catch {
      setError("One of these files couldn't be opened.");
    }
  }

  async function compare() {
    setRunning(true);
    setError(null);
    setReadings(null);
    try {
      const res = await fetch("/api/lab/compare-models", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ pages: pages.map((p) => ({ data: p.dataUrl, mediaType: p.mediaType })) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `The comparison failed (${res.status}).`);
      setReadings(body.readings as ModelReading[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The comparison failed.");
    } finally {
      setRunning(false);
    }
  }

  if (access !== "allowed") {
    return (
      <div className="min-h-screen">
        <DashboardNavbar />
        <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-teal-900/70">
          {access === "checking" ? "Loading…" : "This page doesn't exist."}
        </main>
      </div>
    );
  }

  const invoices = readings?.map((r) => r.invoice) ?? [];
  const maxLines = Math.max(0, ...invoices.map((i) => i?.products.length ?? 0));

  return (
    <div className="min-h-screen pb-16">
      <DashboardNavbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-teal-950">Model comparison</h1>
        <p className="mt-1 text-sm text-teal-900/65">
          Test page: the invoice is read by each model with the same prompt as the real scan. Nothing is saved. Cells in gold differ between models.
        </p>

        <section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
          <label className="cursor-pointer rounded-full border border-teal-200 px-5 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50">
            Add photos or PDF
            <input type="file" accept={ACCEPTED_TYPES.join(",")} multiple onChange={addFiles} className="sr-only" />
          </label>
          <span className="text-sm text-teal-900/70">
            {pages.length === 0 ? "No pages yet" : `${pages.length} page${pages.length > 1 ? "s" : ""}: ${pages.map((p) => p.name).join(", ")}`}
          </span>
          {pages.length > 0 && (
            <button type="button" onClick={() => { setPages([]); setReadings(null); }} className="text-sm font-semibold text-teal-700 hover:underline">
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={compare}
            disabled={running || pages.length === 0}
            className="ml-auto rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-teal-800 disabled:opacity-60"
          >
            {running ? "Reading with 3 models…" : "Compare"}
          </button>
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {readings && (
          <>
            <section className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-semibold text-teal-950">Cost and speed</h2>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-teal-100 text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                    <th className="py-2 pr-4">Model</th>
                    <th className="py-2 pr-4 text-right">Time</th>
                    <th className="py-2 pr-4 text-right">Input tokens</th>
                    <th className="py-2 pr-4 text-right">Output tokens</th>
                    <th className="py-2 pr-4 text-right">Cost</th>
                    <th className="py-2 pr-4 text-right">Cost per page</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100 tabular-nums">
                  {readings.map((r) => (
                    <tr key={r.model}>
                      <td className="py-2 pr-4 font-semibold text-teal-950">{r.model}</td>
                      <td className="py-2 pr-4 text-right">{(r.ms / 1000).toFixed(1)} s</td>
                      <td className="py-2 pr-4 text-right">{show(r.inputTokens?.toLocaleString("en-US"))}</td>
                      <td className="py-2 pr-4 text-right">{show(r.outputTokens?.toLocaleString("en-US"))}</td>
                      <td className="py-2 pr-4 text-right">{fmtUsd(r.costUsd)}</td>
                      <td className="py-2 pr-4 text-right">{fmtUsd(r.costUsd === null ? null : r.costUsd / pages.length)}</td>
                      <td className={`py-2 ${r.ok ? "text-teal-700" : "text-red-600"}`}>{r.ok ? `OK · ${r.invoice?.products.length} lines` : r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-semibold text-teal-950">Invoice</h2>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-teal-100 text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                    <th className="py-2 pr-4">Field</th>
                    {readings.map((r) => (
                      <th key={r.model} className="py-2 pr-4">
                        {r.model}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {HEADER_FIELDS.map(({ label, key }) => {
                    const values = invoices.map((i) => (i ? i[key] : undefined));
                    const diff = differs(values);
                    return (
                      <tr key={key}>
                        <td className="py-2 pr-4 font-medium text-teal-900/70">{label}</td>
                        {values.map((v, k) => (
                          <td key={k} className={`py-2 pr-4 ${diff ? "bg-gold-50 font-semibold text-gold-800" : "text-teal-950"}`}>
                            {show(v)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-semibold text-teal-950">Lines (in the order read)</h2>
              <table className="mt-3 w-full min-w-[900px] text-left text-xs">
                <thead>
                  <tr className="border-b border-teal-100 font-semibold uppercase tracking-wide text-teal-900/55">
                    <th className="py-2 pr-3">#</th>
                    {readings.map((r) => (
                      <th key={r.model} className="py-2 pr-3">
                        {r.model}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100 align-top">
                  {Array.from({ length: maxLines }, (_, line) => {
                    const products = invoices.map((i) => i?.products[line]);
                    return (
                      <tr key={line}>
                        <td className="py-2 pr-3 font-semibold text-teal-900/60">{line + 1}</td>
                        {products.map((p, k) => (
                          <td key={k} className="py-2 pr-3">
                            {!p ? (
                              <span className="font-semibold text-gold-800">No line</span>
                            ) : (
                              <dl className="space-y-0.5">
                                {PRODUCT_FIELDS.map(({ label, get }) => {
                                  const diff = differs(products.map((q) => (q ? get(q) : undefined)));
                                  return (
                                    <div key={label} className={`flex gap-2 rounded px-1 ${diff ? "bg-gold-50 font-semibold text-gold-800" : "text-teal-950"}`}>
                                      <dt className="w-16 shrink-0 text-teal-900/55">{label}</dt>
                                      <dd>{show(get(p))}</dd>
                                    </div>
                                  );
                                })}
                              </dl>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
