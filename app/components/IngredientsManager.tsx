"use client";

import Link from "next/link";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type FormEvent, type Ref } from "react";
import {
  addManualIngredient,
  clearReviewFlag,
  fetchIngredients,
  formatUnitPrice,
  mergeProducts,
  saveProductChanges,
  type Ingredient,
  type PriceBasis,
  type ProductChanges,
  type PurchaseUnit,
  type ReviewIssue,
} from "../../lib/ingredients";
import { fromIsoDate } from "../../lib/invoices";
import { CATEGORY_LABELS, PRODUCT_CATEGORIES, type ContentUnit, type ProductCategory } from "../../lib/scanInvoice";
import { useUser } from "../context/UserContext";
import { inputClass, labelClass } from "./FormField";

const fieldClass =
  "rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const smallButton =
  "rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-60";
const UNIT_LABELS: Record<ContentUnit, string> = { g: "g", ml: "ml", pcs: "pieces" };

const fmtDate = (iso: string) => fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtAmount = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });
const unitKey = (s: string) => s.trim().toLowerCase();

function sizeText(u: PurchaseUnit): string {
  if (!u.contentAmount || !u.contentUnit) return "Size unknown";
  const text = `1 ${u.unit} = ${fmtAmount(u.contentAmount)} ${UNIT_LABELS[u.contentUnit]}`;
  return u.contentSource === "estimated" ? `${text} (estimated)` : text;
}

function issueText(issue: ReviewIssue): string {
  switch (issue.kind) {
    case "category":
      return "Category unknown";
    case "size":
      return `Size of one “${issue.unit}” unknown`;
    case "price":
      return `Price looks wrong on invoice ${issue.invoiceNumber} (${issue.unitPrice.toLocaleString("en-US")} ฿)`;
    case "line":
      return `Check line on invoice ${issue.invoiceNumber}: the printed line total is higher than quantity × unit price`;
  }
}

/** Price of one purchase: "per piece", "per kg", "per liter" or "pack of X pieces". */
function PriceBasisField({ id, value, onChange }: { id: string; value: PriceBasis; onChange: (b: PriceBasis) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        id={id}
        value={value.kind}
        onChange={(e) => {
          const kind = e.target.value as PriceBasis["kind"];
          onChange(kind === "pack" ? { kind, pieces: 12 } : { kind });
        }}
        className={fieldClass}
      >
        <option value="piece">per piece / bottle</option>
        <option value="kg">per kg</option>
        <option value="liter">per liter</option>
        <option value="pack">for a pack of…</option>
      </select>
      {value.kind === "pack" && (
        <>
          <input
            type="number"
            min="1"
            step="1"
            autoComplete="off"
            aria-label="Pieces in the pack"
            value={value.pieces}
            onChange={(e) => onChange({ kind: "pack", pieces: Number(e.target.value) })}
            className={`${fieldClass} w-20`}
          />
          <span className="text-sm text-teal-900/70">pieces</span>
        </>
      )}
    </div>
  );
}

function AddIngredientForm({ onDone, onCancel }: { onDone: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("food");
  const [price, setPrice] = useState("");
  const [basis, setBasis] = useState<PriceBasis>({ kind: "piece" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addManualIngredient({ name, category, price: Number(price), basis });
      onDone(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't add this ingredient. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
      <h2 className="text-lg font-semibold text-teal-950">Add ingredient</h2>
      <p className="mt-1 text-sm text-teal-900/65">
        For things you buy without an invoice (market) or only resell. Marked “manual”; once an invoice contains it, merge the two with “Same as…”.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="add-name" className={labelClass}>
            Name
          </label>
          <input id="add-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={inputClass} />
        </div>
        <div>
          <label htmlFor="add-category" className={labelClass}>
            Category
          </label>
          <select id="add-category" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className={inputClass}>
            <option value="food">{CATEGORY_LABELS.food}</option>
            <option value="resale">{CATEGORY_LABELS.resale}</option>
          </select>
        </div>
        <div>
          <label htmlFor="add-price" className={labelClass}>
            Price paid (฿)
          </label>
          <input
            id="add-price"
            type="number"
            min="0"
            step="0.01"
            autoComplete="off"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="add-basis" className={labelClass}>
            For
          </label>
          <div className="mt-1.5">
            <PriceBasisField id="add-basis" value={basis} onChange={setBasis} />
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving || !name.trim() || price === ""}
          className="rounded-full bg-teal-700 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add ingredient"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-teal-200 px-7 py-3 text-base font-semibold text-teal-800 transition hover:bg-teal-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Lets the list ask the open editor to close (it asks "Save / Discard" first if there are unsaved changes). */
export type EditorHandle = { requestClose: (then: () => void) => void };

type SizeDraft = { amount: string; unit: ContentUnit };

/**
 * The Edit / Fix panel of one product: every change is kept here until "Save & mark as reviewed",
 * which saves them all at once. Closing with unsaved changes asks first.
 */
function ProductEditor({
  item,
  others,
  canEdit,
  ref,
  onSaved,
  onMerged,
  onClose,
  onDirtyChange,
}: {
  item: Ingredient;
  others: Ingredient[];
  canEdit: boolean;
  ref: Ref<EditorHandle>;
  onSaved: (productId: string) => Promise<void>;
  onMerged: (message: string) => Promise<void>;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const initialSizes = useMemo(
    () =>
      Object.fromEntries(
        item.units.map((u) => [unitKey(u.unit), { amount: u.contentAmount ? String(u.contentAmount) : "", unit: u.contentUnit ?? item.baseUnit ?? "g" }]),
      ) as Record<string, SizeDraft>,
    [item],
  );
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<ProductCategory | null>(item.category);
  const [sizes, setSizes] = useState<Record<string, SizeDraft>>(initialSizes);
  const [price, setPrice] = useState("");
  const [basis, setBasis] = useState<PriceBasis>({ kind: "piece" });
  const [mergeInto, setMergeInto] = useState("");
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when closing was asked with unsaved changes: what to do once the owner has chosen.
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);

  const sizeChanged = (u: PurchaseUnit) => {
    const s = sizes[unitKey(u.unit)];
    return !!s && (s.amount !== (initialSizes[unitKey(u.unit)]?.amount ?? "") || s.unit !== initialSizes[unitKey(u.unit)]?.unit);
  };
  const dirty =
    name.trim() !== item.name || category !== item.category || item.units.some(sizeChanged) || price.trim() !== "";

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Leaving the page with unsaved changes: the browser asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useImperativeHandle(ref, () => ({
    requestClose: (then) => {
      if (dirty) setPendingClose(() => then);
      else then();
    },
  }));

  const flaggedLineIds = item.review.flatMap((i) => (i.kind === "price" || i.kind === "line" ? [i.lineId] : []));

  /** Saves everything; returns true when it worked. Errors are always shown, never swallowed. */
  async function saveAll(): Promise<boolean> {
    setError(null);
    const changes: ProductChanges = { reviewedLineIds: flaggedLineIds };
    if (name.trim() !== item.name) changes.name = name;
    if (category && category !== item.category) changes.category = category;
    const sizeChanges: NonNullable<ProductChanges["sizes"]> = [];
    for (const u of item.units) {
      const s = sizes[unitKey(u.unit)];
      if (!s || s.amount.trim() === "") continue;
      const amount = Number(s.amount);
      if (!(amount > 0)) {
        setError(`Size of “${u.unit}”: please enter a quantity above 0, or leave it empty.`);
        return false;
      }
      // Changed, or an estimate being confirmed by reviewing it.
      if (sizeChanged(u) || u.contentSource === "estimated") sizeChanges.push({ unit: u.unit, lineIds: u.lineIds, amount, contentUnit: s.unit });
    }
    if (sizeChanges.length > 0) changes.sizes = sizeChanges;
    if (price.trim() !== "") {
      const value = Number(price);
      if (!(value >= 0)) {
        setError("Market price: please enter a price in baht, or leave it empty.");
        return false;
      }
      if (basis.kind === "pack" && !(basis.pieces > 0)) {
        setError("Market price: please enter how many pieces are in the pack.");
        return false;
      }
      changes.manualPrice = { price: value, basis };
    }

    setSaving(true);
    try {
      await saveProductChanges(item.id, changes);
      await onSaved(item.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your changes. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function markPriceCorrect() {
    setError(null);
    setSaving(true);
    try {
      for (const lineId of flaggedLineIds) await clearReviewFlag(lineId);
      await onSaved(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't clear the alert. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function merge() {
    const target = others.find((o) => o.id === mergeInto);
    if (!target) return;
    setError(null);
    setSaving(true);
    try {
      await mergeProducts(item.id, target.id);
      await onMerged(`${item.name} was merged into ${target.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't merge these products. Please try again.");
      setSaving(false);
    }
  }

  const target = others.find((o) => o.id === mergeInto);

  return (
    <div className="mt-4 space-y-5 rounded-xl bg-teal-50/60 p-4 text-sm">
      {pendingClose && (
        <div role="alertdialog" aria-labelledby={`unsaved-${item.id}`} className="rounded-lg border border-gold-500/40 bg-gold-50 p-3">
          <p id={`unsaved-${item.id}`} className="font-semibold text-gold-800">
            You have unsaved changes
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const then = pendingClose;
                if (await saveAll()) {
                  setPendingClose(null);
                  then();
                }
              }}
              className="rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const then = pendingClose;
                setPendingClose(null);
                onDirtyChange(false);
                then();
              }}
              className={smallButton}
            >
              Discard
            </button>
            <button type="button" disabled={saving} onClick={() => setPendingClose(null)} className={smallButton}>
              Keep editing
            </button>
          </div>
        </div>
      )}

      {canEdit ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`name-${item.id}`} className="block font-medium text-teal-900/80">
                Name
              </label>
              <input
                id={`name-${item.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                className={`${fieldClass} mt-1 w-full`}
              />
            </div>
            <div>
              <label htmlFor={`cat-${item.id}`} className="block font-medium text-teal-900/80">
                Category
              </label>
              <select
                id={`cat-${item.id}`}
                value={category ?? ""}
                onChange={(e) => setCategory((e.target.value || null) as ProductCategory | null)}
                className={`${fieldClass} mt-1 w-full`}
              >
                {!item.category && <option value="">Choose a category…</option>}
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {item.units.length > 0 && (
            <div>
              <p className="font-medium text-teal-900/80">Sizes</p>
              <ul className="mt-2 space-y-2">
                {item.units.map((u) => {
                  const s = sizes[unitKey(u.unit)];
                  return (
                    <li key={u.unit} className="flex flex-wrap items-center gap-2">
                      <span className="text-teal-900/80">1 {u.unit} =</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        autoComplete="off"
                        aria-label={`Quantity in one ${u.unit}`}
                        placeholder="Unknown"
                        value={s?.amount ?? ""}
                        onChange={(e) => setSizes({ ...sizes, [unitKey(u.unit)]: { unit: s?.unit ?? "g", amount: e.target.value } })}
                        className={`${fieldClass} w-24`}
                      />
                      <select
                        aria-label={`Unit of one ${u.unit}`}
                        value={s?.unit ?? "g"}
                        onChange={(e) => setSizes({ ...sizes, [unitKey(u.unit)]: { amount: s?.amount ?? "", unit: e.target.value as ContentUnit } })}
                        className={fieldClass}
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pieces</option>
                      </select>
                      {u.contentSource === "estimated" && <span className="text-xs text-gold-800">estimated: saving confirms it</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <p className="font-medium text-teal-900/80">Market price (no invoice) — optional</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                autoComplete="off"
                aria-label="Price paid in baht"
                placeholder="Price ฿"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`${fieldClass} w-28`}
              />
              <PriceBasisField id={`basis-${item.id}`} value={basis} onChange={setBasis} />
            </div>
          </div>

          {others.length > 0 && (
            <div>
              <p className="font-medium text-teal-900/80">Same product as another one?</p>
              {!confirmMerge ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select aria-label="Product to keep" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} className={`${fieldClass} max-w-xs`}>
                    <option value="">Same as…</option>
                    {others.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={!mergeInto} onClick={() => setConfirmMerge(true)} className={smallButton}>
                    Continue
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-teal-950">
                    Move everything of <strong>{item.name}</strong> to <strong>{target?.name}</strong>, then delete <strong>{item.name}</strong>? This
                    can&apos;t be undone.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={merge}
                      className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {saving ? "Merging…" : "Yes, merge"}
                    </button>
                    <button type="button" onClick={() => setConfirmMerge(false)} className={smallButton}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-teal-900/70">Only the owner and managers can change products.</p>
      )}

      {item.invoices.length > 0 && (
        <div>
          <p className="font-medium text-teal-900/80">On invoices</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {item.invoices.slice(0, 6).map((inv) => (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="font-medium text-teal-700 underline-offset-2 hover:underline">
                {inv.number} · {fmtDate(inv.date)}
              </Link>
            ))}
            {item.invoices.length > 6 && <span className="text-teal-900/60">and {item.invoices.length - 6} more</span>}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-teal-100 pt-4">
        {canEdit && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveAll()}
            className="rounded-full bg-teal-700 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & mark as reviewed"}
          </button>
        )}
        {canEdit && flaggedLineIds.length > 0 && (
          <button
            type="button"
            disabled={saving}
            // With other changes pending, save them too rather than lose them (it clears the alert as well).
            onClick={() => void (dirty ? saveAll() : markPriceCorrect())}
            className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline disabled:opacity-60"
          >
            Price is correct
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => (dirty ? setPendingClose(() => onClose) : onClose())}
          className="ml-auto text-sm font-semibold text-teal-900/70 hover:text-teal-900 disabled:opacity-60"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function IngredientsManager() {
  const { role } = useUser();
  const canEdit = role === "owner" || role === "manager";
  const [items, setItems] = useState<Ingredient[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const editorRef = useRef<EditorHandle>(null);
  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  /** Reloads the list; returns the fresh rows (null if it failed, with the error shown). */
  const load = useCallback(async () => {
    try {
      const rows = await fetchIngredients();
      setItems(rows);
      setLoadError(false);
      return rows;
    } catch {
      setLoadError(true);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchIngredients()
      .then((rows) => !cancelled && setItems(rows))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  /** Opens a product's panel (or closes it); an open panel with unsaved changes asks first. */
  function open(id: string | null) {
    const go = () => {
      dirtyRef.current = false;
      setOpenId(id);
    };
    if (openId && dirtyRef.current && editorRef.current) editorRef.current.requestClose(go);
    else go();
  }

  async function afterSave(productId: string) {
    const rows = await load();
    const fresh = rows?.find((r) => r.id === productId);
    dirtyRef.current = false;
    setOpenId(null);
    if (!rows) return;
    setNotice(
      fresh && fresh.review.length > 0
        ? `${fresh.name} was saved. Still to fix: ${fresh.review.map(issueText).join("; ")}.`
        : `${fresh?.name ?? "The product"} was saved and marked as reviewed.`,
    );
  }

  async function afterMerge(message: string) {
    dirtyRef.current = false;
    setOpenId(null);
    await load();
    setNotice(message);
  }

  const needsReview = useMemo(() => (items ?? []).filter((i) => i.review.length > 0), [items]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter(
      (i) => (filter === "all" || i.category === filter) && (!q || i.name.toLowerCase().includes(q) || i.printedNames.some((n) => n.toLowerCase().includes(q))),
    );
  }, [items, filter, search]);

  if (loadError && !items) {
    return (
      <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        We couldn&apos;t load your ingredients. Please refresh the page.
      </p>
    );
  }
  if (!items) {
    return (
      <p role="status" className="mt-6 text-sm text-teal-900/70">
        Loading…
      </p>
    );
  }

  const editor = (item: Ingredient) => (
    <ProductEditor
      key={item.id}
      ref={editorRef}
      item={item}
      others={items.filter((o) => o.id !== item.id)}
      canEdit={canEdit}
      onSaved={afterSave}
      onMerged={afterMerge}
      onClose={() => open(null)}
      onDirtyChange={onDirtyChange}
    />
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-teal-900/65">
          Everything you buy, with the latest price per kg, litre or piece. Only Food and Drinks for resale are used in recipes.
        </p>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-gold-500 px-6 py-3 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
          >
            Add ingredient
          </button>
        )}
      </div>

      {adding && (
        <AddIngredientForm
          onCancel={() => setAdding(false)}
          onDone={(name) => {
            setAdding(false);
            void load();
            setNotice(`${name} was added.`);
          }}
        />
      )}

      {notice && (
        <p role="status" className="mt-6 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {notice}
        </p>
      )}
      {loadError && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Your change was saved, but the list couldn&apos;t be refreshed. Please refresh the page.
        </p>
      )}

      {needsReview.length > 0 && (
        <section aria-labelledby="review-title" className="mt-6 rounded-2xl border border-gold-500/40 bg-gold-50 p-6">
          <h2 id="review-title" className="text-lg font-semibold text-teal-950">
            Needs review ({needsReview.length})
          </h2>
          <p className="mt-1 text-sm text-teal-900/70">These products are not used in recipes until you fix them.</p>
          <ul className="mt-4 space-y-3">
            {needsReview.map((item) => (
              <li key={item.id} className="rounded-xl border border-gold-500/30 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-teal-950">{item.name}</p>
                    {item.printedNames.length > 0 && (
                      <p className="text-xs italic text-teal-900/50">Printed: {item.printedNames.join(" · ")}</p>
                    )}
                    <ul className="mt-1 space-y-1 text-sm text-gold-800">
                      {item.review.map((issue, k) => (
                        <li key={k} className="flex flex-wrap items-center gap-2">
                          <span>{issueText(issue)}</span>
                          {(issue.kind === "price" || issue.kind === "line") && (
                            <Link href={`/dashboard/invoices/${issue.invoiceId}`} className="font-semibold text-teal-700 hover:underline">
                              Open invoice
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {openId !== item.id && (
                    <button type="button" onClick={() => open(item.id)} className={smallButton}>
                      Fix
                    </button>
                  )}
                </div>
                {openId === item.id && editor(item)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-teal-100 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-teal-100 px-6 py-4">
          <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
            {(["all", ...PRODUCT_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={filter === c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  filter === c ? "bg-teal-700 text-white" : "border border-teal-200 text-teal-800 hover:bg-teal-50"
                }`}
              >
                {c === "all" ? `All (${items.length})` : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <input
            type="search"
            autoComplete="off"
            placeholder="Search a product"
            aria-label="Search a product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${fieldClass} ml-auto w-full sm:w-64`}
          />
        </div>

        {shown.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-teal-900/60">No products match.</p>
        ) : (
          <ul className="divide-y divide-teal-100">
            {shown.map((item) => (
              <li key={item.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-teal-950">
                      {item.name}
                      {item.source === "manual" && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">manual</span>
                      )}
                      {item.review.length > 0 && (
                        <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-semibold text-gold-800">Needs review</span>
                      )}
                    </p>
                    {item.printedNames.length > 0 && (
                      <p className="mt-0.5 text-xs italic text-teal-900/50">Printed: {item.printedNames.join(" · ")}</p>
                    )}
                    <p className="mt-0.5 text-xs text-teal-900/60">
                      {item.category ? CATEGORY_LABELS[item.category] : "No category"}
                      {item.units.length > 0 && ` · ${item.units.map(sizeText).join(" · ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-teal-950">{item.lastPrice ? formatUnitPrice(item.lastPrice) : "—"}</p>
                      <p className="text-xs text-teal-900/60">
                        {item.lastPrice
                          ? `${item.lastPrice.source === "manual" ? "manual · " : ""}${fmtDate(item.lastPrice.date)}${item.lastPrice.estimated ? " · estimated size" : ""}`
                          : "No price yet"}
                      </p>
                      {item.trend !== null && (
                        <p className={`text-xs font-semibold ${item.trend > 0.001 ? "text-red-600" : item.trend < -0.001 ? "text-teal-700" : "text-teal-900/60"}`}>
                          {item.trend > 0 ? "+" : ""}
                          {Math.round(item.trend * 100)}% vs 30 days ago
                        </p>
                      )}
                    </div>
                    {openId !== item.id && (
                      <button type="button" onClick={() => open(item.id)} className={smallButton}>
                        {canEdit ? "Edit" : "Details"}
                      </button>
                    )}
                  </div>
                </div>
                {openId === item.id && item.review.length === 0 && editor(item)}
                {openId === item.id && item.review.length > 0 && (
                  <p className="mt-3 text-xs text-gold-800">This product is in “Needs review” above: fix it there.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
