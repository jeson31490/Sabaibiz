import { currentBusinessId } from "./invoices";
import type { Ingredient } from "./ingredients";
import type { ContentUnit } from "./scanInvoice";
import { supabase } from "./supabase";

// Recipes and the real cost of a dish (tables: supabase/11_ingredients_recipes.sql).
// Cost of a line = quantity × latest price per g / ml / piece of the linked product.

export type RecipeKind = "dish" | "resale";

export type RecipeLine = {
  id?: string;
  name: string;
  productId: string | null;
  quantity: number;
  unit: ContentUnit;
};

export type Recipe = {
  id: string;
  itemName: string;
  kind: RecipeKind;
  portions: number;
  lines: RecipeLine[];
};

export type MenuItem = { name: string; price: number | null; category: string | null };

export type LineCost = { cost: number | null; reason: "no_product" | "no_price" | "unit" | null };

/** What one recipe line costs, or why it can't be worked out yet. */
export function lineCost(line: RecipeLine, products: Map<string, Ingredient>): LineCost {
  if (!line.productId) return { cost: null, reason: "no_product" };
  const price = products.get(line.productId)?.lastPrice;
  if (!price) return { cost: null, reason: "no_price" };
  if (price.unit !== line.unit) return { cost: null, reason: "unit" };
  return { cost: line.quantity * price.perUnit, reason: null };
}

export type DishFigures = {
  /** Cost per portion over the lines that could be priced. */
  costPerPortion: number;
  /** Lines that couldn't be priced: the cost is then a minimum, not the real cost. */
  missing: number;
  margin: number | null;
  marginPct: number | null;
};

export function dishFigures(recipe: Recipe, products: Map<string, Ingredient>, sellingPrice: number | null): DishFigures {
  let total = 0;
  let missing = 0;
  for (const l of recipe.lines) {
    const c = lineCost(l, products);
    if (c.cost === null) missing += 1;
    else total += c.cost;
  }
  const costPerPortion = total / recipe.portions;
  // The sale price includes 7% VAT in Thailand when the shop charges it; the margin shown is on the price as sold.
  const margin = sellingPrice !== null ? sellingPrice - costPerPortion : null;
  const marginPct = margin !== null && sellingPrice! > 0 ? margin / sellingPrice! : null;
  return { costPerPortion, missing, margin, marginPct };
}

type RawRecipe = {
  id: string;
  item_name: string;
  kind: "dish" | "resale" | "modifier";
  portions: number | string;
  recipe_ingredients: { id: string; name: string; product_id: string | null; quantity: number | string; unit: ContentUnit; position: number }[];
};

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, item_name, kind, portions, recipe_ingredients(id, name, product_id, quantity, unit, position)")
    .neq("kind", "modifier")
    .order("item_name");
  if (error) throw error;
  return ((data ?? []) as unknown as RawRecipe[]).map((r) => ({
    id: r.id,
    itemName: r.item_name,
    kind: r.kind === "resale" ? "resale" : "dish",
    portions: Number(r.portions),
    lines: [...r.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ id: l.id, name: l.name, productId: l.product_id, quantity: Number(l.quantity), unit: l.unit })),
  }));
}

export async function fetchMenu(): Promise<MenuItem[]> {
  const { data, error } = await supabase.from("menu_items").select("name, price, category").order("name");
  if (error) throw error;
  return (data ?? []).map((m) => ({ name: m.name as string, price: m.price === null ? null : Number(m.price), category: (m.category as string | null) ?? null }));
}

export async function createRecipe(itemName: string, kind: RecipeKind): Promise<string> {
  const name = itemName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Please type the name of the dish.");
  const userId = await currentBusinessId();
  const { data, error } = await supabase
    .from("recipes")
    .insert({ user_id: userId, item_name: name, kind })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`"${name}" already has a recipe.`);
    throw new Error("We couldn't create this recipe. Please try again.");
  }
  return data.id;
}

/** Saves portions and every line of a recipe (lines are replaced as a whole). */
export async function saveRecipe(recipeId: string, portions: number, lines: RecipeLine[]): Promise<void> {
  if (!(portions > 0)) throw new Error("Portions must be above 0.");
  const clean = lines.filter((l) => l.name.trim() && l.quantity > 0);
  const userId = await currentBusinessId();
  const { error: updateError } = await supabase
    .from("recipes")
    .update({ portions, updated_at: new Date().toISOString() })
    .eq("id", recipeId);
  if (updateError) throw new Error("We couldn't save this recipe. Please try again.");
  const { error: deleteError } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  if (deleteError) throw new Error("We couldn't save this recipe. Please try again.");
  if (clean.length === 0) return;
  const { error: insertError } = await supabase.from("recipe_ingredients").insert(
    clean.map((l, position) => ({
      recipe_id: recipeId,
      user_id: userId,
      position,
      name: l.name.trim(),
      product_id: l.productId,
      quantity: l.quantity,
      unit: l.unit,
    })),
  );
  if (insertError) throw new Error("The recipe was cleared but its lines couldn't be saved. Please save again.");
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw new Error("We couldn't delete this recipe. Please try again.");
}
