import { createHash, timingSafeEqual } from "node:crypto";
import { buildDigests } from "@/lib/digest/build";

/**
 * Works out who has new neighbours and sends each of them one note.
 *
 * Vercel Cron calls this with GET and `Authorization: Bearer $CRON_SECRET`.
 * POST does the same for a manual run, and `?dry=1` reports without sending.
 */
function expectedSecret(): string | null {
  return process.env.CRON_SECRET ?? process.env.DIGEST_SECRET ?? null;
}

/** Hashing first gives both sides the same length, which timingSafeEqual needs. */
function matches(offered: string, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(offered), digest(`Bearer ${secret}`));
}

async function run(request: Request): Promise<Response> {
  const secret = expectedSecret();
  if (!secret) return Response.json({ error: "Digests are not configured" }, { status: 501 });

  if (!matches(request.headers.get("Authorization") ?? "", secret)) {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  try {
    return Response.json(await buildDigests({ dryRun }));
  } catch (error) {
    console.error("[digest]", error);
    return Response.json({ error: "Could not build the digests" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
