import { z } from "zod";
import { reportPin } from "@/lib/pins/reports";
import { failureResponse } from "@/lib/server/failure";
import { pinNumber, readJson, requireToken } from "@/lib/server/request";

const schema = z.object({ reason: z.string().trim().min(1).max(500) });

/** Filing a report is available to anyone signed in, up to ten a day. */
export async function POST(request: Request, context: { params: Promise<{ seq: string }> }) {
  try {
    const token = requireToken(request);
    const seq = pinNumber((await context.params).seq);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) {
      return Response.json({ error: "Say what is wrong with this pin." }, { status: 400 });
    }

    await reportPin(token, seq, parsed.data.reason);
    return Response.json({ filed: true }, { status: 201 });
  } catch (cause) {
    return failureResponse(cause);
  }
}
