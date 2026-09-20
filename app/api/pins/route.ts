import { encodePins } from "@/lib/pins/format";
import { listPinPoints } from "@/lib/pins/repository";

/**
 * Every pin on the map as packed binary. A worker decodes it off the main
 * thread, so panning never waits on JSON parsing. The edge cache serves it,
 * so a page load is a CDN hit rather than a database query.
 */
export async function GET() {
  const pins = await listPinPoints();
  const body = encodePins(pins);

  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
      "X-Pin-Count": String(pins.length),
    },
  });
}
