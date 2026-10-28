import { supabase } from "./supabase";

// "In zone / out of zone" check at clock-in and clock-out (supabase/24_workplace_zone.sql).
// The position goes to the database function, which keeps only the result; coordinates are never stored.

export type ZoneResult = "in" | "out" | "unknown";

export type WorkplaceZone = { enabled: boolean; lat: number | null; lng: number | null; radiusM: number };

export const ZONE_RADII = [50, 100, 150, 300, 500];

/** Is the check switched on for my business? False when the migration hasn't been run. */
export async function isZoneRequired(): Promise<boolean> {
  const { data, error } = await supabase.rpc("zone_required");
  if (error) return false;
  return data === true;
}

/** The workplace point and radius. Owner only (RLS); null when nothing was set yet. */
export async function fetchZone(): Promise<WorkplaceZone | null> {
  const { data, error } = await supabase.from("business_zone").select("enabled, lat, lng, radius_m").maybeSingle();
  if (error) throw error;
  return data ? { enabled: data.enabled, lat: data.lat, lng: data.lng, radiusM: data.radius_m } : null;
}

export async function saveZone(zone: WorkplaceZone): Promise<void> {
  const { error } = await supabase
    .from("business_zone")
    .upsert({ enabled: zone.enabled, lat: zone.lat, lng: zone.lng, radius_m: zone.radiusM, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

/** The phone's position once, or null if the person says no, there is no GPS or it takes too long. */
export function getPosition(timeoutMs = 10000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

export const zoneLabel = (z: ZoneResult | null) =>
  z === "in" ? "In zone" : z === "out" ? "Out of zone" : z === "unknown" ? "Location not shared" : "";
