import "server-only";

// Minimal Loyverse API v1.0 client (server only). The token is only ever put in the
// Authorization header: never log it, never return it.

const BASE_URL = "https://api.loyverse.com/v1.0";
const MAX_ATTEMPTS = 5;

export class LoyverseError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Field names as returned by GET /merchant and GET /receipts.
export type LoyverseMerchant = {
  id?: string;
  name?: string;
  business_name?: string;
};

export type LoyverseLineItem = {
  id?: string;
  item_id?: string | null;
  variant_id?: string | null;
  item_name?: string | null;
  variant_name?: string | null;
  quantity?: number;
  price?: number;
  gross_total_money?: number;
  total_money?: number;
  cost?: number | null;
  cost_total?: number | null;
  /** Options chosen for this line (e.g. Protein: Shrimp). Always empty so far on Moustache's receipts. */
  line_modifiers?: { name?: string | null; option?: string | null }[] | null;
};

// Menu, as returned by GET /items, /categories and /modifiers (field names checked on a real account;
// modifiers could not be checked since that account has none, so they are read defensively).
export type LoyverseItem = {
  id: string;
  item_name: string;
  category_id?: string | null;
  sold_by_weight?: boolean;
  deleted_at?: string | null;
  variants?: { variant_id?: string; default_price?: number | null }[];
};

export type LoyverseCategory = { id: string; name: string };

export type LoyverseModifier = {
  id: string;
  name?: string | null;
  modifier_options?: { id?: string; name?: string | null; price?: number | null }[] | null;
};

export type LoyverseReceipt = {
  receipt_number: string;
  receipt_type: "SALE" | "REFUND";
  receipt_date: string;
  created_at: string;
  cancelled_at?: string | null;
  total_money?: number;
  total_tax?: number;
  total_discount?: number;
  store_id?: string | null;
  line_items?: LoyverseLineItem[];
};

type ReceiptsPage = { receipts?: LoyverseReceipt[]; cursor?: string | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET a Loyverse endpoint, waiting and retrying when rate limited (429) or on a server hiccup (5xx). */
async function loyverseGet<T>(token: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw new LoyverseError(res.status, `Loyverse ${path} answered ${res.status}`);
    }
    // Retry-After is in seconds when Loyverse sends it; otherwise back off 2s, 4s, 8s…
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000);
  }
}

export function fetchMerchant(token: string): Promise<LoyverseMerchant> {
  return loyverseGet<LoyverseMerchant>(token, "/merchant");
}

/** One page of receipts created between `from` and `to` (UTC). Pass the returned cursor to get the next page. */
export function fetchReceiptsPage(token: string, from: Date, to: Date, cursor?: string): Promise<ReceiptsPage> {
  const params: Record<string, string> = {
    created_at_min: from.toISOString(),
    created_at_max: to.toISOString(),
    limit: "250",
  };
  if (cursor) params.cursor = cursor;
  return loyverseGet<ReceiptsPage>(token, "/receipts", params);
}

/** Every page of a list endpoint (limit 250, following the cursor). */
async function fetchAll<T>(token: string, path: string, key: string): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  do {
    const params: Record<string, string> = { limit: "250" };
    if (cursor) params.cursor = cursor;
    const page = await loyverseGet<Record<string, unknown>>(token, path, params);
    all.push(...((page[key] as T[] | undefined) ?? []));
    cursor = (page.cursor as string | null | undefined) || undefined;
  } while (cursor);
  return all;
}

export const fetchItems = (token: string) => fetchAll<LoyverseItem>(token, "/items", "items");
export const fetchCategories = (token: string) => fetchAll<LoyverseCategory>(token, "/categories", "categories");
export const fetchModifiers = (token: string) => fetchAll<LoyverseModifier>(token, "/modifiers", "modifiers");
