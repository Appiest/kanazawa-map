import { findPinDetail } from "@/lib/pins/repository";
import { failureResponse, RequestFailure } from "@/lib/server/failure";
import { pinNumber } from "@/lib/server/request";

/**
 * Card content for one pin, fetched when someone opens it and prefetched on
 * hover. Cached briefly, so a pin a moderator takes down stops showing soon.
 */
export async function GET(_request: Request, context: { params: Promise<{ seq: string }> }) {
  try {
    const pin = await findPinDetail(pinNumber((await context.params).seq));
    if (!pin) throw new RequestFailure(404, "That pin is no longer on the map.");

    return Response.json(pin, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (cause) {
    return failureResponse(cause);
  }
}
