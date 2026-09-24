"use client";

import { useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { MapPinIcon } from "@phosphor-icons/react";
import { AddPinFlow } from "@/components/add/AddPinFlow";
import { Button } from "@/components/ui/Button";
import type { useMyPin } from "@/lib/pins/useMyPin";

const CORNER = "pointer-events-auto absolute right-4 bottom-4 z-10 sm:right-6 sm:bottom-6";

type Props = {
  map: MapLibreMap | null;
  controls: ReturnType<typeof useMyPin>;
  onChanged: () => void;
  onManage: () => void;
  onOpen: () => void;
};

/**
 * The control in the corner. Someone already on the map is offered their own
 * pin; everyone else is offered one. The panel itself belongs to the map,
 * which also opens it when somebody clicks their own tag.
 */
export function PinControls({ map, controls, onChanged, onManage, onOpen }: Props) {
  const afterPlanting = useCallback(() => {
    onChanged();
    controls.reload();
  }, [onChanged, controls]);

  if (controls.state.status === "unknown") return null;

  if (controls.state.status === "none") {
    return <AddPinFlow map={map} onPlanted={afterPlanting} onOpen={onOpen} />;
  }

  return (
    <div className={CORNER} data-touch-target>
      <Button
        onClick={() => {
          onOpen();
          onManage();
        }}
      >
        <MapPinIcon size={16} weight="fill" aria-hidden />
        Your pin
      </Button>
    </div>
  );
}
