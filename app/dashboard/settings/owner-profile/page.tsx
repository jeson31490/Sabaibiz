"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import DashboardNavbar from "../../../components/DashboardNavbar";
import { useUser } from "../../../context/UserContext";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, uploadAvatar } from "../../../../lib/avatar";
import { supabase } from "../../../../lib/supabase";

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
  const { user, updateUser, role } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  // Local preview while a new photo uploads; afterwards the saved photo comes from the user context.
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photo = preview ?? user.avatarUrl;
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Form values shown as defaults; replaced by the saved profile once it has loaded.
  const [firstFromName, ...restName] = user.name.split(" ");
  const [profile, setProfile] = useState({
    firstName: firstFromName ?? "",
    lastName: restName.join(" "),
    email: user.email,
    phone: "",
    language: "English",
    timezone: "Asia/Bangkok",
  });

  // Restore the saved profile from the Supabase auth user metadata.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const u = data.user;
      if (u) {
        const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
        const [fallbackFirst, ...fallbackRest] = (meta.full_name ?? "").split(" ");
        const next = {
          firstName: meta.first_name ?? fallbackFirst ?? "",
          lastName: meta.last_name ?? fallbackRest.join(" "),
          email: u.email ?? "",
          phone: meta.phone_number ?? "",
          language: LANGUAGES.includes(meta.language ?? "") ? (meta.language as string) : "English",
          timezone: TIMEZONES.includes(meta.timezone ?? "") ? (meta.timezone as string) : "Asia/Bangkok",
        };
        setProfile(next);
        updateUser({ name: `${next.firstName} ${next.lastName}`.trim() || next.email, email: next.email });
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setPhotoError(null);
    if (!AVATAR_TYPES.includes(file.type)) {
      setPhotoError("Please choose a JPG or PNG image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setPhotoError("This image is larger than 5 MB. Please choose a smaller one.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error("You need to be signed in to upload a photo.");
      const url = await uploadAvatar(data.user, file);
      updateUser({ avatarUrl: url });
      setPreview(null);
    } catch (err) {
      setPreview(null);
      setPhotoError(err instanceof Error ? err.message : "The photo could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const firstName = String(data.get("firstName")).trim();
    const lastName = String(data.get("lastName")).trim();
    const email = String(data.get("email")).trim();
    const name = `${firstName} ${lastName}`.trim();

    setSaving(true);
    setSaved(false);
    setSaveError(null);
    setSaveMessage(null);

    const { data: result, error } = await supabase.auth.updateUser({
      // Only sent when it changed: Supabase emails a confirmation link for a new address.
      ...(email !== profile.email ? { email } : {}),
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: name,
        phone_number: String(data.get("phone")).trim(),
        language: String(data.get("language")),
        timezone: String(data.get("timezone")),
      },
    });
    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }
    // result.user.email keeps the old address until a new one is confirmed.
    updateUser({ name, email: result.user.email ?? email });
    setProfile((p) => ({ ...p, firstName, lastName, email: result.user.email ?? p.email }));
    setSaved(true);
    if (email !== (result.user.email ?? email)) {
      setSaveMessage(`We sent a confirmation link to ${email}. Your email changes once you confirm it.`);
    }
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
          {/* Managers and employees reach the same page as "Profile". */}
          {role === "owner" ? "Owner Profile" : "Profile"}
        </h1>

        {/* Profile */}
        <form
          key={loaded ? "loaded" : "loading"}
          onSubmit={handleSave}
          onChange={() => {
            setSaved(false);
            setSaveMessage(null);
          }}
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
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-teal-800"
              >
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
              <p className="mt-2 text-xs text-teal-900/60">JPG or PNG, up to 5 MB.</p>
              {photoError && (
                <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                  {photoError}
                </p>
              )}
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
            <Field id="firstName" label="First name" type="text" autoComplete="given-name" defaultValue={profile.firstName} required />
            <Field id="lastName" label="Last name" type="text" autoComplete="family-name" defaultValue={profile.lastName} required />
            <Field id="email" label="Email" type="email" autoComplete="email" defaultValue={profile.email} required />
            <Field id="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+66 …" defaultValue={profile.phone} />
            <div>
              <label htmlFor="language" className={labelClass}>
                Language preference
              </label>
              <select id="language" name="language" defaultValue={profile.language} className={inputClass}>
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
              <select id="timezone" name="timezone" defaultValue={profile.timezone} className={inputClass}>
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
              disabled={saving || !loaded}
              className="rounded-full bg-gold-500 px-8 py-3.5 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-gold-500"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <p role="status" className="text-sm font-medium text-teal-700">
                Changes saved.
              </p>
            )}
            {saveError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {saveError}
              </p>
            )}
          </div>
          {saveMessage && (
            <p role="status" className="mt-3 text-sm text-teal-900/75">
              {saveMessage}
            </p>
          )}
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
