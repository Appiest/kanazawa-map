"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { cameraDuration } from "@/lib/motion";

/** Metro level: near enough to recognise, wide enough to see who else is around. */
const ARRIVAL_ZOOM = 10.5;
const ASKED_KEY = "kanazawa.location-asked";

function askedThisSession(): boolean {
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
    // Worst case it asks again, which the browser answers from its own
    // remembered permission anyway.
  }
}

/**
 * Whether to locate on this load.
 *
 * Already granted means the browser answers without showing anything, so the
 * map can open on the right place every single visit. Still undecided means a
 * prompt, and a prompt on every load is nagging, so that is asked once per
 * session. Denied is left alone.
 *
 * Browsers without the permissions API fall back to asking once a session.
 */
async function shouldLocate(): Promise<boolean> {
  if (!navigator.geolocation) return false;

  if (!navigator.permissions?.query) return !askedThisSession();

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted") return true;
    if (status.state === "denied") return false;
    return !askedThisSession();
  } catch {
    return !askedThisSession();
  }
}

/**
 * Opens the map where the viewer is. Landing on the whole country means
 * scrolling before seeing anybody; landing on your own city means the first
 * thing you see is your neighbours.
 *
 * A refusal is not an error. The map stays where it is and nothing is said,
 * because the national view is a perfectly good place to start.
 */
export function useOrientToViewer(map: MapLibreMap | null, ready: boolean) {
  useEffect(() => {
    if (!map || !ready) return;

    let cancelled = false;

    shouldLocate().then((go) => {
      if (!go || cancelled) return;
      rememberAsked();

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (cancelled) return;
          map.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: Math.max(map.getZoom(), ARRIVAL_ZOOM),
            duration: cameraDuration(2200),
            essential: true,
          });
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [map, ready]);
}
