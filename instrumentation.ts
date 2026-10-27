import * as Sentry from "@sentry/nextjs";

// Error reporting stays off until SENTRY_DSN is set in the environment (Vercel).
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
