"use client";

import { useEffect, useState } from "react";
import { zoneForCountry, type ZoneId } from "./regions";

let countryPromise: Promise<string | null> | null = null;

/** Asks the server once per page load which country the request comes from. */
function fetchCountry(): Promise<string | null> {
  countryPromise ??= fetch("/api/region", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && typeof j.country === "string" ? (j.country as string) : null))
    .catch(() => null);
  return countryPromise;
}

/** Detected country, and whether the lookup has finished (country is null while loading and when unknown). Never throws. */
export function useCountryState(): { country: string | null; loaded: boolean } {
  const [state, setState] = useState<{ country: string | null; loaded: boolean }>({ country: null, loaded: false });
  useEffect(() => {
    let off = false;
    void fetchCountry().then((c) => {
      if (!off) setState({ country: c, loaded: true });
    });
    return () => {
      off = true;
    };
  }, []);
  return state;
}

/** Detected country (null until known, or when unknown). Never throws. */
export function useCountry(): string | null {
  return useCountryState().country;
}

/**
 * The price zone to show: always the one of the visitor's country (there is no way to pick another currency).
 * `ready` is false until the country is known, so pages can avoid flashing the wrong prices.
 * When the country can't be detected, the page's default zone is used.
 */
export function useZone(defaultZone: ZoneId): { zone: ZoneId; ready: boolean } {
  const { country, loaded } = useCountryState();
  return { zone: country ? zoneForCountry(country) : defaultZone, ready: loaded };
}
