import { shortSupplierName } from "./scanInvoice";
import { supabase } from "./supabase";

export type SupplierRow = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  invoices: number;
};

type RawSupplier = {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  invoices: { count: number }[] | null;
};

/** The business's suppliers, A→Z, with how many invoices each has. */
export async function fetchSuppliers(): Promise<SupplierRow[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, legal_name, tax_id, invoices(count)")
    .order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as RawSupplier[]).map((s) => ({
    id: s.id,
    name: s.name,
    legalName: s.legal_name,
    taxId: s.tax_id,
    invoices: s.invoices?.[0]?.count ?? 0,
  }));
}

/** Renames a supplier. Its invoices follow, since they point to the supplier, not to its name. */
export async function renameSupplier(id: string, name: string): Promise<string> {
  const clean = shortSupplierName(name);
  if (!clean) throw new Error("Please type a name.");
  const { error } = await supabase.from("suppliers").update({ name: clean }).eq("id", id);
  if (error) {
    // Unique name per business, ignoring case and spaces (supabase/06_supplier_names.sql).
    if (error.code === "23505") throw new Error(`You already have a supplier called "${clean}". Use "Merge into…" instead.`);
    throw new Error("We couldn't rename this supplier. Please try again.");
  }
  return clean;
}

/** Moves every invoice of `fromId` to `intoId`, then deletes `fromId` (supabase/10_merge_suppliers.sql). */
export async function mergeSuppliers(fromId: string, intoId: string): Promise<number> {
  const { data, error } = await supabase.rpc("merge_suppliers", { p_from: fromId, p_into: intoId });
  // P0001: a message written for the owner by the function (e.g. two invoices with the same number).
  if (error) throw new Error(error.code === "P0001" ? error.message : "We couldn't merge these suppliers. Please try again.");
  return data as number;
}
