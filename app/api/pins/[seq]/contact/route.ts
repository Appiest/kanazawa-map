import { findPinContact } from "@/lib/pins/repository";

/**
 * Contact details for one pin, for a caller who is on the map themselves.
 * The gate is the row-level policy rather than a check here, so the answer is
 * the same whether someone uses the interface or calls this directly.
 */
export async function GET(request: Request, context: { params: Promise<{ seq: string }> }) {
  const { seq } = await context.params;
  const parsed = Number(seq);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return Response.json({ error: "Not a pin number" }, { status: 400 });
  }

  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Add your own pin to see this" }, { status: 401 });
  }

  const contact = await findPinContact(parsed, token);
  if (!contact) {
    return Response.json({ error: "Add your own pin to see this" }, { status: 403 });
  }

  return Response.json(contact, { headers: { "Cache-Control": "private, no-store" } });
}
