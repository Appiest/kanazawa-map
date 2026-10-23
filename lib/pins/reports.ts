import { notifyModerators } from "@/lib/email/moderators";
import { callerClient } from "@/lib/server/callerClient";
import { assertNoDatabaseError } from "@/lib/server/failure";

/** Filed by anyone signed in; read only by moderators, who are told by email. */
export async function reportPin(accessToken: string, seq: number, reason: string): Promise<void> {
  const { error } = await callerClient(accessToken).rpc("report_pin", { p_seq: seq, p_reason: reason });
  assertNoDatabaseError(error);

  await notifyModerators(`A pin was reported (#${seq})`, [
    `Somebody on the map reported pin #${seq}.`,
    "",
    "Their reason:",
    reason,
  ]);
}
