import { z } from "zod";
import { reportPin } from "@/lib/pins/repository";

const schema = z.object({ reason: z.string().trim().min(1).max(500) });

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

/** Filing a report is deliberately available to anyone signed in. */
export async function POST(request: Request, context: { params: Promise<{ seq: string }> }) {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Sign in first" }, { status: 401 });

  const { seq } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(Number(seq)) || !parsed.success) {
    return Response.json({ error: "Say what is wrong with this pin" }, { status: 400 });
  }

  try {
    await reportPin(token, Number(seq), parsed.data.reason);
    return Response.json({ filed: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not file that report";
    return Response.json({ error: message }, { status: 400 });
  }
}
