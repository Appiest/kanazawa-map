import { findPinDetail } from "@/lib/pins/repository";

/** Card content for one pin, fetched when someone opens it and prefetched on hover. */
export async function GET(_request: Request, context: { params: Promise<{ seq: string }> }) {
  const { seq } = await context.params;
  const parsed = Number(seq);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return Response.json({ error: "Not a pin number" }, { status: 400 });
  }

  try {
    const pin = await findPinDetail(parsed);
    if (!pin) {
      return Response.json({ error: "No pin with that number" }, { status: 404 });
    }

    return Response.json(pin, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400" },
    });
  } catch (cause) {
    // Surfaced rather than swallowed: a schema that is behind the code reads
    // exactly like a dropped connection from the outside, and sends whoever
    // is looking at it hunting in the wrong place.
    const message = cause instanceof Error ? cause.message : "Could not load that pin";
    console.error("[pins] detail failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
