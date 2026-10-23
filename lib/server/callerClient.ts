import type { SupabaseClient } from "@supabase/supabase-js";
import { clientForToken } from "@/lib/supabase/server";
import { RequestFailure } from "./failure";

/** A client that acts as whoever holds this token, or a clear failure. */
export function callerClient(accessToken: string | null): SupabaseClient {
  if (!accessToken) throw new RequestFailure(401, "Sign in first.", "not_signed_in");
  const supabase = clientForToken(accessToken);
  if (!supabase) throw new RequestFailure(503, "The map is not connected to its database yet.");
  return supabase;
}
