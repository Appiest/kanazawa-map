"use client";

import { useCallback, useEffect, useState } from "react";
import type { Gathering, NewGathering } from "./repository";
import { currentAccessToken } from "@/lib/supabase/browser";

async function authorized(path: string, init: RequestInit = {}): Promise<Response | null> {
  const token = await currentAccessToken();
  if (!token) return null;
  return fetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

async function loadUpcoming(): Promise<Gathering[]> {
  const response = await authorized("/api/gatherings");
  if (!response?.ok) return [];
  const body = (await response.json()) as { gatherings: Gathering[] };
  return body.gatherings;
}

/** What is coming up, and the two things a host can do about their own. */
export function useGatherings() {
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let current = true;
    loadUpcoming().then(
      (next) => current && setGatherings(next),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [revision]);

  const post = useCallback(
    async (gathering: NewGathering) => {
      const response = await authorized("/api/gatherings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gathering),
      });
      if (!response?.ok) {
        const body = await response?.json().catch(() => null);
        throw new Error(body?.error ?? "Could not post that");
      }
      reload();
    },
    [reload],
  );

  const cancel = useCallback(
    async (seq: number) => {
      const response = await authorized(`/api/gatherings?seq=${seq}`, { method: "DELETE" });
      if (!response?.ok) throw new Error("Could not call that off");
      reload();
    },
    [reload],
  );

  return { gatherings, post, cancel, reload };
}
