"use client";

import { useEffect, useRef, useState } from "react";
import { AttributionControl, Map as MapLibreMap, addProtocol, setWorkerUrl } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { buildMapStyle } from "@/styles/map-style";
import { INITIAL_BOUNDS, MAX_BOUNDS } from "@/lib/config";
import { withBasePath } from "@/lib/paths";
import type { MarkerKind } from "@/styles/markers";
import { renderMarker } from "./pin-icons";

let mapLibreConfigured = false;

/**
 * Turbopack never emits MapLibre's worker chunk, so the worker is served from
 * our own origin instead; see scripts/copy-map-worker.mjs. The pmtiles Protocol
 * is registered once and shared, because it caches the archive header and
 * directory between maps.
 */
function configureMapLibreOnce() {
  if (mapLibreConfigured) return;
  setWorkerUrl(withBasePath("/maplibre/maplibre-gl-worker.mjs"));
  addProtocol("pmtiles", new Protocol().tile);
  mapLibreConfigured = true;
}

const MARKER_KINDS: MarkerKind[] = ["person", "person-selected", "place", "event", "cluster"];

function addPinImages(map: MapLibreMap) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  for (const kind of MARKER_KINDS) {
    if (!map.hasImage(kind)) map.addImage(kind, renderMarker(kind, pixelRatio), { pixelRatio });
  }
}

/**
 * Runs `job` once the style is usable. `load` fires exactly once and can be
 * missed across a remount, so readiness is read from the map itself rather
 * than from a flag that a remount could drop.
 */
export function whenStyleReady(map: MapLibreMap, job: () => void) {
  if (map.isStyleLoaded()) {
    job();
    return;
  }

  // `load` fires once and can be missed across a remount, and `isStyleLoaded`
  // additionally waits on every source, so a `styledata` listener can stop
  // firing before it ever reads true. `idle` fires whenever the map settles,
  // which closes both gaps.
  let done = false;
  const stop = () => {
    map.off("styledata", check);
    map.off("idle", check);
  };
  const check = () => {
    if (done || !map.isStyleLoaded()) return;
    done = true;
    stop();
    job();
  };

  map.on("styledata", check);
  map.on("idle", check);
}

/**
 * In the embed, a page that scrolls past the map keeps scrolling, and the map
 * moves only with two fingers or a modifier key (cooperative gestures).
 */
function createMap(container: HTMLDivElement, embedded: boolean): MapLibreMap {
  configureMapLibreOnce();
  const map = new MapLibreMap({
    container,
    cooperativeGestures: embedded,
    style: buildMapStyle(),
    bounds: INITIAL_BOUNDS,
    fitBoundsOptions: { padding: { top: 48, bottom: 48, left: 48, right: 48 } },
    maxBounds: MAX_BOUNDS,
    minZoom: 2.5,
    maxZoom: 18,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    fadeDuration: 120,
  });
  map.touchZoomRotate.disableRotation();
  // Out of the corners the header and the primary action occupy. The embed has no
  // title, so its status line runs wider and the credit moves to the free bottom corner.
  map.addControl(new AttributionControl({ compact: true }), embedded ? "bottom-left" : "top-right");
  return map;
}

/** Holds the map in state so consumers re-render the moment it exists. */
export function useMapInstance(container: React.RefObject<HTMLDivElement | null>, embedded = false) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const instance = createMap(container.current, embedded);
    mapRef.current = instance;
    setMap(instance);

    const onLoad = () => addPinImages(instance);
    instance.on("load", onLoad);

    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __map?: MapLibreMap }).__map = instance;
    }

    return () => {
      instance.off("load", onLoad);
      instance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, [container, embedded]);

  return map;
}
