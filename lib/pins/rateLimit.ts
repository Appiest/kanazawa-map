import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What one account may do in an hour. A person plants a pin once and edits it
 * occasionally; anything beyond this is a script, not somebody joining.
 */
const LIMITS: Record<string, number> = {
  "pin.write": 12,
  "pin.report": 6,
  "gathering.write": 8,
};

const WINDOW_MS = 60 * 60 * 1000;

export class RateLimited extends Error {
  constructor() {
    super("That is a lot of changes at once. Try again in a little while.");
    this.name = "RateLimited";
  }
}

/**
 * Counts what this account has already done in the window and records the new
 * attempt. Enforced per account rather than per address, because the sign-in
 * is what ties an action to a person.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: keyof typeof LIMITS | string,
): Promise<void> {
  const limit = LIMITS[action];
  if (limit === undefined) return;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("account_actions")
    .select("action", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("at", since);

  if ((count ?? 0) >= limit) throw new RateLimited();

  await supabase.from("account_actions").insert({ user_id: userId, action });
}
