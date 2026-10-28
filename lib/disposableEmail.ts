// Throw-away e-mail domains. Blocking them at sign-up keeps the free plan from being farmed with fake accounts.
// Not exhaustive: the captcha and the e-mail confirmation do the rest.
const DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmailo.com",
  "yopmail.com", "yopmail.fr", "trashmail.com", "trashmail.net", "throwawaymail.com", "getnada.com", "nada.email",
  "dispostable.com", "maildrop.cc", "mailnesia.com", "fakeinbox.com", "emailondeck.com", "mintemail.com",
  "mohmal.com", "moakt.com", "spamgourmet.com", "mytemp.email", "tmpmail.org", "tmpmail.net", "burnermail.io",
  "discard.email", "tempinbox.com", "mailcatch.com", "inboxbear.com", "luxusmail.org", "emailfake.com",
  "fakemail.net", "tempr.email", "1secmail.com", "1secmail.net", "1secmail.org", "mail.tm", "tmail.ws",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  return !!domain && DOMAINS.has(domain);
}
