"use client";

import { useEffect, useState } from "react";
import { isZone, zoneForCountry, type ZoneId } from "./regions";

const ZONE_KEY = "sabai_zone";
let countryPromise: Promise<string | null> | null = null;

/** Asks the server once per page load which country the request comes from. */
function fetchCountry(): Promise<string | null> {
  countryPromise ??= fetch("/api/region", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && typeof j.country === "string" ? (j.country as string) : null))
    .catch(() => null);
  return countryPromise;
}

/** Detected country (null until known, or when unknown). Never throws. */
export function useCountry(): string | null {
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    void fetchCountry().then((c) => {
      if (!off) setCountry(c);
    });
    return () => {
      off = true;
    };
  }, []);
  return country;
}

/** The price zone to show: the visitor's own choice if any, else the detected country, else the page's default. */
export function useZone(defaultZone: ZoneId): { zone: ZoneId; choose: (z: ZoneId) => void } {
  const country = useCountry();
  const [chosen, setChosen] = useState<ZoneId | null>(null);
  useEffect(() => {
    let off = false;
    void Promise.resolve().then(() => {
      try {
        const z = localStorage.getItem(ZONE_KEY);
        if (!off && isZone(z)) setChosen(z);
      } catch {
        /* storage blocked: fine */
      }
    });
    return () => {
      off = true;
    };
  }, []);
  const zone = chosen ?? (country ? zoneForCountry(country) : defaultZone);
  const choose = (z: ZoneId) => {
    setChosen(z);
    try {
      localStorage.setItem(ZONE_KEY, z);
    } catch {
      /* ignore */
    }
  };
  return { zone, choose };
}
