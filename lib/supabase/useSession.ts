"use client";

import { useEffect, useState } from "react";
import { authIsAvailable, onAuthSettled } from "./browser";

export type Session =
  | { status: "checking" }
  | { status: "out" }
  | { status: "in"; token: string };

/**
 * Whether someone is signed in, taken from a subscription rather than a single
 * read. Arriving from an email link puts tokens in the URL that the client
 * reads asynchronously, so asking once can report nobody signed in a moment
 * before they are.
 */
export function useSession(): Session {
  const [session, setSession] = useState<Session>(
    authIsAvailable ? { status: "checking" } : { status: "out" },
  );

  useEffect(() => {
    if (!authIsAvailable) return;
    return onAuthSettled((token) => setSession(token ? { status: "in", token } : { status: "out" }));
  }, []);

  return session;
}
