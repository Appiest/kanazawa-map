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
#   50 states      z0-9        364 MB      $0.005/mo   <- development default
#   50 states      z0-10       863 MB      $0.013/mo
#   50 states      z0-11       1.8 GB      $0.027/mo
#   50 states      z0-12       3.8 GB      $0.057/mo
#   50 states      z0-13       7.9 GB      $0.119/mo   <- recommended for launch
#
# Zoom 9 is fine to develop against: vector tiles overzoom without going
# blurry. It is not fine to launch on. Someone placing a pin zooms to their
# street, and below zoom 13 the street they are looking for has no name on it.
# Build z13, put it on R2, and point NEXT_PUBLIC_TILE_URL at it:
#
#   MAXZOOM=13 OUTPUT=us-z13.pmtiles ./scripts/build-basemap.sh
#   rclone copy us-z13.pmtiles r2:your-bucket/     # or the Cloudflare dashboard
#
# R2 needs CORS allowing GET and Range from the site's origin, otherwise the
# browser cannot read the archive at all.
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

# The CLI is a single static binary, so it is fetched into .tools rather than
# made a prerequisite anyone has to read about first.
PMTILES="$(command -v pmtiles || true)"
if [ -z "$PMTILES" ]; then
  PMTILES="$(pwd)/.tools/pmtiles"
  if [ ! -x "$PMTILES" ]; then
    echo "Fetching the pmtiles CLI into .tools"
    mkdir -p .tools
    case "$(uname -m)" in
      arm64|aarch64) ARCH="arm64" ;;
      *) ARCH="x86_64" ;;
    esac
    case "$(uname -s)" in
      Darwin) OS="Darwin" ;;
      *) OS="Linux" ;;
    esac
    TAG="$(curl -fsSL https://api.github.com/repos/protomaps/go-pmtiles/releases/latest \
      | grep -oE '"tag_name": "[^"]+"' | head -1 | cut -d'"' -f4)"
    VERSION="${TAG#v}"
    curl -fsSL -o .tools/pmtiles.zip \
      "https://github.com/protomaps/go-pmtiles/releases/download/${TAG}/go-pmtiles-${VERSION}_${OS}_${ARCH}.zip"
    unzip -o -q .tools/pmtiles.zip -d .tools
    rm -f .tools/pmtiles.zip
    chmod +x "$PMTILES"
  fi
fi

mkdir -p "$(dirname "$OUTPUT")"
echo "Extracting ${BBOX} z0-${MAXZOOM} from ${PLANET}"
"$PMTILES" extract "$PLANET" "$OUTPUT" \
  --bbox="$BBOX" \
  --maxzoom="$MAXZOOM" \
  --download-threads=8 \
  "$@"

# A dry run prices the extract without writing anything to show.
[ -f "$OUTPUT" ] && "$PMTILES" show "$OUTPUT" | head -8
