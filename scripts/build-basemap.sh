#!/usr/bin/env bash
# Cuts a basemap from the Protomaps daily planet build into a single PMTiles
# archive. MapLibre reads it by HTTP range request, so there is no tile server.
#
# build.protomaps.com sends no CORS headers, so a browser cannot read it
# directly. The archive always has to be served from an origin we control:
# public/basemap in development, R2 in production.
#
# Measured against the 2026-09-18 planet build (128.6 GiB, z0-15):
#
#   scope                    archive    R2 storage
#   LA metro       z0-15       299 MB      $0.004/mo
#   50 states      z0-9        364 MB      $0.005/mo   <- development default
#   50 states      z0-10       863 MB      $0.013/mo
#   CONUS          z0-12       1.9 GB      $0.03/mo
#   CONUS          z0-13       4.2 GB      $0.06/mo
#   CONUS          z0-14       8.8 GB      $0.13/mo
#   CONUS          z0-15        19 GB      $0.29/mo
#
# The bbox spans all fifty states. A map for this audience that leaves out
# Hawaii is missing the state with the largest Asian American share.
#
# Vector tiles overzoom cleanly, so a lower maxzoom stays sharp and only loses
# detail. Run with --dry-run to price a change before downloading anything.

set -euo pipefail

PLANET="${PLANET:-https://build.protomaps.com/20260918.pmtiles}"
BBOX="${BBOX:--179.0,18.0,-66.9,72.0}"
MAXZOOM="${MAXZOOM:-9}"
OUTPUT="${OUTPUT:-public/basemap/us.pmtiles}"

if ! command -v pmtiles >/dev/null 2>&1; then
  echo "pmtiles CLI not found. Install from https://github.com/protomaps/go-pmtiles/releases" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"
echo "Extracting ${BBOX} z0-${MAXZOOM} from ${PLANET}"
pmtiles extract "$PLANET" "$OUTPUT" \
  --bbox="$BBOX" \
  --maxzoom="$MAXZOOM" \
  --download-threads=8 \
  "$@"

pmtiles show "$OUTPUT" | head -8
