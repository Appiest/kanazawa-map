import { z } from "zod";
import {
  dismissReport,
  isModerator,
  listBusySenders,
  listOpenReports,
  removePin,
} from "@/lib/moderation/repository";
import { failureResponse, RequestFailure } from "@/lib/server/failure";
import { bearerToken, readJson } from "@/lib/server/request";

/**
 * Both verbs answer the same way to somebody who is not a moderator, so this
 * route reveals nothing about whether there is a queue at all.
 */
const NOT_YOURS = new RequestFailure(404, "Not available.");

async function requireModerator(request: Request): Promise<string> {
  const token = bearerToken(request);
  if (!token || !(await isModerator(token))) throw NOT_YOURS;
  return token;
}

export async function GET(request: Request) {
  try {
    const token = await requireModerator(request);
    const [reports, busySenders] = await Promise.all([listOpenReports(token), listBusySenders(token)]);
    return Response.json({ reports, busySenders }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    return failureResponse(cause);
  }
}

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dismiss"), reportId: z.string().uuid() }),
  z.object({ action: z.literal("remove"), seq: z.number().int().positive(), ban: z.boolean().default(false) }),
]);

export async function POST(request: Request) {
  try {
    const token = await requireModerator(request);
    const parsed = action.safeParse(await readJson(request));
    if (!parsed.success) throw new RequestFailure(400, "Unknown action.");

    const taken = parsed.data;
    if (taken.action === "dismiss") await dismissReport(token, taken.reportId);
    else await removePin(token, taken.seq, taken.ban);
    return Response.json({ done: true });
  } catch (cause) {
    return failureResponse(cause);
  }
}
