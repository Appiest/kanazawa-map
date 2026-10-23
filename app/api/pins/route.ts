import { keepKnown } from "@/lib/interests";
import { encodePins } from "@/lib/pins/format";
import { savePin } from "@/lib/pins/mine";
import { listPinPoints } from "@/lib/pins/repository";
import { newPinSchema } from "@/lib/pins/schemas";
import { failureResponse } from "@/lib/server/failure";
import { bearerToken, readJson } from "@/lib/server/request";

/**
 * Every pin on the map as packed binary. A worker decodes it off the main
 * thread, so panning never waits on JSON parsing. The edge cache serves it for
 * a minute, and a removed pin is gone from it within a few.
 */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("interests") ?? "";
  const interests = keepKnown(asked.split(",").filter(Boolean));

  try {
    const pins = await listPinPoints(interests);
    const body = encodePins(pins);
    return new Response(body as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Pin-Count": String(pins.length),
        Vary: "Accept-Encoding",
      },
    });
  } catch (cause) {
    return failureResponse(cause);
  }
}

export async function POST(request: Request) {
  const parsed = newPinSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json({ error: "Check the pin details and try again." }, { status: 400 });
  }

  try {
    return Response.json(await savePin(parsed.data, bearerToken(request)), { status: 201 });
  } catch (cause) {
    return failureResponse(cause);
  }
}
