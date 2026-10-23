/**
 * Throwaway inboxes, refused before a sign-in link is sent. This copy only
 * gives instant feedback in the form; the one that is enforced is the
 * private.blocked_email_domains table, read by the "Before User Created" auth
 * hook in supabase/migrations/0006. Add a domain to both.
 */
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "33mail.com",
  "anonaddy.me",
  "burnermail.io",
  "discard.email",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "harakirimail.com",
  "inboxkitten.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mailpoof.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.dev",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "yopmail.com",
  "yopmail.fr",
]);

function domainOf(email: string): string {
  return email.trim().toLowerCase().split("@").at(-1) ?? "";
}

export function isDisposableEmail(email: string): boolean {
  const domain = domainOf(email);
  return [...DISPOSABLE_DOMAINS].some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}
