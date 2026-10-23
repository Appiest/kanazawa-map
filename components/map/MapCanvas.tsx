"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { AnchorPlace } from "@/lib/pins/types";
import { usePinHandles } from "@/lib/contact/usePinHandles";
import { usePinDetail } from "@/lib/pins/usePinDetail";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { useGatheringSource } from "@/components/gatherings/useGatheringSource";
import { useMyPin } from "@/lib/pins/useMyPin";
import { useGatherings } from "@/lib/gatherings/useGatherings";
import type { Session } from "@/lib/supabase/useSession";
import { EmbedControls } from "./EmbedControls";
import { FullMapControls } from "./FullMapControls";
import { KeyboardPins } from "./KeyboardPins";
import { InterestFilterButton, InterestFilterPanel } from "./InterestFilter";
import { MapHeader } from "./MapHeader";
import { PinCard } from "./PinCard";
import type { Viewer } from "./PinContact";
import { SELECTED_LAYER_ID, selectionFilter } from "./pin-layers";
import { useMapInstance } from "./useMapInstance";
import { usePinInteractions } from "./usePinInteractions";
import { useOrientToViewer } from "./useOrientToViewer";
import { usePinSource } from "./usePinSource";
import { useInterestFilter } from "./useInterestFilter";
import { useMarkerVisibility, type Shown } from "./useMarkerVisibility";
import type { SignInControl } from "./useSignIn";
import { useVisiblePins } from "./useVisiblePins";

/**
 * The open pin is marked by swapping one layer's filter, which is cheaper than
 * re-sending the source data.
 */
function useSelectionLayer(map: MapLibreMap | null, layersReady: boolean, selected: number | null) {
  useEffect(() => {
    if (!map || !layersReady) return;
    map.setFilter(SELECTED_LAYER_ID, selectionFilter(selected));
  }, [map, layersReady, selected]);
}

/** `full` is the page at /map; `embed` is the frame the website shows, with no way to edit. */
export type MapVariant = { kind: "full"; signIn: SignInControl } | { kind: "embed" };

type Props = { anchors: AnchorPlace[]; shown: Shown; session: Session; variant: MapVariant };

/**
 * Clicking your own tag manages it. Showing somebody a read-only card of
 * themselves, with a contact row and a report link, would be absurd.
 */
function useOpenPin(mySeq: number | null, canManage: boolean) {
  const [selected, setSelected] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const openPin = useCallback(
    (seq: number) => {
      const isMine = canManage && seq === mySeq;
      setSelected(isMine ? null : seq);
      if (isMine) setManaging(true);
    },
    [mySeq, canManage],
  );
  const dismiss = useCallback(() => setSelected(null), []);
  return { selected, openPin, dismiss, managing, setManaging };
}

/** Who is looking at the card, and where "Sign in" takes them. The embed offers no sign-in on the card. */
function cardViewer(variant: MapVariant, signedIn: boolean, ownSeq: number | null, dismiss: () => void): Viewer {
  if (variant.kind === "embed") return { signedIn, ownSeq, onSignIn: null };
  return {
    signedIn,
    ownSeq,
    onSignIn: () => {
      dismiss();
      variant.signIn.open();
    },
  };
}

type ControlsProps = Omit<React.ComponentProps<typeof FullMapControls>, "signIn"> & {
  variant: MapVariant;
  sessionKnown: boolean;
};

/** Nothing until the session is read, so a signed-in visitor never sees "Sign in" flash past. */
function MapControls({ variant, sessionKnown, ...full }: ControlsProps) {
  if (!sessionKnown) return null;
  if (variant.kind === "full") return <FullMapControls {...full} signIn={variant.signIn} />;
  const { status } = full.mine.state;
  return <EmbedControls signedIn={full.signedIn} onMap={status === "unknown" ? null : status === "mine"} />;
}

export default function MapCanvas({ anchors, shown, session, variant }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const isEmbed = variant.kind === "embed";
  const token = session.status === "in" ? session.token : null;
  const map = useMapInstance(container, isEmbed);
  const filter = useInterestFilter();
  const { count, error, layersReady, refresh } = usePinSource(map, anchors, filter.selected);
  const mine = useMyPin(token, refresh);
  const mySeq = mine.state.status === "mine" ? mine.state.pin.seq : null;
  const { selected, openPin, dismiss, managing, setManaging } = useOpenPin(mySeq, !isEmbed);
  const { state, prefetch } = usePinDetail(selected);
  const contact = usePinHandles(selected, token !== null);
  useOrientToViewer(map, layersReady && !isEmbed);
  const visible = useVisiblePins(map, layersReady);
  const { gatherings, post } = useGatherings(token);
  useGatheringSource(map, gatherings);
  useMarkerVisibility(map, shown, (layersReady ? 1 : 0) + gatherings.length);

  usePinInteractions(map, layersReady, { onSelect: openPin, onPrefetch: prefetch, onDismiss: dismiss });
  useSelectionLayer(map, layersReady, selected);
  useEscapeKey(selected !== null, dismiss);

  const openFilter = () => {
    dismiss();
    filter.setOpen(true);
  };

  return (
    <div className="absolute inset-0 bg-bg-page">
      <div ref={container} className="h-full w-full" />
      <MapHeader count={count} visible={shown.people ? visible : null} error={error} ready={layersReady}>
        <InterestFilterButton selected={filter.selected} onClear={filter.clear} onOpen={openFilter} />
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
      <PinCard
        detail={state}
        contact={contact}
        viewer={cardViewer(variant, token !== null, mySeq, dismiss)}
        onClose={dismiss}
      />
      <MapControls
        variant={variant}
        sessionKnown={session.status !== "checking"}
        map={map}
        signedIn={token !== null}
        mine={mine}
        managing={managing}
        setManaging={setManaging}
        onChanged={refresh}
        onPostGathering={post}
        onOpenPanel={dismiss}
      />
    </div>
  );
}
