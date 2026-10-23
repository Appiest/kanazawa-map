import { countPins } from "@/lib/pins/repository";
import { failureResponse } from "@/lib/server/failure";

/**
 * How many people are on the map, for the block on the Nikkei Nexus website.
 * A count and nothing else, cached for five minutes at the edge.
 */
export async function GET() {
  try {
    return Response.json(
      { people: await countPins() },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (cause) {
    return failureResponse(cause);
  }
}
