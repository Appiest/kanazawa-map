"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContactHandles, NewPin, OwnPin } from "./repository";
import { authIsAvailable, currentAccessToken } from "@/lib/supabase/browser";

type State = { status: "unknown" } | { status: "none" } | { status: "mine"; pin: OwnPin };

const NO_PIN: State = { status: "none" };

async function authorized(path: string, init: RequestInit = {}): Promise<Response | null> {
  const token = await currentAccessToken();
  if (!token) return null;
  return fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}

async function loadOwnPin(): Promise<State> {
  if (!authIsAvailable) return NO_PIN;

  const response = await authorized("/api/me/pin");
  if (!response?.ok) return NO_PIN;

  const body = (await response.json()) as { pin: OwnPin | null };
  return body.pin ? { status: "mine", pin: body.pin } : NO_PIN;
}

/** The signed-in person's own pin, and the ways they can change it. */
export function useMyPin(onChanged: () => void) {
  const [state, setState] = useState<State>({ status: "unknown" });
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let current = true;
    loadOwnPin()
      .then((next) => current && setState(next))
      .catch(() => current && setState(NO_PIN));

    return () => {
      current = false;
    };
  }, [revision]);

  const saveDetails = useCallback(
    async (pin: NewPin) => {
      const response = await authorized("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pin),
      });
      if (!response?.ok) throw new Error("Unable to save your changes");
      reload();
      onChanged();
    },
    [reload, onChanged],
  );

  const saveHandles = useCallback(
    async (handles: ContactHandles) => {
      const response = await authorized("/api/me/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(handles),
      });
      if (!response?.ok) throw new Error("Unable to save those details");
      reload();
    },
    [reload],
  );

  const remove = useCallback(async () => {
    const response = await authorized("/api/me/pin", { method: "DELETE" });
    if (!response?.ok) throw new Error("Unable to remove your pin");
    setState(NO_PIN);
    onChanged();
  }, [onChanged]);

  return { state, reload, saveDetails, saveHandles, remove };
}
