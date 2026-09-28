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
