"use client";

import { useCallback, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { cameraDuration } from "@/lib/motion";

export type Position = { lng: number; lat: number };

export type Surroundings = { name: string; centre: Position | null };

async function describeSurroundings(lng: number, lat: number): Promise<Surroundings> {
  try {
    const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    const body = (await response.json()) as { name: string | null; centre: Position | null };
    return { name: body.name ?? "", centre: body.centre };
  } catch {
    // A missing suggestion just leaves the field empty for someone to type.
    return { name: "", centre: null };
  }
}

/** Where the tag goes: the map centre, steered by hand or by the browser. */
export function usePlacement(map: MapLibreMap | null) {
  const [position, setPosition] = useState<Position | null>(null);
  const [centre, setCentre] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const capture = useCallback(async (): Promise<string> => {
    if (!map) return "";
    const center = map.getCenter();
    setPosition({ lng: center.lng, lat: center.lat });

    const surroundings = await describeSurroundings(center.lng, center.lat);
    setCentre(surroundings.centre);
    return surroundings.name;
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

  return { position, centre, capture, locate, locating, locateError };
}
