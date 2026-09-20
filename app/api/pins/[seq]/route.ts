import { findPinDetail } from "@/lib/pins/repository";

/** Card content for one pin, fetched when someone opens it and prefetched on hover. */
export async function GET(_request: Request, context: { params: Promise<{ seq: string }> }) {
  const { seq } = await context.params;
  const parsed = Number(seq);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return Response.json({ error: "Not a pin number" }, { status: 400 });
  }

  const pin = await findPinDetail(parsed);
  if (!pin) {
    return Response.json({ error: "No pin with that number" }, { status: 404 });
  }

  return Response.json(pin, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400" },
  });
}
