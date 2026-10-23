import { z } from "zod";
import { MESSAGE_LIMIT, sendContactMessage } from "@/lib/contact/relay";
import { failureResponse } from "@/lib/server/failure";
import { pinNumber, readJson, requireToken } from "@/lib/server/request";

/** Control characters other than line breaks and tabs have no place in a note. */
const UNPRINTABLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const schema = z.object({
  message: z
    .string()
    .transform((value) => value.replace(UNPRINTABLE, "").trim())
    .pipe(z.string().min(1).max(MESSAGE_LIMIT)),
});

/** Sends one note to the owner of a pin, by email, without showing either address. */
export async function POST(request: Request, context: { params: Promise<{ seq: string }> }) {
  try {
    const token = requireToken(request);
    const seq = pinNumber((await context.params).seq);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) {
      return Response.json({ error: `Write a message of up to ${MESSAGE_LIMIT} characters.` }, { status: 400 });
    }

    await sendContactMessage(token, seq, parsed.data.message);
    return Response.json({ sent: true }, { status: 201 });
  } catch (cause) {
    return failureResponse(cause);
  }
}
