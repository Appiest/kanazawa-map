"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDisposableEmail } from "@/lib/auth/disposableDomains";
import { signInRedirect } from "@/lib/auth/returnPath";

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
const READABLE_AUTH_ERRORS: { matches: (text: string) => boolean; message: string }[] = [
  {
    matches: (text) => text.includes("rate limit") || text.includes("too many"),
    message: "Too many sign-in emails have gone out just now. Try again in a few minutes.",
  },
  {
    matches: (text) => text.includes("invalid") && text.includes("email"),
    message: "Check the email address and try again.",
  },
  {
    matches: (text) => text.includes("captcha"),
    message: "The check that you are a person did not go through. Try it again.",
  },
  {
    matches: (text) => text.includes("throwaway"),
    message: "Use an email address you keep. Throwaway inboxes cannot join.",
  },
  {
    matches: (text) => text.includes("smtp") || text.includes("sending"),
    message: "The sign-in email could not be sent. Try again shortly.",
  },
];

function readableAuthError(message: string): string {
  const text = message.toLowerCase();
  const known = READABLE_AUTH_ERRORS.find((entry) => entry.matches(text));
  return known?.message ?? "Could not send the link. Check the address and try again.";
}

export type SignInOptions = {
  /** From the Turnstile widget, when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
  captchaToken: string | null;
  /** A same-origin path to come back to after the link is opened. */
  returnTo: string | null;
};

export async function sendSignInLink(email: string, { captchaToken, returnTo }: SignInOptions): Promise<void> {
  const supabase = browserClient();
  if (!supabase) throw new Error("Sign-in is not set up yet");
  if (isDisposableEmail(email)) throw new Error(readableAuthError("throwaway"));

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: signInRedirect(window.location.origin, returnTo),
      ...(captchaToken ? { captchaToken } : {}),
    },
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
  const stopWatchingTabs = watchOtherTabs(supabase, handler);
  return () => {
    data.subscription.unsubscribe();
    stopWatchingTabs();
  };
}

/** supabase-js keeps the session under a key shaped like `sb-<project>-auth-token`. */
function isSessionKey(key: string | null): boolean {
  return key === null || (key.startsWith("sb-") && key.endsWith("-auth-token"));
}

/**
 * Signing in or out in another tab writes local storage, which fires a
 * `storage` event here. The embedded map listens for it, so somebody who signs
 * in on the full map finds the embed on the website signed in too.
 */
function watchOtherTabs(supabase: SupabaseClient, handler: (token: string | null) => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (!isSessionKey(event.key)) return;
    void supabase.auth.getSession().then(({ data }) => handler(data.session?.access_token ?? null));
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export async function currentAccessToken(): Promise<string | null> {
  const supabase = browserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
