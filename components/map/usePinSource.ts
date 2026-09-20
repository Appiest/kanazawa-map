"use client";

import { useEffect, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { ANCHOR_SOURCE_ID, PIN_SOURCE_ID } from "@/lib/config";
import type { PinWorkerResponse } from "@/lib/pins/decode.worker";
import type { AnchorPlace } from "@/lib/pins/repository";
import { anchorLayer, clusterLayer, pinLayer, selectedPinLayer } from "./pin-layers";
import { whenStyleReady } from "./useMapInstance";

const EMPTY: GeoJSON.FeatureCollection<GeoJSON.Point> = { type: "FeatureCollection", features: [] };

function toAnchorCollection(places: AnchorPlace[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      id: place.id,
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: { name: place.name, blurb: place.blurb },
    })),
  };
}

function addSourcesAndLayers(map: MapLibreMap, anchors: AnchorPlace[]) {
  if (map.getSource(ANCHOR_SOURCE_ID)) return;

  map.addSource(ANCHOR_SOURCE_ID, { type: "geojson", data: toAnchorCollection(anchors) });
  map.addSource(PIN_SOURCE_ID, {
    type: "geojson",
    data: EMPTY,
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 13,
  });

  map.addLayer(anchorLayer);
  map.addLayer(clusterLayer);
  map.addLayer(pinLayer);
  map.addLayer(selectedPinLayer);
}

/**
 * Loads the pin payload through a worker and hands MapLibre the result.
 * MapLibre then clusters in its own worker, so neither decoding nor clustering
 * ever touches the main thread.
 */
export function usePinSource(map: MapLibreMap | null, anchors: AnchorPlace[]) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layersReady, setLayersReady] = useState(false);

  useEffect(() => {
    if (!map) return;

    const worker = new Worker(new URL("../../lib/pins/decode.worker.ts", import.meta.url));

    worker.addEventListener("message", (event: MessageEvent<PinWorkerResponse>) => {
      if (!event.data.ok) {
        setError(event.data.message);
        return;
      }
      const collection = event.data.collection;
      setCount(event.data.count);
      whenStyleReady(map, () => map.getSource<GeoJSONSource>(PIN_SOURCE_ID)?.setData(collection));
    });

    whenStyleReady(map, () => {
      addSourcesAndLayers(map, anchors);
      setLayersReady(true);
      worker.postMessage({ url: "/api/pins" });
    });

    return () => {
      worker.terminate();
      setLayersReady(false);
    };
  }, [map, anchors]);

  return { count, error, layersReady };
}
