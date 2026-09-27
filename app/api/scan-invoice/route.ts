import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MAX_INVOICE_PAGES } from "../../../lib/scanInvoice";
import { supabase } from "../../../lib/supabase";

// Reading a long invoice can take a while.
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const PDF_TYPE = "application/pdf";
// Claude accepts images up to 5MB; the scan page shrinks photos well below that.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
// Well under the Claude API's 32MB request limit.
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

const ScannedInvoiceSchema = z.object({
  supplier_name: z.string().nullable(),
  invoice_date: z.string().nullable().describe("Date printed on the invoice, as YYYY-MM-DD"),
  invoice_number: z.string().nullable(),
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
      name: z.string(),
      quantity: z.number(),
      unit: z.string().describe("Unit of measure, e.g. kg, g, L, ml, pcs, box, pack, bottle"),
      unit_price: z.number().describe("Price for one unit, in Thai baht"),
    }),
  ),
});

export type ScannedInvoice = z.infer<typeof ScannedInvoiceSchema>;

/** What the route returns: the invoice, plus the id of this reading in invoice_scans (null if it couldn't be recorded). */
export type ScanResult = ScannedInvoice & { scan_id: string | null };

const PROMPT = `These are the pages of one supplier invoice or receipt from a restaurant or shop in Thailand, in order. Read all pages together as a single invoice. Extract:
- supplier_name: the business that issued the invoice (the seller, not the buyer).
- invoice_date: the date printed on the invoice, as YYYY-MM-DD. Thai invoices often use the Buddhist Era year (e.g. 2569); subtract 543 to get the Gregorian year.
- invoice_number: the invoice, receipt or tax invoice number, exactly as printed.
- subtotal_excl_vat: the amount before VAT, copied exactly from the invoice, not calculated by you. Usually labelled "มูลค่าสินค้า", "มูลค่าก่อนภาษี", "LEGAL AMOUNT", "VATABLE" or "Subtotal". It must be a number printed on the invoice: if a discount comes between the printed subtotal and the VAT and no line shows the amount after that discount, use null. Never subtract or add amounts yourself.
- vat_amount: the VAT amount (7% in Thailand), copied exactly from the invoice, not calculated by you. Usually labelled "ภาษี", "ภาษีมูลค่าเพิ่ม", "VAT" or "VAT 7%". Use null if the invoice doesn't print it.
- invoice_total: the final amount payable, copied exactly from the invoice's total line, not calculated by you. It is usually the last total printed, after VAT, service charge and discounts, and labelled for example "จำนวนเงินรวมทั้งสิ้น", "ยอดสุทธิ", "รวมเงิน", "TOTAL", "Grand total" or "Net amount". When several totals are printed (e.g. รวมเงิน before VAT, then จำนวนเงินรวมทั้งสิ้น after VAT), use the final one. On a multi-page invoice it is usually on the last page.
  Supermarket and wholesale receipts (Makro, Lotus's, Big C, CP Freshmart) often print a TOTAL first and then promotion or member discounts as minus lines; the amount payable is the one after those discounts, often labelled "ยอดสุทธิ", "ยอดชำระ", "NET", "NET TOTAL" or "Amount due". Never use the cash handed over ("เงินสด", "รับเงิน", "CASH"), the change ("เงินทอน", "CHANGE"), the amount before VAT ("มูลค่าสินค้า", "VATABLE"), the VAT line or an item count.
- invoice_total_label: the label printed next to the amount you used for invoice_total, exactly as printed.
- products: every purchased line item, with its name, quantity, unit and unit price in baht.

Write product names in English; if a name is printed only in Thai, translate it and keep it short (e.g. "Chicken breast"). If a line shows only a line total, divide it by the quantity to get the unit price. Leave out discounts, VAT, service charge, deposits and subtotal lines. Use null for any header field or total you cannot read.

If the invoice spans several pages, return one combined list of products covering every page. Header details (supplier, date, number) usually appear on the first page and may be repeated on later ones. Don't count a line twice when it is repeated, such as a header reprinted on each page, a "carried forward" subtotal, or the same page photographed twice.`;

type PageInput = { data?: unknown; mediaType?: unknown };

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

const client = new Anthropic();

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Records one reading and the tokens it used in invoice_scans, as the signed-in user (RLS puts it
 * in their business). Returns its id, or null: a failed record never stops the scan itself.
 */
async function recordScan(
  userToken: string,
  scan: { pages: number; inputTokens: number; outputTokens: number; succeeded: boolean },
): Promise<string | null> {
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await asUser
    .from("invoice_scans")
    .insert({
      model: MODEL,
      pages: scan.pages,
      input_tokens: scan.inputTokens,
      output_tokens: scan.outputTokens,
      succeeded: scan.succeeded,
    })
    .select("id")
    .single();
  if (error) {
    console.error("scan-invoice: couldn't record scan cost", error.message);
    return null;
  }
  return data.id;
}

export async function POST(request: Request) {
  // Only signed-in users may spend Claude API credits.
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in to scan invoices.", 401);
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);

  let body: { pages?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }

  const pages = Array.isArray(body.pages) ? (body.pages as PageInput[]) : [];
  if (pages.length === 0) return jsonError("No invoice image was sent.", 400);
  if (pages.length > MAX_INVOICE_PAGES) return jsonError(`An invoice can have at most ${MAX_INVOICE_PAGES} pages.`, 400);

  // Label each page so Claude knows the order.
  const content: Anthropic.ContentBlockParam[] = [];
  let totalBytes = 0;
  for (const [i, page] of pages.entries()) {
    const result = toContentBlock(page);
    if ("error" in result) return jsonError(result.error, 400);
    totalBytes += result.bytes;
    content.push({ type: "text", text: `Page ${i + 1} of ${pages.length}:` }, result.block);
  }
  if (totalBytes > MAX_TOTAL_BYTES) return jsonError("These pages are too large together. The limit is 20MB.", 413);
  content.push({ type: "text", text: PROMPT });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(ScannedInvoiceSchema) },
    });

    const invoice = response.parsed_output;
    // DEBUG: what Claude returned, and the line sum for comparison with the printed total.
    console.log("[scan-invoice] Claude response", {
      pages: pages.length,
      stop_reason: response.stop_reason,
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
      subtotal_excl_vat: invoice?.subtotal_excl_vat,
      vat_amount: invoice?.vat_amount,
      invoice_total: invoice?.invoice_total,
      invoice_total_label: invoice?.invoice_total_label,
      sum_of_products: invoice ? Math.round(invoice.products.reduce((s, p) => s + p.quantity * p.unit_price, 0) * 100) / 100 : null,
    });
    console.log("[scan-invoice] parsed output", JSON.stringify(invoice, null, 2));

    const succeeded = response.stop_reason !== "refusal" && !!invoice;
    // Paid for either way, so recorded either way.
    const scanId = await recordScan(token, {
      pages: pages.length,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      succeeded,
    });

    if (!succeeded || !invoice) {
      return jsonError("We couldn't read this invoice. Please try a clearer photo.", 422);
    }

    return Response.json({
      ...invoice,
      // Drop lines the database would reject.
      products: invoice.products.filter((p) => p.name.trim() && p.quantity > 0 && p.unit_price >= 0),
      scan_id: scanId,
    } satisfies ScanResult);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return jsonError("Sabai is busy right now. Please try again in a minute.", 429);
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("scan-invoice: bad request", error.message);
      return jsonError("We couldn't read this file. Please try another photo.", 400);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("scan-invoice: invalid ANTHROPIC_API_KEY");
      return jsonError("Invoice reading is not configured correctly.", 500);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`scan-invoice: API error ${error.status}`, error.message);
      return jsonError("Invoice reading is temporarily unavailable. Please try again.", 502);
    }
    throw error;
  }
}
