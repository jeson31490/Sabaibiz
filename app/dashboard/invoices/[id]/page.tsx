"use client";

import Link from "next/link";
import { use, useEffect, useState, type FormEvent } from "react";
import DashboardNavbar from "../../../components/DashboardNavbar";
import { inputClass, labelClass } from "../../../components/FormField";
import { useUser } from "../../../context/UserContext";
import {
  bangkokToday,
  DuplicateInvoiceError,
  fetchInvoice,
  fetchSupplierNames,
  fromIsoDate,
  invoiceDateWarning,
  isIsoDate,
  updateInvoice,
  type InvoiceDetail,
} from "../../../../lib/invoices";

const fmtDate = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

type Load = { status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ready"; invoice: InvoiceDetail };
type Draft = { supplier: string; number: string; date: string };

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { role } = useUser();
  // Employees can look; the owner and managers can correct what was misread.
  const canEdit = role === "owner" || role === "manager";

  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInvoice(id)
      .then((invoice) => !cancelled && setLoad(invoice ? { status: "ready", invoice } : { status: "missing" }))
      .catch(() => !cancelled && setLoad({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  function startEdit(invoice: InvoiceDetail) {
    setDraft({ supplier: invoice.supplier, number: invoice.generatedNumber ? "" : invoice.number, date: invoice.date });
    setError(null);
    setNotice(null);
    fetchSupplierNames()
      .then(setSupplierNames)
      .catch(() => {}); // suggestions are a convenience
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || load.status !== "ready") return;
    setSaving(true);
    setError(null);
    try {
      await updateInvoice(id, draft);
      const fresh = await fetchInvoice(id);
      if (fresh) setLoad({ status: "ready", invoice: fresh });
      setDraft(null);
      setNotice("Invoice updated.");
    } catch (err) {
      setError(
        err instanceof DuplicateInvoiceError || (err instanceof Error && err.message.startsWith("Please"))
          ? err.message
          : "We couldn't save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const invoice = load.status === "ready" ? load.invoice : null;
  const dateWarning = draft && invoice ? invoiceDateWarning(draft.date, invoice.scannedOn) : null;
  const canSave =
    !!draft &&
    !!invoice &&
    !saving &&
    draft.supplier.trim() !== "" &&
    isIsoDate(draft.date) &&
    (invoice.generatedNumber || draft.number.trim() !== "");

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          My Invoices
        </Link>

        {load.status === "loading" && (
          <p role="status" className="mt-6 text-sm text-teal-900/70">
            Loading…
          </p>
        )}
        {load.status === "missing" && (
          <p role="alert" className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 text-sm text-teal-900/70 shadow-card">
            This invoice doesn&apos;t exist or was deleted.
          </p>
        )}
        {load.status === "error" && (
          <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
            We couldn&apos;t load this invoice. Please refresh the page.
          </p>
        )}

        {invoice && (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
                {invoice.generatedNumber ? "Invoice without number" : `Invoice ${invoice.number}`}
              </h1>
              {canEdit && !draft && (
                <button
                  type="button"
                  onClick={() => startEdit(invoice)}
                  className="rounded-full border border-teal-200 bg-white px-5 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                >
                  Edit
                </button>
              )}
            </div>

            {notice && (
              <p role="status" className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                {notice}
              </p>
            )}

            {draft ? (
              <form onSubmit={save} className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8">
                <h2 className="text-lg font-semibold text-teal-950">Edit invoice</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-supplier" className={labelClass}>
                      Supplier
                    </label>
                    <input
                      id="edit-supplier"
                      value={draft.supplier}
                      onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                      list="edit-supplier-suggestions"
                      autoComplete="off"
                      className={inputClass}
                    />
                    <datalist id="edit-supplier-suggestions">
                      {supplierNames.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="edit-number" className={labelClass}>
                      Invoice number{invoice.generatedNumber ? " (optional)" : ""}
                    </label>
                    <input
                      id="edit-number"
                      value={draft.number}
                      onChange={(e) => setDraft({ ...draft, number: e.target.value })}
                      placeholder={invoice.generatedNumber ? `No number (kept as ${invoice.number})` : undefined}
                      autoComplete="off"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-date" className={labelClass}>
                      Invoice date
                    </label>
                    <input
                      id="edit-date"
                      type="date"
                      autoComplete="off"
                      value={draft.date}
                      max={bangkokToday()}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      aria-describedby={dateWarning ? "edit-date-hint" : undefined}
                      className={inputClass}
                    />
                    {dateWarning && (
                      <p id="edit-date-hint" className="mt-1.5 text-xs font-medium text-gold-800">
                        {dateWarning}
                      </p>
                    )}
                  </div>
                </div>
                {error && (
                  <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={!canSave}
                    className="rounded-full bg-teal-700 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    disabled={saving}
                    className="rounded-full border border-teal-200 px-7 py-3 text-base font-semibold text-teal-800 transition hover:bg-teal-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-6 grid gap-4 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-teal-900/55">Supplier</dt>
                  <dd className="mt-1 font-semibold text-teal-950">{invoice.supplier}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-teal-900/55">Number</dt>
                  <dd className="mt-1 font-semibold text-teal-950">
                    {invoice.number}
                    {invoice.generatedNumber && (
                      <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        No number
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-teal-900/55">Invoice date</dt>
                  <dd className="mt-1 font-semibold text-teal-950">{fmtDate(invoice.date)}</dd>
                </div>
              </dl>
            )}

            <section className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-semibold text-teal-950">Products</h2>
              {invoice.items.length === 0 ? (
                <p className="mt-3 text-sm text-teal-900/60">No products on this invoice.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-teal-100 text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                        <th className="py-2 pr-2">Product</th>
                        <th className="py-2 pr-2 text-right">Qty</th>
                        <th className="py-2 pr-2">Unit</th>
                        <th className="py-2 text-right">Unit price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                      {invoice.items.map((p, i) => (
                        <tr key={i}>
                          <td className="py-2.5 pr-2 font-medium text-teal-950">{p.name}</td>
                          <td className="py-2.5 pr-2 text-right tabular-nums text-teal-900/75">{fmt(p.quantity)}</td>
                          <td className="py-2.5 pr-2 text-teal-900/75">{p.unit}</td>
                          <td className="py-2.5 text-right tabular-nums text-teal-950">{fmt(p.unitPrice)} ฿</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-teal-100 pt-4">
                <span className="text-sm font-medium text-teal-900/70">Total (incl. VAT)</span>
                <span className="text-2xl font-bold tabular-nums text-teal-950">{fmt(invoice.total)} ฿</span>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
