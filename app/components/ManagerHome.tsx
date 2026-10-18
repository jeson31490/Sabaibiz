"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchBusinessAbsences,
  fmtDay,
  fmtDayRange,
  isAttendanceNotSetUp,
  kindLabel,
  shiftDay,
  type Absence,
} from "../../lib/attendance";
import { bangkokToday, fetchInvoicesScannedToday, type InvoiceRow } from "../../lib/invoices";
import { fetchTeamNames } from "../../lib/teamNames";
import { useLiveReload } from "../../lib/useLiveReload";
import { useNotifications } from "../../lib/useNotifications";

// A manager's home: what was scanned today, who is away, and new absence declarations.
// No sales, costs summary or profit: those stay on the owner's dashboard.

type Data = {
  today: string;
  invoices: InvoiceRow[];
  absences: Absence[];
  names: Map<string, string>;
  /** False before supabase/18 has been run: the absence section is then left out. */
  attendance: boolean;
};

type Load = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Data);

const fmtBaht = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ฿`;

async function loadData(): Promise<Data> {
  const today = bangkokToday();
  const invoices = await fetchInvoicesScannedToday();
  try {
    const [absences, names] = await Promise.all([fetchBusinessAbsences(today), fetchTeamNames()]);
    // Away today or starting within the next week.
    const soon = shiftDay(today, 7);
    return { today, invoices, absences: absences.filter((a) => a.startDate <= soon), names, attendance: true };
  } catch (e) {
    if (isAttendanceNotSetUp(e)) return { today, invoices, absences: [], names: new Map(), attendance: false };
    throw e;
  }
}

export default function ManagerHome() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const { unread } = useNotifications(true);

  const refresh = useCallback(() => {
    loadData()
      .then((data) => setLoad({ status: "ready", ...data }))
      // Keep what is on screen if a background refresh fails.
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then((data) => {
        if (!cancelled) setLoad({ status: "ready", ...data });
      })
      .catch((e) => {
        if (!cancelled) {
          setLoad({ status: "error", message: e instanceof Error ? e.message : "Today's invoices could not be loaded." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useLiveReload(["invoices", "absences"], refresh);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Today</h1>
          {load.status === "ready" && <p className="mt-1 text-sm text-teal-900/65">{fmtDay(load.today)}</p>}
        </div>
        <Link
          href="/dashboard/invoices/scan"
          className="rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
        >
          Scan a new invoice
        </Link>
      </div>

      {unread > 0 && (
        <Link
          href="/dashboard/team"
          className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-gold-500/40 bg-gold-50 px-5 py-4 text-sm font-semibold text-gold-800 transition hover:bg-gold-500/15"
        >
          <span>
            {unread === 1 ? "1 new absence or sick-day declaration" : `${unread} new absence or sick-day declarations`}
          </span>
          <span aria-hidden>View →</span>
        </Link>
      )}

      {load.status === "loading" && (
        <p role="status" className="mt-8 text-sm text-teal-900/70">
          Loading…
        </p>
      )}

      {load.status === "error" && (
        <p role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
          {load.message}
        </p>
      )}

      {load.status === "ready" && (
        <>
          <section className="mt-8 rounded-2xl border border-teal-100 bg-white shadow-card">
            <div className="flex items-center justify-between gap-4 px-6 pt-6">
              <h2 className="text-lg font-semibold text-teal-950">
                Scanned today <span className="font-normal text-teal-900/55">({load.invoices.length})</span>
              </h2>
              <Link href="/dashboard/invoices" className="text-sm font-medium text-teal-700 transition hover:text-teal-900">
                All invoices
              </Link>
            </div>
            {load.invoices.length === 0 ? (
              <p className="px-6 pb-6 pt-2 text-sm text-teal-900/65">Nothing has been scanned yet today.</p>
            ) : (
              <ul className="mt-3 divide-y divide-teal-100 border-t border-teal-100">
                {load.invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-4 text-sm transition hover:bg-teal-50/60"
                    >
                      <span>
                        <span className="font-medium text-teal-950">{inv.supplier}</span>
                        <span className="text-teal-900/65">
                          {" "}
                          · {inv.generatedNumber ? "No number" : `#${inv.number}`} · {inv.products}{" "}
                          {inv.products === 1 ? "product" : "products"}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        {inv.status !== "processed" && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              inv.status === "error" ? "bg-red-50 text-red-700" : "bg-gold-500/15 text-gold-600"
                            }`}
                          >
                            {inv.status === "error" ? "Needs a fix" : "Pending"}
                          </span>
                        )}
                        <span className="font-semibold text-teal-950">{fmtBaht(inv.total)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-6 pb-5 pt-2 text-xs text-teal-900/50">Open an invoice to correct a line or add a missing one.</p>
          </section>

          {load.attendance && (
            <section className="mt-6 rounded-2xl border border-teal-100 bg-white shadow-card">
              <div className="flex items-center justify-between gap-4 px-6 pt-6">
                <h2 className="text-lg font-semibold text-teal-950">Absences and sick days</h2>
                <Link href="/dashboard/team" className="text-sm font-medium text-teal-700 transition hover:text-teal-900">
                  Team
                </Link>
              </div>
              {load.absences.length === 0 ? (
                <p className="px-6 pb-6 pt-2 text-sm text-teal-900/65">Nobody is away today or in the coming week.</p>
              ) : (
                <ul className="mt-3 divide-y divide-teal-100 border-t border-teal-100">
                  {load.absences.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3 text-sm">
                      <span>
                        <span className="font-medium text-teal-950">{load.names.get(a.employeeId) ?? "Former team member"}</span>
                        <span className="text-teal-900/75"> · {fmtDayRange(a)}</span>
                        {a.note && <span className="mt-0.5 block text-xs text-teal-900/55">{a.note}</span>}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          a.kind === "sick" ? "bg-red-50 text-red-700" : "bg-gold-500/15 text-gold-600"
                        }`}
                      >
                        {kindLabel(a.kind)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
