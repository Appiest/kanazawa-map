import type { PostgrestError } from "@supabase/supabase-js";

/**
 * A failure that is safe to show the person who caused it. Anything else is
 * logged on the server and reported to the browser as GENERIC, so a database
 * message never reaches a client.
 */
export class RequestFailure extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reason: string | null = null,
  ) {
    super(message);
    this.name = "RequestFailure";
  }
}

export const GENERIC = "Something went wrong on our side. Try again in a moment.";

/** The reasons raised by the functions in supabase/migrations/0006. */
const DATABASE_REASONS: Record<string, { status: number; message: string }> = {
  not_signed_in: { status: 401, message: "Sign in first." },
  account_banned: { status: 403, message: "This account can no longer make changes on the map." },
  needs_own_pin: { status: 409, message: "Add your own pin first, so people can see who is getting in touch." },
  pin_not_found: { status: 404, message: "That pin is no longer on the map." },
  own_pin: { status: 400, message: "That is your own pin." },
  not_moderator: { status: 404, message: "Not available." },
  quota_exceeded: { status: 429, message: "That is more than one account can do in a day. Try again tomorrow." },
  quota_exceeded_recipient: {
    status: 429,
    message: "You have written to this person a few times today. Give them a chance to reply.",
  },
  gathering_time: { status: 400, message: "Pick a time in the next 60 days." },
  exact_location_refused: { status: 400, message: "Pins go on a city or region, never an exact spot." },
  invalid_input: { status: 400, message: "Check the details and try again." },
};

const INVALID_VALUE_CODES = new Set(["23514", "22001", "22P02", "23502"]);

function isExpiredSession(error: PostgrestError): boolean {
  return error.code === "PGRST301" || error.code === "PGRST302" || /jwt/i.test(error.message);
}

export function fromDatabase(error: PostgrestError): RequestFailure {
  const known = DATABASE_REASONS[error.message];
  if (known) return new RequestFailure(known.status, known.message, error.message);
  if (INVALID_VALUE_CODES.has(error.code)) return new RequestFailure(400, DATABASE_REASONS.invalid_input.message);
  if (isExpiredSession(error)) return new RequestFailure(401, "Your sign-in has expired. Sign in again.");

  console.error("[database]", error.code, error.message);
  return new RequestFailure(500, GENERIC);
}

/** Throws the readable version of a Supabase error, if there is one. */
export function assertNoDatabaseError(error: PostgrestError | null): void {
  if (error) throw fromDatabase(error);
}

export function failureResponse(cause: unknown): Response {
  if (cause instanceof RequestFailure) {
    return Response.json({ error: cause.message, reason: cause.reason }, { status: cause.status });
  }
  console.error("[request]", cause);
  return Response.json({ error: GENERIC }, { status: 500 });
}
