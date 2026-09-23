import { z } from "zod";
import { keepKnown } from "@/lib/interests";
import { encodePins } from "@/lib/pins/format";
import { createPin, listPinPoints } from "@/lib/pins/repository";

/**
 * Every pin on the map as packed binary. A worker decodes it off the main
 * thread, so panning never waits on JSON parsing. The edge cache serves it,
 * so a page load is a CDN hit rather than a database query.
 */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("interests") ?? "";
  const interests = keepKnown(asked.split(",").filter(Boolean));
  const pins = await listPinPoints(interests);
  const body = encodePins(pins);

  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
      "X-Pin-Count": String(pins.length),
      Vary: "Accept-Encoding",
    },
  });
}

const newPinSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  neighborhood: z.string().trim().min(1).max(60),
  note: z.string().trim().max(180).nullable(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  // Defaults to the safer of the two, so a caller that omits it cannot end up
  // publishing somebody's doorstep by accident.
  precision: z.enum(["neighborhood", "exact"]).default("neighborhood"),
  // Anything outside the vocabulary is dropped rather than stored.
  interests: z.array(z.string()).max(20).default([]).transform(keepKnown),
});

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

export async function POST(request: Request) {
  const parsed = newPinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Check the pin details and try again" }, { status: 400 });
  }

  try {
    const pin = await createPin(parsed.data, bearerToken(request));
    return Response.json(pin, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save your pin";
    return Response.json({ error: message }, { status: 400 });
  }
}
