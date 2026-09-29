"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addManualIngredient,
  addManualPrice,
  clearReviewFlag,
  confirmUnitSize,
  fetchIngredients,
  formatUnitPrice,
  mergeProducts,
  renameProduct,
  setProductCategory,
  type Ingredient,
  type PriceBasis,
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
const smallPrimary =
  "rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60";
const UNIT_LABELS: Record<ContentUnit, string> = { g: "g", ml: "ml", pcs: "pieces" };

const fmtDate = (iso: string) => fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtAmount = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });

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

function CategorySelect({ value, onChange, disabled, id }: { value: ProductCategory | null; onChange: (c: ProductCategory) => void; disabled?: boolean; id: string }) {
  return (
    <select
      id={id}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => e.target.value && onChange(e.target.value as ProductCategory)}
      className={fieldClass}
    >
      {!value && <option value="">Choose a category…</option>}
      {PRODUCT_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {CATEGORY_LABELS[c]}
        </option>
      ))}
    </select>
  );
}

/** "1 [unit] = [amount] [g/ml/pieces]" for one way the product is bought. */
function SizeForm({ unit, onSave, busy }: { unit: PurchaseUnit; onSave: (amount: number, u: ContentUnit) => void; busy: boolean }) {
  const [amount, setAmount] = useState(unit.contentAmount ? String(unit.contentAmount) : "");
  const [contentUnit, setContentUnit] = useState<ContentUnit>(unit.contentUnit ?? "g");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(Number(amount), contentUnit);
      }}
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="text-teal-900/80">1 {unit.unit} =</span>
      <input
        type="number"
        min="0"
        step="any"
        autoComplete="off"
        aria-label={`Quantity in one ${unit.unit}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={`${fieldClass} w-24`}
      />
      <select aria-label="Unit" value={contentUnit} onChange={(e) => setContentUnit(e.target.value as ContentUnit)} className={fieldClass}>
        <option value="g">g</option>
        <option value="ml">ml</option>
        <option value="pcs">pieces</option>
      </select>
      <button type="submit" disabled={busy || !(Number(amount) > 0)} className={smallPrimary}>
        {unit.contentSource === "estimated" && Number(amount) === unit.contentAmount ? "Confirm" : "Save"}
      </button>
    </form>
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
      setError(err instanceof Error ? err.message : "We couldn't add this ingredient.");
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

export default function IngredientsManager() {
  const { role } = useUser();
  const canEdit = role === "owner" || role === "manager";
  const [items, setItems] = useState<Ingredient[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Row panels
  const [mergeInto, setMergeInto] = useState("");
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [price, setPrice] = useState("");
  const [basis, setBasis] = useState<PriceBasis>({ kind: "piece" });
  const [renameValue, setRenameValue] = useState("");

  const load = useCallback(() => {
    return fetchIngredients()
      .then((rows) => {
        setItems(rows);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
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

  /** Runs an action, shows its result, and reloads the list. */
  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
    setMergeInto("");
    setConfirmMerge(false);
    setPrice("");
    setBasis({ kind: "piece" });
    setRenameValue((items ?? []).find((i) => i.id === id)?.name ?? "");
  }

  const needsReview = useMemo(() => (items ?? []).filter((i) => i.review.length > 0), [items]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((i) => (filter === "all" || i.category === filter) && (!q || i.name.toLowerCase().includes(q)));
  }, [items, filter, search]);

  if (loadError) {
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

  /** The editable details of one product (also used in the review list). */
  function renderDetails(item: Ingredient) {
    const others = (items ?? []).filter((o) => o.id !== item.id);
    const target = others.find((o) => o.id === mergeInto);
    return (
      <div className="mt-4 space-y-5 rounded-xl bg-teal-50/60 p-4 text-sm">
        {canEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => renameProduct(item.id, renameValue), `Renamed to “${renameValue.trim()}”.`);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <label htmlFor={`rename-${item.id}`} className="font-medium text-teal-900/80">
              Name
            </label>
            <input
              id={`rename-${item.id}`}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoComplete="off"
              className={`${fieldClass} min-w-0 flex-1 sm:max-w-sm`}
            />
            <button type="submit" disabled={busy || !renameValue.trim() || renameValue.trim() === item.name} className={smallButton}>
              Rename
            </button>
          </form>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={`cat-${item.id}`} className="font-medium text-teal-900/80">
            Category
          </label>
          <CategorySelect
            id={`cat-${item.id}`}
            value={item.category}
            disabled={!canEdit || busy}
            onChange={(c) => act(() => setProductCategory(item.id, c), `${item.name}: ${CATEGORY_LABELS[c]}.`)}
          />
        </div>

        {item.units.length > 0 && (
          <div>
            <p className="font-medium text-teal-900/80">Sizes</p>
            <ul className="mt-2 space-y-2">
              {item.units.map((u) => (
                <li key={u.unit}>
                  {canEdit ? (
                    <SizeForm
                      unit={u}
                      busy={busy}
                      onSave={(amount, cu) =>
                        act(() => confirmUnitSize(item.id, u.lineIds, amount, cu), `${item.name}: 1 ${u.unit} = ${fmtAmount(amount)} ${UNIT_LABELS[cu]}.`)
                      }
                    />
                  ) : (
                    <span className="text-teal-900/80">{sizeText(u)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canEdit && (
          <div>
            <p className="font-medium text-teal-900/80">Add a market price (no invoice)</p>
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
              <button
                type="button"
                disabled={busy || price === ""}
                onClick={() => act(() => addManualPrice(item.id, Number(price), basis), `Price added to ${item.name}.`)}
                className={smallPrimary}
              >
                Add price
              </button>
            </div>
          </div>
        )}

        {canEdit && others.length > 0 && (
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
                  Move everything of <strong>{item.name}</strong> to <strong>{target?.name}</strong>, then delete <strong>{item.name}</strong>? This can&apos;t be undone.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => mergeProducts(item.id, mergeInto), `${item.name} was merged into ${target?.name}.`).then(() => setOpenId(null))}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {busy ? "Merging…" : "Yes, merge"}
                  </button>
                  <button type="button" onClick={() => setConfirmMerge(false)} className={smallButton}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
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
      </div>
    );
  }

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
      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {needsReview.length > 0 && (
        <section aria-labelledby="review-title" className="mt-6 rounded-2xl border border-gold-500/40 bg-gold-50 p-6">
          <h2 id="review-title" className="text-lg font-semibold text-teal-950">
            Needs review ({needsReview.length})
          </h2>
          <p className="mt-1 text-sm text-teal-900/70">
            These products are not used in recipes until you fix them.
          </p>
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
                            <>
                              <Link href={`/dashboard/invoices/${issue.invoiceId}`} className="font-semibold text-teal-700 hover:underline">
                                Open invoice
                              </Link>
                              {canEdit && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    act(
                                      () => clearReviewFlag(issue.lineId),
                                      `${item.name}: ${issue.kind === "line" ? "line" : "price"} marked as correct.`,
                                    )
                                  }
                                  className={smallButton}
                                >
                                  {issue.kind === "line" ? "Line is correct" : "Price is correct"}
                                </button>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button type="button" onClick={() => toggle(item.id)} className={smallButton} aria-expanded={openId === item.id}>
                    {openId === item.id ? "Close" : "Fix"}
                  </button>
                </div>
                {openId === item.id && renderDetails(item)}
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
                    <button type="button" onClick={() => toggle(item.id)} className={smallButton} aria-expanded={openId === item.id}>
                      {openId === item.id ? "Close" : canEdit ? "Edit" : "Details"}
                    </button>
                  </div>
                </div>
                {openId === item.id && item.review.length === 0 && renderDetails(item)}
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
