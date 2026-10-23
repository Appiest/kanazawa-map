"use client";

import { useCallback, useState } from "react";
import type { NewPin, PinDetail } from "@/lib/pins/types";
import { authorizedFetch, jsonBody, throwUnlessOk } from "@/lib/http/client";

async function postPin(pin: NewPin): Promise<PinDetail> {
  const response = await throwUnlessOk(
    await authorizedFetch("/pins", jsonBody(pin, { method: "POST" })),
    "Unable to save your pin",
  );
  return (await response.json()) as PinDetail;
}

/**
 * Saving a pin. Signing in happens before the map is ever shown, so this is one
 * authenticated request with nothing to hold across a page load: no draft, no
 * email round trip, and no state that can be lost in between.
 */
export function usePlanting(onPlanted: (pin: PinDetail) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plant = useCallback(
    async (pin: NewPin): Promise<boolean> => {
      setError(null);
      setBusy(true);
      try {
        onPlanted(await postPin(pin));
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save your pin");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onPlanted],
  );

  return { plant, busy, error };
}
