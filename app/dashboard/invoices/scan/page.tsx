"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent } from "react";
import DashboardNavbar from "../../../components/DashboardNavbar";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const PROCESSING_MS = 2000;

// Placeholder result until the invoice is actually read by the Claude API.
const EXTRACTED = {
  supplier: "Makro Samui",
  date: "26 Sep 2026",
  products: [
    { name: "Chicken breast", quantity: "10 kg", unitPrice: 147 },
    { name: "Jasmine rice", quantity: "25 kg", unitPrice: 36 },
    { name: "Cooking oil", quantity: "6 litre", unitPrice: 61 },
    { name: "Fresh lime", quantity: "4 kg", unitPrice: 55 },
  ],
};
const parseQty = (q: string) => Number(q.split(" ")[0]);
const EXTRACTED_TOTAL = EXTRACTED.products.reduce((s, p) => s + parseQty(p.quantity) * p.unitPrice, 0);
const fmt = (n: number) => n.toLocaleString("en-US");

type Phase = "idle" | "processing" | "done";

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function InvoiceDateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-6 max-w-xs">
      <label htmlFor="invoice-date" className="block text-sm font-semibold text-teal-950">
        Invoice date
      </label>
      <p id="invoice-date-hint" className="mt-0.5 text-xs text-gray-500">
        You can change this if you&apos;re scanning a past invoice.
      </p>
      <input
        id="invoice-date"
        type="date"
        value={value}
        max={toIso(new Date())}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="invoice-date-hint"
        suppressHydrationWarning
        className="mt-2 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      />
    </div>
  );
}

export default function ScanInvoicePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The official invoice date (not the scan date); defaults to today, editable.
  const [invoiceDate, setInvoiceDate] = useState(() => toIso(new Date()));

  // Simulated reading step.
  useEffect(() => {
    if (phase !== "processing") return;
    const t = setTimeout(() => setPhase("done"), PROCESSING_MS);
    return () => clearTimeout(t);
  }, [phase]);

  function accept(f: File | undefined) {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("This file type isn't supported. Please choose a JPG, PNG or PDF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("This file is larger than 10MB. Please choose a smaller one.");
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl(null);
    if (f.type !== "application/pdf") {
      // Data URL rather than an object URL, so there is nothing to revoke.
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(f);
    }
    setPhase("processing");
  }

  function reset() {
    setFile(null);
    setPhase("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    accept(e.dataTransfer.files[0]);
  }

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
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => accept(e.target.files?.[0])}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />

        {!file ? (
          <>
            <div
              onDragOver={onDragOver}
              onDragEnter={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
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
                className="mt-4 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
              >
                Choose a photo
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-4 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}
            <p className="mt-4 text-center text-xs text-gray-500">
              Accepted formats: JPG, PNG, PDF. Max size: 10MB.
            </p>
            <InvoiceDateField value={invoiceDate} onChange={setInvoiceDate} />
          </>
        ) : (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {/* Preview */}
              <section aria-label="Your invoice" className="rounded-2xl border border-teal-100 bg-white p-4 shadow-card">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview of your invoice"
                    className="max-h-[520px] w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl bg-teal-50 text-teal-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-14 w-14" aria-hidden>
                      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
                      <path d="M14 3v4h4M9 12h6M9 16h6" />
                    </svg>
                    <p className="text-sm font-medium">PDF document</p>
                  </div>
                )}
                <p className="mt-3 truncate text-center text-sm text-teal-900/70">{file.name}</p>
              </section>

              {/* Processing / result */}
              {phase === "processing" ? (
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
                  <p className="mt-1 text-sm text-teal-900/70">Sabai is reading your invoice...</p>
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
              ) : (
                <section aria-label="Extracted data" className="rounded-2xl border-2 border-teal-600 bg-white p-6 shadow-card">
                  <h2 className="text-lg font-semibold text-teal-950">Extracted data</h2>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-teal-900/60">Supplier</dt>
                      <dd className="mt-0.5 font-semibold text-teal-950">{EXTRACTED.supplier}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-teal-900/60">Invoice date</dt>
                      <dd className="mt-0.5 font-semibold text-teal-950">{EXTRACTED.date}</dd>
                    </div>
                  </dl>

                  <table className="mt-6 w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-teal-100 text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                        <th className="py-2 pr-2">Product</th>
                        <th className="py-2 pr-2 text-right">Qty</th>
                        <th className="py-2 text-right">Unit price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                      {EXTRACTED.products.map((p) => (
                        <tr key={p.name}>
                          <td className="py-2.5 pr-2 font-medium text-teal-950">{p.name}</td>
                          <td className="py-2.5 pr-2 text-right tabular-nums text-teal-900/75">{p.quantity}</td>
                          <td className="py-2.5 text-right tabular-nums text-teal-950">{fmt(p.unitPrice)} ฿</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 flex items-center justify-between border-t border-teal-100 pt-4">
                    <span className="text-sm font-medium text-teal-900/70">Total</span>
                    <span className="text-2xl font-bold tabular-nums text-teal-950">{fmt(EXTRACTED_TOTAL)} ฿</span>
                  </div>
                </section>
              )}
            </div>

            <InvoiceDateField value={invoiceDate} onChange={setInvoiceDate} />

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={`/dashboard/invoices/scan/confirm?date=${invoiceDate}`}
                className="rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
              >
                Confirm and save
              </Link>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border-2 border-teal-700 px-8 py-3.5 text-lg font-semibold text-teal-700 transition hover:bg-teal-700 hover:text-white"
              >
                Scan another invoice
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
