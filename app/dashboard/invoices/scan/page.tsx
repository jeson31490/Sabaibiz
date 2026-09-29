"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import DashboardNavbar from "../../../components/DashboardNavbar";
import {
  bangkokToday,
  DuplicateInvoiceError,
  fetchSupplierNames,
  findSavedInvoice,
  fromIsoDate,
  invoiceDateWarning,
  isIsoDate,
  saveInvoice,
  SimilarInvoiceError,
} from "../../../../lib/invoices";
import { CATEGORY_LABELS, MAX_INVOICE_PAGES } from "../../../../lib/scanInvoice";
import { supabase } from "../../../../lib/supabase";
import type { ScanResult } from "../../../api/scan-invoice/route";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
// Longest edge sent to Claude; larger photos would be downscaled by the API anyway.
const MAX_IMAGE_EDGE = 1568;

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

// "collecting": pages are being added, nothing has been read yet.
type Phase = "collecting" | "processing" | "done" | "error";

type InvoicePage = {
  id: string;
  name: string;
  mediaType: "image/jpeg" | "application/pdf";
  /** Shrunk JPEG or the original PDF, as a data URL. */
  dataUrl: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "1 bottle = 400 ml", "1 pcs ≈ 300 g (estimated)", or "Size unknown" (set later in Ingredients). */
function sizeLabel(p: ScanResult["products"][number]): string {
  if (!p.content_amount || !p.content_unit) return "Size unknown: set it later in Ingredients";
  const amount = p.content_amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p.content_source === "standard") return `per ${p.unit}`;
  return p.content_source === "estimated"
    ? `1 ${p.unit} ≈ ${amount} ${p.content_unit} (estimated)`
    : `1 ${p.unit} = ${amount} ${p.content_unit}`;
}

// Phone photos are often 5-10MB, above Claude's 5MB image limit: shrink to a JPEG data URL.
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function toInvoicePage(file: File): Promise<InvoicePage> {
  const isPdf = file.type === "application/pdf";
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mediaType: isPdf ? "application/pdf" : "image/jpeg",
    dataUrl: isPdf ? await readAsDataUrl(file) : await shrinkImage(file),
  };
}

async function scanInvoice(pages: InvoicePage[], signal: AbortSignal): Promise<ScanResult> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/scan-invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ pages: pages.map((p) => ({ data: p.dataUrl, mediaType: p.mediaType })) }),
    signal,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Something went wrong while reading your invoice.");
  return body as ScanResult;
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder = "Not found, please type it",
  suggestions,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Offered as the owner types (browser autocomplete); any other value can still be typed. */
  suggestions?: string[];
  hint?: string | null;
}) {
  const listId = suggestions ? `${id}-suggestions` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block font-medium text-teal-900/60">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1 w-full rounded-lg border border-teal-200 px-3 py-2 font-semibold text-teal-950 placeholder:font-normal placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs font-medium text-gold-800">
          {hint}
        </p>
      )}
    </div>
  );
}

function InvoiceDateField({
  value,
  onChange,
  missing,
}: {
  value: string;
  onChange: (v: string) => void;
  /** No date was printed on the invoice: the owner must type it. */
  missing: boolean;
}) {
  const warning = invoiceDateWarning(value);
  return (
    <div className="mt-6 max-w-xs">
      <label htmlFor="invoice-date" className="block text-sm font-semibold text-teal-950">
        Invoice date
      </label>
      <p
        id="invoice-date-hint"
        className={`mt-0.5 text-xs ${missing || warning ? "font-medium text-gold-800" : "text-gray-500"}`}
      >
        {missing
          ? "No date on this invoice — please enter it"
          : (warning ?? "The date printed on the invoice. You can correct it here.")}
      </p>
      <input
        id="invoice-date"
        type="date"
        autoComplete="off"
        value={value}
        max={bangkokToday()}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="invoice-date-hint"
        suppressHydrationWarning
        className="mt-2 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      />
    </div>
  );
}

function PageThumbnail({
  page,
  number,
  onRemove,
}: {
  page: InvoicePage;
  number: number;
  onRemove?: () => void;
}) {
  return (
    <li className="relative aspect-[3/4] overflow-hidden rounded-xl border border-teal-100 bg-teal-50">
      {page.mediaType === "image/jpeg" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.dataUrl} alt={`Page ${number} of your invoice`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-teal-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10" aria-hidden>
            <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
            <path d="M14 3v4h4M9 12h6M9 16h6" />
          </svg>
          <p className="w-full truncate text-center text-xs font-medium">{page.name}</p>
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-teal-950/80 px-2 py-0.5 text-xs font-semibold text-white">
        Page {number}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove page ${number}`}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-teal-950 shadow transition hover:bg-red-50 hover:text-red-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </li>
  );
}

export default function ScanInvoicePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<AbortController | null>(null);
  const [pages, setPages] = useState<InvoicePage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [phase, setPhase] = useState<Phase>("collecting");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The official invoice date (not the scan date), from the reading; empty until then, editable.
  const [invoiceDate, setInvoiceDate] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ScanResult | null>(null);
  // Editable, so the owner can fix anything Sabai misread.
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  // Typed by the owner only when Sabai couldn't find the total line.
  const [manualTotal, setManualTotal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Set when this supplier + number is already saved: shown right after reading, before any typing.
  const [alreadySaved, setAlreadySaved] = useState<string | null>(null);
  // Existing suppliers, suggested in the Supplier field (e.g. "Fruit market" for receipts with no name).
  const [supplierNames, setSupplierNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchSupplierNames()
      .then((names) => !cancelled && setSupplierNames(names))
      .catch(() => {}); // suggestions are a convenience: typing still works without them
    return () => {
      cancelled = true;
    };
  }, []);

  const products = extracted?.products ?? [];
  // The total printed on the invoice (after VAT and discounts), never the sum of the lines.
  const totalFound = extracted?.invoice_total != null;
  const total = totalFound ? extracted!.invoice_total! : manualTotal.trim() === "" ? null : Number(manualTotal);
  const totalValid = total !== null && Number.isFinite(total) && total >= 0;
  // The invoice number is optional: small suppliers often only stamp their receipts.
  const canSave =
    phase === "done" && !saving && supplier.trim() !== "" && isIsoDate(invoiceDate) && products.length > 0 && totalValid;
  // "A similar invoice already exists" for what is on screen now; editing supplier, date or total hides it.
  const similarKey = `${supplier.trim().toLowerCase()}|${invoiceDate}|${total}|${invoiceNumber.trim()}`;
  const [similar, setSimilar] = useState<{ key: string; message: string } | null>(null);
  const similarWarning = similar?.key === similarKey ? similar.message : null;
  const canEditPages = phase !== "processing" && !saving;
  const canAddPage = canEditPages && !preparing && pages.length < MAX_INVOICE_PAGES;

  // Any change to the pages makes an earlier reading out of date.
  function clearReading() {
    scanRef.current?.abort();
    setPhase("collecting");
    setScanError(null);
    setSaveError(null);
    setAlreadySaved(null);
    setExtracted(null);
    setManualTotal("");
  }

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    const room = MAX_INVOICE_PAGES - pages.length;
    if (room <= 0) {
      setError(`An invoice can have up to ${MAX_INVOICE_PAGES} pages.`);
      return;
    }
    if (files.some((f) => !ACCEPTED_TYPES.includes(f.type))) {
      setError("This file type isn't supported. Please choose a JPG, PNG or PDF.");
      return;
    }
    if (files.some((f) => f.size > MAX_BYTES)) {
      setError("A file is larger than 10MB. Please choose a smaller one.");
      return;
    }
    setError(files.length > room ? `Only the first ${plural(room, "file")} were added: an invoice can have up to ${MAX_INVOICE_PAGES} pages.` : null);

    setPreparing(true);
    try {
      const added = await Promise.all(files.slice(0, room).map(toInvoicePage));
      setPages((prev) => [...prev, ...added].slice(0, MAX_INVOICE_PAGES));
      clearReading();
    } catch {
      setError("We couldn't open one of these files. Please try another photo.");
    } finally {
      setPreparing(false);
    }
  }

  function removePage(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setError(null);
    clearReading();
  }

  async function read() {
    if (pages.length === 0) return;
    scanRef.current?.abort();
    const controller = new AbortController();
    scanRef.current = controller;
    setPhase("processing");
    setScanError(null);
    setSaveError(null);
    setExtracted(null);
    setManualTotal("");
    try {
      const result = await scanInvoice(pages, controller.signal);
      if (controller.signal.aborted) return;
      // DEBUG: the page shows result.invoice_total as the total; the line sum is only for comparison.
      console.log("[scan-invoice] API result", result);
      console.log("[scan-invoice] total shown:", result.invoice_total, `(from "${result.invoice_total_label}")`, "| sum of products:",
        Math.round(result.products.reduce((s, p) => s + p.quantity * p.unit_price, 0) * 100) / 100);
      setExtracted(result);
      setSupplier(result.supplier_name ?? "");
      setInvoiceNumber(result.invoice_number ?? "");
      // Never today by default: with no date printed, the owner types it (see InvoiceDateField).
      setInvoiceDate(isIsoDate(result.invoice_date) ? result.invoice_date : "");
      setPhase("done");
      // Warn now rather than after the owner has checked every line. Saving checks again anyway.
      findSavedInvoice(result.supplier_name ?? "", result.invoice_number ?? "")
        .then((saved) => {
          if (!saved || controller.signal.aborted) return;
          const date = fromIsoDate(saved.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
          setAlreadySaved(`This invoice is already saved (${result.supplier_name}, n° ${result.invoice_number}, dated ${date}). You don't need to save it again.`);
        })
        .catch(() => {});
    } catch (e) {
      if (controller.signal.aborted) return;
      setScanError(e instanceof Error ? e.message : "Something went wrong while reading your invoice.");
      setPhase("error");
    }
  }

  async function confirmAndSave(allowSimilar = false) {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    setSimilar(null);
    try {
      await saveInvoice(
        {
          supplier: supplier.trim(),
          number: invoiceNumber.trim(),
          date: invoiceDate,
          total: total!,
          items: products.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            unit: p.unit,
            unitPrice: p.unit_price,
            content_amount: p.content_amount,
            content_unit: p.content_unit,
            content_source: p.content_source,
            category: p.category,
          })),
          scanId: extracted?.scan_id ?? null,
          supplierLegalName: extracted?.supplier_legal_name ?? null,
          supplierTaxId: extracted?.supplier_tax_id ?? null,
        },
        { allowSimilar },
      );
      router.push("/dashboard/invoices");
    } catch (e) {
      if (e instanceof SimilarInvoiceError) setSimilar({ key: similarKey, message: e.message });
      else setSaveError(e instanceof DuplicateInvoiceError ? e.message : "We couldn't save this invoice. Please try again.");
      setSaving(false);
    }
  }

  function reset() {
    clearReading();
    setPages([]);
    setError(null);
    setSupplier("");
    setInvoiceNumber("");
  }

  function onDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    if (canAddPage) setDragOver(true);
  }
  function onDragLeave(e: DragEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
  }
  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragOver(false);
    if (canAddPage) addFiles(Array.from(e.dataTransfer.files));
  }
  const dropHandlers = { onDragOver, onDragEnter: onDragOver, onDragLeave, onDrop };

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/dashboard/invoices"
          aria-label="Back to My Invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
          Scan a new invoice
        </h1>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = ""; // so the same file can be chosen again
          }}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />

        {pages.length === 0 ? (
          <>
            <div
              {...dropHandlers}
              className={`mt-8 flex min-h-[420px] flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragOver
                  ? "border-teal-600 bg-teal-100/70"
                  : "border-teal-300 bg-white"
              }`}
            >
              {/*
                The source JPG is mostly white margin. It is drawn 3x larger than before
                (576px tall) and cropped to the character, so the zone doesn't grow
                by 3x of empty space.
              */}
              <div className="relative h-[290px] w-[260px] max-w-full overflow-hidden">
                <Image
                  src="/Thai%20men%20receip.jpg"
                  alt="Mascot ready to photograph your invoice"
                  width={407}
                  height={576}
                  sizes="407px"
                  className="absolute -left-[70px] -top-[95px] max-w-none"
                  priority
                />
              </div>
              <p className="mt-6 text-xl font-semibold text-teal-950">
                {dragOver ? "Drop it here" : "Drag and drop your invoice here"}
              </p>
              <p className="mt-2 text-sm text-teal-900/60">or</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={preparing}
                className="mt-4 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:opacity-60"
              >
                {preparing ? "Opening…" : "Choose a photo"}
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-4 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}
            <p className="mt-4 text-center text-xs text-gray-500">
              Accepted formats: JPG, PNG, PDF. Max size: 10MB. Up to {MAX_INVOICE_PAGES} pages per invoice.
            </p>
          </>
        ) : (
          <>
            <div className="mt-8 grid items-start gap-6 md:grid-cols-2">
              {/* Pages */}
              <section
                aria-label="Your invoice pages"
                {...dropHandlers}
                className={`rounded-2xl border bg-white p-4 shadow-card transition ${
                  dragOver ? "border-teal-600 bg-teal-50" : "border-teal-100"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-teal-950">Your invoice</h2>
                  <p className="text-sm text-teal-900/60">
                    {pages.length} of {MAX_INVOICE_PAGES} pages
                  </p>
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {pages.map((p, i) => (
                    <PageThumbnail
                      key={p.id}
                      page={p}
                      number={i + 1}
                      onRemove={canEditPages ? () => removePage(p.id) : undefined}
                    />
                  ))}
                  {preparing && (
                    <li className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-teal-200 text-sm text-teal-700">
                      Opening…
                    </li>
                  )}
                </ul>

                {canAddPage && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300 px-4 py-3 font-semibold text-teal-700 transition hover:border-teal-600 hover:bg-teal-50"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-5 w-5" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add another page
                  </button>
                )}
                {error && (
                  <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}
              </section>

              {/* Read / processing / result */}
              {phase === "collecting" ? (
                <section className="flex flex-col items-center justify-center rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-card">
                  <h2 className="text-lg font-semibold text-teal-950">Is that the whole invoice?</h2>
                  <p className="mt-2 max-w-xs text-sm text-teal-900/70">
                    If your invoice has more than one page, add every page first. Sabai will read them together as
                    one invoice.
                  </p>
                  <button
                    type="button"
                    onClick={read}
                    disabled={preparing}
                    className="mt-6 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Read invoice
                  </button>
                  <p className="mt-3 text-xs text-gray-500">{plural(pages.length, "page")}</p>
                </section>
              ) : phase === "processing" ? (
                <section
                  role="status"
                  aria-live="polite"
                  className="flex flex-col items-center justify-center rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-card"
                >
                  <div className="relative h-44 w-56 max-w-full motion-safe:animate-pulse">
                    <Image
                      src="/Sabai%20Read%20It.png"
                      alt="Mascot reading your invoice"
                      fill
                      sizes="224px"
                      className="object-contain"
                    />
                  </div>
                  <p className="mt-6 text-lg font-semibold text-teal-950">Processing…</p>
                  <p className="mt-1 text-sm text-teal-900/70">
                    Sabai is reading your invoice{pages.length > 1 ? ` (${plural(pages.length, "page")})` : ""}...
                  </p>
                  <div className="mt-4 flex gap-1.5" aria-hidden>
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-2.5 w-2.5 rounded-full bg-teal-600 motion-safe:animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </section>
              ) : phase === "error" ? (
                <section
                  role="alert"
                  className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
                >
                  <p className="text-lg font-semibold text-red-700">Sabai couldn&apos;t read this invoice</p>
                  <p className="mt-2 text-sm text-red-900">{scanError}</p>
                  <button
                    type="button"
                    onClick={read}
                    className="mt-6 rounded-full border-2 border-teal-700 px-6 py-2.5 font-semibold text-teal-700 transition hover:bg-teal-700 hover:text-white"
                  >
                    Try again
                  </button>
                </section>
              ) : (
                <section aria-label="Extracted data" className="rounded-2xl border-2 border-teal-600 bg-white p-6 shadow-card">
                  <h2 className="text-lg font-semibold text-teal-950">Extracted data</h2>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <TextField
                      id="supplier"
                      label="Supplier"
                      value={supplier}
                      onChange={(v) => { setSupplier(v); setAlreadySaved(null); }}
                      placeholder="Pick or type a supplier"
                      suggestions={supplierNames}
                      hint={
                        extracted && !extracted.supplier_name && supplier.trim() === ""
                          ? "No supplier name on this invoice — pick one or type a name"
                          : null
                      }
                    />
                    <TextField
                      id="invoice-number"
                      label="Invoice number (optional)"
                      value={invoiceNumber}
                      onChange={(v) => { setInvoiceNumber(v); setAlreadySaved(null); }}
                      placeholder="No number? Leave empty"
                    />
                  </div>
                  {alreadySaved && (
                    <p role="alert" className="mt-4 rounded-xl bg-gold-50 p-4 text-sm font-medium text-gold-800">
                      {alreadySaved}
                    </p>
                  )}

                  {products.length === 0 ? (
                    <p className="mt-6 rounded-xl bg-gold-50 p-4 text-sm text-gold-800">
                      No products were found on this invoice. Try a clearer photo of the whole invoice.
                    </p>
                  ) : (
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-teal-100 text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                            <th className="py-2 pr-2">Product</th>
                            <th className="py-2 pr-2 text-right">Qty</th>
                            <th className="py-2 pr-2">Unit</th>
                            <th className="py-2 text-right">Unit price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-teal-100">
                          {products.map((p, i) => (
                            <tr key={i}>
                              <td className="py-2.5 pr-2 font-medium text-teal-950">
                                {p.name}
                                <span className="block text-xs font-normal text-teal-900/55">{p.category ? CATEGORY_LABELS[p.category] : "Category unknown: needs review"} · {sizeLabel(p)}</span>
                              </td>
                              <td className="py-2.5 pr-2 text-right tabular-nums text-teal-900/75">{fmt(p.quantity)}</td>
                              <td className="py-2.5 pr-2 text-teal-900/75">{p.unit}</td>
                              <td className="py-2.5 text-right tabular-nums text-teal-950">{fmt(p.unit_price)} ฿</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* All three amounts are read from the invoice, never calculated. */}
                  <dl className="mt-4 space-y-2 border-t border-teal-100 pt-4 text-sm">
                    {[
                      { label: "Subtotal (excl. VAT)", value: extracted?.subtotal_excl_vat },
                      { label: "VAT (7%)", value: extracted?.vat_amount },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="font-medium text-teal-900/70">{label}</dt>
                        <dd className="tabular-nums text-teal-950">
                          {value != null ? `${fmt(value)} ฿` : <span className="text-gray-400">Not on invoice</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {totalFound ? (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-teal-900/70">Total (incl. VAT)</span>
                      <span className="text-2xl font-bold tabular-nums text-teal-950">{fmt(total!)} ฿</span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex items-center justify-between gap-4">
                        <label htmlFor="invoice-total" className="text-sm font-medium text-teal-900/70">
                          Total (incl. VAT)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="invoice-total"
                            type="number"
                            autoComplete="off"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={manualTotal}
                            onChange={(e) => setManualTotal(e.target.value)}
                            aria-describedby="invoice-total-hint"
                            className="w-36 rounded-lg border border-teal-200 px-3 py-2 text-right text-lg font-bold tabular-nums text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                          />
                          <span className="text-lg font-bold text-teal-950">฿</span>
                        </div>
                      </div>
                      <p id="invoice-total-hint" className="mt-2 text-xs text-gold-800">
                        Sabai couldn&apos;t find the total on this invoice. Please type the final amount you paid.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </div>

            <InvoiceDateField value={invoiceDate} onChange={setInvoiceDate} missing={phase === "done" && invoiceDate === ""} />

            {saveError && (
              <p role="alert" className="mt-6 text-sm font-medium text-red-600">
                {saveError}
              </p>
            )}
            {similarWarning && (
              <div role="alert" className="mt-6 rounded-xl bg-gold-50 p-4 text-sm text-gold-800">
                <p className="font-medium">{similarWarning}</p>
                <p className="mt-1">Two identical purchases on the same day are possible. Save it only if this is a different purchase.</p>
                <button
                  type="button"
                  onClick={() => confirmAndSave(true)}
                  disabled={saving}
                  className="mt-3 rounded-full border border-gold-500 px-5 py-2 text-sm font-semibold text-gold-800 transition hover:bg-gold-100 disabled:opacity-60"
                >
                  Save anyway
                </button>
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {phase === "done" && (
                <button
                  type="button"
                  onClick={() => confirmAndSave()}
                  disabled={!canSave}
                  className="rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gold-500"
                >
                  {saving ? "Saving…" : "Confirm and save"}
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="rounded-full border-2 border-teal-700 px-8 py-3.5 text-lg font-semibold text-teal-700 transition hover:bg-teal-700 hover:text-white disabled:opacity-50"
              >
                {phase === "done" ? "Scan another invoice" : "Start over"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
