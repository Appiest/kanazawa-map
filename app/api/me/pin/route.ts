import { deleteOwnPin, findOwnPin, saveHandles } from "@/lib/pins/mine";
import { handleSettingsSchema } from "@/lib/pins/schemas";
import { failureResponse } from "@/lib/server/failure";
import { readJson, requireToken } from "@/lib/server/request";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    return Response.json({ pin: await findOwnPin(requireToken(request)) }, { headers: PRIVATE });
  } catch (cause) {
    return failureResponse(cause);
  }
}

/** Instagram, website, and whether other members may see them. */
export async function PATCH(request: Request) {
  try {
    const token = requireToken(request);
    const parsed = handleSettingsSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Check those details and try again.";
      return Response.json({ error: message }, { status: 400 });
    }

    await saveHandles(token, parsed.data);
    return Response.json({ saved: true });
  } catch (cause) {
    return failureResponse(cause);
  }
}

export async function DELETE(request: Request) {
  try {
    await deleteOwnPin(requireToken(request));
    return Response.json({ removed: true });
  } catch (cause) {
    return failureResponse(cause);
  }
}
