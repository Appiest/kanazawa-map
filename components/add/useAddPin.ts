"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { PinDetail } from "@/lib/pins/repository";
import { usePlacement } from "./usePlacement";
import { usePlanting } from "./usePlanting";

export type Step = "closed" | "placing" | "describing" | "signingIn" | "sent" | "done";

export type Details = { displayName: string; neighborhood: string; note: string };

const EMPTY: Details = { displayName: "", neighborhood: "", note: "" };

export function useAddPin(map: MapLibreMap | null, onPlanted: () => void) {
  const [step, setStep] = useState<Step>("closed");
  const [details, setDetails] = useState<Details>(EMPTY);
  const [email, setEmail] = useState("");

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
    const outcome = await planting.plant({
      displayName: details.displayName.trim(),
      neighborhood: details.neighborhood.trim(),
      note: details.note.trim() || null,
      ...placement.position,
    });
    if (outcome?.kind === "needs-sign-in") setStep("signingIn");
  }, [details, placement.position, planting]);

  const sendLink = useCallback(async () => {
    if (await planting.sendLink(email)) setStep("sent");
  }, [email, planting]);

  return {
    step,
    details,
    email,
    busy: planting.busy || placement.locating,
    error: planting.error ?? placement.locateError,
    setEmail,
    patchDetails: (patch: Partial<Details>) => setDetails((current) => ({ ...current, ...patch })),
    open: () => setStep("placing"),
    close: () => setStep("closed"),
    back: () => setStep("placing"),
    backToDetails: () => setStep("describing"),
    locate: placement.locate,
    confirmPlacement,
    submit,
    sendLink,
  };
}

export type AddPinFlowState = ReturnType<typeof useAddPin>;
