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

    setSending(true);
    setInviteError(null);
    setNotice(null);
    try {
      const member = await inviteTeamMember(email, role);
      setLoad((prev) => (prev.status === "owner" ? { ...prev, members: [...prev.members, member] } : prev));
      setNotice(`Invitation sent to ${member.email}.`);
      form.reset();
      setInviting(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "We couldn't send the invitation. Please try again.");
    } finally {
      setSending(false);
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
                They&apos;ll get an email with a link to join {user.businessName}. Team members see and add this
                business&apos;s invoices.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field id="inviteEmail" label="Email" type="email" autoComplete="off" required />
                <SelectField id="inviteRole" label="Role" options={INVITE_ROLES} defaultValue="Manager" />
              </div>
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
          {removeError && (
            <p role="alert" className="mt-6 text-sm font-medium text-red-600">
              {removeError}
            </p>
          )}

          <section className="mt-8 rounded-2xl border border-teal-100 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
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
                          <button
                            type="button"
                            onClick={() => setConfirmingId(m.id)}
                            aria-label={`Remove ${m.email}`}
                            className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {load.members.length === 0 && (
              <p className="border-t border-teal-100 px-6 py-5 text-sm text-teal-900/65">
                No team members yet. Invite a manager or employee to let them scan and view invoices.
              </p>
            )}
          </section>
        </>
      )}
    </SettingsShell>
  );
}
