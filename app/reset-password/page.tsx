"use client";

import Link from "next/link";
import { Wordmark } from "../components/landing/SabaiMark";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

type Phase = { status: "checking" } | { status: "invalid"; message: string } | { status: "form" } | { status: "done" };

// Where the "reset your password" e-mail lands. Supabase signs the person in from the link
// (the session arrives in the URL and lib/supabase picks it up); here they choose a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
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
      if (data.session) {
        setPhase({ status: "form" });
        return;
      }
      setPhase({
        status: "invalid",
        message:
          linkError === "otp_expired"
            ? "This link has expired. Ask for a new one below."
            : "This link isn't valid any more. Ask for a new one below.",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }
    setPhase({ status: "done" });
    setTimeout(() => router.replace("/dashboard"), 1500);
  }

  return (
    <main className="app-dark flex min-h-screen flex-col items-center px-6 py-10">
      <Link href="/" aria-label="SabaiBiz"><Wordmark size={44} id="auth" className="text-3xl" /></Link>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-card">
        {phase.status === "checking" && (
          <p role="status" className="text-center text-sm font-medium text-teal-800">
            Checking your link…
          </p>
        )}

        {phase.status === "invalid" && (
          <>
            <h1 className="text-center text-2xl font-bold tracking-tight text-teal-950">Link not valid</h1>
            <p role="alert" className="mt-4 text-center text-sm text-teal-900/75">
              {phase.message}
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 block w-full rounded-full bg-gold-500 px-8 py-4 text-center text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
            >
              Send a new link
            </Link>
          </>
        )}

        {phase.status === "form" && (
          <>
            <h1 className="text-center text-3xl font-bold tracking-tight text-teal-950">Choose a new password</h1>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="password" className={labelClass}>
                  New password
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
                  Confirm new password
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
                {submitting ? "Saving…" : "Save password"}
              </button>
            </form>
          </>
        )}

        {phase.status === "done" && (
          <p role="status" className="text-center text-sm font-medium text-teal-800">
            Your password was changed. Taking you to your dashboard…
          </p>
        )}
      </div>
    </main>
  );
}
