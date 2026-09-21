"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AnchorPlace } from "@/lib/pins/repository";
import { useContact } from "@/lib/pins/useContact";
import { useEnsureContact } from "@/lib/pins/useEnsureContact";
import { usePinDetail } from "@/lib/pins/usePinDetail";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { AddPinFlow } from "@/components/add/AddPinFlow";
import { PinCard } from "./PinCard";
import { SELECTED_LAYER_ID, selectionFilter } from "./pin-layers";
import { useMapInstance } from "./useMapInstance";
import { usePinInteractions } from "./usePinInteractions";
import { usePinSource } from "./usePinSource";

export default function MapCanvas({ anchors }: { anchors: AnchorPlace[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useMapInstance(container);
  const { layersReady, refresh } = usePinSource(map, anchors);
  const [selected, setSelected] = useState<number | null>(null);
  const { state, prefetch } = usePinDetail(selected);
  const contact = useContact(selected);
  useEnsureContact();

  const dismiss = useCallback(() => setSelected(null), []);

  usePinInteractions(map, layersReady, {
    onSelect: setSelected,
    onPrefetch: prefetch,
    onDismiss: dismiss,
  });

  // The open pin is marked by swapping one layer's filter, which is cheaper
  // than re-sending the source data.
  useEffect(() => {
    if (!map || !layersReady) return;
    map.setFilter(SELECTED_LAYER_ID, selectionFilter(selected));
  }, [map, layersReady, selected]);

  useEscapeKey(selected !== null, dismiss);

  return (
    <div className="absolute inset-0 bg-bg-page">
      <div ref={container} className="h-full w-full" />
      <PinCard detail={state} contact={contact} onClose={dismiss} />
      <AddPinFlow map={map} onPlanted={refresh} onOpen={dismiss} />
    </div>
  );
}
