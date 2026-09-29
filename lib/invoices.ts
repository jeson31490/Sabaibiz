import { checkLine, shortSupplierName, type ContentUnit, type ProductCategory, type PurchaseContent } from "./scanInvoice";
import { supabase } from "./supabase";

export type InvoiceStatus = "processed" | "pending" | "error";

export type InvoiceRow = {
  id: string;
  number: string;
  /** True for an AUTO-… reference made because the invoice has no number. */
  generatedNumber: boolean;
  supplier: string;
  /** Official invoice date as YYYY-MM-DD. */
  date: string;
  products: number;
  total: number;
  status: InvoiceStatus;
};

export type PriceAlertRow = {
  product: string;
  change: string;
  supplier: string;
  from: number;
  to: number;
  unit: string;
  severity: "high" | "medium";
};

type Related<T> = T | T[] | null;

type RawInvoice = {
  id: string;
  invoice_number: string;
  is_generated_number: boolean | null;
  invoice_date: string;
  total: number | string;
  status: InvoiceStatus;
  suppliers: Related<{ name: string }>;
  invoice_items: { count: number }[] | null;
};

type RawAlert = {
  product_name: string;
  change_percent: number | string;
  previous_price: number | string;
  current_price: number | string;
  unit: string;
  period: "week" | "month";
  severity: "high" | "medium";
  suppliers: Related<{ name: string }>;
};

// PostgREST returns a many-to-one embed as an object, but be tolerant of an array.
const relatedName = (r: Related<{ name: string }>) => (Array.isArray(r) ? r[0]?.name : r?.name) ?? "Unknown supplier";

const INVOICE_SELECT =
  "id, invoice_number, is_generated_number, invoice_date, total, status, suppliers(name), invoice_items(count)";

// Row Level Security limits every query to the signed-in user's own rows.
// orderBy "added" lists the most recently saved invoices first, whatever date is printed on them.
export async function fetchInvoices(
  options: { limit?: number; date?: string; orderBy?: "invoiceDate" | "added" } = {},
): Promise<InvoiceRow[]> {
  let query = supabase.from("invoices").select(INVOICE_SELECT);
  if (options.orderBy !== "added") query = query.order("invoice_date", { ascending: false });
  query = query.order("created_at", { ascending: false });
  if (options.date) query = query.eq("invoice_date", options.date);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawInvoice[]).map((r) => ({
    id: r.id,
    number: r.invoice_number,
    generatedNumber: r.is_generated_number === true,
    supplier: relatedName(r.suppliers),
    date: r.invoice_date,
    products: r.invoice_items?.[0]?.count ?? 0,
    total: Number(r.total),
    status: r.status,
  }));
}

/** Sum of the invoices whose invoice date (printed on it) is in the range, both ends included. */
export async function fetchCostsForPeriod(range: { from: string; to: string }): Promise<{ total: number; count: number }> {
  const { data, error } = await supabase
    .from("invoices")
    .select("total")
    .gte("invoice_date", range.from)
    .lte("invoice_date", range.to)
    .neq("status", "error");
  if (error) throw error;
  const rows = (data ?? []) as { total: number | string }[];
  // Add up in satang to avoid floating-point drift.
  const satang = rows.reduce((s, r) => s + Math.round(Number(r.total) * 100), 0);
  return { total: satang / 100, count: rows.length };
}

/**
 * Sum of the invoices scanned today (by created_at, in Bangkok time), whatever date is printed on them:
 * owners scan the day's receipts in the evening. Invoices that failed to read don't count.
 */
export async function fetchCostsScannedToday(): Promise<{ total: number; count: number }> {
  // Thailand has no daylight saving time, so a Bangkok day is always exactly 24 hours.
  const start = new Date(`${bangkokToday()}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("invoices")
    .select("total")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .neq("status", "error");
  if (error) throw error;

  const rows = (data ?? []) as { total: number | string }[];
  // numeric columns arrive as strings; add up in satang to avoid floating-point drift.
  const satang = rows.reduce((s, r) => s + Math.round(Number(r.total) * 100), 0);
  return { total: satang / 100, count: rows.length };
}

export type PurchaseRow = {
  product: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  /** Date printed on the invoice, as YYYY-MM-DD. */
  date: string;
  supplier: string;
};

type RawPurchase = {
  product_name: string;
  unit: string;
  quantity: number | string;
  unit_price: number | string;
  printed_line_total: number | string | null;
  invoices: Related<{ invoice_date: string; suppliers: Related<{ name: string }> }>;
};

const PAGE_SIZE = 1000; // PostgREST's default maximum rows per request

/** Every product line the user has bought, with its invoice date and supplier. Invoices that failed to read are left out. */
/** The business's short supplier names, A→Z and each once, for the supplier suggestions on the scan page. */
export async function fetchSupplierNames(): Promise<string[]> {
  const { data, error } = await supabase.from("suppliers").select("name").order("name");
  if (error) throw error;
  const byKey = new Map<string, string>();
  for (const { name } of (data ?? []) as { name: string }[]) {
    const short = shortSupplierName(name);
    if (short && !byKey.has(short.toLowerCase())) byKey.set(short.toLowerCase(), short);
  }
  return [...byKey.values()];
}

export async function fetchPurchaseHistory(): Promise<PurchaseRow[]> {
  const rows: RawPurchase[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("product_name, unit, quantity, unit_price, printed_line_total, invoices!inner(invoice_date, suppliers(name))")
      .neq("invoices.status", "error")
      .order("id") // stable order so pages don't overlap
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as RawPurchase[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows.flatMap((r) => {
    const invoice = Array.isArray(r.invoices) ? r.invoices[0] : r.invoices;
    if (!invoice) return [];
    return [
      {
        product: r.product_name,
        unit: r.unit,
        quantity: Number(r.quantity),
        // After a line discount, the real price paid per unit (printed line total ÷ quantity).
        unitPrice: checkLine(
          Number(r.quantity),
          Number(r.unit_price),
          r.printed_line_total === null ? null : Number(r.printed_line_total),
        ).effectiveUnitPrice,
        date: invoice.invoice_date,
        supplier: relatedName(invoice.suppliers),
      },
    ];
  });
}

export async function fetchPriceAlerts(limit = 10): Promise<PriceAlertRow[]> {
  const { data, error } = await supabase
    .from("price_alerts")
    .select("product_name, change_percent, previous_price, current_price, unit, period, severity, suppliers(name)")
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as unknown as RawAlert[]).map((a) => {
    const percent = Math.round(Number(a.change_percent));
    return {
      product: a.product_name,
      change: `${percent > 0 ? "+" : ""}${percent}% this ${a.period}`,
      supplier: relatedName(a.suppliers),
      from: Number(a.previous_price),
      to: Number(a.current_price),
      unit: a.unit,
      severity: a.severity,
    };
  });
}

export type NewInvoice = {
  supplier: string;
  /** Empty when the invoice has no number: the database then makes an AUTO-YYYYMMDD-001 reference. */
  number: string;
  /** Official invoice date as YYYY-MM-DD. */
  date: string;
  /** Final amount payable as printed on the invoice, including VAT and discounts. */
  total: number;
  /** content_*: what one purchase unit contains (see purchaseContent in lib/scanInvoice.ts). */
  items: ({
    name: string;
    /** As printed on the invoice (often Thai), to spot a wrong translation. */
    originalName?: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    category?: ProductCategory | null;
    /** The total printed for the line (after a line discount), when there is one. */
    printedLineTotal?: number | null;
  } &
    Partial<PurchaseContent>)[];
  /** The Claude reading it came from (invoice_scans), to know what it cost. */
  scanId?: string | null;
  /** As printed on the invoice, when it is: the tax ID finds the supplier whatever name was read. */
  supplierLegalName?: string | null;
  supplierTaxId?: string | null;
};

export class DuplicateInvoiceError extends Error {}

/** An invoice without a number looks like one already saved. Not blocking: saveInvoice({ allowSimilar }) goes ahead. */
export class SimilarInvoiceError extends Error {}

function duplicateError(invoice: NewInvoice, savedDate?: string) {
  const when = savedDate
    ? `, dated ${fromIsoDate(savedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : "";
  return new DuplicateInvoiceError(
    `Invoice ${invoice.number.trim()} from ${invoice.supplier.trim()} is already saved${when}. It was not saved again.`,
  );
}

/** How a supplier's name is saved and shown: short, tidy spaces, no parentheses ("Makro (บริษัท …)" → "Makro"). */
const cleanName = (s: string) => shortSupplierName(s);
/** Two supplier names are the same supplier when they only differ by case, spaces or a legal name in parentheses. */
const supplierKey = (s: string) => cleanName(s).toLowerCase();
const sameText = (a: string, b: string) => supplierKey(a) === supplierKey(b);

type SupplierIdentity = { name: string; legalName?: string | null; taxId?: string | null };
type KnownSupplier = { id: string; name: string; tax_id: string | null };

/**
 * The business's existing supplier for this invoice, or null. The same tax ID is the same supplier,
 * whatever name was read; otherwise the name decides, ignoring case and spaces ("MAKRO" = "Makro ").
 */
async function findSupplier(
  userId: string,
  { name, taxId }: SupplierIdentity,
): Promise<{ supplier: KnownSupplier | null; taxIdTaken: boolean }> {
  const { data, error } = await supabase.from("suppliers").select("id, name, tax_id").eq("user_id", userId);
  if (error) throw error;
  const rows = (data ?? []) as KnownSupplier[];
  const byTaxId = taxId ? rows.find((s) => s.tax_id === taxId) : undefined;
  const byName = rows.find((s) => sameText(s.name, name));
  // The name is exactly another supplier you already have: the tax ID read is doubtful (often the
  // buyer's own, printed on the same invoice), so trust the name rather than filing it elsewhere.
  if (byTaxId && byName && byTaxId.id !== byName.id) return { supplier: byName, taxIdTaken: true };
  return { supplier: byTaxId ?? byName ?? null, taxIdTaken: !!byTaxId };
}

/** The existing supplier (same tax ID, or same name), or a new one. Never creates "MAKRO" next to "Makro". */
async function findOrCreateSupplier(userId: string, identity: SupplierIdentity): Promise<string> {
  const { supplier, taxIdTaken } = await findSupplier(userId, identity);
  if (supplier) {
    // Learn the tax ID the first time it is printed, so later invoices match it whatever name is read.
    if (identity.taxId && !supplier.tax_id && !taxIdTaken) {
      await supabase
        .from("suppliers")
        .update({ tax_id: identity.taxId, legal_name: identity.legalName ?? null })
        .eq("id", supplier.id);
    }
    return supplier.id;
  }
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      user_id: userId,
      name: cleanName(identity.name),
      legal_name: identity.legalName ?? null,
      tax_id: identity.taxId ?? null,
    })
    .select("id")
    .single();
  if (!error) return data.id;
  // Created meanwhile (e.g. from another phone): use that one.
  if (error.code === "23505") {
    const { supplier: created } = await findSupplier(userId, identity);
    if (created) return created.id;
  }
  throw error;
}

/**
 * An invoice already saved with this supplier and number, if any. Case and spaces in the supplier
 * name are ignored ("MAKRO" = "Makro "), as is the case of the number.
 */
export async function findSavedInvoice(supplier: string, number: string): Promise<{ date: string } | null> {
  if (!supplier.trim() || !number.trim()) return null;
  // ilike without wildcards is a case-insensitive equality; escape any % or _ in the number.
  const pattern = number.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_date, suppliers(name)")
    .ilike("invoice_number", pattern);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { invoice_date: string; suppliers: Related<{ name: string }> }[];
  const match = rows.find((r) => {
    const s = Array.isArray(r.suppliers) ? r.suppliers[0] : r.suppliers;
    return s ? sameText(s.name, supplier) : false;
  });
  return match ? { date: match.invoice_date } : null;
}

/**
 * For invoices without a number: one already saved with the same supplier (ignoring case and
 * spaces), date and total. Returns its reference, or null.
 */
async function findSimilarInvoice(supplier: string, date: string, total: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number, suppliers(name)")
    .eq("invoice_date", date)
    .eq("total", Math.round(total * 100) / 100);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { invoice_number: string; suppliers: Related<{ name: string }> }[];
  const match = rows.find((r) => {
    const s = Array.isArray(r.suppliers) ? r.suppliers[0] : r.suppliers;
    return s ? sameText(s.name, supplier) : false;
  });
  return match?.invoice_number ?? null;
}

/** The owner's user id for a team member, otherwise the signed-in user's own id. */
export async function currentBusinessId(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in first.");
  const { data, error } = await supabase.rpc("current_business_id");
  // PGRST202: supabase/03_team_members.sql hasn't been run yet, so there are no teams.
  if (error?.code === "PGRST202") return auth.user.id;
  if (error) throw error;
  return data as string;
}

/** Product names match ignoring case and spaces, like the unique index in supabase/11_ingredients_recipes.sql. */
const productKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Links each invoice line to a product of the catalogue, creating the missing ones. A line with no
 * size read gets the size the owner already confirmed for that product and purchase unit, if any.
 */
async function withProducts<T extends NewInvoice["items"][number]>(
  userId: string,
  items: T[],
): Promise<(T & { productId: string | null })[]> {
  const { data, error } = await supabase.from("products").select("id, name").eq("user_id", userId);
  if (error) throw error;
  const byKey = new Map(((data ?? []) as { id: string; name: string }[]).map((p) => [productKey(p.name), p.id]));

  for (const item of items) {
    const key = productKey(item.name);
    if (!key || byKey.has(key)) continue;
    const { data: created, error: createError } = await supabase
      .from("products")
      // A new product takes the category read on this invoice; null = "Needs review" in Ingredients.
      .insert({
        user_id: userId,
        name: item.name.trim().replace(/\s+/g, " "),
        base_unit: item.content_unit ?? null,
        category: item.category ?? null,
      })
      .select("id")
      .single();
    if (created) byKey.set(key, created.id);
    // 23505: created meanwhile (another line or another phone); found on the next save. Never blocks saving.
    else if (createError?.code !== "23505") throw createError;
  }

  const lines = items.map((i) => ({ ...i, productId: byKey.get(productKey(i.name)) ?? null }));

  // Reuse sizes the owner confirmed in Ingredients ("1 ชร = 12 pcs"), for the same product and unit.
  const missing = lines.filter((l) => l.productId && !l.content_source);
  if (missing.length > 0) {
    const { data: confirmed, error: confirmedError } = await supabase
      .from("invoice_items")
      .select("product_id, unit, content_amount, content_unit")
      .in("product_id", [...new Set(missing.map((l) => l.productId!))])
      .eq("content_source", "confirmed");
    if (confirmedError) throw confirmedError;
    const sizes = new Map(
      ((confirmed ?? []) as { product_id: string; unit: string; content_amount: number; content_unit: ContentUnit }[]).map(
        (c) => [`${c.product_id}|${productKey(c.unit)}`, c],
      ),
    );
    for (const l of missing) {
      const size = sizes.get(`${l.productId}|${productKey(l.unit)}`);
      if (size) Object.assign(l, { content_amount: Number(size.content_amount), content_unit: size.content_unit, content_source: "confirmed" });
    }
  }
  return lines;
}

/** Saves a confirmed invoice and its line items, creating the supplier if it's new. Returns the invoice id. */
export async function saveInvoice(
  invoice: NewInvoice,
  options: { allowSimilar?: boolean } = {},
): Promise<string> {
  // Rows belong to the business: the owner's id, also when a team member scans the invoice.
  const userId = await currentBusinessId();
  const number = invoice.number.trim();
  const identity: SupplierIdentity = {
    name: invoice.supplier,
    legalName: invoice.supplierLegalName?.trim() || null,
    taxId: invoice.supplierTaxId || null,
  };
  // Check duplicates against the supplier this invoice will be filed under, e.g. "Makro" when
  // "Siam Makro" was read but the tax ID is Makro's.
  const { supplier: known } = await findSupplier(userId, identity);
  const supplierName = known?.name ?? invoice.supplier;

  if (number) {
    // A real number: the same supplier + number is always a duplicate.
    const existing = await findSavedInvoice(supplierName, number);
    if (existing) throw duplicateError({ ...invoice, supplier: supplierName }, existing.date);
  } else if (!options.allowSimilar) {
    // No number: only warn, two identical purchases on the same day are possible.
    const similar = await findSimilarInvoice(supplierName, invoice.date, invoice.total);
    if (similar) {
      throw new SimilarInvoiceError(
        `A similar invoice already exists (${cleanName(supplierName)}, same date and same total, saved as ${similar}).`,
      );
    }
  }

  const supplierId = await findOrCreateSupplier(userId, identity);

  const { data: saved, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      supplier_id: supplierId,
      // null: the database writes the AUTO-… reference (supabase/07_generated_invoice_numbers.sql).
      invoice_number: number || null,
      invoice_date: invoice.date,
      total: Math.round(invoice.total * 100) / 100,
      status: "processed",
      scan_id: invoice.scanId ?? null,
    })
    .select("id")
    .single();
  if (invoiceError) {
    // unique (user_id, supplier_id, invoice_number): saved meanwhile, e.g. from another device
    if (invoiceError.code === "23505" && number) throw duplicateError(invoice);
    throw invoiceError;
  }

  if (invoice.items.length > 0) {
    const lines = await withProducts(userId, invoice.items);
    const { error: itemsError } = await supabase.from("invoice_items").insert(
      lines.map((i, index) => ({
        invoice_id: saved.id,
        user_id: userId,
        product_name: i.name,
        original_name: i.originalName?.trim() || null,
        printed_line_total: i.printedLineTotal ?? null,
        // Paper order: the scan returns the lines in the order printed, across all pages.
        line_position: index + 1,
        // "Check line" until the owner corrects or confirms it (Ingredients → Needs review).
        review_reason: checkLine(i.quantity, i.unitPrice, i.printedLineTotal).mismatch ? "line_mismatch" : null,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unitPrice,
        product_id: i.productId,
        content_amount: i.content_amount ?? null,
        content_unit: i.content_unit ?? null,
        content_source: i.content_source ?? null,
      })),
    );
    if (itemsError) {
      // Don't leave an invoice without its items; deleting it cascades.
      await supabase.from("invoices").delete().eq("id", saved.id);
      throw itemsError;
    }
  }

  return saved.id;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// en-CA formats dates as YYYY-MM-DD.
const bangkokDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** Today's date in Thailand (UTC+7) as YYYY-MM-DD, wherever the browser is. */
export const bangkokToday = (now: Date = new Date()) => bangkokDateFormat.format(now);

export const fromIsoDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const isIsoDate = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/**
 * "Please check the date" when the invoice date is in the future, or more than 3 months before
 * the day it was scanned (`scannedOn`, today by default): usually a day/month mix-up.
 */
export function invoiceDateWarning(date: string, scannedOn: string = bangkokToday()): string | null {
  if (!isIsoDate(date)) return null;
  if (date > bangkokToday()) return "Please check the date: it is in the future.";
  const limit = fromIsoDate(scannedOn);
  limit.setMonth(limit.getMonth() - 3);
  if (date < toIsoDate(limit)) {
    return "Please check the date: it is more than 3 months before the scan. Thai invoices are day/month/year.";
  }
  return null;
}

export type InvoiceDetail = {
  id: string;
  number: string;
  generatedNumber: boolean;
  supplier: string;
  date: string;
  /** Day it was saved (Bangkok), to judge whether the invoice date is plausible. */
  scannedOn: string;
  total: number;
  status: InvoiceStatus;
  items: InvoiceLine[];
};

export type InvoiceLine = {
  id: string;
  name: string;
  /** As printed (often Thai); null for invoices scanned before it was kept. */
  originalName: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  contentAmount: number | null;
  contentUnit: ContentUnit | null;
  contentSource: PurchaseContent["content_source"];
  /** The product of the catalogue this line is linked to. */
  productName: string | null;
  suspectPrice: boolean;
  /** Printed line total, when read (not on invoices scanned before it was). */
  printedLineTotal: number | null;
  /** "Check line": flagged until corrected or confirmed. */
  lineFlagged: boolean;
};

type RawInvoiceDetail = {
  id: string;
  invoice_number: string;
  is_generated_number: boolean | null;
  invoice_date: string;
  created_at: string;
  total: number | string;
  status: InvoiceStatus;
  suppliers: Related<{ name: string }>;
  invoice_items:
    | {
        id: string;
        product_name: string;
        original_name: string | null;
        quantity: number | string;
        unit: string;
        unit_price: number | string;
        content_amount: number | string | null;
        content_unit: ContentUnit | null;
        content_source: PurchaseContent["content_source"];
        review_reason: string | null;
        printed_line_total: number | string | null;
        products: Related<{ name: string }>;
      }[]
    | null;
};

/** One invoice with its lines, or null if it doesn't exist (or belongs to another business). */
export async function fetchInvoice(id: string): Promise<InvoiceDetail | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, is_generated_number, invoice_date, created_at, total, status, suppliers(name), " +
        "invoice_items(id, product_name, original_name, quantity, unit, unit_price, content_amount, content_unit, content_source, review_reason, printed_line_total, products(name))",
    )
    .eq("id", id)
    .order("line_position", { referencedTable: "invoice_items", nullsFirst: false })
    .order("id", { referencedTable: "invoice_items" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as unknown as RawInvoiceDetail;
  return {
    id: r.id,
    number: r.invoice_number,
    generatedNumber: r.is_generated_number === true,
    supplier: relatedName(r.suppliers),
    date: r.invoice_date,
    scannedOn: bangkokToday(new Date(r.created_at)),
    total: Number(r.total),
    status: r.status,
    items: (r.invoice_items ?? []).map((i) => {
      const product = Array.isArray(i.products) ? i.products[0] : i.products;
      return {
        id: i.id,
        name: i.product_name,
        originalName: i.original_name,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unit_price),
        contentAmount: i.content_amount === null ? null : Number(i.content_amount),
        contentUnit: i.content_unit,
        contentSource: i.content_source,
        productName: product?.name ?? null,
        suspectPrice: i.review_reason === "suspect_price",
        printedLineTotal: i.printed_line_total === null ? null : Number(i.printed_line_total),
        lineFlagged: i.review_reason === "line_mismatch",
      };
    }),
  };
}

/** A line as edited on the invoice page. No id = a new line. */
export type InvoiceLineInput = {
  id?: string;
  name: string;
  originalName: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  contentAmount: number | null;
  contentUnit: ContentUnit | null;
  /** The catalogue product to link it to: an existing name, or a new product with this name. */
  productName: string;
  /** The total printed for the line; null when there is none. */
  printedLineTotal: number | null;
};

/**
 * Replaces the lines of a saved invoice with the edited ones (update, add, remove) and saves the
 * printed total. A line that was changed loses its "suspect price" alert. A product left with no
 * invoice line, price or recipe afterwards is removed from the catalogue.
 */
export async function updateInvoiceLines(invoiceId: string, lines: InvoiceLineInput[], printedTotal: number): Promise<void> {
  if (lines.length === 0) throw new Error("Please keep at least one line.");
  for (const l of lines) {
    if (!l.name.trim()) throw new Error("Please give every line a name.");
    if (!(l.quantity > 0)) throw new Error(`Please enter a quantity above 0 for ${l.name}.`);
    if (!(l.unitPrice >= 0)) throw new Error(`Please enter a price for ${l.name}.`);
    if (!l.unit.trim()) throw new Error(`Please enter a unit for ${l.name}.`);
    if ((l.contentAmount === null) !== (l.contentUnit === null) || (l.contentAmount !== null && !(l.contentAmount > 0))) {
      throw new Error(`Please complete the size of ${l.name}, or leave it empty.`);
    }
  }
  if (!(printedTotal >= 0)) throw new Error("Please enter the printed total.");
  const userId = await currentBusinessId();

  const { data: before, error: beforeError } = await supabase
    .from("invoice_items")
    .select("id, product_name, original_name, quantity, unit, unit_price, content_amount, content_unit, product_id, printed_line_total, line_position")
    .eq("invoice_id", invoiceId);
  if (beforeError) throw beforeError;
  type Before = { id: string; product_name: string; original_name: string | null; quantity: number | string; unit: string; unit_price: number | string; content_amount: number | string | null; content_unit: ContentUnit | null; product_id: string | null; printed_line_total: number | string | null; line_position: number | null };
  const old = new Map(((before ?? []) as Before[]).map((b) => [b.id, b]));

  // Products: link to the one with this name, or create it (taking the category of the product it replaces).
  const { data: products, error: productsError } = await supabase.from("products").select("id, name, category").eq("user_id", userId);
  if (productsError) throw productsError;
  const byKey = new Map(((products ?? []) as { id: string; name: string; category: ProductCategory | null }[]).map((p) => [productKey(p.name), p]));
  const categoryOf = new Map(((products ?? []) as { id: string; category: ProductCategory | null }[]).map((p) => [p.id, p.category]));
  async function productIdFor(line: InvoiceLineInput): Promise<string> {
    const name = (line.productName.trim() || line.name).trim().replace(/\s+/g, " ");
    const found = byKey.get(productKey(name));
    if (found) return found.id;
    const previous = line.id ? old.get(line.id)?.product_id : null;
    const { data, error } = await supabase
      .from("products")
      .insert({ user_id: userId, name, base_unit: line.contentUnit, category: previous ? (categoryOf.get(previous) ?? null) : null })
      .select("id, name, category")
      .single();
    if (error) throw error;
    byKey.set(productKey(name), data as { id: string; name: string; category: ProductCategory | null });
    return data.id;
  }

  const touchedProducts = new Set<string>();
  for (const [index, line] of lines.entries()) {
    const productId = await productIdFor(line);
    const row = {
      product_name: line.name.trim(),
      original_name: line.originalName?.trim() || null,
      quantity: line.quantity,
      unit: line.unit.trim(),
      unit_price: line.unitPrice,
      product_id: productId,
      content_amount: line.contentAmount,
      content_unit: line.contentUnit,
      printed_line_total: line.printedLineTotal,
      // The order shown on the page, which is the paper order (lines can be moved with ↑ ↓).
      line_position: index + 1,
    };
    const prev = line.id ? old.get(line.id) : undefined;
    if (prev) {
      const prevAmount = prev.content_amount === null ? null : Number(prev.content_amount);
      const sizeChanged = prevAmount !== line.contentAmount || prev.content_unit !== line.contentUnit;
      const changed =
        sizeChanged ||
        prev.product_name !== row.product_name ||
        (prev.original_name ?? null) !== row.original_name ||
        Number(prev.quantity) !== row.quantity ||
        prev.unit !== row.unit ||
        Number(prev.unit_price) !== row.unit_price ||
        (prev.printed_line_total === null ? null : Number(prev.printed_line_total)) !== row.printed_line_total ||
        prev.line_position !== row.line_position ||
        prev.product_id !== productId;
      if (!changed) continue;
      if (prev.product_id && prev.product_id !== productId) touchedProducts.add(prev.product_id);
      const { error } = await supabase
        .from("invoice_items")
        .update({
          ...row,
          // Corrected by the owner: its alert goes (a line still off stays "Check line"), and a
          // size they typed is confirmed.
          review_reason: checkLine(line.quantity, line.unitPrice, line.printedLineTotal).mismatch ? "line_mismatch" : null,
          ...(sizeChanged ? { content_source: line.contentAmount === null ? null : "confirmed" } : {}),
        })
        .eq("id", prev.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("invoice_items").insert({
        ...row,
        invoice_id: invoiceId,
        user_id: userId,
        content_source: line.contentAmount === null ? null : "confirmed",
        review_reason: checkLine(line.quantity, line.unitPrice, line.printedLineTotal).mismatch ? "line_mismatch" : null,
      });
      if (error) throw error;
    }
  }

  const kept = new Set(lines.map((l) => l.id).filter(Boolean));
  const removed = [...old.values()].filter((b) => !kept.has(b.id));
  if (removed.length > 0) {
    const { error } = await supabase.from("invoice_items").delete().in("id", removed.map((b) => b.id));
    if (error) throw error;
    for (const b of removed) if (b.product_id) touchedProducts.add(b.product_id);
  }

  const { error: totalError } = await supabase.from("invoices").update({ total: Math.round(printedTotal * 100) / 100 }).eq("id", invoiceId);
  if (totalError) throw totalError;

  await removeUnusedProducts([...touchedProducts]);
}

/** Deletes products that nothing refers to any more (no invoice line, manual price or recipe ingredient). */
async function removeUnusedProducts(ids: string[]): Promise<void> {
  for (const id of ids) {
    const [lines, prices, ingredients] = await Promise.all([
      supabase.from("invoice_items").select("id", { count: "exact", head: true }).eq("product_id", id),
      supabase.from("manual_prices").select("id", { count: "exact", head: true }).eq("product_id", id),
      supabase.from("recipe_ingredients").select("id", { count: "exact", head: true }).eq("product_id", id),
    ]);
    if (lines.error || prices.error || ingredients.error) continue; // keeping a product is harmless
    if ((lines.count ?? 0) + (prices.count ?? 0) + (ingredients.count ?? 0) === 0) {
      await supabase.from("products").delete().eq("id", id);
    }
  }
}

/** Names of the business's products, A→Z, to link an invoice line to one. */
export async function fetchProductNames(): Promise<string[]> {
  const { data, error } = await supabase.from("products").select("name").order("name");
  if (error) throw error;
  return (data ?? []).map((p) => p.name as string);
}

/**
 * Corrects a saved invoice's supplier, number and date. An empty number keeps the current one
 * (e.g. its AUTO-… reference). The same supplier + number twice is refused, as when saving.
 */
export async function updateInvoice(
  id: string,
  changes: { supplier: string; number: string; date: string },
): Promise<void> {
  if (!changes.supplier.trim()) throw new Error("Please choose a supplier.");
  if (!isIsoDate(changes.date)) throw new Error("Please enter the invoice date.");
  const userId = await currentBusinessId();
  const supplierId = await findOrCreateSupplier(userId, { name: changes.supplier });
  const number = changes.number.trim();

  if (number) {
    // ilike without wildcards is a case-insensitive equality; escape any % or _ in the number.
    const pattern = number.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: same, error } = await supabase
      .from("invoices")
      .select("id")
      .eq("supplier_id", supplierId)
      .ilike("invoice_number", pattern)
      .neq("id", id)
      .limit(1);
    if (error) throw error;
    if (same && same.length > 0) {
      throw new DuplicateInvoiceError(`Another invoice from ${cleanName(changes.supplier)} already has number ${number}.`);
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      supplier_id: supplierId,
      invoice_date: changes.date,
      // A number typed here is a real one, even on an invoice that had an AUTO-… reference.
      ...(number ? { invoice_number: number, is_generated_number: false } : {}),
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      throw new DuplicateInvoiceError(`Another invoice from ${cleanName(changes.supplier)} already has number ${number}.`);
    }
    throw error;
  }
}
