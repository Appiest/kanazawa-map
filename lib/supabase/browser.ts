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

export async function currentAccessToken(): Promise<string | null> {
  const supabase = browserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
