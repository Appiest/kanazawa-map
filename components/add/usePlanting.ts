"use client";

import { useCallback, useEffect, useState } from "react";
import { clearDraft, markJustPlanted, readDraft, saveDraft } from "@/lib/pins/draft";
import type { NewPin, PinDetail } from "@/lib/pins/repository";
import { authIsAvailable, currentAccessToken, sendSignInLink } from "@/lib/supabase/browser";

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

type Outcome = { kind: "planted"; pin: PinDetail } | { kind: "needs-sign-in" };

/** Saving a pin, and the email round trip that has to happen first. */
export function usePlanting(onPlanted: (pin: PinDetail) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(
    (pin: PinDetail) => {
      clearDraft();
      onPlanted(pin);
    },
    [onPlanted],
  );

  // Returning from an email link: whatever was written before leaving is saved.
  useEffect(() => {
    if (!authIsAvailable) return;
    const draft = readDraft();
    if (!draft) return;

    currentAccessToken().then((token) => {
      if (!token) return;
      postPin(draft, token).then((pin) => {
        markJustPlanted();
        finish(pin);
      }, () => clearDraft());
    });
  }, [finish]);

  const plant = useCallback(
    async (pin: NewPin): Promise<Outcome | null> => {
      setError(null);
      const token = authIsAvailable ? await currentAccessToken() : null;

      if (authIsAvailable && !token) {
        saveDraft(pin);
        return { kind: "needs-sign-in" };
      }

      setBusy(true);
      try {
        const saved = await postPin(pin, token);
        finish(saved);
        return { kind: "planted", pin: saved };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save your pin");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [finish],
  );

  const sendLink = useCallback(async (email: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await sendSignInLink(email.trim());
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the link");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { plant, sendLink, busy, error };
}
