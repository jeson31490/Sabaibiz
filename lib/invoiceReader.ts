import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  cleanInvoiceNumber,
  cleanTaxId,
  PRODUCT_CATEGORIES,
  purchaseContent,
  type PurchaseContent,
  shortSupplierName,
} from "./scanInvoice";

// Reads one invoice with Claude: the prompt, the answer's format, and the safety nets applied to
// the answer. Shared by the scan (app/api/scan-invoice) and the model comparison page (lab).

/** The model used for real scans. */
export const SCAN_MODEL = "claude-sonnet-4-6";

/** Price in US$ per million tokens (input, output), from Anthropic's price list. */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function readingCost(model: string, usage: { input_tokens: number; output_tokens: number }): number | null {
  const price = MODEL_PRICES[model];
  return price ? (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1e6 : null;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const PDF_TYPE = "application/pdf";
// Claude accepts images up to 5MB; the scan page shrinks photos well below that.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
// Well under the Claude API's 32MB request limit.
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export const ScannedInvoiceSchema = z.object({
  supplier_name: z.string().nullable().describe('Short trading name only, e.g. "Makro"; no legal name, branch or parentheses'),
  supplier_legal_name: z.string().nullable(),
  supplier_tax_id: z.string().nullable().describe("Seller's 13-digit Thai tax ID, digits only; never the buyer's"),
  invoice_date: z
    .string()
    .nullable()
    .describe("Date printed on the invoice, read as day/month/year, returned as YYYY-MM-DD; null if none printed"),
  invoice_number: z
    .string()
    .nullable()
    .describe("Only a number labelled as the invoice/receipt number; null if none. Never a date, phone, tax ID or amount"),
  subtotal_excl_vat: z
    .number()
    .nullable()
    .describe("Amount before VAT as printed on the invoice, in Thai baht"),
  vat_amount: z.number().nullable().describe("VAT amount (7%) as printed on the invoice, in Thai baht"),
  // Asked for before the amount so Claude picks the line first; also shows in the logs which line it used.
  invoice_total_label: z
    .string()
    .nullable()
    .describe("The label printed next to the total that invoice_total is copied from, exactly as printed"),
  invoice_total: z
    .number()
    .nullable()
    .describe("Final amount payable as printed on the invoice's total line, in Thai baht, after VAT and discounts"),
  products: z.array(
    z.object({
      name: z.string().describe("Short English name"),
      original_name: z
        .string()
        .nullable()
        .describe("The product name exactly as printed on the invoice, in its original language (often Thai)"),
      quantity: z.number(),
      unit: z.string().describe("Unit of measure, e.g. kg, g, L, ml, pcs, box, pack, bottle"),
      unit_price: z.number().describe("Price for one unit, in Thai baht, as printed"),
      line_total: z
        .number()
        .nullable()
        .describe("The total printed for this line (after any discount on the line), in baht; null if none is printed"),
      content_amount: z
        .number()
        .nullable()
        .describe("What ONE purchase unit contains, in content_unit: 400 for a 400ml bottle, 7800 for a carton of 24 x 325ml"),
      content_unit: z.enum(["g", "ml", "pcs"]).nullable(),
      category: z
        .enum(PRODUCT_CATEGORIES)
        .nullable()
        .describe("food, resale, packaging, equipment or cleaning; null if you can't tell what the product is"),
      content_source: z
        .enum(["printed", "estimated"])
        .nullable()
        .describe("printed: the size is written on the invoice; estimated: your typical-size guess"),
    }),
  ),
});

export type ScannedInvoice = z.infer<typeof ScannedInvoiceSchema>;

/** An invoice as read, after the safety nets (without the scan id the scan route adds). */
export type ReadInvoice = Omit<ScannedInvoice, "products"> & {
  products: (Omit<ScannedInvoice["products"][number], keyof PurchaseContent> & PurchaseContent)[];
};

const PROMPT = `These are the pages of one supplier invoice or receipt from a restaurant or shop in Thailand, in order. Read all pages together as a single invoice. Extract:
- supplier_name: the short trading name of the business that issued the invoice (the seller, not the buyer), as a customer would say it: "Makro", "Tops", "Big C", "Lotus's", "HomePro". Never add the legal company name, a branch, "Co., Ltd.", "บริษัท … จำกัด" or anything in parentheses. The same shop must always get the same short name: Siam Makro and CP Axtra receipts are both "Makro". Use null when no seller name is printed, as on many market and small family receipts that only show a date, the products and a total; the owner will pick the supplier. Never use the buyer's name, a product name or a stamp you can't read.
- supplier_legal_name: the seller's full registered company name exactly as printed (e.g. "บริษัท ซีพี แอ็กซ์ตร้า จำกัด (มหาชน)"), or null if none is printed.
- supplier_tax_id: the seller's 13-digit Thai tax ID ("เลขประจำตัวผู้เสียภาษี", "Tax ID", "TAX ID NO."), digits only, or null. Tax invoices often also print the buyer's (customer's, "ลูกค้า") tax ID: never use that one.
- invoice_date: the date printed on the invoice, as YYYY-MM-DD. Thai invoices write dates DAY/MONTH/YEAR: 08/01/2026 is 8 January 2026 and 01/08/69 is 1 August 2569, never the American month/day order. They often use the Buddhist Era year (e.g. 2569, or 69 for short); subtract 543 to get the Gregorian year. If no date is printed, use null: never guess or use today's date.
- invoice_number: only a number explicitly labelled as the invoice or receipt number, such as "No.", "Invoice No", "Receipt No", "Bill No", "Tax invoice no", "เลขที่" or "เลขที่ใบกำกับ", copied exactly as printed. Never use a date, a phone number, a tax ID (13 digits, "เลขประจำตัวผู้เสียภาษี", "Tax ID"), an amount or a total as the invoice number. If no labelled number is printed, use null; SabaiBiz then makes its own reference.
- subtotal_excl_vat: the amount before VAT, copied exactly from the invoice, not calculated by you. Usually labelled "มูลค่าสินค้า", "มูลค่าก่อนภาษี", "LEGAL AMOUNT", "VATABLE" or "Subtotal". It must be a number printed on the invoice: if a discount comes between the printed subtotal and the VAT and no line shows the amount after that discount, use null. Never subtract or add amounts yourself.
- vat_amount: the VAT amount (7% in Thailand), copied exactly from the invoice, not calculated by you. Usually labelled "ภาษี", "ภาษีมูลค่าเพิ่ม", "VAT" or "VAT 7%". Use null if the invoice doesn't print it.
- invoice_total: the final amount payable, copied exactly from the invoice's total line, not calculated by you. It is usually the last total printed, after VAT, service charge and discounts, and labelled for example "จำนวนเงินรวมทั้งสิ้น", "ยอดสุทธิ", "รวมเงิน", "TOTAL", "Grand total" or "Net amount". When several totals are printed (e.g. รวมเงิน before VAT, then จำนวนเงินรวมทั้งสิ้น after VAT), use the final one. On a multi-page invoice it is usually on the last page.
  Supermarket and wholesale receipts (Makro, Lotus's, Big C, CP Freshmart) often print a TOTAL first and then promotion or member discounts as minus lines; the amount payable is the one after those discounts, often labelled "ยอดสุทธิ", "ยอดชำระ", "NET", "NET TOTAL" or "Amount due". Never use the cash handed over ("เงินสด", "รับเงิน", "CASH"), the change ("เงินทอน", "CHANGE"), the amount before VAT ("มูลค่าสินค้า", "VATABLE"), the VAT line or an item count.
- invoice_total_label: the label printed next to the amount you used for invoice_total, exactly as printed.
- products: every purchased line item, with its name, quantity, unit and unit price in baht, and line_total: the amount printed for the whole line (often in the last column, after any discount on that line, e.g. Makro promotions). Copy the printed numbers; never compute line_total yourself. Use null when no line total is printed.
- For each product, content_amount + content_unit: what ONE purchase unit contains, in grams (g), millilitres (ml) or pieces (pcs), so a price per gram, ml or piece can be worked out. Examples: "Ketchup 400ml", unit bottle → 400 ml; "cream cheese 250g", unit piece → 250 g; "Condensed milk 325ml x24 cans", unit carton → 7800 ml (24 × 325); "Eggs 30 pcs", unit tray → 30 pcs; "gloves 1x100", unit box → 100 pcs. Set content_source to "printed" when the size is written on the invoice. When nothing is written (1 lettuce, 1 bunch of basil, 1 tray), give your best estimate of a typical size in Thailand (e.g. 1 lettuce ≈ 300 g) with content_source "estimated". When the unit is itself a weight or volume (kg, g, L, ml), you may leave all three null. When you cannot tell at all, use null for all three.

Write product names in English; if a name is printed only in Thai, translate it carefully and keep it short (e.g. "Chicken breast"). Keep sizes and pack counts as printed, and never invent a size or a product type that is not printed. Also copy the name exactly as printed, in its original language, into original_name. If a line shows only a line total, divide it by the quantity to get the unit price. Leave out discounts, VAT, service charge, deposits and subtotal lines. Use null for any header field or total you cannot read.

If the invoice spans several pages, return one combined list of products covering every page. Header details (supplier, date, number) usually appear on the first page and may be repeated on later ones. Don't count a line twice when it is repeated, such as a header reprinted on each page, a "carried forward" subtotal, or the same page photographed twice.`;

export type PageInput = { data?: unknown; mediaType?: unknown };

// Turns one uploaded page into a Claude content block, or returns an error message.
function toContentBlock(page: PageInput): { block: Anthropic.ContentBlockParam; bytes: number } | { error: string } {
  const { mediaType } = page;
  // Accept either raw base64 or a data URL.
  const data = typeof page.data === "string" ? page.data.replace(/^data:[^;]+;base64,/, "") : "";
  if (!data) return { error: "One of the pages is empty." };

  const bytes = Math.floor((data.length * 3) / 4);
  if (mediaType === PDF_TYPE) {
    if (bytes > MAX_PDF_BYTES) return { error: "One of the PDFs is too large. The limit is 10MB." };
    return { bytes, block: { type: "document", source: { type: "base64", media_type: PDF_TYPE, data } } };
  }
  if (IMAGE_TYPES.includes(mediaType as (typeof IMAGE_TYPES)[number])) {
    if (bytes > MAX_IMAGE_BYTES) return { error: "One of the photos is too large. The limit is 5MB." };
    return {
      bytes,
      block: { type: "image", source: { type: "base64", media_type: mediaType as (typeof IMAGE_TYPES)[number], data } },
    };
  }
  return { error: "This file type isn't supported. Please use a JPG, PNG or PDF." };
}

/** The pages as Claude content (each labelled "Page n of N"), or the error to show. */
export function buildInvoiceContent(pages: PageInput[]): { content: Anthropic.ContentBlockParam[] } | { error: string; status: number } {
  const content: Anthropic.ContentBlockParam[] = [];
  let totalBytes = 0;
  for (const [i, page] of pages.entries()) {
    const result = toContentBlock(page);
    if ("error" in result) return { error: result.error, status: 400 };
    totalBytes += result.bytes;
    content.push({ type: "text", text: `Page ${i + 1} of ${pages.length}:` }, result.block);
  }
  if (totalBytes > MAX_TOTAL_BYTES) return { error: "These pages are too large together. The limit is 20MB.", status: 413 };
  content.push({ type: "text", text: PROMPT });
  return { content };
}

/** The safety nets on top of the prompt. */
function cleanReading(invoice: ScannedInvoice): ReadInvoice {
  return {
    ...invoice,
    // "Makro (บริษัท …)" → "Makro"; a tax ID is 13 digits or nothing.
    supplier_name: shortSupplierName(invoice.supplier_name ?? "") || null,
    supplier_legal_name: invoice.supplier_legal_name?.trim() || null,
    supplier_tax_id: cleanTaxId(invoice.supplier_tax_id),
    // A date read as the number is dropped, so an AUTO-… reference is made.
    invoice_number: cleanInvoiceNumber(invoice.invoice_number, invoice.invoice_date),
    // Drop lines the database would reject.
    products: invoice.products
      .filter((p) => p.name.trim() && p.quantity > 0 && p.unit_price >= 0)
      // A unit that is itself a weight or volume (kg, กก, L…) always wins over the AI's reading.
      .map((p) => ({ ...p, ...purchaseContent(p) })),
  };
}

export type Reading = {
  /** Null when Claude couldn't read it (refusal or no structured answer). */
  invoice: ReadInvoice | null;
  /** As Claude returned it, before the safety nets (for the logs). */
  raw: ScannedInvoice | null;
  stopReason: string | null;
  usage: { input_tokens: number; output_tokens: number };
};

/** Reads the invoice with the given model. Throws the SDK's typed errors (rate limit, bad request…). */
export async function readInvoice(client: Anthropic, model: string, content: Anthropic.ContentBlockParam[]): Promise<Reading> {
  const response = await client.messages.parse({
    model,
    max_tokens: 16000,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(ScannedInvoiceSchema) },
  });
  const raw = response.parsed_output;
  const ok = response.stop_reason !== "refusal" && !!raw;
  return {
    invoice: ok && raw ? cleanReading(raw) : null,
    raw: raw ?? null,
    stopReason: response.stop_reason,
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
  };
}
