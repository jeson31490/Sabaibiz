"use client";

import { useState, type FormEvent } from "react";
import { SelectField, Field } from "../../../components/FormField";
import SettingsShell from "../../../components/SettingsShell";
import { useUser } from "../../../context/UserContext";

type Role = "Owner" | "Manager" | "Employee";
type Member = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Invited";
};

const INVITE_ROLES = ["Manager", "Employee"];

export default function TeamAccessPage() {
  const { user } = useUser();
  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "", email: "", role: "Owner", status: "Active" },
    { id: 2, name: "Somchai Prasert", email: "somchai@moustache.example", role: "Manager", status: "Active" },
    { id: 3, name: "Nok Wattana", email: "nok@moustache.example", role: "Employee", status: "Invited" },
  ]);
  const [nextId, setNextId] = useState(4);
  const [inviting, setInviting] = useState(false);

  function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setMembers((prev) => [
      ...prev,
      {
        id: nextId,
        name: "—",
        email: String(data.get("inviteEmail")),
        role: data.get("inviteRole") as Role,
        status: "Invited",
      },
    ]);
    setNextId((n) => n + 1);
    setInviting(false);
    // Sending the invitation email will be wired up with Supabase.
  }

  return (
    <SettingsShell title="Team Access" maxWidth="max-w-5xl">
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setInviting((v) => !v)}
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
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field id="inviteEmail" label="Email" type="email" autoComplete="off" required />
            <SelectField id="inviteRole" label="Role" options={INVITE_ROLES} defaultValue="Manager" />
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              className="rounded-full bg-teal-700 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800"
            >
              Send invite
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

      <section className="mt-8 rounded-2xl border border-teal-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100">
              {members.map((m) => {
                const isOwner = m.role === "Owner";
                const name = isOwner ? user.name : m.name;
                const email = isOwner ? user.email || "—" : m.email;
                return (
                  <tr key={m.id} className="transition hover:bg-teal-50/60">
                    <td className="px-6 py-4 font-medium text-teal-950">{name}</td>
                    <td className="px-6 py-4 text-teal-900/70">{email}</td>
                    <td className="px-6 py-4 text-teal-900/80">{m.role}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          m.status === "Active"
                            ? "bg-teal-50 text-teal-800"
                            : "bg-gold-500/15 text-gold-600"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))}
                          aria-label={`Remove ${name}`}
                          className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </SettingsShell>
  );
}
