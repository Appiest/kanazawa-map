import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Signed-out reads. The anon role can only see public.map_pins. */
export function readOnlyClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, NO_SESSION);
}

/** Acts as the caller: every function it calls reads auth.uid() from this token. */
export function clientForToken(accessToken: string): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    ...NO_SESSION,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Bypasses row-level security, so it is only ever built inside a route
 * handler, after the route has decided who the caller is.
 */
export function serviceClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, NO_SESSION);
}
