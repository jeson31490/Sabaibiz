"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import DashboardNavbar from "../../components/DashboardNavbar";
import { useUser } from "../../context/UserContext";
import {
  bangkokDayOf,
  fetchBusinessAbsences,
  fetchBusinessShifts,
  fmtClock,
  fmtDay,
  fmtDayRange,
  isAttendanceNotSetUp,
  kindLabel,
  NOT_SET_UP_MESSAGE,
  shiftDay,
  shiftDuration,
  type Absence,
  type Shift,
} from "../../../lib/attendance";
import { bangkokToday } from "../../../lib/invoices";
import type { AppNotification } from "../../../lib/notifications";
import { fetchTeamNames } from "../../../lib/teamNames";
import { useLiveReload } from "../../../lib/useLiveReload";
import { useNotifications } from "../../../lib/useNotifications";

type Overview = {
  today: string;
  shifts: Shift[];
  absences: Absence[];
  /** user id -> label */
  names: Map<string, string>;
};

type Load = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Overview);

const card = "rounded-2xl border border-teal-100 bg-white shadow-card";
const th = "px-6 py-3 text-xs font-semibold uppercase tracking-wide text-teal-900/55";

const minutesOf = (s: Shift) => (s.clockOut ? Math.max(0, (Date.parse(s.clockOut) - Date.parse(s.clockIn)) / 60000) : 0);
const fmtHours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, "0")}m`;

async function loadOverview(): Promise<Overview> {
  const today = bangkokToday();
  const [shifts, absences, names] = await Promise.all([
    fetchBusinessShifts(shiftDay(today, -6)),
    fetchBusinessAbsences(shiftDay(today, -7)),
    fetchTeamNames(),
  ]);
  return { today, shifts, absences, names };
}

// Attendance and declared absences for the owner and managers, kept live. Employees are sent back to
// their own screen.
export default function TeamPage() {
  const router = useRouter();
  const { role } = useUser();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const enabled = role === "owner" || role === "manager";
  const { items, markAllRead } = useNotifications(enabled);

  useEffect(() => {
    if (role === "employee") router.replace("/dashboard");
  }, [role, router]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadOverview()
      .then((overview) => {
        if (!cancelled) setLoad({ status: "ready", ...overview });
      })
      .catch((e) => {
        if (cancelled) return;
        setLoad({
          status: "error",
          message: isAttendanceNotSetUp(e)
            ? NOT_SET_UP_MESSAGE
            : e instanceof Error
              ? e.message
              : "Your team's attendance could not be loaded.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Someone clocks in or declares an absence: the screen updates by itself.
  const refresh = useCallback(() => {
    loadOverview()
      .then((overview) => setLoad({ status: "ready", ...overview }))
      // Keep what is on screen if a background refresh fails.
      .catch(() => {});
  }, []);
  useLiveReload(["absences", "time_entries"], refresh, enabled);

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Team</h1>
        <p className="mt-1 text-sm text-teal-900/65">Who is in today, hours this week, and declared absences.</p>

        {(role === null || load.status === "loading") && role !== "employee" && (
          <p role="status" className="mt-8 text-sm text-teal-900/70">
            Loading your team…
          </p>
        )}

        {load.status === "error" && (
          <p role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
            {load.message}
          </p>
        )}

        {load.status === "ready" && <TeamContent {...load} notifications={items} onMarkAllRead={markAllRead} />}
      </main>
    </div>
  );
}

function TeamContent({
  today,
  shifts,
  absences,
  names,
  notifications,
  onMarkAllRead,
}: Overview & { notifications: AppNotification[]; onMarkAllRead: () => void }) {
  const nameOf = (id: string) => names.get(id) ?? "Former team member";

  const todayShifts = shifts.filter((s) => bangkokDayOf(s.clockIn) === today || !s.clockOut);
  const stillIn = shifts.filter((s) => !s.clockOut);

  // Hours over the last 7 days (today included), finished shifts only, per person.
  const perPerson = new Map<string, number>();
  for (const s of shifts) perPerson.set(s.employeeId, (perPerson.get(s.employeeId) ?? 0) + minutesOf(s));
  const totals = [...perPerson.entries()].sort((a, b) => b[1] - a[1]);

  const current = absences.filter((a) => a.endDate >= today);
  const recent = absences.filter((a) => a.endDate < today).reverse();

  const unread = notifications.filter((n) => !n.readAt);

  return (
    <>
      {unread.length > 0 && (
        <section aria-label="New declarations" className="mt-8 rounded-2xl border border-gold-500/40 bg-gold-50 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
            <h2 className="text-lg font-semibold text-gold-800">New ({unread.length})</h2>
            <button
              type="button"
              onClick={onMarkAllRead}
              className="rounded-full border border-gold-500/50 px-4 py-1.5 text-xs font-semibold text-gold-800 transition hover:bg-gold-500/15"
            >
              Mark all as read
            </button>
          </div>
          <ul className="mt-2 divide-y divide-gold-500/20">
            {unread.map((n) => (
              <li key={n.id} className="px-6 py-3 text-sm text-teal-950">
                <span className="font-medium">{nameOf(n.absence.employeeId)}</span> declared{" "}
                {n.absence.kind === "sick" ? "a sick day" : "an absence"}
                <span className="text-teal-900/75"> · {fmtDayRange(n.absence)}</span>
                {n.absence.note && <span className="mt-0.5 block text-xs text-teal-900/60">{n.absence.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`mt-8 ${card} p-6`}>
        <h2 className="text-lg font-semibold text-teal-950">In right now</h2>
        {stillIn.length === 0 ? (
          <p className="mt-2 text-sm text-teal-900/65">Nobody is clocked in.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {stillIn.map((s) => (
              <li key={s.id} className="rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-800">
                {nameOf(s.employeeId)} <span className="text-teal-900/55">since {fmtClock(s.clockIn)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="px-6 pt-6 text-lg font-semibold text-teal-950">Absences and sick days</h2>
        {current.length === 0 ? (
          <p className="px-6 pb-6 pt-2 text-sm text-teal-900/65">Nothing declared for today or the days ahead.</p>
        ) : (
          <ul className="mt-3 divide-y divide-teal-100 border-t border-teal-100">
            {current.map((a) => (
              <AbsenceRow key={a.id} a={a} name={nameOf(a.employeeId)} />
            ))}
          </ul>
        )}
        {recent.length > 0 && (
          <>
            <h3 className="border-t border-teal-100 px-6 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-teal-900/55">
              Last 7 days
            </h3>
            <ul className="divide-y divide-teal-100">
              {recent.map((a) => (
                <AbsenceRow key={a.id} a={a} name={nameOf(a.employeeId)} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="px-6 pt-6 text-lg font-semibold text-teal-950">Today, {fmtDay(today)}</h2>
        {todayShifts.length === 0 ? (
          <p className="px-6 pb-6 pt-2 text-sm text-teal-900/65">Nobody has clocked in today.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr>
                  <th className={th}>Person</th>
                  <th className={th}>In</th>
                  <th className={th}>Out</th>
                  <th className={th}>Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100">
                {[...todayShifts].reverse().map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-3 font-medium text-teal-950">{nameOf(s.employeeId)}</td>
                    <td className="px-6 py-3 text-teal-900/80">{fmtClock(s.clockIn)}</td>
                    <td className="px-6 py-3 text-teal-900/80">{s.clockOut ? fmtClock(s.clockOut) : "Still in"}</td>
                    <td className="px-6 py-3 text-teal-900/60">{shiftDuration(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="px-6 pt-6 text-lg font-semibold text-teal-950">Hours, last 7 days</h2>
        {totals.length === 0 ? (
          <p className="px-6 pb-6 pt-2 text-sm text-teal-900/65">No shifts recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-teal-100 border-t border-teal-100">
            {totals.map(([id, minutes]) => (
              <li key={id} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="font-medium text-teal-950">{nameOf(id)}</span>
                <span className="text-teal-900/75">{fmtHours(minutes)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="px-6 pb-5 pt-2 text-xs text-teal-900/50">Finished shifts only. A shift someone forgot to clock out of isn&apos;t counted.</p>
      </section>
    </>
  );
}

function AbsenceRow({ a, name }: { a: Absence; name: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3 text-sm">
      <span>
        <span className="font-medium text-teal-950">{name}</span>
        <span className="text-teal-900/75"> · {fmtDayRange(a)}</span>
        {a.note && <span className="mt-0.5 block text-xs text-teal-900/55">{a.note}</span>}
      </span>
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
          a.kind === "sick" ? "bg-red-50 text-red-700" : "bg-gold-500/15 text-gold-600"
        }`}
      >
        {kindLabel(a.kind)}
      </span>
    </li>
  );
}
