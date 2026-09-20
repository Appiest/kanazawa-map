/// <reference lib="webworker" />
import { decodePins } from "./format";

/**
 * Fetches and unpacks the pin payload, then builds the feature collection
 * MapLibre clusters. All of it happens here so the main thread is free to
 * keep painting; the page never drops a frame decoding pins.
 */
export type PinWorkerResponse =
  | { ok: true; collection: GeoJSON.FeatureCollection<GeoJSON.Point>; count: number }
  | { ok: false; message: string };

function toFeatureCollection(
  pins: ReturnType<typeof decodePins>,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({
      type: "Feature",
      id: pin.seq,
      geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
      properties: { seq: pin.seq },
    })),
  };
}

self.addEventListener("message", async (event: MessageEvent<{ url: string }>) => {
  try {
    const response = await fetch(event.data.url);
    if (!response.ok) throw new Error(`Pin request failed with ${response.status}`);
    const pins = decodePins(await response.arrayBuffer());
    const message: PinWorkerResponse = {
      ok: true,
      collection: toFeatureCollection(pins),
      count: pins.length,
    };
    self.postMessage(message);
  } catch (error) {
    const message: PinWorkerResponse = {
      ok: false,
      message: error instanceof Error ? error.message : "Could not load pins",
    };
    self.postMessage(message);
  }
});
