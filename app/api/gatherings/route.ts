import { z } from "zod";
import { cancelGathering, createGathering, listUpcoming } from "@/lib/gatherings/repository";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

const SIGN_IN = Response.json({ error: "Sign in first" }, { status: 401 });

export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token) return SIGN_IN;

  try {
    return Response.json(
      { gatherings: await listUpcoming(token) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ gatherings: [] });
  }
}

const newGathering = z.object({
  title: z.string().trim().min(1).max(80),
  place: z.string().trim().min(1).max(80),
  note: z.string().trim().max(280).nullable(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  startsAt: z.string().datetime(),
});

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return SIGN_IN;

  const parsed = newGathering.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Check the details and try again" }, { status: 400 });
  }

  // A gathering in the past is nobody's invitation.
  if (new Date(parsed.data.startsAt).getTime() < Date.now() - 60000) {
    return Response.json({ error: "Pick a time that has not passed" }, { status: 400 });
  }

  try {
    return Response.json(await createGathering(token, parsed.data), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not post that";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const token = bearerToken(request);
  if (!token) return SIGN_IN;

  const seq = Number(new URL(request.url).searchParams.get("seq"));
  if (!Number.isInteger(seq)) return Response.json({ error: "Which one?" }, { status: 400 });

  try {
    await cancelGathering(token, seq);
    return Response.json({ cancelled: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not call that off";
    return Response.json({ error: message }, { status: 400 });
  }
}
