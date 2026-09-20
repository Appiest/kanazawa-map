"use client";

import { useEffect } from "react";
import type { GeoJSONSource, MapLayerMouseEvent, Map as MapLibreMap } from "maplibre-gl";
import { PIN_SOURCE_ID } from "@/lib/config";
import { CLUSTER_LAYER_ID, PIN_LAYER_ID } from "./pin-layers";

const HOVERABLE_LAYERS = [PIN_LAYER_ID, CLUSTER_LAYER_ID, "anchors-label"];

function readSeq(event: MapLayerMouseEvent): number | null {
  const seq = event.features?.[0]?.properties?.seq;
  return typeof seq === "number" ? seq : null;
}

/** Opening a cluster flies to the zoom where it breaks apart. */
async function expandCluster(map: MapLibreMap, event: MapLayerMouseEvent) {
  const feature = event.features?.[0];
  const clusterId = feature?.properties?.cluster_id;
  if (typeof clusterId !== "number" || feature?.geometry.type !== "Point") return;

  const source = map.getSource<GeoJSONSource>(PIN_SOURCE_ID);
  if (!source) return;

  const zoom = await source.getClusterExpansionZoom(clusterId);
  map.easeTo({
    center: feature.geometry.coordinates as [number, number],
    zoom,
    duration: 420,
  });
}

type Handlers = {
  onSelect: (seq: number) => void;
  onPrefetch: (seq: number) => void;
  onDismiss: () => void;
};

export function usePinInteractions(
  map: MapLibreMap | null,
  layersReady: boolean,
  { onSelect, onPrefetch, onDismiss }: Handlers,
) {
  useEffect(() => {
    if (!map || !layersReady) return;

    const canvas = map.getCanvas();
    const pointer = () => {
      canvas.style.cursor = "pointer";
    };
    const reset = () => {
      canvas.style.cursor = "";
    };

    const openPin = (event: MapLayerMouseEvent) => {
      const seq = readSeq(event);
      if (seq !== null) onSelect(seq);
    };

    const prefetchPin = (event: MapLayerMouseEvent) => {
      pointer();
      const seq = readSeq(event);
      if (seq !== null) onPrefetch(seq);
    };

    const openCluster = (event: MapLayerMouseEvent) => {
      void expandCluster(map, event);
    };

    // A click that hits no pin is a click on the map, which closes the card.
    const dismissOnBackground = (event: MapLayerMouseEvent) => {
      const hits = map.queryRenderedFeatures(event.point, { layers: [PIN_LAYER_ID, CLUSTER_LAYER_ID] });
      if (hits.length === 0) onDismiss();
    };

    map.on("click", PIN_LAYER_ID, openPin);
    map.on("click", CLUSTER_LAYER_ID, openCluster);
    map.on("click", dismissOnBackground);
    map.on("mousemove", PIN_LAYER_ID, prefetchPin);
    for (const layer of HOVERABLE_LAYERS) {
      map.on("mouseenter", layer, pointer);
      map.on("mouseleave", layer, reset);
    }

    return () => {
      map.off("click", PIN_LAYER_ID, openPin);
      map.off("click", CLUSTER_LAYER_ID, openCluster);
      map.off("click", dismissOnBackground);
      map.off("mousemove", PIN_LAYER_ID, prefetchPin);
      for (const layer of HOVERABLE_LAYERS) {
        map.off("mouseenter", layer, pointer);
        map.off("mouseleave", layer, reset);
      }
      reset();
    };
  }, [map, layersReady, onSelect, onPrefetch, onDismiss]);
}
