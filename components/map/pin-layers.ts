import type { FilterSpecification, LayerSpecification } from "maplibre-gl";
import { ANCHOR_SOURCE_ID, GATHERING_SOURCE_ID, PIN_SOURCE_ID } from "@/lib/config";
import { hexOf } from "@/styles/palette";

export const PIN_LAYER_ID = "pins-single";
export const CLUSTER_LAYER_ID = "pins-cluster";
export const ANCHOR_LAYER_ID = "anchors-label";
export const GATHERING_LAYER_ID = "gatherings";
export const SELECTED_LAYER_ID = "pins-selected";

/** A filter that matches no feature, used when nothing is open. */
const NOTHING_SELECTED: FilterSpecification = ["==", ["get", "seq"], -1];

const LABEL_FONT = ["Archivo Medium"];
const BODY_FONT = ["Archivo Regular"];

/**
 * Anchors sit under the pins and stay in the neutral ramp. They orient someone
 * who does not know the city; they are not people, so they carry no green.
 */
export const anchorLayer: LayerSpecification = {
  id: ANCHOR_LAYER_ID,
  type: "symbol",
  source: ANCHOR_SOURCE_ID,
  minzoom: 5,
  layout: {
    "icon-image": "anchor",
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "text-field": ["get", "name"],
    "text-font": BODY_FONT,
    "text-size": 12,
    "text-offset": [0, 0.5],
    "text-anchor": "top",
    "text-optional": true,
  },
  paint: {
    "text-color": hexOf("paper", 650),
    "text-halo-color": hexOf("paper", 100),
    "text-halo-width": 1.5,
  },
};

/** Sits above the pins: something happening outranks somebody being there. */
export const gatheringLayer: LayerSpecification = {
  id: GATHERING_LAYER_ID,
  type: "symbol",
  source: GATHERING_SOURCE_ID,
  layout: {
    "icon-image": "gathering",
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "text-field": ["get", "title"],
    "text-font": LABEL_FONT,
    "text-size": 12,
    "text-offset": [0, 0.4],
    "text-anchor": "top",
    "text-optional": true,
    "text-max-width": 9,
  },
  paint: {
    "text-color": hexOf("clay", 700),
    "text-halo-color": hexOf("land", 100),
    "text-halo-width": 1.5,
  },
};

export const clusterLayer: LayerSpecification = {
  id: CLUSTER_LAYER_ID,
  type: "symbol",
  source: PIN_SOURCE_ID,
  filter: ["has", "point_count"],
  layout: {
    "icon-image": "cluster",
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": LABEL_FONT,
    "text-size": 12,
    // Sits inside the tag at the top of the bundle, not below the stakes.
    "text-offset": [0, -1.05],
    "text-anchor": "center",
    "text-allow-overlap": true,
  },
  paint: { "text-color": hexOf("paper", 50) },
};

export const pinLayer: LayerSpecification = {
  id: PIN_LAYER_ID,
  type: "symbol",
  source: PIN_SOURCE_ID,
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": "person",
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
  },
};

/**
 * Selection is its own layer rather than a feature-state expression, because
 * icon-image is a layout property and layout properties cannot read feature
 * state. Opening a pin swaps this layer's filter, which is a cheap update.
 */
export const selectedPinLayer: LayerSpecification = {
  id: SELECTED_LAYER_ID,
  type: "symbol",
  source: PIN_SOURCE_ID,
  filter: NOTHING_SELECTED,
  layout: {
    "icon-image": "person-selected",
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

export function selectionFilter(seq: number | null): FilterSpecification {
  return seq === null ? NOTHING_SELECTED : ["==", ["get", "seq"], seq];
}
