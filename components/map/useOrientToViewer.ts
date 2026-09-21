"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { cameraDuration } from "@/lib/motion";

/** Metro level: near enough to recognise, wide enough to see who else is around. */
const ARRIVAL_ZOOM = 10.5;
const ASKED_KEY = "kanazawa.location-asked";

function alreadyAsked(): boolean {
  try {
    return window.sessionStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberAsked(): void {
  try {
    window.sessionStorage.setItem(ASKED_KEY, "1");
  } catch {
    // Worst case it asks again next visit, which the browser answers from its
    // own remembered permission anyway.
  }
}

/**
 * Asks once, on arrival, and flies to whatever comes back. Landing on the whole
 * country means scrolling before seeing anybody; landing on your own city means
 * the first thing you see is your neighbours.
 *
 * A refusal is not an error. The map stays where it is and nothing is said,
 * because the national view is a perfectly good place to start.
 */
export function useOrientToViewer(map: MapLibreMap | null, ready: boolean) {
  useEffect(() => {
    if (!map || !ready || alreadyAsked() || !navigator.geolocation) return;
    rememberAsked();

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled) return;
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: ARRIVAL_ZOOM,
          duration: cameraDuration(2200),
          essential: true,
        });
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );

    return () => {
      cancelled = true;
    };
  }, [map, ready]);
}
