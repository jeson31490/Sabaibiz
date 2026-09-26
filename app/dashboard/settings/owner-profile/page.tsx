"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import DashboardNavbar from "../../../components/DashboardNavbar";
import { useUser } from "../../../context/UserContext";

const LANGUAGES = ["English", "Thai", "French"];
const TIMEZONES = [
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Phnom_Penh",
  "Asia/Vientiane",
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "UTC",
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} name={id} className={inputClass} {...props} />
    </div>
  );
}

export default function OwnerProfilePage() {
  const { user, updateUser } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(user.avatarUrl);
  const [saved, setSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [defaultFirst, ...restName] = user.name.split(" ");
  const defaultLast = restName.join(" ");

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Data URL (not an object URL) so it stays valid once shared through context.
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = `${data.get("firstName")} ${data.get("lastName")}`.trim();
    updateUser({ name, email: String(data.get("email")), avatarUrl: photo });
    // Persisting to Supabase will be wired in the next step.
    setSaved(true);
  }

  function handlePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordError(null);
    // Password update will be wired to Supabase auth in the next step.
  }

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/dashboard/settings"
          aria-label="Back to Account & Settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
          Owner Profile
        </h1>

        {/* Profile */}
        <form
          onSubmit={handleSave}
          onChange={() => setSaved(false)}
          className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8"
        >
          <div className="flex items-center gap-5">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="Your profile photo"
                className="h-24 w-24 flex-none rounded-full object-cover ring-2 ring-teal-100"
              />
            ) : (
              <span
                className="flex h-24 w-24 flex-none items-center justify-center rounded-full bg-teal-100 text-teal-700 ring-2 ring-teal-50"
                aria-label="No profile photo"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
                </svg>
              </span>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-teal-800"
              >
                Upload photo
              </button>
              <p className="mt-2 text-xs text-teal-900/60">JPG or PNG, up to 5 MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handlePhoto}
                className="sr-only"
                tabIndex={-1}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field id="firstName" label="First name" type="text" autoComplete="given-name" defaultValue={defaultFirst} required />
            <Field id="lastName" label="Last name" type="text" autoComplete="family-name" defaultValue={defaultLast} required />
            <Field id="email" label="Email" type="email" autoComplete="email" defaultValue={user.email} required />
            <Field id="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+66 …" />
            <div>
              <label htmlFor="language" className={labelClass}>
                Language preference
              </label>
              <select id="language" name="language" defaultValue="English" className={inputClass}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="timezone" className={labelClass}>
                Timezone
              </label>
              <select id="timezone" name="timezone" defaultValue="Asia/Bangkok" className={inputClass}>
                {TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-gold-500 px-8 py-3.5 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
            >
              Save changes
            </button>
            {saved && (
              <p role="status" className="text-sm font-medium text-teal-700">
                Changes saved.
              </p>
            )}
          </div>
        </form>

        {/* Change password */}
        <form
          onSubmit={handlePassword}
          className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8"
        >
          <h2 className="text-lg font-semibold text-teal-950">Change Password</h2>
          <div className="mt-5 space-y-5">
            <Field id="currentPassword" label="Current password" type="password" autoComplete="current-password" required />
            <Field id="newPassword" label="New password" type="password" autoComplete="new-password" minLength={8} required />
            <Field id="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          {passwordError && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-600">
              {passwordError}
            </p>
          )}
          <button
            type="submit"
            className="mt-8 rounded-full border-2 border-teal-700 px-8 py-3 text-base font-semibold text-teal-700 transition hover:bg-teal-700 hover:text-white"
          >
            Update password
          </button>
        </form>
      </main>
    </div>
  );
}
