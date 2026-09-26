"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { DEFAULT_BUSINESS_NAME, useUser } from "../context/UserContext";
import { supabase } from "../../lib/supabase";
import { acceptTeamInvite, fetchMyMembership } from "../../lib/team";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

type Phase = { status: "checking" } | { status: "invalid"; message: string } | { status: "form"; email: string };

// Where the invitation email's link lands. Supabase signs the person in from the link
// (the session arrives in the URL and lib/supabase picks it up); here they choose a password and join the team.
export default function AcceptInvitePage() {
  const router = useRouter();
  const { user, refreshRole } = useUser();
  const [phase, setPhase] = useState<Phase>({ status: "checking" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // An expired or already-used link comes back with the error in the URL fragment.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const linkError = hash.get("error_code") ?? hash.get("error");

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const session = data.session;
      if (!session) {
        setPhase({
          status: "invalid",
          message:
            linkError === "otp_expired"
              ? "This invitation link has expired. Ask the business owner to send you a new invitation."
              : "This invitation link isn't valid any more. Ask the business owner to send you a new invitation.",
        });
        return;
      }
      // Already joined (e.g. the link was opened twice): go straight in.
      const membership = await fetchMyMembership(session.user.id).catch(() => null);
      if (cancelled) return;
      if (membership?.status === "active") router.replace("/dashboard");
      else setPhase({ status: "form", email: session.user.email ?? "" });
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirmPassword"))) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: String(data.get("fullName")).trim() },
    });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    try {
      const membership = await acceptTeamInvite();
      if (!membership) {
        setSubmitting(false);
        setError("We couldn't find an invitation for this email. It may have been cancelled by the business owner.");
        return;
      }
      refreshRole(); // they are a manager or employee now, not an owner
      router.replace("/dashboard");
    } catch {
      setSubmitting(false);
      setError("We couldn't join the team. Please try again.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-teal-50/60 px-6 py-10">
      <Link href="/" className="flex items-center gap-1">
        <Image src="/Thaimen1.png" alt="Sabai mascot" width={1380} height={1349} sizes="66px" className="h-16 w-auto object-contain" priority />
        <Image src="/sabaibiz-logo.png" alt="SabaiBiz logo" width={2816} height={1536} sizes="300px" className="h-20 w-auto object-contain" priority />
      </Link>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-card">
        {phase.status === "checking" && (
          <p role="status" className="text-center text-sm font-medium text-teal-800">
            Checking your invitation…
          </p>
        )}

        {phase.status === "invalid" && (
          <>
            <h1 className="text-center text-2xl font-bold tracking-tight text-teal-950">Invitation link not valid</h1>
            <p role="alert" className="mt-4 text-center text-sm text-teal-900/75">
              {phase.message}
            </p>
            <p className="mt-6 text-center text-sm text-teal-900/70">
              Already joined?{" "}
              <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-900">
                Sign in
              </Link>
            </p>
          </>
        )}

        {phase.status === "form" && (
          <>
            <h1 className="text-center text-3xl font-bold tracking-tight text-teal-950">Join your team</h1>
            <p className="mt-2 text-center text-sm text-teal-900/70">
              You&apos;ve been invited to {user.businessName === DEFAULT_BUSINESS_NAME ? "a business" : user.businessName} on
              SabaiBiz. Choose a password to finish.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input id="email" type="email" value={phase.email} readOnly className={`${inputClass} bg-teal-50/60 text-teal-900/70`} />
              </div>
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Your name
                </label>
                <input id="fullName" name="fullName" type="text" autoComplete="name" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  aria-describedby="password-hint"
                  className={inputClass}
                />
                <p id="password-hint" className="mt-1 text-xs text-gray-500">
                  At least 8 characters.
                </p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className={inputClass}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-gold-500"
              >
                {submitting ? "Joining…" : "Join the team"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
