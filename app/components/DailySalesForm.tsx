"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { bangkokToday } from "../../lib/invoices";
import { shiftDay } from "../../lib/attendance";
import {
  deleteDailySale,
  fetchDailySale,
  fetchRecentDailySales,
  isDailySalesNotSetUp,
  readDailyReceipt,
  saveDailySale,
  type DailySale,
} from "../../lib/dailySales";
import { useUser } from "../context/UserContext";
import { inputClass, labelClass } from "./FormField";

const fmtBaht = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ฿`;
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// Phone photos are often 5-10MB: shrink to a JPEG data URL (Claude accepts images up to 5MB).
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Enter the day's takings by hand, or photograph the till's end-of-day receipt: Sabai reads the total and
 * fills the form, the person checks it and saves. Owner: any day. Manager: the last 7 days.
 */
export default function DailySalesForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { role } = useUser();
  const today = bangkokToday();
  const minDay = role === "owner" ? undefined : shiftDay(today, -7);

  const [day, setDay] = useState(today);
  const [amount, setAmount] = useState("");
  const [tickets, setTickets] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<"manual" | "photo">("manual");
  const [existing, setExisting] = useState<DailySale | null>(null);
  const [recent, setRecent] = useState<DailySale[]>([]);
  const [busy, setBusy] = useState<"read" | "save" | "delete" | null>(null);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // What is already saved for the chosen day (shown, and replaced when you save).
  useEffect(() => {
    let cancelled = false;
    fetchDailySale(day)
      .then((s) => {
        if (cancelled) return;
        setExisting(s);
        if (s) {
          setAmount(String(s.amount));
          setTickets(s.tickets === null ? "" : String(s.tickets));
          setNote(s.note ?? "");
          setSource(s.source);
        } else {
          setAmount("");
          setTickets("");
          setNote("");
          setSource("manual");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(isDailySalesNotSetUp(e) ? "Daily takings aren't set up yet. Please try again in a few minutes." : "We couldn't load this day.");
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  const loadRecent = () => fetchRecentDailySales(7).then(setRecent).catch(() => {});
  useEffect(() => {
    let cancelled = false;
    fetchRecentDailySales(7)
      .then((r) => !cancelled && setRecent(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setError("");
    setInfo("");
    setBusy("read");
    try {
      const result = await readDailyReceipt(await shrinkImage(file));
      if (result.total !== null) setAmount(String(result.total));
      if (result.tickets !== null) setTickets(String(result.tickets));
      setSource("photo");
      // The date on the receipt wins when it is a day you may enter.
      let note = "";
      if (result.date && result.date <= today && (!minDay || result.date >= minDay)) {
        if (result.date !== day) {
          setDay(result.date);
          note = ` for ${fmtDay(result.date)}`;
        }
      } else if (result.date) {
        note = ` (the receipt is dated ${fmtDay(result.date)}, please check the day)`;
      }
      setInfo(`Read from your receipt${note}${result.label ? `: “${result.label}”` : ""}. Please check the numbers, then save.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read this receipt.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    const total = Number(amount.replace(/,/g, ""));
    if (!amount.trim() || !Number.isFinite(total) || total < 0) {
      setError("Please enter the day's total in baht.");
      return;
    }
    const count = tickets.trim() === "" ? null : Number(tickets);
    if (count !== null && (!Number.isInteger(count) || count < 0)) {
      setError("The number of tickets must be a whole number.");
      return;
    }
    setBusy("save");
    try {
      await saveDailySale({ day, amount: total, tickets: count, note: note.trim() || null, source });
      onSaved();
      onClose();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setError(
        code === "42501"
          ? "You can't change this day. Managers can enter the last 7 days; ask the owner for older days."
          : isDailySalesNotSetUp(err as { code?: string })
            ? "Daily takings aren't set up yet. Please try again in a few minutes."
            : "We couldn't save this. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy("delete");
    setError("");
    try {
      await deleteDailySale(day);
      setExisting(null);
      setAmount("");
      setTickets("");
      setNote("");
      setSource("manual");
      onSaved();
      void loadRecent();
    } catch {
      setError("We couldn't remove this day.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Daily takings" className="fixed inset-0 z-50 flex items-end justify-center bg-teal-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={handleSave} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-teal-100 bg-white p-6 shadow-soft sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-teal-950">Daily takings</h2>
            <p className="mt-1 text-sm text-teal-900/70">Type the day&apos;s total, or photograph the till&apos;s end-of-day receipt.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-teal-200 px-3 py-1 text-sm font-semibold text-teal-900 hover:bg-teal-50">
            ✕
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" id="receipt-photo" onChange={(e) => void handlePhoto(e.target.files?.[0])} />
        <label
          htmlFor="receipt-photo"
          className={`mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gold-500/60 bg-gold-500/10 px-4 py-4 font-semibold text-gold-500 transition hover:bg-gold-500/15 ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
            <circle cx="12" cy="13.5" r="3.5" />
          </svg>
          {busy === "read" ? "Reading your receipt…" : "Photograph the end-of-day receipt"}
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ds-day" className={labelClass}>
              Day
            </label>
            <input id="ds-day" type="date" value={day} min={minDay} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ds-amount" className={labelClass}>
              Total sales (฿)
            </label>
            <input id="ds-amount" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12,500" className={inputClass} />
          </div>
          <div>
            <label htmlFor="ds-tickets" className={labelClass}>
              Number of tickets <span className="text-teal-900/50">(optional)</span>
            </label>
            <input id="ds-tickets" inputMode="numeric" autoComplete="off" value={tickets} onChange={(e) => setTickets(e.target.value)} placeholder="38" className={inputClass} />
          </div>
          <div>
            <label htmlFor="ds-note" className={labelClass}>
              Note <span className="text-teal-900/50">(optional)</span>
            </label>
            <input id="ds-note" maxLength={300} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>

        {existing && (
          <p className="mt-3 text-sm text-teal-900/70">
            Already saved for this day: {fmtBaht(existing.amount)}. Saving replaces it.
          </p>
        )}
        {info && (
          <p role="status" className="mt-3 rounded-xl border border-gold-500/40 bg-gold-50 px-4 py-3 text-sm font-medium text-gold-800">
            {info}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy !== null} className="rounded-full bg-gold-500 px-7 py-3 font-semibold transition hover:bg-gold-400 disabled:opacity-60">
            {busy === "save" ? "Saving…" : "Save the day"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-teal-200 px-5 py-3 font-semibold text-teal-900 hover:bg-teal-50">
            Cancel
          </button>
          {existing && role === "owner" && (
            <button type="button" onClick={handleDelete} disabled={busy !== null} className="ml-auto text-sm font-semibold text-red-600 hover:underline disabled:opacity-60">
              Remove this day
            </button>
          )}
        </div>

        {recent.length > 0 && (
          <div className="mt-6 border-t border-dashed border-teal-950/20 pt-4">
            <p className="font-plex text-xs uppercase tracking-wide text-teal-400">Recent days</p>
            <ul className="mt-2 space-y-1">
              {recent.map((r) => (
                <li key={r.day}>
                  <button type="button" onClick={() => setDay(r.day)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-teal-50">
                    <span className="text-teal-900">{fmtDay(r.day)}{r.source === "photo" ? " · photo" : ""}</span>
                    <span className="font-semibold tabular-nums text-teal-950">{fmtBaht(r.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
