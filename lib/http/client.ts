"use client";

import { apiPath } from "@/lib/paths";
import { currentAccessToken } from "@/lib/supabase/browser";

/** A request to one of this app's API routes, wherever the app is mounted. */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiPath(path), init);
}

export function jsonBody(body: unknown, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...init.headers, "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/** As the signed-in person, or null when nobody is signed in. */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
  const token = await currentAccessToken();
  if (!token) return null;
  return apiFetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

export type Failure = { message: string; reason: string | null };

/** What the server said went wrong, in words it chose for a person to read. */
export async function readFailure(response: Response | null, fallback: string): Promise<Failure> {
  if (!response) return { message: "Sign in first.", reason: "not_signed_in" };
  const body = (await response.json().catch(() => null)) as { error?: string; reason?: string } | null;
  return { message: body?.error ?? fallback, reason: body?.reason ?? null };
}

export async function throwUnlessOk(response: Response | null, fallback: string): Promise<Response> {
  if (response?.ok) return response;
  throw new Error((await readFailure(response, fallback)).message);
}
