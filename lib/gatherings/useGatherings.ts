"use client";

import { useCallback, useEffect, useState } from "react";
import type { Gathering, NewGathering } from "./repository";
import { authorizedFetch, jsonBody, throwUnlessOk } from "@/lib/http/client";

async function loadUpcoming(): Promise<Gathering[]> {
  const response = await authorizedFetch("/gatherings");
  if (!response?.ok) return [];
  const body = (await response.json()) as { gatherings: Gathering[] };
  return body.gatherings;
}

/** What is coming up, and the two things a host can do about their own. */
export function useGatherings(sessionToken: string | null) {
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let current = true;
    const next = sessionToken ? loadUpcoming() : Promise.resolve([]);
    next.then(
      (next) => current && setGatherings(next),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [revision, sessionToken]);

  const post = useCallback(
    async (gathering: NewGathering) => {
      await throwUnlessOk(await authorizedFetch("/gatherings", jsonBody(gathering, { method: "POST" })), "Could not post that");
      reload();
    },
    [reload],
  );

  const cancel = useCallback(
    async (seq: number) => {
      await throwUnlessOk(await authorizedFetch(`/gatherings?seq=${seq}`, { method: "DELETE" }), "Could not call that off");
      reload();
    },
    [reload],
  );

  return { gatherings, post, cancel, reload };
}
