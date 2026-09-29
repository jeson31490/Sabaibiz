"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState, type FormEvent } from "react";
import DashboardNavbar from "../../../components/DashboardNavbar";
import { inputClass, labelClass } from "../../../components/FormField";
import { useUser } from "../../../context/UserContext";
import {
  bangkokToday,
  DuplicateInvoiceError,
  fetchInvoice,
  fetchProductNames,
  fetchSupplierNames,
  fromIsoDate,
  invoiceDateWarning,
  isIsoDate,
  updateInvoice,
  updateInvoiceLines,
  type InvoiceDetail,
  type InvoiceLine,
} from "../../../../lib/invoices";
import { checkLine, type ContentUnit } from "../../../../lib/scanInvoice";
import LineTotal from "../../../components/LineTotal";

const fmtDate = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const UNIT_LABELS: Record<ContentUnit, string> = { g: "g", ml: "ml", pcs: "pieces" };
const productKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

const fieldClass =
  "w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const smallLabel = "block text-xs font-medium text-teal-900/65";

type Load = { status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ready"; invoice: InvoiceDetail };

/** A line being edited; numbers stay strings while typed. No id = new line. */
type LineDraft = {
  key: string;
  id?: string;
  name: string;
  originalName: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  contentAmount: string;
  contentUnit: ContentUnit | "";
  productName: string;
  /** Total printed for the line; empty when none was read. */
  printedLineTotal: string;
  lineFlagged: boolean;
  suspectPrice: boolean;
};
type Draft = { supplier: string; number: string; date: string; total: string; lines: LineDraft[] };

const toDraftLine = (l: InvoiceLine): LineDraft => ({
  key: l.id,
  id: l.id,
  name: l.name,
  originalName: l.originalName,
  quantity: String(l.quantity),
  unit: l.unit,
  unitPrice: String(l.unitPrice),
  contentAmount: l.contentAmount === null ? "" : String(l.contentAmount),
  contentUnit: l.contentUnit ?? "",
  productName: l.productName ?? l.name,
  printedLineTotal: l.printedLineTotal === null ? "" : String(l.printedLineTotal),
  lineFlagged: l.lineFlagged,
  suspectPrice: l.suspectPrice,
});

function sizeText(l: InvoiceLine): string {
  if (l.contentAmount === null || !l.contentUnit) return "Size unknown";
  if (l.contentSource === "standard") return `per ${l.unit}`;
  const text = `1 ${l.unit} = ${fmt(l.contentAmount)} ${UNIT_LABELS[l.contentUnit]}`;
  return l.contentSource === "estimated" ? `${text} (estimated)` : text;
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { role } = useUser();
  // Employees can look; the owner and managers can correct what was misread.
  const canEdit = role === "owner" || role === "manager";

  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
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
    setDraft({
      supplier: invoice.supplier,
      number: invoice.generatedNumber ? "" : invoice.number,
      date: invoice.date,
      total: String(invoice.total),
      lines: invoice.items.map(toDraftLine),
    });
    setError(null);
    setNotice(null);
    // Suggestions are a convenience: editing works without them.
    fetchSupplierNames().then(setSupplierNames).catch(() => {});
    fetchProductNames().then(setProductNames).catch(() => {});
  }

  function setLine(key: string, changes: Partial<LineDraft>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: d.lines.map((l) => {
              if (l.key !== key) return l;
              const next = { ...l, ...changes };
              // Renaming a line proposes the product of that name (new or existing), unless the
              // owner already picked another product for it.
              if (changes.name !== undefined && productKey(l.productName) === productKey(l.name)) next.productName = changes.name;
              return next;
            }),
          }
        : d,
    );
  }

  function addLine() {
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: [
              ...d.lines,
              {
                key: `new-${Date.now()}`,
                name: "",
                originalName: null,
                quantity: "1",
                unit: "pcs",
                unitPrice: "",
                printedLineTotal: "",
                lineFlagged: false,
                contentAmount: "",
                contentUnit: "",
                productName: "",
                suspectPrice: false,
              },
            ],
          }
        : d,
    );
  }

  const knownProducts = useMemo(() => new Set(productNames.map(productKey)), [productNames]);
  // A line comes to its printed total when there is one (line discounts), else quantity × unit price.
  const lineCheckOf = (l: LineDraft) =>
    checkLine(Number(l.quantity) || 0, Number(l.unitPrice) || 0, l.printedLineTotal === "" ? null : Number(l.printedLineTotal));
  const linesTotal = draft ? Math.round(draft.lines.reduce((s, l) => s + lineCheckOf(l).total, 0) * 100) / 100 : 0;
  const totalGap = draft && draft.total !== "" ? Math.round((Number(draft.total) - linesTotal) * 100) / 100 : 0;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || load.status !== "ready") return;
    setSaving(true);
    setError(null);
    try {
      await updateInvoice(id, { supplier: draft.supplier, number: draft.number, date: draft.date });
      await updateInvoiceLines(
        id,
        draft.lines.map((l) => ({
          id: l.id,
          name: l.name,
          originalName: l.originalName,
          quantity: Number(l.quantity),
          unit: l.unit,
          unitPrice: l.unitPrice === "" ? NaN : Number(l.unitPrice),
          contentAmount: l.contentAmount === "" ? null : Number(l.contentAmount),
          contentUnit: l.contentAmount === "" ? null : l.contentUnit || null,
          productName: l.productName,
          printedLineTotal: l.printedLineTotal === "" ? null : Number(l.printedLineTotal),
        })),
        Number(draft.total),
      );
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
    draft.total !== "" &&
    draft.lines.length > 0 &&
    (invoice.generatedNumber || draft.number.trim() !== "");

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />
      <main className="mx-auto max-w-4xl px-6 py-8">
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
              <form onSubmit={save} className="mt-6 space-y-6">
                <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8">
                  <h2 className="text-lg font-semibold text-teal-950">Edit invoice</h2>
                  <div className="mt-5 grid gap-5 sm:grid-cols-3">
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
                </section>

                <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8">
                  <h2 className="text-lg font-semibold text-teal-950">Products</h2>
                  <datalist id="edit-product-suggestions">
                    {productNames.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  <ul className="mt-4 space-y-4">
                    {draft.lines.map((l, index) => {
                      const linkedToExisting = l.productName.trim() !== "" && knownProducts.has(productKey(l.productName));
                      return (
                        <li key={l.key} className={`rounded-xl border p-4 ${l.suspectPrice ? "border-gold-500/50 bg-gold-50/60" : "border-teal-100"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <label htmlFor={`name-${l.key}`} className={smallLabel}>
                                Line {index + 1} · Name
                              </label>
                              <input
                                id={`name-${l.key}`}
                                value={l.name}
                                onChange={(e) => setLine(l.key, { name: e.target.value })}
                                autoComplete="off"
                                className={`mt-1 ${fieldClass} font-medium`}
                              />
                              {l.originalName && (
                                <p className="mt-1 text-xs italic text-teal-900/55">Printed: {l.originalName}</p>
                              )}
                              {l.suspectPrice && (
                                <p className="mt-1 text-xs font-medium text-gold-800">
                                  Price marked as suspect: correcting this line removes the alert.
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setDraft({ ...draft, lines: draft.lines.filter((x) => x.key !== l.key) })}
                              className="mt-5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              aria-label={`Remove line ${index + 1}`}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-4">
                            <div>
                              <label htmlFor={`qty-${l.key}`} className={smallLabel}>
                                Quantity
                              </label>
                              <input
                                id={`qty-${l.key}`}
                                type="number"
                                min="0"
                                step="any"
                                autoComplete="off"
                                value={l.quantity}
                                onChange={(e) => setLine(l.key, { quantity: e.target.value })}
                                className={`mt-1 ${fieldClass} tabular-nums`}
                              />
                            </div>
                            <div>
                              <label htmlFor={`unit-${l.key}`} className={smallLabel}>
                                Unit
                              </label>
                              <input
                                id={`unit-${l.key}`}
                                value={l.unit}
                                onChange={(e) => setLine(l.key, { unit: e.target.value })}
                                autoComplete="off"
                                className={`mt-1 ${fieldClass}`}
                              />
                            </div>
                            <div>
                              <label htmlFor={`price-${l.key}`} className={smallLabel}>
                                Unit price (฿)
                              </label>
                              <input
                                id={`price-${l.key}`}
                                type="number"
                                min="0"
                                step="0.01"
                                autoComplete="off"
                                value={l.unitPrice}
                                onChange={(e) => setLine(l.key, { unitPrice: e.target.value })}
                                className={`mt-1 ${fieldClass} tabular-nums`}
                              />
                            </div>
                            <div>
                              <label htmlFor={`total-${l.key}`} className={smallLabel}>
                                Line total printed (฿)
                              </label>
                              <input
                                id={`total-${l.key}`}
                                type="number"
                                min="0"
                                step="0.01"
                                autoComplete="off"
                                placeholder="Not printed"
                                value={l.printedLineTotal}
                                onChange={(e) => setLine(l.key, { printedLineTotal: e.target.value })}
                                className={`mt-1 ${fieldClass} tabular-nums`}
                              />
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <span className={smallLabel}>One {l.unit || "unit"} contains</span>
                              <div className="mt-1 flex gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  autoComplete="off"
                                  aria-label={`Quantity in one ${l.unit || "unit"}`}
                                  placeholder="Unknown"
                                  value={l.contentAmount}
                                  onChange={(e) => setLine(l.key, { contentAmount: e.target.value, contentUnit: l.contentUnit || "g" })}
                                  className={`${fieldClass} tabular-nums`}
                                />
                                <select
                                  aria-label="Unit of the content"
                                  value={l.contentUnit}
                                  onChange={(e) => setLine(l.key, { contentUnit: e.target.value as ContentUnit | "" })}
                                  className={`${fieldClass} w-28`}
                                >
                                  <option value="">—</option>
                                  <option value="g">g</option>
                                  <option value="ml">ml</option>
                                  <option value="pcs">pieces</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label htmlFor={`product-${l.key}`} className={smallLabel}>
                                Product (for prices and recipes)
                              </label>
                              <input
                                id={`product-${l.key}`}
                                value={l.productName}
                                onChange={(e) => setLine(l.key, { productName: e.target.value })}
                                list="edit-product-suggestions"
                                autoComplete="off"
                                placeholder="Search your products"
                                className={`mt-1 ${fieldClass}`}
                              />
                              <p className="mt-1 text-xs text-teal-900/60">
                                {l.productName.trim() === "" && l.name.trim() === ""
                                  ? "Type a name first."
                                  : linkedToExisting
                                    ? "Linked to an existing product."
                                    : `A new product “${(l.productName.trim() || l.name).trim()}” will be created.`}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-right text-xs text-teal-900/60">
                            Line total:{" "}
                            <LineTotal check={lineCheckOf(l)} quantity={Number(l.quantity) || 0} unitPrice={Number(l.unitPrice) || 0} flagged />
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={addLine}
                    className="mt-4 rounded-full border border-teal-200 px-5 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                  >
                    + Add a line
                  </button>

                  <div className="mt-6 space-y-2 border-t border-teal-100 pt-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-teal-900/70">Lines add up to</span>
                      <span className="font-semibold tabular-nums text-teal-950">{fmt(linesTotal)} ฿</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <label htmlFor="edit-total" className="font-medium text-teal-900/70">
                        Total printed on the invoice (฿)
                      </label>
                      <input
                        id="edit-total"
                        type="number"
                        min="0"
                        step="0.01"
                        autoComplete="off"
                        value={draft.total}
                        onChange={(e) => setDraft({ ...draft, total: e.target.value })}
                        className="w-36 rounded-lg border border-teal-200 px-3 py-2 text-right font-bold tabular-nums text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                      />
                    </div>
                    {Math.abs(totalGap) >= 1 && (
                      <p role="status" className="rounded-lg bg-gold-50 px-3 py-2 text-xs font-medium text-gold-800">
                        The lines differ from the printed total by {fmt(Math.abs(totalGap))} ฿. That&apos;s normal for VAT or a discount;
                        otherwise, check a quantity or a price.
                      </p>
                    )}
                  </div>
                </section>

                {error && (
                  <p role="alert" className="text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
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
              <>
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
                            <th className="py-2 pr-2 text-right">Unit price</th>
                            <th className="py-2 text-right">Line total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-teal-100">
                          {invoice.items.map((p) => (
                            <tr key={p.id} className={p.lineFlagged ? "bg-gold-50/70" : undefined}>
                              <td className="py-2.5 pr-2 font-medium text-teal-950">
                                {p.name}
                                {p.suspectPrice && (
                                  <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-semibold text-gold-800">Check price</span>
                                )}
                                {p.originalName && p.originalName !== p.name && (
                                  <span className="block text-xs font-normal italic text-teal-900/50">Printed: {p.originalName}</span>
                                )}
                                <span className="block text-xs font-normal text-teal-900/55">{sizeText(p)}</span>
                              </td>
                              <td className="py-2.5 pr-2 text-right tabular-nums text-teal-900/75">{fmt(p.quantity)}</td>
                              <td className="py-2.5 pr-2 text-teal-900/75">{p.unit}</td>
                              <td className="py-2.5 pr-2 text-right tabular-nums text-teal-950">{fmt(p.unitPrice)} ฿</td>
                              <td className="py-2.5 text-right">
                                <LineTotal
                                  check={checkLine(p.quantity, p.unitPrice, p.printedLineTotal)}
                                  quantity={p.quantity}
                                  unitPrice={p.unitPrice}
                                  flagged={p.lineFlagged}
                                />
                              </td>
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
          </>
        )}
      </main>
    </div>
  );
}
