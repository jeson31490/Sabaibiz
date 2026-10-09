/** Supabase errors are plain objects with a message, not Error instances. */
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "object" && e && "message" in e && typeof e.message === "string" && e.message) return e.message;
  return fallback;
}
