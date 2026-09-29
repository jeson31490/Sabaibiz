import { bangkokToday, currentBusinessId } from "./invoices";
import type { ContentSource, ContentUnit, ProductCategory } from "./scanInvoice";
import { supabase } from "./supabase";

// The Ingredients screen: every product the business buys, its latest price per g / ml / piece,
// and what needs the owner's review before it can be used in recipes.

export type PricePoint = { perUnit: number; unit: ContentUnit; date: string; source: "invoice" | "manual"; estimated: boolean };

/** One way the product is bought ("bottle", "ชร"…), and what that unit contains. */
export type PurchaseUnit = {
  unit: string;
  lineIds: string[];
  contentAmount: number | null;
  contentUnit: ContentUnit | null;
  contentSource: ContentSource | null;
};

export type ReviewIssue =
  | { kind: "category" }
  | { kind: "size"; unit: string }
  | { kind: "price" | "line"; lineId: string; invoiceId: string; invoiceNumber: string; unitPrice: number };

export type Ingredient = {
  id: string;
  name: string;
  category: ProductCategory | null;
  baseUnit: ContentUnit | null;
  source: "invoice" | "manual";
  lastPrice: PricePoint | null;
  /** Change of the latest price vs the price 30 days ago (0.08 = +8%), when both are known. */
  trend: number | null;
  units: PurchaseUnit[];
  /** Invoices this product appears on, newest first. */
  invoices: { id: string; number: string; date: string }[];
  review: ReviewIssue[];
  /** Names as printed on its invoices (often Thai), to spot a wrong translation. */
  printedNames: string[];
};

/** Only these can go in recipes; the others are costs but never ingredients. */
export const RECIPE_CATEGORIES: ProductCategory[] = ["food", "resale"];

const unitKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Every row of a query, 1000 at a time (the API's maximum per request). */
async function fetchAllRows<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

type RawLine = {
  id: string;
  product_id: string;
  unit: string;
  unit_price: number | string;
  content_amount: number | string | null;
  content_unit: ContentUnit | null;
  content_source: ContentSource | null;
  review_reason: "suspect_price" | "line_mismatch" | null;
  original_name: string | null;
  invoices: { id: string; invoice_number: string; invoice_date: string } | null;
};
type RawPoint = { product_id: string; price_date: string; price_per_unit: number | string; unit: ContentUnit; source: "invoice" | "manual"; estimated: boolean };

export async function fetchIngredients(): Promise<Ingredient[]> {
  const [products, lines, points] = await Promise.all([
    fetchAllRows<{ id: string; name: string; category: ProductCategory | null; base_unit: ContentUnit | null; source: "invoice" | "manual" }>(
      (a, b) => supabase.from("products").select("id, name, category, base_unit, source").order("name").range(a, b),
    ),
    fetchAllRows<RawLine>((a, b) =>
      supabase
        .from("invoice_items")
        .select("id, product_id, unit, unit_price, content_amount, content_unit, content_source, review_reason, original_name, invoices(id, invoice_number, invoice_date)")
        .not("product_id", "is", null)
        .order("id")
        .range(a, b),
    ),
    fetchAllRows<RawPoint>((a, b) =>
      supabase.from("product_price_points").select("product_id, price_date, price_per_unit, unit, source, estimated").range(a, b),
    ),
  ]);

  const monthAgo = new Date(`${bangkokToday()}T00:00:00Z`);
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 30);
  const monthAgoIso = monthAgo.toISOString().slice(0, 10);

  return products.map((p) => {
    const mine = lines.filter((l) => l.product_id === p.id);
    // Newest first; on the same day, an invoice price wins over a manual one.
    const prices = points
      .filter((pt) => pt.product_id === p.id)
      .map((pt) => ({ perUnit: Number(pt.price_per_unit), unit: pt.unit, date: pt.price_date, source: pt.source, estimated: pt.estimated }))
      .sort((a, b) => b.date.localeCompare(a.date) || (a.source === "invoice" ? -1 : 1));
    const lastPrice = prices[0] ?? null;
    const before = lastPrice ? prices.find((pt) => pt.date <= monthAgoIso && pt.unit === lastPrice.unit) : undefined;
    const trend = lastPrice && before && before.perUnit > 0 ? lastPrice.perUnit / before.perUnit - 1 : null;

    const units = new Map<string, PurchaseUnit>();
    for (const l of mine) {
      const k = unitKey(l.unit);
      const u = units.get(k) ?? { unit: l.unit.trim(), lineIds: [], contentAmount: null, contentUnit: null, contentSource: null };
      u.lineIds.push(l.id);
      // Keep the most trusted size seen for this unit.
      const rank = (s: ContentSource | null) => (s ? ["estimated", "printed", "standard", "confirmed"].indexOf(s) : -1);
      if (rank(l.content_source) > rank(u.contentSource)) {
        u.contentAmount = l.content_amount === null ? null : Number(l.content_amount);
        u.contentUnit = l.content_unit;
        u.contentSource = l.content_source;
      }
      units.set(k, u);
    }

    const invoices = [...new Map(mine.filter((l) => l.invoices).map((l) => [l.invoices!.id, l.invoices!])).values()]
      .map((i) => ({ id: i.id, number: i.invoice_number, date: i.invoice_date }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const review: ReviewIssue[] = [];
    if (!p.category) review.push({ kind: "category" });
    // A size only matters for what goes in recipes (a fridge has no price per gram).
    if (!p.category || RECIPE_CATEGORIES.includes(p.category)) {
      for (const u of units.values()) if (!u.contentSource) review.push({ kind: "size", unit: u.unit });
    }
    for (const l of mine) {
      if (l.review_reason && l.invoices) {
        review.push({
          kind: l.review_reason === "line_mismatch" ? "line" : "price",
          lineId: l.id,
          invoiceId: l.invoices.id,
          invoiceNumber: l.invoices.invoice_number,
          unitPrice: Number(l.unit_price),
        });
      }
    }

    const printedNames = [...new Set(mine.map((l) => l.original_name?.trim()).filter((n): n is string => !!n && n !== p.name))];

    return { id: p.id, name: p.name, category: p.category, baseUnit: p.base_unit, source: p.source, lastPrice, trend, units: [...units.values()], invoices, review, printedNames };
  });
}

export async function setProductCategory(productId: string, category: ProductCategory): Promise<void> {
  const { error } = await supabase.from("products").update({ category }).eq("id", productId);
  if (error) throw new Error("We couldn't change the category. Please try again.");
}

/** "1 ชร = 12 pcs": confirmed by the owner for every line bought in that unit, and reused on future invoices. */
export async function confirmUnitSize(productId: string, lineIds: string[], amount: number, unit: ContentUnit): Promise<void> {
  if (!(amount > 0)) throw new Error("Please enter a quantity above 0.");
  const { error } = await supabase
    .from("invoice_items")
    .update({ content_amount: amount, content_unit: unit, content_source: "confirmed" })
    .in("id", lineIds);
  if (error) throw new Error("We couldn't save this size. Please try again.");
  // Recipes use this unit for the product.
  await supabase.from("products").update({ base_unit: unit }).eq("id", productId);
}

/** The owner checked the paper invoice: the price or the line is right after all. */
export async function clearReviewFlag(lineId: string): Promise<void> {
  const { error } = await supabase.from("invoice_items").update({ review_reason: null }).eq("id", lineId);
  if (error) throw new Error("We couldn't update this line. Please try again.");
}

/** Moves everything of `fromId` to `intoId`, then deletes `fromId` (supabase/14_merge_products.sql). */
export async function mergeProducts(fromId: string, intoId: string): Promise<void> {
  const { error } = await supabase.rpc("merge_products", { p_from: fromId, p_into: intoId });
  if (error) throw new Error(error.code === "P0001" ? error.message : "We couldn't merge these products. Please try again.");
}

/** What a manual price is for: "per piece", "per kg", "per liter" or "pack of 12". */
export type PriceBasis = { kind: "piece" } | { kind: "kg" } | { kind: "liter" } | { kind: "pack"; pieces: number };

export function basisToAmount(basis: PriceBasis): { amount: number; unit: ContentUnit } {
  switch (basis.kind) {
    case "piece":
      return { amount: 1, unit: "pcs" };
    case "kg":
      return { amount: 1000, unit: "g" };
    case "liter":
      return { amount: 1000, unit: "ml" };
    case "pack":
      return { amount: basis.pieces, unit: "pcs" };
  }
}

/** A price paid without an invoice (market), dated today unless another date is given. */
export async function addManualPrice(productId: string, price: number, basis: PriceBasis, date: string = bangkokToday()): Promise<void> {
  if (!(price >= 0)) throw new Error("Please enter a price.");
  const { amount, unit } = basisToAmount(basis);
  if (!(amount > 0)) throw new Error("Please enter how many pieces are in the pack.");
  const { error } = await supabase.from("manual_prices").insert({ product_id: productId, price, amount, unit, price_date: date });
  if (error) throw new Error("We couldn't save this price. Please try again.");
  await supabase.from("products").update({ base_unit: unit }).eq("id", productId).is("base_unit", null);
}

/** "Add ingredient": a product never scanned (market, or a drink only resold), with its price. */
export async function addManualIngredient(input: {
  name: string;
  category: ProductCategory;
  price: number;
  basis: PriceBasis;
}): Promise<string> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Please type a name.");
  const { unit } = basisToAmount(input.basis);
  const userId = await currentBusinessId();
  const { data, error } = await supabase
    .from("products")
    .insert({ user_id: userId, name, category: input.category, base_unit: unit, source: "manual" })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`"${name}" is already in your ingredients: add a price to it instead.`);
    throw new Error("We couldn't add this ingredient. Please try again.");
  }
  await addManualPrice(data.id, input.price, input.basis);
  return data.id;
}

/** For the dashboard badge. */
export async function countIngredientsNeedingReview(): Promise<number> {
  return (await fetchIngredients()).filter((i) => i.review.length > 0).length;
}

/** "12.40 ฿/kg", "3.30 ฿/piece" — prices per g and ml are shown per kg and per litre. */
export function formatUnitPrice(p: { perUnit: number; unit: ContentUnit }): string {
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p.unit === "pcs") return `${fmt(p.perUnit)} ฿/piece`;
  return `${fmt(p.perUnit * 1000)} ฿/${p.unit === "g" ? "kg" : "L"}`;
}

/** Renames a product of the catalogue (its invoice lines keep the name read on each invoice). */
export async function renameProduct(productId: string, name: string): Promise<void> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Please type a name.");
  const { error } = await supabase.from("products").update({ name: clean }).eq("id", productId);
  if (error) {
    if (error.code === "23505") throw new Error(`You already have a product called "${clean}". Use “Same as…” to merge them.`);
    throw new Error("We couldn't rename this product. Please try again.");
  }
}
