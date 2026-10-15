"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { LAYERS_BY_GROUP, type MarkerGroup } from "./pin-layers";

export type Shown = Record<MarkerGroup, boolean>;

export const SHOW_EVERYTHING: Shown = { people: true, places: true, events: true };

/**
 * Hides a group by switching its layers off rather than emptying its source,
 * so turning it back on is instant. `layerCount` re-runs this when a layer
 * arrives late, as the gatherings layer does.
 */
export function useMarkerVisibility(map: MapLibreMap | null, shown: Shown, layerCount: number) {
  useEffect(() => {
    if (!map) return;
    for (const [group, layers] of Object.entries(LAYERS_BY_GROUP)) {
      const visibility = shown[group as MarkerGroup] ? "visible" : "none";
      for (const id of layers) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
      }
    }
  }, [map, shown, layerCount]);
}
