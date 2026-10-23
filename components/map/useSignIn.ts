"use client";

import { useCallback, useEffect, useState } from "react";
import { safeReturnPath } from "@/lib/auth/returnPath";
import type { Session } from "@/lib/supabase/useSession";
import { useLocationSearch } from "@/lib/useLocationSearch";

export type SignInControl = {
  isOpen: boolean;
  returnTo: string | null;
  open: () => void;
  close: () => void;
};

/**
 * Somebody who started on a page of the website arrives back here from the
 * email link with `?next=/that/page`, and is sent on to it once the session
 * lands. Only a path on this origin is followed.
 */
function useReturnAfterSignIn(session: Session, returnTo: string | null) {
  useEffect(() => {
    if (session.status !== "in") return;
    const next = safeReturnPath(returnTo, window.location.origin);
    if (next) window.location.assign(next);
  }, [session.status, returnTo]);
}

/** The sign-in panel on the full map. `?signin=1` opens it on arrival. */
export function useSignIn(session: Session): SignInControl {
  const params = useLocationSearch();
  const returnTo = params.get("next");
  const askedOnArrival = params.get("signin") === "1";
  const [choice, setChoice] = useState<"open" | "closed" | null>(null);

  useReturnAfterSignIn(session, returnTo);

  const wanted = choice === null ? askedOnArrival : choice === "open";
  return {
    isOpen: session.status === "out" && wanted,
    returnTo,
    open: useCallback(() => setChoice("open"), []),
    close: useCallback(() => setChoice("closed"), []),
  };
}
