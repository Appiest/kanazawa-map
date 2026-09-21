/**
 * The basemap is a single PMTiles archive read by HTTP range request, so there
 * is no tile server. build.protomaps.com sends no CORS headers and cannot be
 * read from a browser, so the archive is always served from an origin we own:
 * public/basemap in development, R2 in production.
 * Rebuild the archive with scripts/build-basemap.sh.
 */
const LOCAL_BASEMAP = "/basemap/us.pmtiles";

export const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL ?? LOCAL_BASEMAP;
export const GLYPHS_URL = "/glyphs/{fontstack}/{range}.pbf";

/** The map opens framed on the continental US, fitted to whatever viewport it gets. */
export const INITIAL_BOUNDS: [[number, number], [number, number]] = [
  [-125, 24.4],
  [-66.9, 49.4],
];

/** Wide enough never to fight the opening frame, tight enough to stay over data. */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-179, 5],
  [-40, 72],
];

/** Working title. Every visible mention of the product reads from here. */
export const APP_NAME = "Kanazawa";

export const PIN_SOURCE_ID = "pins";
export const ANCHOR_SOURCE_ID = "anchors";
export const BASEMAP_SOURCE_ID = "protomaps";
