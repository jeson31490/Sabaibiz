import Anthropic from "@anthropic-ai/sdk";
import { buildInvoiceContent, readInvoice, readingCost, type PageInput, type ReadInvoice } from "../../../../lib/invoiceReader";
import { MAX_INVOICE_PAGES } from "../../../../lib/scanInvoice";
import { supabase } from "../../../../lib/supabase";

// Reads one invoice with several models side by side, to compare quality, cost and speed.
// Hidden: only for the emails in ADMIN_EMAILS (comma-separated, server-only). Nothing is saved:
// no invoice, and no line in invoice_scans.

// Three readings run in parallel; the slowest decides.
export const maxDuration = 120;

const COMPARED_MODELS = ["claude-sonnet-4-6", "claude-sonnet-5", "claude-haiku-4-5"] as const;

export type ModelReading = {
  model: string;
  ok: boolean;
  error: string | null;
  ms: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  invoice: ReadInvoice | null;
};

const client = new Anthropic();

function isAdmin(email: string | undefined): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

async function readWith(model: string, content: Anthropic.ContentBlockParam[]): Promise<ModelReading> {
  const started = Date.now();
  try {
    const reading = await readInvoice(client, model, content);
    return {
      model,
      ok: !!reading.invoice,
      error: reading.invoice ? null : `No answer (stop reason: ${reading.stopReason ?? "unknown"})`,
      ms: Date.now() - started,
      inputTokens: reading.usage.input_tokens,
      outputTokens: reading.usage.output_tokens,
      costUsd: readingCost(model, reading.usage),
      invoice: reading.invoice,
    };
  } catch (err) {
    const message = err instanceof Anthropic.APIError ? `API error ${err.status}: ${err.message}` : err instanceof Error ? err.message : "Failed";
    return { model, ok: false, error: message, ms: Date.now() - started, inputTokens: null, outputTokens: null, costUsd: null, invoice: null };
  }
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  // Anyone else gets a plain "not found": the page doesn't exist for them.
  if (!auth.user || !isAdmin(auth.user.email)) return new Response("Not found", { status: 404 });

  let body: { pages?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be JSON." }, { status: 400 });
  }
  const pages = Array.isArray(body.pages) ? (body.pages as PageInput[]) : [];
  if (pages.length === 0 || pages.length > MAX_INVOICE_PAGES) {
    return Response.json({ error: `Send 1 to ${MAX_INVOICE_PAGES} pages.` }, { status: 400 });
  }
  const built = buildInvoiceContent(pages);
  if ("error" in built) return Response.json({ error: built.error }, { status: built.status });

  const readings = await Promise.all(COMPARED_MODELS.map((m) => readWith(m, built.content)));
  return Response.json({ pages: pages.length, readings });
}

/** Lets the page find out, without spending anything, whether this account may use it. */
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  return auth.user && isAdmin(auth.user.email) ? Response.json({ ok: true }) : new Response("Not found", { status: 404 });
}
