import { z } from "zod";
import { isModerator, listOpenReports, resolveReport } from "@/lib/pins/repository";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Both verbs answer the same way to somebody who is not a moderator, so this
 * route reveals nothing about whether there is a queue at all.
 */
const NOT_YOURS = Response.json({ error: "Not available" }, { status: 404 });

export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token || !(await isModerator(token))) return NOT_YOURS;
  return Response.json({ reports: await listOpenReports(token) });
}

const resolution = z.object({
  id: z.string().uuid(),
  outcome: z.enum(["dismiss", "remove"]),
});

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token || !(await isModerator(token))) return NOT_YOURS;

  const parsed = resolution.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown resolution" }, { status: 400 });

  try {
    await resolveReport(token, parsed.data.id, parsed.data.outcome);
    return Response.json({ resolved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not resolve that report";
    return Response.json({ error: message }, { status: 400 });
  }
}
