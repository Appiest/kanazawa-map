"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ChosenPrecision, PinDetail } from "@/lib/pins/repository";
import type { InterestId } from "@/lib/interests";
import type { ConnectionId } from "@/lib/connections";
import { toggled } from "@/lib/vocabulary";
import { usePlacement, type Surroundings } from "./usePlacement";
import { usePlanting } from "./usePlanting";

export type Step = "closed" | "placing" | "connecting" | "describing" | "interests" | "done";

export type Details = {
  displayName: string;
  neighborhood: string;
  note: string;
  precision: ChosenPrecision;
  interests: InterestId[];
  connections: ConnectionId[];
};

const EMPTY: Details = {
  displayName: "",
  neighborhood: "",
  note: "",
  precision: "city",
  interests: [],
  connections: [],
};

const NO_AREA = "We could not work out which city that is. Move your tag a little and try again.";

/** The level somebody asked for, or the other one when only that is known. */
function levelFor(surroundings: Surroundings, wanted: ChosenPrecision): ChosenPrecision {
  if (surroundings[wanted]) return wanted;
  return wanted === "city" ? "region" : "city";
}

/**
 * Placing a pin, now that signing in happens before the map is ever shown.
 * The flow is place, say how you are connected to Japan, describe yourself,
 * pick interests, done.
 */
export function useAddPin(map: MapLibreMap | null, onPlanted: () => void) {
  const [step, setStep] = useState<Step>("closed");
  const [details, setDetails] = useState<Details>(EMPTY);
  const [areaError, setAreaError] = useState<string | null>(null);

  const placement = usePlacement(map);
  const planting = usePlanting(
    useCallback(
      (pin: PinDetail) => {
        setDetails((current) => ({ ...current, displayName: pin.displayName, neighborhood: pin.neighborhood, note: "" }));
        setStep("done");
        onPlanted();
      },
      [onPlanted],
    ),
  );

  const confirmPlacement = useCallback(async () => {
    setAreaError(null);
    setStep("connecting");
    const found = await placement.capture();
    setDetails((current) => {
      const precision = levelFor(found, current.precision);
      return { ...current, precision, neighborhood: found[precision]?.name ?? "" };
    });
  }, [placement]);

  /** Switching level swaps in that level's name, which the person can still edit. */
  const choosePrecision = useCallback(
    (precision: ChosenPrecision) =>
      setDetails((current) => ({
        ...current,
        precision,
        neighborhood: placement.surroundings?.[precision]?.name ?? current.neighborhood,
      })),
    [placement.surroundings],
  );

  const submit = useCallback(async () => {
    // Only the middle of the chosen area is sent, so the spot under the tag
    // never leaves this browser. Without an area the pin is refused rather
    // than published somewhere nobody chose.
    const area = placement.surroundings?.[details.precision];
    if (!area) {
      setAreaError(NO_AREA);
      return;
    }

    await planting.plant({
      displayName: details.displayName.trim(),
      neighborhood: details.neighborhood.trim(),
      note: details.note.trim() || null,
      lng: area.centre.lng,
      lat: area.centre.lat,
      precision: details.precision,
      interests: details.interests,
      connections: details.connections,
    });
  }, [details, placement.surroundings, planting]);

  return {
    step,
    details,
    surroundings: placement.surroundings,
    busy: planting.busy || placement.locating,
    error: areaError ?? planting.error ?? placement.locateError,
    patchDetails: (patch: Partial<Details>) => setDetails((current) => ({ ...current, ...patch })),
    choosePrecision,
    goTo: setStep,
    toggleInterest: (id: InterestId) =>
      setDetails((current) => ({ ...current, interests: toggled(current.interests, id) })),
    toggleConnection: (id: ConnectionId) =>
      setDetails((current) => ({ ...current, connections: toggled(current.connections, id) })),
    open: () => setStep("placing"),
    close: () => setStep("closed"),
    locate: placement.locate,
    confirmPlacement,
    submit,
  };
}

export type AddPinFlowState = ReturnType<typeof useAddPin>;
