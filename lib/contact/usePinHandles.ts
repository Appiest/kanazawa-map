"use client";

import { useEffect, useState } from "react";
import { authorizedFetch, jsonBody, readFailure } from "@/lib/http/client";
import type { ContactHandles } from "@/lib/pins/types";

export type HandlesState =
  | { status: "hidden" }
  | { status: "loading" }
  | { status: "needsPin" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; handles: ContactHandles | null };

const HIDDEN: HandlesState = { status: "hidden" };

async function loadHandles(seq: number): Promise<HandlesState> {
  const response = await authorizedFetch(`/pins/${seq}/contact`);
  if (!response) return HIDDEN;
  if (response.ok) {
    const body = (await response.json()) as { handles: ContactHandles | null };
    return { status: "ready", handles: body.handles };
  }

  const failure = await readFailure(response, "Contact details would not load.");
  if (failure.reason === "needs_own_pin") return { status: "needsPin" };
  return { status: "unavailable", message: failure.message };
}

/**
 * What the open pin's owner chose to share, for a viewer who is signed in.
 * The answer is kept against the pin it was about, so switching pins shows a
 * wait rather than the previous person's details.
 */
export function usePinHandles(seq: number | null, signedIn: boolean): HandlesState {
  const [answer, setAnswer] = useState<{ seq: number; state: HandlesState } | null>(null);

  useEffect(() => {
    if (seq === null || !signedIn) return;

    let current = true;
    loadHandles(seq)
      .then((state) => current && setAnswer({ seq, state }))
      .catch(() => current && setAnswer({ seq, state: { status: "unavailable", message: "Contact details would not load." } }));

    return () => {
      current = false;
    };
  }, [seq, signedIn]);

  if (seq === null || !signedIn) return HIDDEN;
  return answer?.seq === seq ? answer.state : { status: "loading" };
}

/** Sends one note through the relay. Throws the server's own words on failure. */
export async function sendMessage(seq: number, message: string): Promise<void> {
  const response = await authorizedFetch(`/pins/${seq}/message`, jsonBody({ message }, { method: "POST" }));
  if (response?.ok) return;
  throw new Error((await readFailure(response, "Your message did not send. Try again in a moment.")).message);
}
