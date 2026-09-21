"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { MapPinIcon } from "@phosphor-icons/react";
import { AddPinFlow } from "@/components/add/AddPinFlow";
import { Button } from "@/components/ui/Button";
import { useMyPin } from "@/lib/pins/useMyPin";
import { MyPin } from "./MyPin";

const CORNER = "pointer-events-auto absolute right-4 bottom-4 z-10 sm:right-6 sm:bottom-6";

type Props = {
  map: MapLibreMap | null;
  onChanged: () => void;
  onOpen: () => void;
};

/**
 * One control in the corner. Someone who is already on the map manages the pin
 * they have; everyone else is offered one.
 */
export function PinControls({ map, onChanged, onOpen }: Props) {
  const controls = useMyPin(onChanged);
  const [managing, setManaging] = useState(false);

  const afterPlanting = useCallback(() => {
    onChanged();
    controls.reload();
  }, [onChanged, controls]);

  if (controls.state.status === "unknown") return null;

  if (controls.state.status === "none") {
    return <AddPinFlow map={map} onPlanted={afterPlanting} onOpen={onOpen} />;
  }

  if (!managing) {
    return (
      <div className={CORNER}>
        <Button
          onClick={() => {
            onOpen();
            setManaging(true);
          }}
        >
          <MapPinIcon size={16} weight="fill" aria-hidden />
          Your pin
        </Button>
      </div>
    );
  }

  return (
    <MyPin
      pin={controls.state.pin}
      map={map}
      controls={controls}
      onClose={() => setManaging(false)}
    />
  );
}
