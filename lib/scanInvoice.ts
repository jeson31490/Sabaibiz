/** Most photos or PDFs a single invoice can be made of. Shared by the scan page and /api/scan-invoice. */
export const MAX_INVOICE_PAGES = 5;

/**
 * The short trading name: trailing parentheses removed, even nested ones.
 * "Makro (บริษัท สยาม แม็คโคร จำกัด (มหาชน))" → "Makro". A name that is only in parentheses is kept.
 */
export function shortSupplierName(name: string): string {
  let s = name.trim().replace(/\s+/g, " ");
  while (s.endsWith(")")) {
    let depth = 0;
    let open = -1;
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] === ")") depth++;
      else if (s[i] === "(" && --depth === 0) {
        open = i;
        break;
      }
    }
    if (open <= 0) break;
    s = s.slice(0, open).trim();
  }
  return s;
}

/** A Thai tax ID is exactly 13 digits; spaces and dashes as printed are dropped. Anything else → null. */
export function cleanTaxId(taxId: string | null | undefined): string | null {
  const digits = (taxId ?? "").replace(/[\s-]/g, "");
  return /^\d{13}$/.test(digits) ? digits : null;
}

const SEP = String.raw`\s*[/.-]\s*`;
// 4-digit years: Gregorian 19xx/20xx or Buddhist Era 25xx; 2-digit years are always accepted.
const YEAR = String.raw`(\d{2}|(?:19|20|25)\d{2})`;
const DAY_MONTH_YEAR = new RegExp(String.raw`^(\d{1,2})${SEP}(\d{1,2})${SEP}${YEAR}$`); // 27/09/69, 27.9.2569
const YEAR_MONTH_DAY = new RegExp(String.raw`^(?:19|20|25)\d{2}${SEP}(\d{1,2})${SEP}(\d{1,2})$`); // 2026-09-27
const DAY_MONTHNAME_YEAR = new RegExp(String.raw`^\d{1,2}\s*[A-Za-z฀-๿.]{3,}\s*${YEAR}$`); // 27 Sep 2026, 27 ก.ย. 69

const isDay = (s: string) => Number(s) >= 1 && Number(s) <= 31;
const isMonth = (s: string) => Number(s) >= 1 && Number(s) <= 12;

/** True for 27/09/69, 27-09-2026, 27.9.2569, 9/27/26, 2026-09-27, 27 Sep 2026, 27 ก.ย. 69… but not 01-02-0034. */
function looksLikeDate(s: string): boolean {
  const dmy = DAY_MONTH_YEAR.exec(s);
  if (dmy) return (isDay(dmy[1]) && isMonth(dmy[2])) || (isMonth(dmy[1]) && isDay(dmy[2]));
  const ymd = YEAR_MONTH_DAY.exec(s);
  if (ymd) return isMonth(ymd[1]) && isDay(ymd[2]);
  return DAY_MONTHNAME_YEAR.test(s);
}

/** Ways invoice_date (YYYY-MM-DD) can be written as digits only, in Gregorian or Buddhist Era years. */
function dateAsDigits(isoDate: string): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return [];
  const [, y, mo, d] = m;
  const years = [y, String(Number(y) + 543)];
  return years.flatMap((yyyy) => {
    const yy = yyyy.slice(2);
    return [`${yyyy}${mo}${d}`, `${d}${mo}${yyyy}`, `${d}${mo}${yy}`, `${yy}${mo}${d}`];
  });
}

/**
 * The invoice number as read, or null when it is really a date (a common misreading on market
 * receipts that only print a date). An empty number makes SabaiBiz generate an AUTO-… reference.
 */
export function cleanInvoiceNumber(number: string | null, invoiceDate: string | null): string | null {
  const n = number?.trim() ?? "";
  if (!n) return null;
  if (looksLikeDate(n)) return null;
  // Digits only (maybe with separators) that spell the invoice date, e.g. 20260927 or 270969.
  if (invoiceDate && /^[\d\s/.-]+$/.test(n) && dateAsDigits(invoiceDate).includes(n.replace(/\D/g, ""))) return null;
  return n;
}

export type ContentUnit = "g" | "ml" | "pcs";
export type ContentSource = "standard" | "printed" | "estimated" | "confirmed";
export type PurchaseContent = {
  content_amount: number | null;
  content_unit: ContentUnit | null;
  content_source: ContentSource | null;
};

// Units that are themselves a weight or volume: the content of one unit is certain.
const STANDARD_UNITS: Record<string, { amount: number; unit: ContentUnit }> = {
  kg: { amount: 1000, unit: "g" }, kgs: { amount: 1000, unit: "g" }, kilo: { amount: 1000, unit: "g" },
  "กก": { amount: 1000, unit: "g" }, "กิโล": { amount: 1000, unit: "g" }, "กิโลกรัม": { amount: 1000, unit: "g" },
  g: { amount: 1, unit: "g" }, gr: { amount: 1, unit: "g" }, gram: { amount: 1, unit: "g" }, "กรัม": { amount: 1, unit: "g" },
  l: { amount: 1000, unit: "ml" }, lt: { amount: 1000, unit: "ml" }, ltr: { amount: 1000, unit: "ml" },
  liter: { amount: 1000, unit: "ml" }, litre: { amount: 1000, unit: "ml" }, "ลิตร": { amount: 1000, unit: "ml" },
  ml: { amount: 1, unit: "ml" }, "มล": { amount: 1, unit: "ml" },
};

/**
 * What one purchase unit contains. A weight or volume unit (kg, กก, L…) is "standard" and always
 * wins; otherwise the size read from the invoice ("printed") or guessed ("estimated") is kept if
 * it makes sense. Everything null = "Needs conversion".
 */
export function purchaseContent(line: {
  unit: string;
  content_amount?: number | null;
  content_unit?: ContentUnit | null;
  content_source?: ContentSource | null;
}): PurchaseContent {
  const standard = STANDARD_UNITS[line.unit.trim().toLowerCase().replace(/\./g, "")];
  if (standard) return { content_amount: standard.amount, content_unit: standard.unit, content_source: "standard" };
  const amount = line.content_amount;
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0 && line.content_unit && line.content_source) {
    return { content_amount: Math.round(amount * 10000) / 10000, content_unit: line.content_unit, content_source: line.content_source };
  }
  return { content_amount: null, content_unit: null, content_source: null };
}

/** Categories of purchased products. Only food and resale are used in recipes; all count as costs. */
export const PRODUCT_CATEGORIES = ["food", "resale", "packaging", "equipment", "cleaning"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food: "Food & ingredients",
  resale: "Drinks for resale",
  packaging: "Packaging & consumables",
  equipment: "Kitchen equipment",
  cleaning: "Cleaning & other",
};
