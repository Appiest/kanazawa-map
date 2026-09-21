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

/**
 * Supabase reports these in developer language. Nobody signing up should be
 * shown "email rate limit exceeded" and left to work out what to do about it.
 */
function readableAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many sign-in emails have gone out just now. Try again in a few minutes.";
  }
  if (text.includes("invalid") && text.includes("email")) {
    return "Check the email address and try again.";
  }
  if (text.includes("smtp") || text.includes("sending")) {
    return "The sign-in email could not be sent. Try again shortly.";
  }
  return "Could not send the link. Check the address and try again.";
}

export async function sendSignInLink(email: string): Promise<void> {
  const supabase = browserClient();
  if (!supabase) throw new Error("Sign-in is not set up yet");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/map` },
  });
  if (error) throw new Error(readableAuthError(error.message));
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
