import { findPinHandles } from "@/lib/pins/mine";
import { failureResponse } from "@/lib/server/failure";
import { pinNumber, requireToken } from "@/lib/server/request";

/**
 * The Instagram and website a member chose to share, for somebody who is on
 * the map. Never an email address: people write to each other through the
 * message route instead. Each look costs from a daily allowance.
 */
export async function GET(request: Request, context: { params: Promise<{ seq: string }> }) {
  try {
    const seq = pinNumber((await context.params).seq);
    const handles = await findPinHandles(requireToken(request), seq);
    return Response.json(
      { handles },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (cause) {
    return failureResponse(cause);
  }
}
