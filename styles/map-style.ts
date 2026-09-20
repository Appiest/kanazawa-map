import { layersWithCustomTheme } from "protomaps-themes-base";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { BASEMAP_SOURCE_ID, GLYPHS_URL, TILE_URL } from "@/lib/config";
import { paperTheme } from "./paper-theme";
import { hexOf } from "./palette";

/** Labels the paper survey drops so the pins own the screen. */
const SUPPRESSED_LAYERS = new Set(["pois", "roads_labels_minor", "buildings_labels"]);

/**
 * Protomaps sets country, region, subplace and ocean labels in uppercase.
 * Place names are not uppercase content, and letterform shape is most of how
 * a name is recognised, so every label renders as written.
 */
function withoutUppercase(layer: LayerSpecification): LayerSpecification {
  if (layer.type !== "symbol" || layer.layout?.["text-transform"] !== "uppercase") return layer;
  const { "text-transform": _uppercase, ...layout } = layer.layout;
  return { ...layer, layout };
}

export function buildMapStyle(): StyleSpecification {
  const basemapLayers = layersWithCustomTheme(BASEMAP_SOURCE_ID, paperTheme, "en")
    .filter((layer) => !SUPPRESSED_LAYERS.has(layer.id))
    .map(withoutUppercase);

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      [BASEMAP_SOURCE_ID]: {
        type: "vector",
        url: `pmtiles://${TILE_URL}`,
        attribution:
          '<a href="https://openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://protomaps.com">Protomaps</a>',
      },
    },
    layers: [
      { id: "land", type: "background", paint: { "background-color": hexOf("paper", 100) } },
      ...basemapLayers,
    ],
  };
}
