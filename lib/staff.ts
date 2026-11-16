// Staff accounts without an e-mail address: the phone number is the identifier, a 6-digit code is the secret.
// Supabase Auth needs an e-mail, so we derive a technical one from the phone number. ".invalid" is reserved
// (RFC 2606): it can never receive mail, so nobody can ever use "forgot password" on it to take an account over.
export const STAFF_DOMAIN = "staff.sabaibiz.invalid";

/** Digits only, 7 to 15 of them. The employee must type the number the same way every time. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

export const staffEmail = (digits: string) => `p${digits}@${STAFF_DOMAIN}`;
export const isStaffEmail = (email: string) => email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`);

/** The real Supabase password: long and specific, so password-strength checks never reject a numeric code. */
export const staffPassword = (digits: string, code: string) => `sabai-${digits}-${code}`;

const BAD_CODES = new Set(["123456", "654321", "012345", "234567", "345678", "456789", "567890", "121212", "112233", "123123"]);
/** 6 digits, not all the same, not an obvious run. */
export function codeProblem(code: string): string | null {
  if (!/^\d{6}$/.test(code)) return "The code must be exactly 6 digits.";
  if (/^(\d)\1{5}$/.test(code) || BAD_CODES.has(code)) return "That code is too easy to guess. Choose another one.";
  return null;
}

/** What to show for a member: the name the owner gave, else the phone number, else the e-mail. */
export function friendlyContact(email: string, label?: string | null): string {
  if (!isStaffEmail(email)) return email;
  const phone = /^p(\d+)@/.exec(email)?.[1];
  const who = label || (phone ? `+${phone}` : "Staff member");
  return phone && label ? `${label} (+${phone})` : who;
}
