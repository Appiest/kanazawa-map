import { RequestFailure } from "./failure";

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

export function requireToken(request: Request): string {
  const token = bearerToken(request);
  if (!token) throw new RequestFailure(401, "Sign in first.", "not_signed_in");
  return token;
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

/** A route's [seq] segment as a pin number, or a 400. */
export function pinNumber(raw: string): number {
  const seq = Number(raw);
  if (!Number.isInteger(seq) || seq < 1) throw new RequestFailure(400, "Not a pin number.");
  return seq;
}
