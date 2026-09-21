import { ensureOwnContact } from "@/lib/pins/repository";

/** Fills in the caller's own contact row when their pin predates having one. */
export async function POST(request: Request) {
  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return Response.json({ error: "Sign in first" }, { status: 401 });

  try {
    return Response.json({ ready: await ensureOwnContact(token) });
  } catch {
    return Response.json({ ready: false });
  }
}
