"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  fetchBusinessAbsences,
  fetchBusinessShifts,
  fmtClock,
  punctuality,
  type Absence,
  type Shift,
} from "../../lib/attendance";
import { fetchIngredients } from "../../lib/ingredients";
import { bangkokToday } from "../../lib/invoices";
import { fetchPaymentScansForDay, type PaymentScan } from "../../lib/paymentScans";
import { computePayslip, fetchStaff } from "../../lib/payroll";
import { dishFigures, fetchMenu, fetchRecipes } from "../../lib/recipes";
import { fetchTeamPeople, type TeamPerson } from "../../lib/team";

// The owner's extra cards under the result: team today, transfers, payroll and best margins.
// Each card loads on its own and simply stays out of the way if its data is not set up yet.

const fmtBaht = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ฿`;
const keyOf = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

function Card({ title, link, children }: { title: string; link?: { href: string; label: string }; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#19D3B5]/20 bg-[#072A2B] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#F4EBD8]">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs font-medium text-[#19D3B5] hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Pill = ({ tone, children }: { tone: "ok" | "warn" | "bad"; children: ReactNode }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
      tone === "ok" ? "bg-[#19D3B5]/15 text-[#19D3B5]" : tone === "warn" ? "bg-[#E8B94A]/15 text-[#E8B94A]" : "bg-[#FF8A6E]/15 text-[#FF8A6E]"
    }`}
  >
    {children}
  </span>
);

const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

type TeamState = { people: TeamPerson[]; shifts: Shift[]; away: Absence[] };

function TeamToday() {
  const [data, setData] = useState<TeamState | null | "off">(null);
  useEffect(() => {
    const today = bangkokToday();
    let cancelled = false;
    Promise.all([fetchTeamPeople(), fetchBusinessShifts(today), fetchBusinessAbsences(today)])
      .then(([people, shifts, absences]) => {
        if (cancelled) return;
        setData({
          people: people.filter((p) => p.role !== "owner"),
          shifts,
          away: absences.filter((a) => a.startDate <= today && a.endDate >= today),
        });
      })
      .catch(() => !cancelled && setData("off"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (data === "off") return null;
  if (data === null) return <Card title="Team today"><p className="text-sm text-[#F4EBD8]/60">Loading…</p></Card>;
  if (data.people.length === 0) {
    return (
      <Card title="Team today" link={{ href: "/dashboard/team", label: "Invite your team" }}>
        <p className="text-sm text-[#F4EBD8]/70">Invite your people to see who is in, on time or late.</p>
      </Card>
    );
  }

  const rows = data.people.map((p) => {
    const awayToday = data.away.some((a) => a.employeeId === p.userId);
    // First clock-in of the day (the list is newest first).
    const mine = data.shifts.filter((s) => s.employeeId === p.userId);
    const first = mine[mine.length - 1];
    const state = awayToday
      ? ({ kind: "away" } as const)
      : first
        ? (() => {
            const arr = punctuality(first, { workStart: p.workStart, workEnd: p.workEnd }).arrival;
            return arr?.state === "late" ? ({ kind: "late", minutes: arr.minutes, at: fmtClock(first.clockIn) } as const) : ({ kind: "ok", at: fmtClock(first.clockIn) } as const);
          })()
        : ({ kind: "none" } as const);
    return { p, state };
  });
  const count = (k: string) => rows.filter((r) => r.state.kind === k).length;
  const late = rows.filter((r) => r.state.kind === "late");

  return (
    <Card title="Team today" link={{ href: "/dashboard/team", label: "Open team" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex -space-x-2">
          {rows.slice(0, 6).map(({ p, state }) => (
            <span
              key={p.userId}
              title={p.name || p.email}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#072A2B] text-xs font-bold text-[#031B1C] ${
                state.kind === "late" ? "bg-[#E8B94A]" : state.kind === "ok" ? "bg-[#19D3B5]" : "bg-[#F4EBD8]/50"
              }`}
            >
              {initials(p.name || p.email)}
            </span>
          ))}
          {rows.length > 6 && <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#072A2B] bg-[#F4EBD8]/30 text-xs font-bold text-[#F4EBD8]">+{rows.length - 6}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="ok">{count("ok")} on time</Pill>
          {late.length > 0 && <Pill tone="warn">{late.length} late</Pill>}
          {count("away") > 0 && <Pill tone="bad">{count("away")} away</Pill>}
          {count("none") > 0 && <Pill tone="warn">{count("none")} not in yet</Pill>}
        </div>
      </div>
      {late.map(({ p, state }) => (
        <p key={p.userId} className="mt-3 text-xs text-[#F4EBD8]/65">
          {p.name || p.email} · in at {state.kind === "late" ? state.at : ""} · {state.kind === "late" ? state.minutes : 0} min late
        </p>
      ))}
    </Card>
  );
}

function TransfersToday() {
  const [scans, setScans] = useState<PaymentScan[] | null | "off">(null);
  useEffect(() => {
    let cancelled = false;
    fetchPaymentScansForDay(bangkokToday())
      .then((s) => !cancelled && setScans(s))
      .catch(() => !cancelled && setScans("off"));
    return () => {
      cancelled = true;
    };
  }, []);
  if (scans === "off") return null;
  return (
    <Card title="Transfers today" link={{ href: "/dashboard/transfers", label: "Open" }}>
      {scans === null ? (
        <p className="text-sm text-[#F4EBD8]/60">Loading…</p>
      ) : scans.length === 0 ? (
        <p className="text-sm text-[#F4EBD8]/70">No transfer photos yet today.</p>
      ) : (
        <>
          <p className="font-display text-3xl font-extrabold text-[#F4EBD8]">{scans.length} <span className="text-base font-medium text-[#F4EBD8]/60">slip{scans.length === 1 ? "" : "s"}</span></p>
          <ul className="mt-2 divide-y divide-[#19D3B5]/10 text-sm">
            {scans.slice(0, 3).map((s) => (
              <li key={s.id} className="flex justify-between py-1.5 text-[#F4EBD8]/80">
                <span>{fmtClock(s.scannedAt)}</span>
                <span className="text-[#F4EBD8]/50">photo</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function PayrollCard() {
  const [info, setInfo] = useState<{ n: number; net: number } | null | "off">(null);
  useEffect(() => {
    let cancelled = false;
    fetchStaff()
      .then((staff) => !cancelled && setInfo({ n: staff.length, net: staff.reduce((s, x) => s + computePayslip(x.baseSalary).net, 0) }))
      .catch(() => !cancelled && setInfo("off"));
    return () => {
      cancelled = true;
    };
  }, []);
  if (info === "off") return null;
  const month = new Date().toLocaleDateString("en-GB", { month: "long", timeZone: "Asia/Bangkok" });
  return (
    <Card title={`Payroll · ${month}`} link={{ href: "/dashboard/team", label: "Open" }}>
      {info === null ? (
        <p className="text-sm text-[#F4EBD8]/60">Loading…</p>
      ) : info.n === 0 ? (
        <p className="text-sm text-[#F4EBD8]/70">Add your staff to prepare payslips.</p>
      ) : (
        <>
          <p className="font-display text-3xl font-extrabold text-[#F4EBD8]">{fmtBaht(info.net)}</p>
          <p className="mt-1 text-xs text-[#F4EBD8]/60">Net pay for {info.n} payslip{info.n === 1 ? "" : "s"}, before any extra or deduction you add</p>
        </>
      )}
    </Card>
  );
}

function BestMargins() {
  const [rows, setRows] = useState<{ name: string; pct: number }[] | null | "off">(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRecipes(), fetchIngredients(), fetchMenu().catch(() => [])])
      .then(([recipes, products, menu]) => {
        if (cancelled) return;
        const map = new Map(products.map((p) => [p.id, p]));
        const price = new Map(menu.map((m) => [keyOf(m.name), m.price]));
        const out = recipes
          .map((r) => ({ name: r.itemName, f: dishFigures(r, map, price.get(keyOf(r.itemName)) ?? null) }))
          .filter((x) => x.f.marginPct !== null && x.f.missing === 0)
          .map((x) => ({ name: x.name, pct: x.f.marginPct as number }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3);
        setRows(out);
      })
      .catch(() => !cancelled && setRows("off"));
    return () => {
      cancelled = true;
    };
  }, []);
  if (rows === "off") return null;
  return (
    <Card title="Best margins" link={{ href: "/dashboard/recipes", label: "All products" }}>
      {rows === null ? (
        <p className="text-sm text-[#F4EBD8]/60">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#F4EBD8]/70">Add a recipe to see what each dish really earns you.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex justify-between text-[#F4EBD8]">
                <span>{r.name}</span>
                <b className={r.pct >= 0.6 ? "text-[#19D3B5]" : "text-[#E8B94A]"}>{Math.round(r.pct * 100)}%</b>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F4EBD8]/10">
                <div className={`h-full rounded-full ${r.pct >= 0.6 ? "bg-[#19D3B5]" : "bg-[#E8B94A]"}`} style={{ width: `${Math.max(3, Math.min(100, r.pct * 100))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function OwnerExtras() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TeamToday />
      <TransfersToday />
      <BestMargins />
      <PayrollCard />
    </div>
  );
}
