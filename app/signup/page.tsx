"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useUser } from "../context/UserContext";
import { supabase } from "../../lib/supabase";

const COUNTRIES = [
  "Thailand",
  "Cambodia",
  "Laos",
  "Malaysia",
  "Myanmar",
  "Singapore",
  "Vietnam",
  "Other",
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

export default function SignupPage() {
  const router = useRouter();
  const { updateUser } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("password") !== data.get("confirmPassword")) {
      setError("Passwords do not match.");
      setSuccess(null);
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const email = String(data.get("email")).trim();
    const fullName = String(data.get("fullName")).trim();
    const { data: result, error: signUpError } = await supabase.auth.signUp({
      email,
      password: String(data.get("password")),
      options: {
        data: {
          full_name: fullName,
          business_name: String(data.get("businessName")).trim(),
          country: String(data.get("country")),
        },
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // With email confirmation on, Supabase answers an existing address with an
    // obfuscated user that has no identities instead of an error.
    if (result.user && result.user.identities?.length === 0) {
      setError("An account with this email already exists. Try signing in instead.");
      return;
    }

    updateUser({ name: fullName, email });
    if (result.session) {
      // Email confirmation is off: the user is already signed in.
      router.push("/dashboard");
    } else {
      setSuccess("Account created! Check your email and click the confirmation link, then sign in.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-teal-50/60 px-6 py-10">
      <Link href="/" className="flex items-center gap-1">
        <Image
          src="/Thaimen1.png"
          alt="Sabai mascot"
          width={1380}
          height={1349}
          sizes="66px"
          className="h-16 w-auto object-contain"
          priority
        />
        <Image
          src="/sabaibiz-logo.png"
          alt="SabaiBiz logo"
          width={2816}
          height={1536}
          sizes="300px"
          className="h-20 w-auto object-contain"
          priority
        />
      </Link>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-card">
        <h1 className="text-center text-3xl font-bold tracking-tight text-teal-950">
          Create your account
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
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
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
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
          <div>
            <label htmlFor="businessName" className={labelClass}>
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              autoComplete="organization"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="country" className={labelClass}>
              Country
            </label>
            <select
              id="country"
              name="country"
              defaultValue="Thailand"
              required
              className={inputClass}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm font-medium text-teal-800">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-gold-500"
          >
            {submitting ? "Creating your account…" : "Create my account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-teal-900/70">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
