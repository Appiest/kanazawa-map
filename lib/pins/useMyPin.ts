"use client";

import { useCallback, useEffect, useState } from "react";
import type { HandleSettings, NewPin, OwnPin } from "./types";
import { authorizedFetch, jsonBody, throwUnlessOk } from "@/lib/http/client";

type State =
  | { status: "unknown" }
  | { status: "none" }
  | { status: "mine"; pin: OwnPin };

const NO_PIN: State = { status: "none" };

async function loadOwnPin(): Promise<State> {
  const response = await authorizedFetch("/me/pin");
  if (!response?.ok) return NO_PIN;

  const body = (await response.json()) as { pin: OwnPin | null };
  return body.pin ? { status: "mine", pin: body.pin } : NO_PIN;
}

/**
 * The signed-in person's own pin, and the ways they can change it. Re-read
 * whenever the session token changes, since that changes whose pin it is.
 */
export function useMyPin(sessionToken: string | null, onChanged: () => void) {
  const [state, setState] = useState<State>({ status: "unknown" });
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let current = true;
    const next = sessionToken ? loadOwnPin() : Promise.resolve(NO_PIN);
    next.then(
      (found) => current && setState(found),
      () => current && setState(NO_PIN),
    );

    return () => {
      current = false;
    };
  }, [revision, sessionToken]);

  const saveDetails = useCallback(
    async (pin: NewPin) => {
      await throwUnlessOk(await authorizedFetch("/pins", jsonBody(pin, { method: "POST" })), "Unable to save your changes");
      reload();
      onChanged();
    },
    [reload, onChanged],
  );

  const saveHandles = useCallback(
    async (handles: HandleSettings) => {
      await throwUnlessOk(
        await authorizedFetch("/me/pin", jsonBody(handles, { method: "PATCH" })),
        "Unable to save those details",
      );
      reload();
    },
    [reload],
  );

  const remove = useCallback(async () => {
    await throwUnlessOk(await authorizedFetch("/me/pin", { method: "DELETE" }), "Unable to remove your pin");
    setState(NO_PIN);
    onChanged();
  }, [onChanged]);

  return { state, reload, saveDetails, saveHandles, remove };
}
