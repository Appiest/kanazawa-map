"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { PinDetail } from "@/lib/pins/repository";
import { usePlacement } from "./usePlacement";
import { usePlanting } from "./usePlanting";

export type Step = "closed" | "placing" | "describing" | "done";

export type Details = { displayName: string; neighborhood: string; note: string };

const EMPTY: Details = { displayName: "", neighborhood: "", note: "" };

/**
 * Placing a pin, now that signing in happens before the map is ever shown.
 * There is no email step and nothing held across a page load, so the flow is
 * place, describe, done.
 */
export function useAddPin(map: MapLibreMap | null, onPlanted: () => void) {
  const [step, setStep] = useState<Step>("closed");
  const [details, setDetails] = useState<Details>(EMPTY);

  const placement = usePlacement(map);
  const planting = usePlanting(
    useCallback(
      (pin: PinDetail) => {
        setDetails({ displayName: pin.displayName, neighborhood: pin.neighborhood, note: "" });
        setStep("done");
        onPlanted();
      },
      [onPlanted],
    ),
  );

  const confirmPlacement = useCallback(async () => {
    setStep("describing");
    const suggestion = await placement.capture();
    setDetails((current) => (current.neighborhood ? current : { ...current, neighborhood: suggestion }));
  }, [placement]);

  const submit = useCallback(async () => {
    if (!placement.position) return;
    await planting.plant({
      displayName: details.displayName.trim(),
      neighborhood: details.neighborhood.trim(),
      note: details.note.trim() || null,
      ...placement.position,
    });
  }, [details, placement.position, planting]);

  return {
    step,
    details,
    busy: planting.busy || placement.locating,
    error: planting.error ?? placement.locateError,
    patchDetails: (patch: Partial<Details>) => setDetails((current) => ({ ...current, ...patch })),
    open: () => setStep("placing"),
    close: () => setStep("closed"),
    back: () => setStep("placing"),
    locate: placement.locate,
    confirmPlacement,
    submit,
  };
}

export type AddPinFlowState = ReturnType<typeof useAddPin>;
