"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type PriceAlert = {
  product: string;
  change: string;
  supplier: string;
  from: number;
  to: number;
  unit: string;
  severity: "high" | "medium";
};

export default function PriceAlertsCard({ alerts = [] }: { alerts?: PriceAlert[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasAlerts = alerts.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`block h-full w-full rounded-2xl border bg-white p-6 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 ${
          hasAlerts ? "border-red-200 focus-visible:ring-red-400" : "border-teal-100 focus-visible:ring-teal-500"
        }`}
      >
        <span className="block text-sm font-medium text-teal-900/65">Price Alerts</span>
        {hasAlerts ? (
          <span className="mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight text-red-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            {alerts.length} alerts
          </span>
        ) : (
          <>
            <span className="mt-3 block text-3xl font-bold tracking-tight text-teal-950">No alerts</span>
            <span className="mt-1 block text-xs text-gray-500">No data yet</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Price alerts"
          className="absolute right-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-3rem)] rounded-2xl border border-teal-200 bg-white p-4 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-teal-950">Price alerts</h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label="Close price alerts"
              className="flex h-7 w-7 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          {hasAlerts ? (
            <ul className="mt-3 space-y-3">
              {alerts.map((a, i) => (
                <li key={`${a.product}-${i}`} className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${
                      a.severity === "high" ? "bg-red-500" : "bg-gold-400"
                    }`}
                  />
                  <div className="text-sm">
                    <p>
                      <span className="font-bold text-red-600">{a.product}</span>{" "}
                      <span className="font-semibold text-teal-950">{a.change}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-teal-900/70">
                      {a.supplier}: {a.from} → {a.to} ฿/{a.unit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-teal-900/70">
              No price alerts yet. They appear here once your invoices show prices going up.
            </p>
          )}

          <Link
            href="/dashboard/price-analysis"
            className="mt-4 block border-t border-teal-100 pt-3 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
          >
            View all alerts →
          </Link>
        </div>
      )}
    </div>
  );
}
