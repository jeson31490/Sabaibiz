"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Real authentication will be wired to Supabase auth in the next step.
    router.push("/dashboard");
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
          Welcome back
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-sm">
          <Link
            href="/forgot-password"
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            Forgot password?
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-teal-900/70">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/signup"
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            Start free trial
          </Link>
        </p>
      </div>
    </main>
  );
}
