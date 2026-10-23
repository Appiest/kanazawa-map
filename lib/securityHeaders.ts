/**
 * Response headers for every page and route. Kept out of next.config.ts so
 * the policy reads as one list, and so the embed can relax framing alone.
 */
type Header = { key: string; value: string };

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

function originOf(url: string | undefined): string | null {
  if (!url?.startsWith("http")) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Supabase answers over https and, for realtime, over a websocket on the same host. */
function supabaseOrigins(): string[] {
  const origin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return origin ? [origin, origin.replace(/^http/, "ws")] : [];
}

function connectSources(): string {
  const tileOrigin = originOf(process.env.NEXT_PUBLIC_TILE_URL);
  return ["'self'", ...supabaseOrigins(), ...(tileOrigin ? [tileOrigin] : [])].join(" ");
}

function scriptSources(isDev: boolean): string {
  // Next's bootstrap scripts are inline and carry no nonce on a static page.
  // React needs eval only for development error overlays.
  return ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), TURNSTILE_ORIGIN].join(" ");
}

export function contentSecurityPolicy(frameAncestors: string[], isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src ${scriptSources(isDev)}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources()}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    `frame-src ${TURNSTILE_ORIGIN}`,
    `frame-ancestors ${frameAncestors.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const SHARED: Header[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
];

export function pageHeaders(isDev: boolean): Header[] {
  return [
    ...SHARED,
    { key: "Content-Security-Policy", value: contentSecurityPolicy(["'self'"], isDev) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ];
}

/**
 * The embed is meant to sit in an iframe on the host website. That site
 * serves this app on its own origin, so 'self' covers it; the host origin is
 * added for previews where the two still differ.
 */
export function embedHeaders(isDev: boolean): Header[] {
  const host = originOf(process.env.NEXT_PUBLIC_HOST_URL);
  return [
    ...SHARED,
    { key: "Content-Security-Policy", value: contentSecurityPolicy(["'self'", ...(host ? [host] : [])], isDev) },
  ];
}
