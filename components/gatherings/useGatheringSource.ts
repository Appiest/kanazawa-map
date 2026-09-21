"use client";

import { useEffect } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { GATHERING_SOURCE_ID } from "@/lib/config";
import type { Gathering } from "@/lib/gatherings/repository";
import { gatheringLayer } from "@/components/map/pin-layers";
import { whenStyleReady } from "@/components/map/useMapInstance";

function toCollection(gatherings: Gathering[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: gatherings.map((gathering) => ({
      type: "Feature",
      id: gathering.seq,
      geometry: { type: "Point", coordinates: [gathering.lng, gathering.lat] },
      properties: { seq: gathering.seq, title: gathering.title },
    })),
  };
}

/**
 * Gatherings are few and never clustered: each one is a specific invitation,
 * and folding three of them into a number would throw away the only thing that
 * makes them worth looking at.
 */
export function useGatheringSource(map: MapLibreMap | null, gatherings: Gathering[]) {
  useEffect(() => {
    if (!map) return;

    whenStyleReady(map, () => {
      const existing = map.getSource<GeoJSONSource>(GATHERING_SOURCE_ID);
      if (existing) {
        existing.setData(toCollection(gatherings));
        return;
      }

      map.addSource(GATHERING_SOURCE_ID, { type: "geojson", data: toCollection(gatherings) });
      map.addLayer(gatheringLayer);
    });
  }, [map, gatherings]);
}
