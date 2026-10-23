import { z } from "zod";
import { cancelGathering, createGathering, listUpcoming } from "@/lib/gatherings/repository";
import { failureResponse, RequestFailure } from "@/lib/server/failure";
import { readJson, requireToken } from "@/lib/server/request";

export async function GET(request: Request) {
  try {
    return Response.json(
      { gatherings: await listUpcoming(requireToken(request)) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (cause) {
    return failureResponse(cause);
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
  try {
    const token = requireToken(request);
    const parsed = newGathering.safeParse(await readJson(request));
    if (!parsed.success) throw new RequestFailure(400, "Check the details and try again.");

    return Response.json(await createGathering(token, parsed.data), { status: 201 });
  } catch (cause) {
    return failureResponse(cause);
  }
}

export async function DELETE(request: Request) {
  try {
    const token = requireToken(request);
    const seq = Number(new URL(request.url).searchParams.get("seq"));
    if (!Number.isInteger(seq)) throw new RequestFailure(400, "Which gathering?");

    if (!(await cancelGathering(token, seq))) throw new RequestFailure(404, "That gathering is not yours to call off.");
    return Response.json({ cancelled: true });
  } catch (cause) {
    return failureResponse(cause);
  }
}
