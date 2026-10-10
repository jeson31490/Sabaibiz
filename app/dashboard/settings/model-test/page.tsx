"use client";

import { useState, type ChangeEvent } from "react";
import SettingsShell from "../../../components/SettingsShell";
import { MAX_INVOICE_PAGES } from "../../../../lib/scanInvoice";
import { supabase } from "../../../../lib/supabase";
import type { ScanResult } from "../../../api/scan-invoice/route";

// Same shrink as the scan page: Claude accepts images up to 5MB, phone photos are often bigger.
const MAX_IMAGE_EDGE = 1568;
// Rough exchange rate, only to show costs in baht.
const USD_THB = 33;

// Prices in USD per million tokens (platform.claude.com/docs/en/about-claude/pricing).
const MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", note: "used today", inPrice: 3, outPrice: 15 },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", note: "", inPrice: 2, outPrice: 10 },
  { id: "claude-haiku-5-5", label: "Haiku 5.5", note: "", inPrice: 0.1, outPrice: 0.5 },
] as const;
type Model = (typeof MODELS)[number];
type ModelId = Model["id"];

type Outcome =
  | { status: "ok"; result: ScanResult; seconds: number; inputTokens: number | null; outputTokens: number | null }
  | { status: "error"; message: string; seconds: number };

const baht = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 3 : 2 })} ฿`;
const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function readWith(model: ModelId, pages: string[], token: string): Promise<Outcome> {
  const started = performance.now();
  const elapsed = () => (performance.now() - started) / 1000;
  try {
    const res = await fetch("/api/scan-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ model, pages: pages.map((data) => ({ data, mediaType: "image/jpeg" })) }),
    });
    const body = await res.json().catch(() => null);
    const seconds = elapsed();
    if (!res.ok) {
      const message = [body?.error, body?.detail].filter(Boolean).join(" — ") || `HTTP ${res.status}`;
      return { status: "error", message, seconds };
    }
    const result = body as ScanResult;
    // The route records every reading with its tokens in invoice_scans; read them back to price it.
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    if (result.scan_id) {
      const { data } = await supabase
        .from("invoice_scans")
        .select("input_tokens, output_tokens")
        .eq("id", result.scan_id)
        .maybeSingle();
      if (data) {
        inputTokens = data.input_tokens;
        outputTokens = data.output_tokens;
      }
    }
    return { status: "ok", result, seconds, inputTokens, outputTokens };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", seconds: elapsed() };
  }
}

function costBaht(model: Model, o: Outcome): number | null {
  if (o.status !== "ok" || o.inputTokens === null || o.outputTokens === null) return null;
  return ((o.inputTokens * model.inPrice + o.outputTokens * model.outPrice) / 1_000_000) * USD_THB;
}

const sumOfLines = (r: ScanResult) => r.products.reduce((s, p) => s + p.quantity * p.unit_price, 0);

/** How many lines have the same quantity and unit price as a line of the baseline reading (names are translated, so they differ). */
function matchingLines(r: ScanResult, baseline: ScanResult): number {
  const pool = new Map<string, number>();
  for (const p of baseline.products) {
    const k = `${p.quantity}|${p.unit_price}`;
    pool.set(k, (pool.get(k) ?? 0) + 1);
  }
  let n = 0;
  for (const p of r.products) {
    const k = `${p.quantity}|${p.unit_price}`;
    const left = pool.get(k) ?? 0;
    if (left > 0) {
      pool.set(k, left - 1);
      n += 1;
    }
  }
  return n;
}

function Row({ label, value, differs }: { label: string; value: string; differs?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-teal-900/60">{label}</dt>
      <dd className={`text-right font-medium ${differs ? "rounded bg-amber-100 px-1.5 text-amber-900" : "text-teal-950"}`}>{value}</dd>
    </div>
  );
}

function ResultCard({ model, outcome, baseline }: { model: Model; outcome: Outcome | undefined; baseline: ScanResult | null }) {
  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-teal-950">
        {model.label}
        {model.note ? <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 align-middle text-xs font-semibold text-teal-800">{model.note}</span> : null}
      </h2>
      <p className="text-xs text-teal-900/60">
        ${model.inPrice} in / ${model.outPrice} out per million tokens
      </p>

      {!outcome ? (
        <p className="mt-4 text-sm text-teal-900/60">Waiting…</p>
      ) : outcome.status === "error" ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          Failed after {outcome.seconds.toFixed(1)} s: {outcome.message}
        </p>
      ) : (
        (() => {
          const r = outcome.result;
          const cost = costBaht(model, outcome);
          const same = (a: string | number | null | undefined, b: string | number | null | undefined) => baseline === null || norm(String(a ?? "")) === norm(String(b ?? ""));
          return (
            <>
              <dl className="mt-3 divide-y divide-teal-50">
                <Row label="Supplier" value={r.supplier_name ?? "—"} differs={!same(r.supplier_name, baseline?.supplier_name)} />
                <Row label="Invoice number" value={r.invoice_number ?? "—"} differs={!same(r.invoice_number, baseline?.invoice_number)} />
                <Row label="Date" value={r.invoice_date ?? "—"} differs={!same(r.invoice_date, baseline?.invoice_date)} />
                <Row label="Total" value={r.invoice_total === null ? "—" : `${num(r.invoice_total)} ฿`} differs={!same(r.invoice_total, baseline?.invoice_total)} />
                <Row label="Lines read" value={String(r.products.length)} differs={baseline !== null && r.products.length !== baseline.products.length} />
                <Row label="Sum of lines" value={`${num(sumOfLines(r))} ฿`} />
                {baseline ? <Row label="Same qty and price as Sonnet 4.6" value={`${matchingLines(r, baseline)} of ${baseline.products.length}`} /> : null}
              </dl>

              <dl className="mt-3 rounded-xl bg-teal-50/70 p-3">
                <Row label="Time" value={`${outcome.seconds.toFixed(1)} s`} />
                <Row label="Tokens in / out" value={outcome.inputTokens === null ? "—" : `${num(outcome.inputTokens)} / ${num(outcome.outputTokens ?? 0)}`} />
                <Row label="Cost of this reading" value={cost === null ? "—" : `≈ ${baht(cost)}`} />
              </dl>

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium text-teal-700">Show the {r.products.length} lines</summary>
                <ul className="mt-2 space-y-1.5">
                  {r.products.map((p, i) => (
                    <li key={`${p.name}-${i}`} className="flex justify-between gap-3">
                      <span className="text-teal-950">{p.name}</span>
                      <span className="whitespace-nowrap text-teal-900/70">
                        {num(p.quantity)} {p.unit} × {num(p.unit_price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          );
        })()
      )}
    </section>
  );
}

export default function ModelTestPage() {
  const [pages, setPages] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [running, setRunning] = useState(false);
  const [outcomes, setOutcomes] = useState<Partial<Record<ModelId, Outcome>>>({});
  const [error, setError] = useState<string | null>(null);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_INVOICE_PAGES);
    e.target.value = "";
    if (files.length === 0) return;
    setPreparing(true);
    setError(null);
    setOutcomes({});
    try {
      setPages(await Promise.all(files.map(shrinkImage)));
    } catch {
      setError("Couldn't open one of the photos. Please use JPG or PNG images.");
      setPages([]);
    } finally {
      setPreparing(false);
    }
  }

  async function run() {
    if (pages.length === 0 || running) return;
    setRunning(true);
    setError(null);
    setOutcomes({});
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    // The three readings run at the same time; each card fills in as soon as its model answers.
    await Promise.all(
      MODELS.map(async (m) => {
        const outcome = await readWith(m.id, pages, token);
        setOutcomes((prev) => ({ ...prev, [m.id]: outcome }));
      }),
    );
    setRunning(false);
  }

  const baselineOutcome = outcomes[MODELS[0].id];
  const baseline = baselineOutcome?.status === "ok" ? baselineOutcome.result : null;
  const costs = MODELS.map((m) => {
    const o = outcomes[m.id];
    return o ? costBaht(m, o) : null;
  });
  const allPriced = costs.every((c) => c !== null);

  return (
    <SettingsShell title="Reading model test" maxWidth="max-w-6xl" ownerOnly>
      <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-teal-900/80">
          Photograph one invoice (up to {MAX_INVOICE_PAGES} pages). The same photos are read by three models, so you can compare what each one
          reads and what it costs. Differences from the model used today are highlighted. Each test counts as 3 scans in your scan history.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100">
            {pages.length > 0 ? "Choose other photos" : "Choose invoice photos"}
            <input type="file" accept="image/jpeg,image/png" multiple className="sr-only" onChange={onFiles} disabled={preparing || running} />
          </label>
          <button
            type="button"
            onClick={run}
            disabled={pages.length === 0 || preparing || running}
            className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Reading…" : "Read with the 3 models"}
          </button>
          <span className="text-sm text-teal-900/60">
            {preparing ? "Preparing photos…" : pages.length > 0 ? `${pages.length} ${pages.length === 1 ? "page" : "pages"} ready` : "No photo yet"}
          </span>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      {allPriced ? (
        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Cost of this invoice: {MODELS.map((m, i) => `${m.label} ≈ ${baht(costs[i]!)}`).join("  ·  ")}
          {costs[0]! > 0 && costs[2]! > 0 ? `  ·  Haiku is about ${Math.round(costs[0]! / costs[2]!)}× cheaper than today's model.` : ""}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {MODELS.map((m) => (
          <ResultCard key={m.id} model={m} outcome={outcomes[m.id]} baseline={m.id === MODELS[0].id ? null : baseline} />
        ))}
      </div>

      <p className="mt-6 text-xs text-teal-900/60">
        Costs use the published token prices and about {USD_THB} ฿ per dollar. Run it on 5 to 10 different invoices (Makro, a market receipt, a
        handwritten one) before choosing a model.
      </p>
    </SettingsShell>
  );
}
