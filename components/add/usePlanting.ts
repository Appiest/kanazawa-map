"use client";

import { useCallback, useState } from "react";
import type { NewPin, PinDetail } from "@/lib/pins/repository";
import { currentAccessToken } from "@/lib/supabase/browser";

async function postPin(pin: NewPin, token: string | null): Promise<PinDetail> {
  const response = await fetch("/api/pins", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(pin),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Unable to save your pin");
  return body as PinDetail;
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
        onPlanted(await postPin(pin, await currentAccessToken()));
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
