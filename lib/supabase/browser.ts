"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const authIsAvailable = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** One browser client for the page; the session lives in local storage. */
export function browserClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  client ??= createClient(url, anonKey);
  return client;
}

export async function sendSignInLink(email: string): Promise<void> {
  const supabase = browserClient();
  if (!supabase) throw new Error("Sign-in is not set up yet");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

/** Leaving a shared computer without leaving your pin editable. */
export async function signOut(): Promise<void> {
  await browserClient()?.auth.signOut();
}

/**
 * Calls back whenever the signed-in state settles, including the first time.
 *
 * Arriving from an email link puts tokens in the URL, and the client reads
 * them asynchronously, so a single getSession() can run before a session
 * exists and report nobody signed in. Subscribing catches the session whenever
 * it lands; supabase fires an initial event too, so an ordinary visit takes
 * the same path. Returns an unsubscribe.
 */
export function onAuthSettled(handler: (token: string | null) => void): () => void {
  const supabase = browserClient();
  if (!supabase) {
    handler(null);
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session?.access_token ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function currentAccessToken(): Promise<string | null> {
  const supabase = browserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
