"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { NewPin, PinDetail } from "@/lib/pins/repository";
import { usePlacement } from "./usePlacement";
import { usePlanting } from "./usePlanting";

export type Step = "closed" | "placing" | "describing" | "signingIn" | "sent" | "done";

export type Details = { displayName: string; neighborhood: string; note: string };

const EMPTY: Details = { displayName: "", neighborhood: "", note: "" };

type Recovery = {
  step: Step;
  details: Details;
  position: { lng: number; lat: number } | null;
};

/**
 * A restore that failed leaves a draft nobody can see. Rather than dropping it,
 * the flow reopens on what was written, with the reason it did not save. The
 * draft carries its own coordinates, because the page reloaded since the tag
 * was placed and placement has nothing left in it.
 */
function withRecoveredDraft(
  draft: NewPin | null,
  edited: boolean,
  current: Recovery,
): Recovery {
  if (!draft) return current;
  return {
    step: current.step === "closed" ? "describing" : current.step,
    details: edited
      ? current.details
      : { displayName: draft.displayName, neighborhood: draft.neighborhood, note: draft.note ?? "" },
    position: current.position ?? { lng: draft.lng, lat: draft.lat },
  };
}

export function useAddPin(map: MapLibreMap | null, onPlanted: () => void) {
  const [step, setStep] = useState<Step>("closed");
  const [details, setDetails] = useState<Details>(EMPTY);
  const [email, setEmail] = useState("");
  const [edited, setEdited] = useState(false);

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

  const shown = withRecoveredDraft(planting.restoreError ? planting.pendingDraft() : null, edited, {
    step,
    details,
    position: placement.position,
  });
  const shownDetails = shown.details;

  const position = shown.position;

  const submit = useCallback(async () => {
    if (!position) return;
    const outcome = await planting.plant({
      displayName: shownDetails.displayName.trim(),
      neighborhood: shownDetails.neighborhood.trim(),
      note: shownDetails.note.trim() || null,
      ...position,
    });
    if (outcome?.kind === "needs-sign-in") setStep("signingIn");
  }, [shownDetails, position, planting]);

  const sendLink = useCallback(async () => {
    if (await planting.sendLink(email)) setStep("sent");
  }, [email, planting]);

  return {
    step: shown.step,
    details: shownDetails,
    email,
    busy: planting.busy || placement.locating,
    error: planting.error ?? planting.restoreError ?? placement.locateError,
    setEmail,
    patchDetails: (patch: Partial<Details>) => {
      setEdited(true);
      setDetails({ ...shownDetails, ...patch });
    },
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
