import { buildDigests } from "@/lib/digest/build";

/**
 * Works out who has new neighbours and sends each of them one note.
 *
 * Pulled on a schedule rather than pushed as things happen: a map gains a
 * person at a time, and a message for each one would be a notification
 * treadmill rather than a reason to come back. Guarded by a shared secret, so
 * a crawler finding the URL cannot mail everybody.
 */
export async function POST(request: Request) {
  const secret = process.env.DIGEST_SECRET;
  if (!secret) {
    return Response.json({ error: "Digests are not configured" }, { status: 501 });
  }

  const offered = request.headers.get("Authorization");
  if (offered !== `Bearer ${secret}`) {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  try {
    return Response.json(await buildDigests({ dryRun }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build the digests";
    return Response.json({ error: message }, { status: 500 });
  }
}
