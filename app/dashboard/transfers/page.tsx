"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DashboardNavbar from "../../components/DashboardNavbar";
import { useUser } from "../../context/UserContext";
import { bangkokToday } from "../../../lib/invoices";
import { shiftDay } from "../../../lib/attendance";
import {
  deletePaymentScan,
  fetchPaymentScansForDay,
  isPaymentScansNotSetUp,
  MANAGER_HISTORY_DAYS,
  PAYMENT_SCAN_RETENTION_DAYS,
  uploadPaymentScan,
  type PaymentScan,
} from "../../../lib/paymentScans";
import { fetchTeamNames } from "../../../lib/teamNames";
import { useCanScanPayments } from "../../../lib/useCanScanPayments";
import { useLiveReload } from "../../../lib/useLiveReload";

// Photos of customers' transfer receipts. Anyone allowed can add one; the owner and managers see them all, day by day.

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

const fmtDayLong = (isoDay: string) =>
  new Date(`${isoDay}T12:00:00+07:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Bangkok",
  });

export default function TransfersPage() {
  const router = useRouter();
  const { role } = useUser();
  const isManager = role === "owner" || role === "manager";
  const allowed = useCanScanPayments();
  const [day, setDay] = useState(bangkokToday());
  const [scans, setScans] = useState<PaymentScan[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<PaymentScan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // An employee who isn't allowed has nothing to do here.
  useEffect(() => {
    if (role === "employee" && allowed === false) router.replace("/dashboard");
  }, [role, allowed, router]);

  const load = useCallback(async () => {
    // Employees have no history: they can only add photos.
    if (role === "employee") {
      setScans([]);
      return;
    }
    try {
      const list = await fetchPaymentScansForDay(day);
      setScans(list);
      setError(null);
    } catch (e) {
      setScans([]);
      setError(
        isPaymentScansNotSetUp(e)
          ? "This feature isn't set up yet: supabase/25_payment_scans.sql has to be run."
          : "The photos could not be loaded. Please try again.",
      );
    }
  }, [day, role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!isManager) return;
    fetchTeamNames().then(setNames).catch(() => {});
  }, [isManager]);

  useLiveReload(["payment_scans"], load);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await uploadPaymentScan(file);
      setNotice("Saved. Thank you!");
      setDay(bangkokToday());
      await load();
    } catch (e) {
      setError(
        isPaymentScansNotSetUp(e)
          ? "This feature isn't set up yet."
          : "We couldn't save the photo. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(scan: PaymentScan) {
    try {
      await deletePaymentScan(scan);
      setConfirmDelete(null);
      setOpen(null);
      await load();
    } catch {
      setError("We couldn't delete this photo.");
    }
  }

  const today = bangkokToday();
  // The owner browses everything that is kept; a manager only the last 30 days.
  const oldest = shiftDay(today, -(role === "owner" ? PAYMENT_SCAN_RETENTION_DAYS : MANAGER_HISTORY_DAYS));
  const planBlocked = allowed === false && isManager;

  return (
    <div className="min-h-screen">
      <DashboardNavbar />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Transfers</h1>
        <p className="mt-1 text-sm text-teal-900/65">
          Photos of customers&apos; transfer receipts, kept {Math.round(PAYMENT_SCAN_RETENTION_DAYS / 30)} months.
          {role === "manager" && ` You can see the last ${MANAGER_HISTORY_DAYS} days.`}
        </p>

        {planBlocked && (
          <p className="mt-6 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-5 text-sm text-teal-950">
            Transfer photos are included in the paid plans. Choose a plan in Settings to start saving your receipts.
          </p>
        )}

        {allowed && (
          <section className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 text-center shadow-card">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files)}
              aria-label="Take a photo of the transfer receipt"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-gold-500 px-8 py-6 text-2xl font-bold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-wait disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
                <path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
              </svg>
              {busy ? "Saving…" : "Photograph a transfer"}
            </button>
            <p className="mt-3 text-xs text-teal-900/60">Take a clear photo of the whole receipt on the customer&apos;s phone.</p>
          </section>
        )}

        {notice && (
          <p role="status" className="mt-6 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {isManager && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-teal-950">{day === today ? "Today" : fmtDayLong(day)}</h2>
            {(
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDay((d) => shiftDay(d, -1))}
                  disabled={day <= oldest}
                  className="rounded-full border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-40"
                  aria-label="Previous day"
                >
                  ←
                </button>
                <input
                  type="date"
                  value={day}
                  min={oldest}
                  max={today}
                  onChange={(e) => e.target.value && setDay(e.target.value)}
                  className="rounded-full border border-teal-200 bg-white px-4 py-2 text-sm text-teal-950"
                  aria-label="Day"
                />
                <button
                  type="button"
                  onClick={() => setDay((d) => shiftDay(d, 1))}
                  disabled={day >= today}
                  className="rounded-full border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-40"
                  aria-label="Next day"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {scans === null && <p className="mt-4 text-sm text-teal-900/70">Loading…</p>}
          {scans && scans.length === 0 && !error && (
            <p className="mt-4 rounded-2xl border border-teal-100 bg-white p-6 text-sm text-teal-900/70 shadow-card">
              No transfer photos {day === today ? "yet today" : "on this day"}.
            </p>
          )}
          {scans && scans.length > 0 && (
            <>
              <p className="mt-2 text-sm text-teal-900/65">
                {scans.length} photo{scans.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {scans.map((s) => (
                  <li key={s.id} className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-card">
                    {s.url ? (
                      <button type="button" onClick={() => setOpen(s)} className="block w-full" aria-label={`Open photo taken at ${fmtTime(s.scannedAt)}`}>
                        {/* Signed, short-lived link: next/image optimisation can't be used. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.url} alt="" loading="lazy" className="h-40 w-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-teal-50 text-2xl" aria-hidden>
                        ✓
                      </div>
                    )}
                    <div className="px-3 py-2 text-sm">
                      <p className="font-semibold text-teal-950">{fmtTime(s.scannedAt)}</p>
                      <p className="truncate text-xs text-teal-900/60">{(s.scannedBy && names.get(s.scannedBy)) || "Former team member"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        )}
      </main>

      {open && open.url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Transfer photo"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.url} alt="Transfer receipt" className="max-h-[75vh] max-w-full rounded-xl object-contain" />
          <p className="text-sm text-white/80">
            {fmtTime(open.scannedAt)} · {(open.scannedBy && names.get(open.scannedBy)) || "Former team member"}
          </p>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(null)} className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-teal-950">
              Close
            </button>
            {role === "owner" &&
              (confirmDelete === open.id ? (
                <button type="button" onClick={() => handleDelete(open)} className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white">
                  Yes, delete this photo
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(open.id)} className="rounded-full border border-red-300 px-6 py-2 text-sm font-semibold text-red-300">
                  Delete
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
