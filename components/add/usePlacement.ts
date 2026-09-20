"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

export type Position = { lng: number; lat: number };

async function suggestNeighborhood(lng: number, lat: number): Promise<string> {
  try {
    const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    const body = (await response.json()) as { name: string | null };
    return body.name ?? "";
  } catch {
    // A missing suggestion just leaves the field empty for someone to type.
    return "";
  }
}

/** Where the tag goes: the map centre, steered by hand or by the browser. */
export function usePlacement(map: MapLibreMap | null) {
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const capture = useCallback(async (): Promise<string> => {
    if (!map) return "";
    const center = map.getCenter();
    setPosition({ lng: center.lng, lat: center.lat });
    return suggestNeighborhood(center.lng, center.lat);
  }, [map]);

  const locate = useCallback(() => {
    if (!map || !navigator.geolocation) {
      setLocateError("This browser cannot share your location. Move the map instead.");
      return;
    }

    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        map.easeTo({ center: [coords.longitude, coords.latitude], zoom: 14, duration: 900 });
      },
      () => {
        setLocating(false);
        setLocateError("Could not get your location. Move the map instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [map]);

  return { position, capture, locate, locating, locateError };
}
