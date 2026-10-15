"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { cameraDuration } from "@/lib/motion";

export type Position = { lng: number; lat: number };

export type Area = { name: string; centre: Position };

/** The city and the region around a point. Either can be missing. */
export type Surroundings = { city: Area | null; region: Area | null };

const UNKNOWN: Surroundings = { city: null, region: null };

export async function describeSurroundings(lng: number, lat: number): Promise<Surroundings> {
  try {
    const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    if (!response.ok) return UNKNOWN;
    return (await response.json()) as Surroundings;
  } catch {
    return UNKNOWN;
  }
}

/** Where the tag goes: the map centre, steered by hand or by the browser. */
export function usePlacement(map: MapLibreMap | null) {
  const [surroundings, setSurroundings] = useState<Surroundings | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  /** The spot under the tag is read once, turned into areas, and dropped. */
  const capture = useCallback(async (): Promise<Surroundings> => {
    if (!map) return UNKNOWN;
    setSurroundings(null);
    const center = map.getCenter();
    const found = await describeSurroundings(center.lng, center.lat);
    setSurroundings(found);
    return found;
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
        map.easeTo({ center: [coords.longitude, coords.latitude], zoom: 14, duration: cameraDuration(900) });
      },
      () => {
        setLocating(false);
        setLocateError("Could not get your location. Move the map instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [map]);

  return { surroundings, capture, locate, locating, locateError };
}
