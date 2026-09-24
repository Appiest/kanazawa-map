"use client";

import { useCallback, useEffect, useState } from "react";
import type { PinDetail } from "./repository";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pin: PinDetail }
  | { status: "error"; message: string };

/** A pin's details do not change while you look at it, so results are kept. */
const cache = new Map<number, PinDetail>();
const failed = new Map<number, string>();

async function loadDetail(seq: number): Promise<PinDetail> {
  const cached = cache.get(seq);
  if (cached) return cached;

  const response = await fetch(`/api/pins/${seq}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Pin ${seq} returned ${response.status}`);
  }

  const pin = (await response.json()) as PinDetail;
  cache.set(seq, pin);
  return pin;
}

function readState(seq: number | null): State {
  if (seq === null) return { status: "idle" };
  const pin = cache.get(seq);
  if (pin) return { status: "ready", pin };
  const why = failed.get(seq);
  if (why) return { status: "error", message: why };
  return { status: "loading" };
}

/**
 * Card content for the open pin. Hovering a pin prefetches it, so by the time
 * someone clicks there is usually nothing left to wait for.
 */
export function usePinDetail(seq: number | null) {
  const [, setRevision] = useState(0);
  const settle = useCallback(() => setRevision((n) => n + 1), []);

  const prefetch = useCallback(
    (wanted: number) => {
      if (cache.has(wanted) || failed.has(wanted)) return;
      loadDetail(wanted).then(settle, () => undefined);
    },
    [settle],
  );

  useEffect(() => {
    if (seq === null || cache.has(seq) || failed.has(seq)) return;

    let current = true;
    loadDetail(seq).then(
      () => current && settle(),
      (cause: unknown) => {
        failed.set(seq, cause instanceof Error ? cause.message : "Could not load that pin");
        if (current) settle();
      },
    );

    return () => {
      current = false;
    };
  }, [seq, settle]);

  return { state: readState(seq), prefetch };
}
