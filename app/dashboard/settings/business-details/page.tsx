"use client";

import { useState, type FormEvent } from "react";
import { Field, SelectField } from "../../../components/FormField";
import SettingsShell from "../../../components/SettingsShell";
import { useUser } from "../../../context/UserContext";

const BUSINESS_TYPES = ["Restaurant", "Café", "Shop", "Other"];
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

export default function BusinessDetailsPage() {
  const { user } = useUser();
  const [saved, setSaved] = useState(false);

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Persisting to Supabase will be wired in the next step.
    setSaved(true);
  }

  return (
    <SettingsShell ownerOnly title="Business Details">
      <form
        onSubmit={handleSave}
        onChange={() => setSaved(false)}
        className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-card sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Keyed so the field picks up the saved name once the session has loaded. */}
          <Field
            key={user.businessName}
            id="businessName"
            label="Business name"
            type="text"
            defaultValue={user.businessName}
            autoComplete="organization"
            required
          />
          <SelectField id="businessType" label="Business type" options={BUSINESS_TYPES} defaultValue="Restaurant" />
          <div className="sm:col-span-2">
            <Field id="address" label="Address" type="text" autoComplete="street-address" />
          </div>
          <Field id="city" label="City" type="text" autoComplete="address-level2" />
          <SelectField id="country" label="Country" options={COUNTRIES} defaultValue="Thailand" />
          <Field id="taxId" label="Tax ID" type="text" inputMode="numeric" />
          <Field id="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+66 …" />
          <div className="sm:col-span-2">
            <Field id="website" label="Website URL" type="url" placeholder="https://" />
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
    </SettingsShell>
  );
}
