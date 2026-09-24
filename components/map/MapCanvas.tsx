"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AnchorPlace } from "@/lib/pins/repository";
import { useContact } from "@/lib/pins/useContact";
import { useEnsureContact } from "@/lib/pins/useEnsureContact";
import { usePinDetail } from "@/lib/pins/usePinDetail";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { GatheringFlow } from "@/components/gatherings/GatheringFlow";
import { useGatheringSource } from "@/components/gatherings/useGatheringSource";
import { MyPin } from "@/components/mine/MyPin";
import { PinControls } from "@/components/mine/PinControls";
import { useMyPin } from "@/lib/pins/useMyPin";
import { useGatherings } from "@/lib/gatherings/useGatherings";
import { KeyboardPins } from "./KeyboardPins";
import { InterestFilterButton, InterestFilterPanel } from "./InterestFilter";
import { MapHeader } from "./MapHeader";
import { PinCard } from "./PinCard";
import { SELECTED_LAYER_ID, selectionFilter } from "./pin-layers";
import { useMapInstance } from "./useMapInstance";
import { usePinInteractions } from "./usePinInteractions";
import { useOrientToViewer } from "./useOrientToViewer";
import { usePinSource } from "./usePinSource";
import { useInterestFilter } from "./useInterestFilter";
import { useVisiblePins } from "./useVisiblePins";

export default function MapCanvas({ anchors }: { anchors: AnchorPlace[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useMapInstance(container);
  const filter = useInterestFilter();
  const [managing, setManaging] = useState(false);
  const { count, error, layersReady, refresh } = usePinSource(map, anchors, filter.selected);
  const [selected, setSelected] = useState<number | null>(null);
  const { state, prefetch } = usePinDetail(selected);
  const contact = useContact(selected);
  useEnsureContact();
  useOrientToViewer(map, layersReady);
  const visible = useVisiblePins(map, layersReady);
  const { gatherings, post } = useGatherings();
  useGatheringSource(map, gatherings);

  const mine = useMyPin(refresh);
  const mySeq = mine.state.status === "mine" ? mine.state.pin.seq : null;

  const dismiss = useCallback(() => setSelected(null), []);

  // Clicking your own tag manages it. Showing somebody a read-only card of
  // themselves, with a locked contact row and a report link, would be absurd.
  const openPin = useCallback(
    (seq: number) => {
      if (seq === mySeq) {
        setSelected(null);
        setManaging(true);
        return;
      }
      setSelected(seq);
    },
    [mySeq],
  );

  usePinInteractions(map, layersReady, {
    onSelect: openPin,
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
      <MapHeader count={count} visible={visible} error={error} ready={layersReady}>
        <InterestFilterButton
          selected={filter.selected}
          onClear={filter.clear}
          onOpen={() => {
            dismiss();
            filter.setOpen(true);
          }}
        />
      </MapHeader>
      {filter.open ? (
        <InterestFilterPanel
          selected={filter.selected}
          onToggle={filter.toggle}
          onClear={filter.clear}
          onClose={() => filter.setOpen(false)}
        />
      ) : null}
      <KeyboardPins map={map} layersReady={layersReady} onSelect={openPin} />
      <PinCard detail={state} contact={contact} onClose={dismiss} />
      <PinControls
        map={map}
        controls={mine}
        onChanged={refresh}
        onManage={() => setManaging(true)}
        onOpen={dismiss}
      />
      {managing && mine.state.status === "mine" ? (
        <MyPin
          pin={mine.state.pin}
          map={map}
          controls={mine}
          onClose={() => setManaging(false)}
        />
      ) : null}
      <GatheringFlow map={map} onPost={post} onOpen={dismiss} />
    </div>
  );
}
