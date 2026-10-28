"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchIngredients, formatUnitPrice, RECIPE_CATEGORIES, type Ingredient } from "../../lib/ingredients";
import {
  createRecipe,
  deleteRecipe,
  dishFigures,
  fetchMenu,
  fetchRecipes,
  lineCost,
  saveRecipe,
  type MenuItem,
  type Recipe,
  type RecipeKind,
  type RecipeLine,
} from "../../lib/recipes";
import type { ContentUnit } from "../../lib/scanInvoice";
import { inputClass } from "./FormField";
import { usePlanUsage } from "./usePlanUsage";

const fmt = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const UNITS: ContentUnit[] = ["g", "ml", "pcs"];
const keyOf = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

type Data = { recipes: Recipe[]; products: Ingredient[]; menu: MenuItem[] };

export default function RecipesManager() {
  const { usage } = usePlanUsage();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [recipes, products, menu] = await Promise.all([fetchRecipes(), fetchIngredients(), fetchMenu().catch(() => [])]);
      setData({ recipes, products, menu });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your recipes could not be loaded.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (usage && !usage.degraded && usage.plan.id !== "tracker") {
    return (
      <div className="rounded-2xl border border-gold-500/40 bg-gold-50 p-6 text-sm text-gold-800">
        <p className="font-semibold">Recipes and real margins are part of the Tracker plan.</p>
        <p className="mt-1">You are on the {usage.plan.name} plan.</p>
        <Link href="/dashboard/settings/subscription-plan" className="mt-3 inline-block font-semibold underline">
          See plans
        </Link>
      </div>
    );
  }
  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>;
  if (!data) return <p role="status" className="py-12 text-center text-sm text-teal-900/60">Loading…</p>;

  return <Board data={data} reload={load} />;
}

function Board({ data, reload }: { data: Data; reload: () => Promise<void> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<RecipeKind>("dish");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products]);
  const priceOf = useMemo(() => new Map(data.menu.map((m) => [keyOf(m.name), m.price])), [data.menu]);
  const withRecipe = new Set(data.recipes.map((r) => keyOf(r.itemName)));
  const suggestions = data.menu.filter((m) => !withRecipe.has(keyOf(m.name)));

  async function add(name: string) {
    setBusy(true);
    setError(null);
    try {
      const id = await createRecipe(name, newKind);
      setNewName("");
      await reload();
      setOpenId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-card">
        <h2 className="text-lg font-semibold text-teal-950">Add a dish</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void add(newName);
          }}
        >
          <div className="min-w-56 flex-1">
            <input
              list="menu-suggestions"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={data.menu.length ? "Pick from your Loyverse menu or type a name" : "Name of the dish"}
              aria-label="Dish name"
              className={`${inputClass} mt-0`}
            />
            <datalist id="menu-suggestions">
              {suggestions.map((m) => (
                <option key={m.name} value={m.name} />
              ))}
            </datalist>
          </div>
          <select value={newKind} onChange={(e) => setNewKind(e.target.value as RecipeKind)} aria-label="Type" className={`${inputClass} mt-0 w-auto`}>
            <option value="dish">Cooked here</option>
            <option value="resale">Bought and sold as is</option>
          </select>
          <button type="submit" disabled={busy || !newName.trim()} className="rounded-full bg-gold-500 px-6 py-3 font-semibold text-teal-950 transition hover:bg-gold-400 disabled:opacity-50">
            Add
          </button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </section>

      {data.recipes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-teal-200 bg-white p-8 text-center text-sm text-teal-900/65">
          No recipes yet. Add your first dish, list what goes in one portion, and Sabai works out what it costs and what you keep.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.recipes.map((r) => {
            const price = priceOf.get(keyOf(r.itemName)) ?? null;
            const f = dishFigures(r, products, price);
            const open = openId === r.id;
            return (
              <li key={r.id} className="rounded-2xl border border-teal-100 bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  aria-expanded={open}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 text-left sm:grid-cols-[1fr_7rem_7rem_6rem]"
                >
                  <span className="font-semibold text-teal-950">{r.itemName}</span>
                  <span className="num hidden text-right text-sm sm:block">
                    <span className="block text-xs text-teal-900/55">Cost</span>
                    {fmt(f.costPerPortion)}
                    {f.missing > 0 && <span title={`${f.missing} ingredient(s) have no price yet`}> +?</span>}
                  </span>
                  <span className="num hidden text-right text-sm sm:block">
                    <span className="block text-xs text-teal-900/55">Price</span>
                    {price === null ? "—" : fmt(price)}
                  </span>
                  <span className={`num text-right text-lg font-bold ${f.margin === null ? "text-teal-900/50" : f.margin < 0 ? "text-crimson-600" : "text-teal-700"}`}>
                    {f.marginPct === null ? "—" : pct(f.marginPct)}
                    <span className="block text-xs font-medium text-teal-900/55">margin</span>
                  </span>
                </button>
                {open && <Editor recipe={r} products={data.products} productMap={products} price={price} onChanged={reload} onClose={() => setOpenId(null)} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Editor({
  recipe,
  products,
  productMap,
  price,
  onChanged,
  onClose,
}: {
  recipe: Recipe;
  products: Ingredient[];
  productMap: Map<string, Ingredient>;
  price: number | null;
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [portions, setPortions] = useState(String(recipe.portions));
  const [lines, setLines] = useState<RecipeLine[]>(recipe.lines.length ? recipe.lines : [{ name: "", productId: null, quantity: 0, unit: "g" }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const choices = products.filter((p) => !p.category || RECIPE_CATEGORIES.includes(p.category));
  const draft: Recipe = { ...recipe, portions: Number(portions) > 0 ? Number(portions) : 1, lines };
  const f = dishFigures(draft, productMap, price);

  function patch(i: number, change: Partial<RecipeLine>) {
    setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...change } : l)));
  }

  function pick(i: number, productId: string) {
    const p = productMap.get(productId);
    patch(i, p ? { productId: p.id, name: p.name, unit: p.lastPrice?.unit ?? p.baseUnit ?? lines[i].unit } : { productId: null });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await saveRecipe(recipe.id, Number(portions), lines);
      await onChanged();
      setMessage({ ok: true, text: "Saved." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the recipe for "${recipe.itemName}"?`)) return;
    try {
      await deleteRecipe(recipe.id);
      await onChanged();
      onClose();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    }
  }

  return (
    <div className="border-t border-dashed border-teal-200 px-5 py-5">
      <div className="flex items-end gap-3">
        <label className="text-sm font-medium text-teal-900">
          The quantities below make
          <input
            type="number"
            min="0.01"
            step="any"
            inputMode="decimal"
            value={portions}
            onChange={(e) => setPortions(e.target.value)}
            className={`${inputClass} mt-1 w-28`}
          />
        </label>
        <span className="pb-3 text-sm text-teal-900/70">portion(s)</span>
      </div>

      <ul className="mt-5 space-y-3">
        {lines.map((l, i) => {
          const c = lineCost(l, productMap);
          const linked = l.productId ? productMap.get(l.productId) : null;
          return (
            <li key={i} className="grid grid-cols-[1fr_5.5rem_5rem_auto] items-center gap-2 sm:grid-cols-[1fr_6rem_5rem_7rem_auto]">
              <div className="col-span-4 sm:col-span-1">
                <select
                  value={l.productId ?? ""}
                  onChange={(e) => pick(i, e.target.value)}
                  aria-label="Ingredient"
                  className={`${inputClass} mt-0`}
                >
                  <option value="">{l.name && !l.productId ? `${l.name} (no price yet)` : "Choose an ingredient…"}</option>
                  {choices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.lastPrice ? ` — ${formatUnitPrice(p.lastPrice)}` : ""}
                    </option>
                  ))}
                </select>
                {!l.productId && (
                  <input
                    value={l.name}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    placeholder="…or type a name (no price yet)"
                    aria-label="Ingredient name"
                    className={`${inputClass} mt-1`}
                  />
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={l.quantity || ""}
                onChange={(e) => patch(i, { quantity: Number(e.target.value) })}
                aria-label="Quantity"
                placeholder="Qty"
                className={`${inputClass} mt-0`}
              />
              <select value={l.unit} onChange={(e) => patch(i, { unit: e.target.value as ContentUnit })} aria-label="Unit" className={`${inputClass} mt-0`}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <span className="num col-span-3 text-right text-sm sm:col-span-1">
                {c.cost !== null ? (
                  fmt(c.cost)
                ) : c.reason === "unit" ? (
                  <span className="text-gold-700" title={`Priced per ${linked?.lastPrice?.unit}`}>use {linked?.lastPrice?.unit}</span>
                ) : (
                  <span className="text-teal-900/50">no price</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}
                aria-label="Remove this line"
                className="rounded-full px-3 py-2 text-teal-900/60 hover:bg-teal-50"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setLines((ls) => [...ls, { name: "", productId: null, quantity: 0, unit: "g" }])}
        className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-900"
      >
        + Add an ingredient
      </button>

      <div className="num mt-6 space-y-1 border-t border-dashed border-teal-200 pt-4 text-sm">
        <p className="flex justify-between">
          <span>Cost per portion{f.missing > 0 ? " (without the unpriced lines)" : ""}</span>
          <strong>{fmt(f.costPerPortion)}</strong>
        </p>
        <p className="flex justify-between">
          <span>Selling price {price === null && "(not in your Loyverse menu)"}</span>
          <strong>{price === null ? "—" : fmt(price)}</strong>
        </p>
        <p className="flex justify-between text-base">
          <span>You keep</span>
          <strong className={f.margin !== null && f.margin < 0 ? "text-crimson-600" : "text-teal-700"}>
            {f.margin === null ? "—" : `${fmt(f.margin)} (${f.marginPct === null ? "—" : pct(f.marginPct)})`}
          </strong>
        </p>
      </div>
      {f.missing > 0 && (
        <p className="mt-3 text-xs text-gold-800">
          {f.missing} line(s) have no price: link them to a product bought on an invoice (or add a market price in Ingredients) to get the real cost.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="rounded-full bg-teal-700 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60">
          {busy ? "Saving…" : "Save recipe"}
        </button>
        <button type="button" onClick={remove} className="rounded-full px-4 py-2.5 text-sm font-semibold text-crimson-600 hover:bg-crimson-50">
          Delete
        </button>
        {message && (
          <span role={message.ok ? "status" : "alert"} className={`text-sm font-medium ${message.ok ? "text-teal-700" : "text-red-600"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
