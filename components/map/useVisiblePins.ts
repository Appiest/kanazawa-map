"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { CLUSTER_LAYER_ID, PIN_LAYER_ID } from "./pin-layers";

/**
 * How many people are inside the current view, clusters counted by their size.
 * A map that is empty where someone is looking needs to say so; staying silent
 * reads as broken rather than as early.
 */
export function useVisiblePins(map: MapLibreMap | null, layersReady: boolean): number | null {
  const [visible, setVisible] = useState<number | null>(null);

  useEffect(() => {
    if (!map || !layersReady) return;

    const count = () => {
      const layers = [PIN_LAYER_ID, CLUSTER_LAYER_ID].filter((id) => map.getLayer(id));
      if (layers.length === 0) return;

      const seen = new Set<string>();
      let total = 0;
      for (const feature of map.queryRenderedFeatures({ layers })) {
        const clusterId = feature.properties.cluster_id;
        const key = clusterId === undefined ? `p${feature.properties.seq}` : `c${clusterId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        total += typeof feature.properties.point_count === "number" ? feature.properties.point_count : 1;
      }
      setVisible(total);
    };

    count();
    map.on("moveend", count);
    map.on("idle", count);

    return () => {
      map.off("moveend", count);
      map.off("idle", count);
    };
  }, [map, layersReady]);

  return visible;
}
