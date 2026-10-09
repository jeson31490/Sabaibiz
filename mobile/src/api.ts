// Calls the SabaiBiz website's AI invoice reader (same endpoint as the website's scan page).
import type { ContentUnit, PurchaseContent, ProductCategory } from "@shared/scanInvoice";
import { supabase } from "./supabase";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://www.sabaibiz.com").replace(/\/$/, "");

/** Mirrors ScanResult returned by app/api/scan-invoice/route.ts on the website. */
export type ScanProduct = {
  name: string;
  original_name: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number | null;
  category: ProductCategory | null;
} & PurchaseContent;

export type ScanResult = {
  supplier_name: string | null;
  supplier_legal_name: string | null;
  supplier_tax_id: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  subtotal_excl_vat: number | null;
  vat_amount: number | null;
  invoice_total_label: string | null;
  invoice_total: number | null;
  products: ScanProduct[];
  scan_id: string | null;
};

export type ScanPage = {
  /** data:image/jpeg;base64,… */
  dataUrl: string;
};

export type { ContentUnit };

export async function scanInvoice(pages: ScanPage[], signal?: AbortSignal): Promise<ScanResult> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}/api/scan-invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ pages: pages.map((p) => ({ data: p.dataUrl, mediaType: "image/jpeg" })) }),
    signal,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Something went wrong while reading your invoice.");
  return body as ScanResult;
}
