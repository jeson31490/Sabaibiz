"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SelectField, Field } from "../../../components/FormField";
import SettingsShell from "../../../components/SettingsShell";
import { useUser } from "../../../context/UserContext";
import { supabase } from "../../../../lib/supabase";
import {
  fetchMyMembership,
  fetchTeam,
  inviteTeamMember,
  removeTeamMember,
  resendTeamInvite,
  setTeamMemberCanScan,
  setTeamMemberCanScanPayments,
  setTeamMemberSchedule,
  fetchWorkSchedules,
  type WorkSchedule,
  type TeamMember,
  type TeamRole,
} from "../../../../lib/team";

const INVITE_ROLES = ["Manager", "Employee"];

const roleLabel = (r: TeamRole) => (r === "manager" ? "Manager" : "Employee");
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "member"; membership: TeamMember }
  | { status: "owner"; members: TeamMember[] };

// Supabase returns these when supabase/03_team_members.sql hasn't been run yet.
const isMissingTable = (e: unknown) =>
  typeof e === "object" && e !== null && ["42P01", "PGRST205"].includes((e as { code?: string }).code ?? "");

export default function TeamAccessPage() {
  const { user } = useUser();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [inviting, setInviting] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<TeamRole>("manager");
  const [savingScanId, setSavingScanId] = useState<string | null>(null);
  const [savingPayId, setSavingPayId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Map<string, WorkSchedule>>(new Map());
  const [scanError, setScanError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("Please sign in again.");
        const membership = await fetchMyMembership(data.user.id);
        const next: LoadState =
          membership?.status === "active"
            ? { status: "member", membership }
            : { status: "owner", members: await fetchTeam(data.user.id) };
        if (next.status === "owner") {
          const planned = await fetchWorkSchedules();
          if (!cancelled) setSchedules(planned);
        }
        if (!cancelled) setLoad(next);
      } catch (e) {
        if (cancelled) return;
        setLoad({
          status: "error",
          message: isMissingTable(e)
            ? "Team access isn't set up in the database yet (run supabase/03_team_members.sql)."
            : e instanceof Error
              ? e.message
              : "Your team could not be loaded.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("inviteEmail")).trim();
    const role = String(data.get("inviteRole")).toLowerCase() as TeamRole;
    // The checkbox only exists for employees; managers always scan.
    const canScan = role === "manager" || data.get("inviteCanScan") === "on";

    setSending(true);
    setInviteError(null);
    setNotice(null);
    try {
      const member = await inviteTeamMember(email, role, canScan);
      setLoad((prev) => (prev.status === "owner" ? { ...prev, members: [...prev.members, member] } : prev));
      setNotice(`Invitation sent to ${member.email}.`);
      form.reset();
      setInviteRole("manager");
      setInviting(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "We couldn't send the invitation. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleSchedule(member: TeamMember, field: "workStart" | "workEnd", value: string) {
    const current = schedules.get(member.id) ?? { workStart: null, workEnd: null };
    const next = { ...current, [field]: value || null };
    setSchedules((prev) => new Map(prev).set(member.id, next));
    setScanError(null);
    try {
      await setTeamMemberSchedule(member.id, next.workStart, next.workEnd);
    } catch {
      setScanError("We couldn't save the hours. Make sure supabase/26_work_schedule.sql has been run.");
    }
  }

  async function handleTogglePayments(member: TeamMember) {
    const next = !member.canScanPayments;
    setScanError(null);
    setNotice(null);
    setSavingPayId(member.id);
    try {
      await setTeamMemberCanScanPayments(member.id, next);
      setLoad((prev) =>
        prev.status === "owner"
          ? { ...prev, members: prev.members.map((m) => (m.id === member.id ? { ...m, canScanPayments: next } : m)) }
          : prev,
      );
      setNotice(
        next
          ? `${member.email} can now photograph customers' transfer receipts.`
          : `${member.email} can no longer photograph transfer receipts.`,
      );
    } catch {
      setScanError("We couldn't change this permission. Make sure supabase/25_payment_scans.sql has been run.");
    } finally {
      setSavingPayId(null);
    }
  }

  async function handleToggleScan(member: TeamMember) {
    const next = !member.canScan;
    setScanError(null);
    setNotice(null);
    setSavingScanId(member.id);
    try {
      await setTeamMemberCanScan(member.id, next);
      setLoad((prev) =>
        prev.status === "owner"
          ? { ...prev, members: prev.members.map((m) => (m.id === member.id ? { ...m, canScan: next } : m)) }
          : prev,
      );
      setNotice(
        next
          ? `${member.email} can now scan and see invoices.`
          : `${member.email} can no longer scan or see invoices. They can still clock in and declare absences.`,
      );
    } catch (err) {
      setScanError(
        err instanceof Error && err.message.startsWith("This permission")
          ? err.message
          : "We couldn't change this permission. Make sure supabase/18_team_permissions_attendance.sql has been run.",
      );
    } finally {
      setSavingScanId(null);
    }
  }

  async function handleResend(member: TeamMember) {
    setResendError(null);
    setNotice(null);
    setResendingId(member.id);
    try {
      await resendTeamInvite(member.id);
      setNotice(`A new invitation was sent to ${member.email}.`);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "We couldn't send the invitation again.");
    } finally {
      setResendingId(null);
    }
  }

  async function handleRemove(member: TeamMember) {
    setRemoveError(null);
    try {
      await removeTeamMember(member.id);
      setLoad((prev) =>
        prev.status === "owner" ? { ...prev, members: prev.members.filter((m) => m.id !== member.id) } : prev,
      );
      setNotice(
        member.status === "pending"
          ? `The invitation to ${member.email} was cancelled.`
          : `${member.email} no longer has access to ${user.businessName}.`,
      );
    } catch {
      setRemoveError(`We couldn't remove ${member.email}. Please try again.`);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <SettingsShell ownerOnly title="Team Access" maxWidth="max-w-5xl">
      {load.status === "loading" && (
        <p role="status" className="mt-6 text-sm text-teal-900/70">
          Loading your team…
        </p>
      )}

      {load.status === "error" && (
        <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
          {load.message}
        </p>
      )}

      {load.status === "member" && (
        <section className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
          <p className="text-teal-950">
            You&apos;re a <strong>{roleLabel(load.membership.role)}</strong> at <strong>{user.businessName}</strong>
            {load.membership.acceptedAt && <> since {fmtDate(load.membership.acceptedAt)}</>}.
          </p>
          <p className="mt-2 text-sm text-teal-900/70">Only the owner of the business can invite or remove team members.</p>
        </section>
      )}

      {load.status === "owner" && (
        <>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setInviting((v) => !v);
                setInviteError(null);
              }}
              aria-expanded={inviting}
              className="rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
            >
              Invite a team member
            </button>
          </div>

          {inviting && (
            <form
              onSubmit={handleInvite}
              className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8"
            >
              <h2 className="text-lg font-semibold text-teal-950">Invite a team member</h2>
              <p className="mt-1 text-sm text-teal-900/65">
                They&apos;ll get an email with a link to join {user.businessName}. Everyone can clock in and declare
                an absence; you choose who can scan invoices.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field id="inviteEmail" label="Email" type="email" autoComplete="off" required />
                <SelectField
                  id="inviteRole"
                  label="Role"
                  options={INVITE_ROLES}
                  defaultValue="Manager"
                  onChange={(e) => setInviteRole(e.target.value.toLowerCase() as TeamRole)}
                />
              </div>
              {inviteRole === "employee" ? (
                <label className="mt-5 flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-4 text-sm text-teal-950">
                  <input
                    type="checkbox"
                    name="inviteCanScan"
                    defaultChecked
                    className="mt-0.5 h-4 w-4 rounded border-teal-300 accent-teal-700"
                  />
                  <span>
                    <strong>Can scan and see invoices</strong>
                    <span className="mt-0.5 block text-teal-900/70">
                      Leave it unticked for people who only need to clock in and declare an absence. You can change
                      it later.
                    </span>
                  </span>
                </label>
              ) : (
                <p className="mt-5 text-sm text-teal-900/65">
                  Managers can scan and see invoices, and see your team&apos;s attendance and absences.
                </p>
              )}
              {inviteError && (
                <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                  {inviteError}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-full bg-teal-700 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send invite"}
                </button>
                <button
                  type="button"
                  onClick={() => setInviting(false)}
                  className="rounded-full border border-teal-200 px-7 py-3 text-base font-semibold text-teal-800 transition hover:bg-teal-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {notice && (
            <p role="status" className="mt-6 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
              {notice}
            </p>
          )}
          {resendError && (
            <p role="alert" className="mt-6 text-sm font-medium text-red-600">
              {resendError}
            </p>
          )}
          {scanError && (
            <p role="alert" className="mt-6 text-sm font-medium text-red-600">
              {scanError}
            </p>
          )}
          {removeError && (
            <p role="alert" className="mt-6 text-sm font-medium text-red-600">
              {removeError}
            </p>
          )}

          <section className="mt-8 rounded-2xl border border-teal-100 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Invoice scan</th>
                    <th className="px-6 py-3">Transfer photos</th>
                    <th className="px-6 py-3">Planned hours</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Since</th>
                    <th className="px-6 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  <tr className="transition hover:bg-teal-50/60">
                    <td className="px-6 py-4 font-medium text-teal-950">
                      {user.email || "—"}
                      <span className="ml-2 text-xs font-normal text-teal-900/55">(you)</span>
                    </td>
                    <td className="px-6 py-4 text-teal-900/80">Owner</td>
                    <td className="px-6 py-4 text-teal-900/60">Always</td>
                    <td className="px-6 py-4 text-teal-900/60">Always</td>
                    <td className="px-6 py-4 text-teal-900/60">—</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-teal-900/60">—</td>
                    <td />
                  </tr>
                  {load.members.map((m) => (
                    <tr key={m.id} className="transition hover:bg-teal-50/60">
                      <td className="px-6 py-4 font-medium text-teal-950">{m.email}</td>
                      <td className="px-6 py-4 text-teal-900/80">{roleLabel(m.role)}</td>
                      <td className="px-6 py-4">
                        {m.role === "manager" ? (
                          <span className="text-teal-900/60">Always</span>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={m.canScan}
                            aria-label={`Allow ${m.email} to scan and see invoices`}
                            disabled={savingScanId === m.id}
                            onClick={() => handleToggleScan(m)}
                            className="inline-flex items-center gap-2 disabled:opacity-60"
                          >
                            <span
                              className={`relative inline-block h-6 w-11 rounded-full transition ${
                                m.canScan ? "bg-teal-700" : "bg-teal-900/20"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                  m.canScan ? "left-[22px]" : "left-0.5"
                                }`}
                              />
                            </span>
                            <span className="text-xs font-semibold text-teal-900/80">{m.canScan ? "Allowed" : "Off"}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {m.role === "manager" ? (
                          <span className="text-teal-900/60">Always</span>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={m.canScanPayments}
                            aria-label={`Allow ${m.email} to photograph transfer receipts`}
                            disabled={savingPayId === m.id}
                            onClick={() => handleTogglePayments(m)}
                            className="inline-flex items-center gap-2 disabled:opacity-60"
                          >
                            <span
                              className={`relative inline-block h-6 w-11 rounded-full transition ${
                                m.canScanPayments ? "bg-teal-700" : "bg-teal-900/20"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                  m.canScanPayments ? "left-[22px]" : "left-0.5"
                                }`}
                              />
                            </span>
                            <span className="text-xs font-semibold text-teal-900/80">{m.canScanPayments ? "Allowed" : "Off"}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-teal-900/70">
                          <input
                            type="time"
                            aria-label={`Planned start for ${m.email}`}
                            value={(schedules.get(m.id)?.workStart ?? "").slice(0, 5)}
                            onChange={(e) => handleSchedule(m, "workStart", e.target.value)}
                            className="rounded-lg border border-teal-200 bg-white px-2 py-1 text-sm text-teal-950"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            aria-label={`Planned end for ${m.email}`}
                            value={(schedules.get(m.id)?.workEnd ?? "").slice(0, 5)}
                            onChange={(e) => handleSchedule(m, "workEnd", e.target.value)}
                            className="rounded-lg border border-teal-200 bg-white px-2 py-1 text-sm text-teal-950"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            m.status === "active" ? "bg-teal-50 text-teal-800" : "bg-gold-500/15 text-gold-600"
                          }`}
                        >
                          {m.status === "active" ? "Active" : "Invited"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-teal-900/60">
                        {m.status === "active" && m.acceptedAt ? fmtDate(m.acceptedAt) : `Invited ${fmtDate(m.invitedAt)}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {confirmingId === m.id ? (
                          <span className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRemove(m)}
                              className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                            >
                              {m.status === "pending" ? "Cancel invite" : "Remove access"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              className="rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {m.status === "pending" && (
                              <button
                                type="button"
                                onClick={() => handleResend(m)}
                                disabled={resendingId === m.id}
                                aria-label={`Send the invitation to ${m.email} again`}
                                className="rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60"
                              >
                                {resendingId === m.id ? "Sending…" : "Resend invite"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setConfirmingId(m.id)}
                              aria-label={`Remove ${m.email}`}
                              className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {load.members.length === 0 && (
              <p className="border-t border-teal-100 px-6 py-5 text-sm text-teal-900/65">
                No team members yet. Invite a manager or an employee: they can clock in and declare absences, and you choose who scans invoices.
              </p>
            )}
          </section>
        </>
      )}
    </SettingsShell>
  );
}
