import { findPinDetails } from "@/lib/pins/repository";
import { failureResponse } from "@/lib/server/failure";

const MAX_SEQS = 80;

/**
 * Names for a handful of pins at once. The keyboard layer needs a label for
 * every pin in view, and one request per pin would be dozens of round trips.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("seqs") ?? "";
  const seqs = raw
    .split(",")
    .map(Number)
    .filter((seq) => Number.isInteger(seq) && seq > 0)
    .slice(0, MAX_SEQS);

  if (seqs.length === 0) return Response.json({ pins: [] });

  try {
    return Response.json(
      { pins: await findPinDetails(seqs) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (cause) {
    return failureResponse(cause);
  }
}
