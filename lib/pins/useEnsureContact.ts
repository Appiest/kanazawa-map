"use client";

import { useEffect } from "react";
import { authIsAvailable, currentAccessToken } from "@/lib/supabase/browser";

/**
 * Backfills the signed-in person's contact row once per visit. Pins planted
 * before contact details existed have none, and nobody should have to
 * re-place a pin to fix that.
 */
export function useEnsureContact() {
  useEffect(() => {
    if (!authIsAvailable) return;

    currentAccessToken().then((token) => {
      if (!token) return;
      void fetch("/api/me/contact", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    });
  }, []);
}
