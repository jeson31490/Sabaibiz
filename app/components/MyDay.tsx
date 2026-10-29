"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  bangkokDayOf,
  cancelAbsence,
  clockIn,
  clockOut,
  declareAbsence,
  emailAbsenceNotice,
  fetchMyAbsences,
  fetchMyShifts,
  fetchOpenShift,
  fmtClock,
  fmtDayRange,
  isAttendanceNotSetUp,
  kindLabel,
  NOT_SET_UP_MESSAGE,
  shiftDay,
  shiftDuration,
  type Absence,
  type AbsenceKind,
  type Shift,
} from "../../lib/attendance";
import { bangkokToday } from "../../lib/invoices";
import { useCanScanPayments } from "../../lib/useCanScanPayments";
import { supabase } from "../../lib/supabase";
import { getPosition, isZoneRequired } from "../../lib/zone";
import { useUser } from "../context/UserContext";
import { inputClass, labelClass } from "./FormField";

// What an employee sees instead of the owner's dashboard: clock in/out, declare an absence,
// and a scan button only if the owner allowed it.

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; userId: string; open: Shift | null; today: Shift[]; absences: Absence[] };

const KINDS: { id: AbsenceKind; label: string }[] = [
  { id: "absence", label: "Absence" },
  { id: "sick", label: "Sick" },
];

export default function MyDay() {
  const { user, canScan } = useUser();
  const canScanPayments = useCanScanPayments();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const [kind, setKind] = useState<AbsenceKind>("absence");
  const [sending, setSending] = useState(false);
  const [declareError, setDeclareError] = useState<string | null>(null);
  // The owner can switch on an "in zone / out of zone" check at clock-in and clock-out.
  const [zoneOn, setZoneOn] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) throw new Error("Please sign in again.");
      const today = bangkokToday();
      const [open, shifts, absences] = await Promise.all([
        fetchOpenShift(userId),
        fetchMyShifts(userId, today),
        fetchMyAbsences(userId),
      ]);
      setLoad({
        status: "ready",
        userId,
        open,
        // Shifts that started today (Bangkok), oldest first.
        today: shifts.filter((s) => bangkokDayOf(s.clockIn) === today).reverse(),
        absences,
      });
    } catch (e) {
      setLoad({
        status: "error",
        message: isAttendanceNotSetUp(e)
          ? NOT_SET_UP_MESSAGE
          : e instanceof Error
            ? e.message
            : "Your day could not be loaded.",
      });
    }
  }, []);

  useEffect(() => {
    // Load once on mount; reload() sets state only after its requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    isZoneRequired().then((on) => !cancelled && setZoneOn(on));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClock() {
    if (load.status !== "ready") return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      // Asked once, only at this moment. If it is refused the shift is still saved, marked "location not shared".
      const position = zoneOn ? await getPosition() : null;
      if (load.open) {
        await clockOut(position);
        setNotice("You're clocked out. See you next time!");
      } else {
        await clockIn(position);
        setNotice("You're clocked in. Have a good shift!");
      }
      await reload();
    } catch (e) {
      setActionError(
        isAttendanceNotSetUp(e) ? NOT_SET_UP_MESSAGE : "We couldn't save that. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDeclare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const startDate = String(data.get("startDate"));
    const endDate = String(data.get("endDate") || startDate);
    if (endDate < startDate) {
      setDeclareError("The last day can't be before the first day.");
      return;
    }
    setSending(true);
    setDeclareError(null);
    setNotice(null);
    try {
      const absence = await declareAbsence({ kind, startDate, endDate, note: String(data.get("note") ?? "") });
      // Managers are notified in the app by the database; this adds the e-mail, without waiting for it.
      void emailAbsenceNotice(absence.id);
      form.reset();
      setDeclaring(false);
      setNotice(kind === "sick" ? "Your sick day was declared. Get well soon." : "Your absence was declared.");
      await reload();
    } catch (err) {
      setDeclareError(
        isAttendanceNotSetUp(err)
          ? NOT_SET_UP_MESSAGE
          : "We couldn't save your declaration. Dates can span at most 60 days. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleCancel(a: Absence) {
    setActionError(null);
    setNotice(null);
    try {
      await cancelAbsence(a.id);
      setNotice("Your declaration was cancelled.");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "We couldn't cancel it. Please try again.");
    }
  }

  const today = bangkokToday();
  // Sick days can be declared for the last few days too; absences are for today and later.
  const minDate = kind === "sick" ? shiftDay(today, -3) : today;

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Hello, {user.name || "there"}</h1>
      <p className="mt-1 text-sm text-teal-900/65">{user.businessName}</p>

      {load.status === "loading" && (
        <p role="status" className="mt-8 text-sm text-teal-900/70">
          Loading your day…
        </p>
      )}

      {load.status === "error" && (
        <p role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
          {load.message}
        </p>
      )}

      {load.status === "ready" && (
        <>
          <section className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 text-center shadow-card">
            <p className="text-sm font-medium text-teal-900/70">
              {load.open ? `You clocked in at ${fmtClock(load.open.clockIn)}` : "You're not clocked in"}
            </p>
            <button
              type="button"
              onClick={handleClock}
              disabled={busy}
              className={`mt-4 w-full rounded-full px-8 py-6 text-2xl font-bold shadow-soft transition disabled:cursor-wait disabled:opacity-60 ${
                load.open ? "bg-teal-950 text-white hover:bg-teal-900" : "bg-teal-700 text-white hover:bg-teal-800"
              }`}
            >
              {busy ? "…" : load.open ? "Clock out" : "Clock in"}
            </button>
            {zoneOn && (
              <p className="mt-3 text-xs text-teal-900/60">
                Your workplace checks that you are on site when you clock in or out. Your phone shares its position once, at that
                moment. Only “in zone” or “out of zone” is kept, for 3 months. Your position is never stored.
              </p>
            )}
            {load.today.length > 0 && (
              <ul className="mt-5 space-y-1 text-sm text-teal-900/75">
                {load.today.map((s) => (
                  <li key={s.id}>
                    {fmtClock(s.clockIn)} → {s.clockOut ? fmtClock(s.clockOut) : "now"}
                    {s.clockOut && <span className="text-teal-900/50"> ({shiftDuration(s)})</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canScanPayments && (
            <Link
              href="/dashboard/transfers"
              className="mt-6 flex items-center justify-center gap-3 rounded-full border-2 border-gold-500 px-8 py-5 text-xl font-bold text-gold-500 transition hover:bg-gold-500/10"
            >
              Photograph a transfer
            </Link>
          )}

          {canScan && (
            <Link
              href="/dashboard/invoices/scan"
              className="mt-6 flex items-center justify-center gap-3 rounded-full bg-gold-500 px-8 py-6 text-2xl font-bold text-teal-950 shadow-soft transition hover:bg-gold-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
                aria-hidden
              >
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" />
              </svg>
              Scan an invoice
            </Link>
          )}

          {notice && (
            <p role="status" className="mt-6 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
              {notice}
            </p>
          )}
          {actionError && (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {actionError}
            </p>
          )}

          <section className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-teal-950">Absence or sick day</h2>
              <button
                type="button"
                onClick={() => {
                  setDeclaring((v) => !v);
                  setDeclareError(null);
                }}
                aria-expanded={declaring}
                className="rounded-full border border-teal-200 px-5 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
              >
                {declaring ? "Close" : "Declare"}
              </button>
            </div>

            {declaring && (
              <form onSubmit={handleDeclare} className="mt-5 space-y-5">
                <div role="radiogroup" aria-label="Type" className="flex gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      role="radio"
                      aria-checked={kind === k.id}
                      onClick={() => setKind(k.id)}
                      className={`flex-1 rounded-full border px-5 py-3 text-base font-semibold transition ${
                        kind === k.id
                          ? "border-teal-700 bg-teal-700 text-white"
                          : "border-teal-200 text-teal-800 hover:bg-teal-50"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="startDate" className={labelClass}>
                      First day
                    </label>
                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      required
                      min={minDate}
                      defaultValue={today}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className={labelClass}>
                      Last day <span className="font-normal text-teal-900/55">(optional)</span>
                    </label>
                    <input id="endDate" name="endDate" type="date" min={minDate} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label htmlFor="note" className={labelClass}>
                    Note <span className="font-normal text-teal-900/55">(optional)</span>
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={2}
                    maxLength={500}
                    placeholder="A word for your manager"
                    className={inputClass}
                  />
                </div>
                {declareError && (
                  <p role="alert" className="text-sm font-medium text-red-600">
                    {declareError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-teal-700 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send to my manager"}
                </button>
              </form>
            )}

            {load.absences.length > 0 ? (
              <ul className="mt-5 divide-y divide-teal-100">
                {load.absences.map((a) => {
                  const upcoming = a.endDate >= today;
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span>
                        <span className="font-semibold text-teal-950">{kindLabel(a.kind)}</span>
                        <span className="text-teal-900/75"> · {fmtDayRange(a)}</span>
                        {a.note && <span className="mt-0.5 block text-xs text-teal-900/55">{a.note}</span>}
                      </span>
                      {upcoming && (
                        <button
                          type="button"
                          onClick={() => handleCancel(a)}
                          className="shrink-0 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              !declaring && <p className="mt-3 text-sm text-teal-900/65">Nothing declared. Tell your manager in advance here.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
