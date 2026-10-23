import { serviceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/paths";
import { sendEmail } from "./send";

async function moderatorAddresses(): Promise<string[]> {
  const supabase = serviceClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("moderator_emails");
  if (error) {
    console.error("[moderation] could not list moderators:", error.code);
    return [];
  }
  return (data ?? []) as string[];
}

/**
 * Tells every moderator something needs a look. Failing to send never fails
 * the request that caused it: the report is already in the queue.
 */
export async function notifyModerators(subject: string, lines: string[]): Promise<void> {
  const to = await moderatorAddresses();
  if (to.length === 0) return;

  await sendEmail({
    to,
    subject,
    text: [...lines, "", `Open the queue: ${appUrl("/moderate")}`].join("\n"),
  });
}
