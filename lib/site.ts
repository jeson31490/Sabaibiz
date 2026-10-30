// Facts about the company shown on public pages.

/**
 * Public contact address. Leave null until a mailbox exists (e.g. hello@sabaibiz.com): while it is
 * null the "Contact" link is simply not shown, rather than pointing somewhere that doesn't answer.
 */
export const CONTACT_EMAIL: string | null = null;

/** Public address of the site. Links in emails must use this, never the address the request came from. */
export const SITE_URL = "https://sabaibiz.com";

/** Origin to put in emailed links: the real site in production, the request's own origin when developing locally. */
export function linkOrigin(request: Request): string {
  return process.env.NODE_ENV === "production" ? SITE_URL : new URL(request.url).origin;
}
