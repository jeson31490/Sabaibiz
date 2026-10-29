"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bangkokDayOf,
  fetchBusinessAbsences,
  fetchBusinessShifts,
  fmtClock,
  fmtDay,
  fmtDayRange,
  kindLabel,
  shiftDay,
  punctuality,
  punctualityLabel,
  type Absence,
  type Shift,
} from "../../lib/attendance";
import { bangkokToday } from "../../lib/invoices";
import type { TeamPerson } from "../../lib/team";
import { zoneLabel, type ZoneResult } from "../../lib/zone";
import Avatar from "./Avatar";

const ROLE_LABEL = { owner: "Owner", manager: "Manager", employee: "Employee" } as const;

export function ZoneBadge({ zone }: { zone: ZoneResult | null }) {
  if (!zone) return null;
  const cls =
    zone === "in"
      ? "bg-teal-400/15 text-teal-400"
      : zone === "out"
        ? "bg-red-50 text-red-700"
        : "bg-gold-500/15 text-gold-500";
  return <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{zoneLabel(zone)}</span>;
}

/** One person: last 30 days of shifts (with the zone check when it is on) and their absences. */
export default function TeamProfile({ person, onClose }: { person: TeamPerson; onClose: () => void }) {
  const [data, setData] = useState<{ shifts: Shift[]; absences: Absence[] } | "loading" | "error">("loading");
  const today = bangkokToday();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchBusinessShifts(shiftDay(today, -29)), fetchBusinessAbsences(shiftDay(today, -60))])
      .then(([shifts, absences]) => {
        if (cancelled) return;
        setData({
          shifts: shifts.filter((s) => s.employeeId === person.userId),
          absences: absences.filter((a) => a.employeeId === person.userId).reverse(),
        });
      })
      .catch(() => !cancelled && setData("error"));
    return () => {
      cancelled = true;
    };
  }, [person.userId, today]);

  const stats = useMemo(() => {
    if (typeof data === "string") return null;
    const planned = { workStart: person.workStart, workEnd: person.workEnd };
    const hasPlan = Boolean(person.workStart || person.workEnd);
    const checks = data.shifts.map((s) => punctuality(s, planned));
    const late = checks.filter((c) => c.arrival?.state === "late").length;
    const early = checks.filter((c) => c.departure?.state === "early").length;
    const days = new Set(data.shifts.map((s) => bangkokDayOf(s.clockIn))).size;
    const out = data.shifts.reduce((n, s) => n + (s.clockInZone === "out" ? 1 : 0) + (s.clockOutZone === "out" ? 1 : 0), 0);
    const sick = data.absences.filter((a) => a.kind === "sick").length;
    return { hasPlan, late, early, days, out, sick, absent: data.absences.length - sick };
  }, [data, person.workStart, person.workEnd]);

  return (
    <div role="dialog" aria-modal="true" aria-label={person.name} className="fixed inset-0 z-50 flex items-end justify-center bg-teal-950/50 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-teal-100 bg-white p-6 shadow-soft sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={person.name} url={person.avatarUrl} size={72} ring="#E8B94A" />
            <div>
              <h2 className="font-display text-2xl font-extrabold text-teal-950">{person.name}</h2>
              <p className="text-sm text-teal-900/70">
                {ROLE_LABEL[person.role]} · {person.email}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-teal-200 px-3 py-1 text-sm font-semibold text-teal-900 hover:bg-teal-50">
            ✕
          </button>
        </div>

        {data === "loading" && <p className="mt-6 text-sm text-teal-900/70">Loading…</p>}
        {data === "error" && <p className="mt-6 text-sm font-medium text-red-700">We couldn&apos;t load this person&apos;s history.</p>}

        {typeof data !== "string" && stats && (
          <>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Days worked", String(stats.days)],
                ["Late arrivals", stats.hasPlan ? String(stats.late) : "—"],
                ["Absences", String(stats.absent)],
                ["Sick days", String(stats.sick)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
                  <dt className="text-xs text-teal-900/65">{k}</dt>
                  <dd className="mt-0.5 font-display text-xl font-extrabold text-teal-950">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-teal-900/55">
              Last 30 days.{" "}
              {stats.hasPlan
                ? `Planned hours ${person.workStart?.slice(0, 5) ?? "—"} to ${person.workEnd?.slice(0, 5) ?? "—"}${stats.early > 0 ? ` · ${stats.early} early departure${stats.early > 1 ? "s" : ""}` : ""}. A few minutes either way count as on time.`
                : "No planned hours set (Settings → Team access)."}{" "}
              {stats.out > 0 ? `${stats.out} clock-in/out outside the zone.` : ""}
            </p>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-teal-900/60">Clock-ins</h3>
            {data.shifts.length === 0 ? (
              <p className="mt-2 text-sm text-teal-900/65">No shifts in the last 30 days.</p>
            ) : (
              <ul className="mt-2 divide-y divide-teal-100 rounded-2xl border border-teal-100">
                {data.shifts.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                    <span className="font-medium text-teal-950">{fmtDay(bangkokDayOf(s.clockIn))}</span>
                    <span className="text-teal-900/80">
                      {fmtClock(s.clockIn)}
                      <ZoneBadge zone={s.clockInZone} /> → {s.clockOut ? fmtClock(s.clockOut) : "still in"}
                      <ZoneBadge zone={s.clockOutZone} />
                      {(() => {
                        const label = punctualityLabel(punctuality(s, { workStart: person.workStart, workEnd: person.workEnd }));
                        return label.text === "—" ? null : (
                          <span className={`ml-2 text-xs font-semibold ${label.bad ? "text-red-500" : "text-teal-900/50"}`}>{label.text}</span>
                        );
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-teal-900/60">Absences and sick days</h3>
            {data.absences.length === 0 ? (
              <p className="mt-2 text-sm text-teal-900/65">Nothing declared.</p>
            ) : (
              <ul className="mt-2 divide-y divide-teal-100 rounded-2xl border border-teal-100">
                {data.absences.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>
                      <span className="font-medium text-teal-950">{fmtDayRange(a)}</span>
                      {a.note && <span className="block text-xs text-teal-900/55">{a.note}</span>}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.kind === "sick" ? "bg-red-50 text-red-700" : "bg-gold-500/15 text-gold-600"}`}>
                      {kindLabel(a.kind)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
