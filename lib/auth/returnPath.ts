import { withBasePath } from "@/lib/paths";

/**
 * Where to send somebody after they sign in. Only a path on this same origin
 * is accepted, so a crafted link cannot bounce a fresh session to another
 * site. Anything else comes back null.
 */
export function safeReturnPath(value: string | null | undefined, origin: string): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** The address a sign-in email links back to: the map, plus where to go next. */
export function signInRedirect(origin: string, returnTo: string | null): string {
  const map = `${origin}${withBasePath("/map")}`;
  const next = safeReturnPath(returnTo, origin);
  return next ? `${map}?next=${encodeURIComponent(next)}` : map;
}
