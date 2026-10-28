"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import Turnstile, { CAPTCHA_ENABLED } from "../components/Turnstile";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

// "Forgot password?" on the login page. Sends a link to /reset-password.
export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    if (CAPTCHA_ENABLED && !captchaToken) {
      setError("Please wait for the security check to finish, then try again.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken: captchaToken ?? undefined,
    });
    setSubmitting(false);
    setCaptchaKey((k) => k + 1);

    if (resetError) {
      setError(
        resetError.status === 429
          ? "Too many e-mails were sent. Please wait a few minutes and try again."
          : "We couldn't send the link. Please check the address and try again.",
      );
      return;
    }
    setSentTo(email);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-teal-50/60 px-6 py-10">
      <Link href="/" className="flex items-center gap-1">
        <Image src="/Thaimen1.png" alt="Sabai mascot" width={1380} height={1349} sizes="66px" className="h-16 w-auto object-contain" priority />
        <Image src="/sabaibiz-logo.png" alt="SabaiBiz logo" width={2816} height={1536} sizes="300px" className="h-20 w-auto object-contain" priority />
      </Link>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-card">
        <h1 className="text-center text-3xl font-bold tracking-tight text-teal-950">Forgot your password?</h1>

        {sentTo ? (
          <>
            {/* Same answer whether or not the address has an account, so this page can't be used to find out who does. */}
            <p role="status" className="mt-6 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
              If {sentTo} has a SabaiBiz account, a link to choose a new password is on its way. It can take a minute.
              Check your spam folder too.
            </p>
            <p className="mt-6 text-center text-sm text-teal-900/70">
              <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-900">
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-center text-sm text-teal-900/70">
              Enter your email and we&apos;ll send you a link to choose a new password.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <Turnstile onToken={setCaptchaToken} resetKey={captchaKey} />

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-gold-500"
              >
                {submitting ? "Sending…" : "Send the link"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-teal-900/70">
              <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-900">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
