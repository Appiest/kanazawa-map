#!/usr/bin/env bash
# Checks that a hosted PMTiles archive is actually usable by the map.
#
# Three things have to be true, and two of them fail silently in the browser:
# the file is reachable, it answers range requests, and it sends CORS headers
# for a cross-origin GET. Miss the last one and the map renders blank paper
# with nothing in the console to explain it.
#
#   ./scripts/check-basemap-url.sh https://pub-xxxx.r2.dev/us-z13.pmtiles

set -euo pipefail

URL="${1:-${NEXT_PUBLIC_TILE_URL:-}}"
ORIGIN="${2:-http://localhost:3000}"

if [ -z "$URL" ]; then
  echo "Usage: $0 <tile-url> [origin]" >&2
  exit 1
fi

fail=0
note() { printf '%-28s %s\n' "$1" "$2"; }

status="$(curl -s -o /dev/null -w '%{http_code}' -r 0-1023 -H "Origin: $ORIGIN" "$URL")"
if [ "$status" = "206" ]; then
  note "range request" "206 Partial Content"
else
  note "range request" "$status — expected 206, the map reads this file in pieces"
  fail=1
fi

headers="$(curl -s -D- -o /dev/null -r 0-1023 -H "Origin: $ORIGIN" "$URL")"

if grep -qi "access-control-allow-origin" <<<"$headers"; then
  note "CORS" "$(grep -i 'access-control-allow-origin' <<<"$headers" | tr -d '\r')"
else
  note "CORS" "MISSING — the browser will refuse this and the map stays blank"
  fail=1
fi

size="$(grep -i '^content-range' <<<"$headers" | tr -d '\r' | sed 's|.*/||')"
if [ -n "$size" ]; then
  note "archive size" "$size bytes"
else
  note "archive size" "unknown — no content-range header"
  fail=1
fi

# The first 7 bytes of a PMTiles v3 archive spell PMTiles.
magic="$(curl -s -r 0-6 "$URL" | tr -d '\0')"
if [ "$magic" = "PMTiles" ]; then
  note "archive header" "valid PMTiles"
else
  note "archive header" "not a PMTiles archive (read '$magic') — upload may be incomplete"
  fail=1
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "Ready. Set NEXT_PUBLIC_TILE_URL to this and redeploy."
else
  echo "Not ready yet. Fix the lines above before pointing the site at it."
  exit 1
fi
