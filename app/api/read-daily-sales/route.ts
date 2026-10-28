import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fetchOwnAiKey } from "../../../lib/aiKeyServer";
import { fetchPlanUsage } from "../../../lib/billing";
import { dayStartBangkok, formatResetDate } from "../../../lib/plans";
import { createAdminClient } from "../../../lib/posServer";
import { supabase } from "../../../lib/supabase";

// Reads the day's total from a photo of the till's end-of-day receipt ("Z report", "daily summary").
// Nothing is saved here: the app shows the numbers and the person confirms them. Owner and managers only.
// A reading counts as one scan of the plan (or is free with the business's own AI key), like an invoice.
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const OWN_KEY_DAILY_CAP = 300;

const Schema = z.object({
  report_date: z
    .string()
    .nullable()
    .describe("The business day the report covers, as YYYY-MM-DD; null if it isn't printed or covers several days"),
  total_label: z.string().nullable().describe("The label printed next to the amount used for total_sales, exactly as printed"),
  total_sales: z
    .number()
    .nullable()
    .describe("The day's net sales in Thai baht, as printed: what the shop sold that day, after discounts and refunds, VAT included"),
  tickets: z.number().nullable().describe("Number of sales/bills/receipts that day, as printed; null if not printed"),
});

const PROMPT = `This is a photo of the end-of-day summary receipt printed by the till (POS) of a restaurant or shop in Thailand (a "Z report", "daily sales summary", "สรุปยอดขายประจำวัน", "ปิดยอดขาย", "End of day" ...). Extract:
- total_sales: the day's net sales in baht, copied exactly as printed, not calculated by you. Prefer lines labelled "Net sales", "Total sales", "ยอดขายสุทธิ", "ยอดขายรวม", "รวมยอดขาย", "Grand total". It is what customers paid for that day (VAT included), after discounts and refunds. Never use the cash counted in the drawer, the starting cash, the expected cash, the change, a payment-method line (cash only, card only), a tax line, or an item count. If several totals are printed (gross sales, discounts, net sales), take the net one, after discounts.
- total_label: the label printed next to that amount, exactly as printed.
- report_date: the business day of the report as YYYY-MM-DD. Thai dates are DAY/MONTH/YEAR (08/01/2026 is 8 January 2026) and may use the Buddhist Era year (2569, or 69): subtract 543. If the report covers a range of days, or no date is printed, use null. Never guess.
- tickets: the number of sales, bills or receipts that day ("Number of sales", "จำนวนบิล", "จำนวนรายการขาย", "Bills"), or null.
Use null for anything you cannot read. If the photo is not a till summary, use null for everything.`;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in.", 401);
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);

  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Owner and managers only (employees can't enter takings).
  const { data: isManager, error: roleError } = await asUser.rpc("is_business_manager");
  if (roleError) {
    console.error("read-daily-sales: role check failed", roleError.message);
    return jsonError("We couldn't check your permissions. Please try again.", 500);
  }
  if (isManager !== true) return jsonError("Only the owner and managers can enter the day's takings.", 403);

  // Same allowance as invoice scans.
  const usage = await fetchPlanUsage(asUser);
  let ownKey: string | null = null;
  if (usage.hasOwnKey) {
    const { data: businessId } = await asUser.rpc("current_business_id");
    const admin = createAdminClient();
    if (admin && typeof businessId === "string") ownKey = await fetchOwnAiKey(admin, businessId);
    if (!ownKey) {
      return Response.json(
        { error: "Your saved AI key can't be read. Please save it again in Settings → AI key.", code: "ai_key_invalid" },
        { status: 402 },
      );
    }
    const { count: today } = await asUser
      .from("invoice_scans")
      .select("id", { count: "exact", head: true })
      .eq("own_key", true)
      .gte("created_at", dayStartBangkok().toISOString());
    if ((today ?? 0) >= OWN_KEY_DAILY_CAP) return jsonError("That's a lot of readings for one day. Please carry on tomorrow.", 429);
  } else if (!usage.degraded) {
    if (usage.plan.scansPerMonth === 0) {
      return Response.json(
        { error: "Reading a receipt needs your own AI key (free to add in Settings → AI key) or a paid plan. You can still type the total.", code: "ai_key_required" },
        { status: 402 },
      );
    }
    if (usage.scansLeft <= 0) {
      return Response.json(
        {
          error: `You've used all ${usage.plan.scansPerMonth} scans of your ${usage.plan.name} plan this month (they come back on ${formatResetDate(usage.resetsAt)}). You can still type the total.`,
          code: "quota_exceeded",
        },
        { status: 402 },
      );
    }
  }

  let body: { data?: unknown; mediaType?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }
  const data = typeof body.data === "string" ? body.data.replace(/^data:[^;]+;base64,/, "") : "";
  if (!data) return jsonError("No photo was sent.", 400);
  if (!IMAGE_TYPES.includes(body.mediaType as (typeof IMAGE_TYPES)[number])) {
    return jsonError("Please use a JPG, PNG or WebP photo.", 400);
  }
  if (Math.floor((data.length * 3) / 4) > MAX_IMAGE_BYTES) return jsonError("This photo is too large. The limit is 5MB.", 413);

  try {
    const response = await (ownKey ? new Anthropic({ apiKey: ownKey }) : new Anthropic()).messages.parse({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.mediaType as (typeof IMAGE_TYPES)[number], data } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(Schema) },
    });
    const read = response.parsed_output;
    const succeeded = response.stop_reason !== "refusal" && !!read;

    // Paid for either way, so recorded either way (counts as one scan of the plan).
    const row = {
      model: MODEL,
      pages: 1,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      succeeded,
    };
    let { error: recError } = await asUser.from("invoice_scans").insert({ ...row, own_key: ownKey !== null });
    if (recError?.code === "42703") ({ error: recError } = await asUser.from("invoice_scans").insert(row));
    if (recError) console.error("read-daily-sales: couldn't record the reading", recError.message);

    if (!succeeded || !read || read.total_sales === null) {
      return jsonError("We couldn't find the day's total on this photo. Please try a clearer photo, or type it.", 422);
    }
    const date = read.report_date && /^\d{4}-\d{2}-\d{2}$/.test(read.report_date) ? read.report_date : null;
    return Response.json({
      date,
      total: Math.round(read.total_sales * 100) / 100,
      tickets: read.tickets !== null && read.tickets >= 0 ? Math.round(read.tickets) : null,
      label: read.total_label,
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return jsonError("Sabai is busy right now. Please try again in a minute.", 429);
    if (error instanceof Anthropic.BadRequestError) return jsonError("We couldn't read this file. Please try another photo.", 400);
    if (error instanceof Anthropic.AuthenticationError) {
      if (ownKey) {
        return Response.json(
          { error: "Anthropic refused your AI key. Please save a new one in Settings → AI key.", code: "ai_key_invalid" },
          { status: 402 },
        );
      }
      console.error("read-daily-sales: invalid ANTHROPIC_API_KEY");
      return jsonError("Receipt reading is not configured correctly.", 500);
    }
    if (ownKey && error instanceof Anthropic.PermissionDeniedError) {
      return Response.json(
        { error: "Your AI account can't read receipts right now. Check your Anthropic credit in your provider account.", code: "ai_key_invalid" },
        { status: 402 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`read-daily-sales: API error ${error.status}`, error.message);
      return jsonError("Receipt reading is temporarily unavailable. Please try again.", 502);
    }
    throw error;
  }
}
