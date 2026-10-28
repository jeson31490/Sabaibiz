"use client";

import Link from "next/link";
import { Wordmark } from "../components/landing/SabaiMark";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useUser } from "../context/UserContext";
import { supabase } from "../../lib/supabase";
import Turnstile, { CAPTCHA_ENABLED } from "../components/Turnstile";
import { AUTH, authLang } from "../../lib/authCopy";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const lang = authLang(useSearchParams().get("lang"));
  const t = AUTH[lang];
  const q = lang === "th" ? "?lang=th" : "";
  const router = useRouter();
  const { updateUser } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (CAPTCHA_ENABLED && !captchaToken) {
      setError("Please wait for the security check to finish, then try again.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const { data: result, error: signInError } = await supabase.auth.signInWithPassword({
      email: String(data.get("email")).trim(),
      password: String(data.get("password")),
      options: { captchaToken: captchaToken ?? undefined },
    });

    if (signInError) {
      setSubmitting(false);
      setCaptchaKey((k) => k + 1);
      setError(signInError.message);
      return;
    }

    const user = result.user;
    updateUser({
      name: (user.user_metadata?.full_name as string | undefined) || user.email || "",
      email: user.email ?? "",
    });
    router.push("/dashboard");
  }

  return (
    <main lang={lang} className="app-dark flex min-h-screen flex-col items-center px-6 py-10">
      <Link href="/" aria-label="SabaiBiz"><Wordmark size={44} id="auth" className="text-3xl" /></Link>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-card">
        <h1 className="text-center text-3xl font-bold tracking-tight text-teal-950">
          {t.loginTitle}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className={labelClass}>
              {t.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              {t.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
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
            {submitting ? t.signingIn : t.signIn}
          </button>
        </form>

        <p className="mt-5 text-center text-sm">
          <Link
            href={`/forgot-password${q}`}
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            {t.forgot}
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-teal-900/70">
          {t.noAccount}{" "}
          <Link
            href={`/signup${q}`}
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            {t.startFree}
          </Link>
        </p>
      </div>
    </main>
  );
}
