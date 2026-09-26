import { supabase } from "./supabase";

export type InvoiceStatus = "processed" | "pending" | "error";

export type InvoiceRow = {
  id: string;
  number: string;
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

const INVOICE_SELECT = "id, invoice_number, invoice_date, total, status, suppliers(name), invoice_items(count)";

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
    supplier: relatedName(r.suppliers),
    date: r.invoice_date,
    products: r.invoice_items?.[0]?.count ?? 0,
    total: Number(r.total),
    status: r.status,
  }));
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
  invoices: Related<{ invoice_date: string; suppliers: Related<{ name: string }> }>;
};

const PAGE_SIZE = 1000; // PostgREST's default maximum rows per request

/** Every product line the user has bought, with its invoice date and supplier. Invoices that failed to read are left out. */
export async function fetchPurchaseHistory(): Promise<PurchaseRow[]> {
  const rows: RawPurchase[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("product_name, unit, quantity, unit_price, invoices!inner(invoice_date, suppliers(name))")
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
        unitPrice: Number(r.unit_price),
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
  number: string;
  /** Official invoice date as YYYY-MM-DD. */
  date: string;
  /** Final amount payable as printed on the invoice, including VAT and discounts. */
  total: number;
  items: { name: string; quantity: number; unit: string; unitPrice: number }[];
};

export class DuplicateInvoiceError extends Error {}

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

/** Saves a confirmed invoice and its line items, creating the supplier if it's new. Returns the invoice id. */
export async function saveInvoice(invoice: NewInvoice): Promise<string> {
  // Rows belong to the business: the owner's id, also when a team member scans the invoice.
  const userId = await currentBusinessId();

  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .upsert({ user_id: userId, name: invoice.supplier }, { onConflict: "user_id,name" })
    .select("id")
    .single();
  if (supplierError) throw supplierError;

  const { data: saved, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      supplier_id: supplier.id,
      invoice_number: invoice.number,
      invoice_date: invoice.date,
      total: Math.round(invoice.total * 100) / 100,
      status: "processed",
    })
    .select("id")
    .single();
  if (invoiceError) {
    // unique (user_id, invoice_number)
    if (invoiceError.code === "23505") throw new DuplicateInvoiceError(`Invoice ${invoice.number} is already saved.`);
    throw invoiceError;
  }

  if (invoice.items.length > 0) {
    const { error: itemsError } = await supabase.from("invoice_items").insert(
      invoice.items.map((i) => ({
        invoice_id: saved.id,
        user_id: userId,
        product_name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unitPrice,
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
