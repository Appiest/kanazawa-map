import { z } from "zod";
import { deleteOwnPin, findOwnPin, updateOwnContact } from "@/lib/pins/repository";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

const SIGN_IN_FIRST = Response.json({ error: "Sign in first" }, { status: 401 });

export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token) return SIGN_IN_FIRST;

  try {
    return Response.json({ pin: await findOwnPin(token) });
  } catch {
    return Response.json({ pin: null });
  }
}

const handlesSchema = z.object({
  instagram: z.string().trim().max(30).nullable(),
  website: z.string().trim().max(200).nullable(),
});

export async function PATCH(request: Request) {
  const token = bearerToken(request);
  if (!token) return SIGN_IN_FIRST;

  const parsed = handlesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Check those details and try again" }, { status: 400 });
  }

  try {
    await updateOwnContact(token, parsed.data);
    return Response.json({ saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const token = bearerToken(request);
  if (!token) return SIGN_IN_FIRST;

  try {
    await deleteOwnPin(token);
    return Response.json({ removed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove your pin";
    return Response.json({ error: message }, { status: 400 });
  }
}
