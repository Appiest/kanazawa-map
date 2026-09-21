"use client";

import { useEffect, useState } from "react";
import type { PinContact } from "./repository";
import { currentAccessToken } from "@/lib/supabase/browser";

export type ContactState =
  | { status: "hidden" }
  | { status: "loading" }
  | { status: "locked" }
  | { status: "ready"; contact: PinContact };

const LOCKED: ContactState = { status: "locked" };

async function loadContact(seq: number): Promise<ContactState> {
  const token = await currentAccessToken();
  if (!token) return LOCKED;

  const response = await fetch(`/api/pins/${seq}/contact`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return LOCKED;

  return { status: "ready", contact: (await response.json()) as PinContact };
}

/**
 * Contact details for the open pin. The server decides whether to hand them
 * over, so a locked result means the viewer is not on the map yet. The state
 * is derived from which pin the last answer was about, so switching pins shows
 * a wait rather than the previous person's details.
 */
export function useContact(seq: number | null): ContactState {
  const [answer, setAnswer] = useState<{ seq: number; state: ContactState } | null>(null);

  useEffect(() => {
    if (seq === null) return;

    let current = true;
    loadContact(seq)
      .then((state) => current && setAnswer({ seq, state }))
      .catch(() => current && setAnswer({ seq, state: LOCKED }));

    return () => {
      current = false;
    };
  }, [seq]);

  if (seq === null) return { status: "hidden" };
  return answer?.seq === seq ? answer.state : { status: "loading" };
}
