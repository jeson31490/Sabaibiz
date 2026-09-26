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
export async function fetchInvoices(options: { limit?: number; date?: string } = {}): Promise<InvoiceRow[]> {
  let query = supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false });
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

const pad = (n: number) => String(n).padStart(2, "0");
export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIsoDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
