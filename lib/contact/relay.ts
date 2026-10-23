import { SITE } from "@/lib/content";
import { notifyModerators } from "@/lib/email/moderators";
import { emailIsConfigured, sendEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/paths";
import { assertNoDatabaseError, RequestFailure } from "@/lib/server/failure";
import { serviceClient } from "@/lib/supabase/server";

/**
 * Members reach each other without ever seeing an address. The server checks
 * who is writing, the database checks they may (and takes from their daily
 * allowance), and the note goes out from a no-reply address with the sender's
 * own verified email as Reply-To. The recipient decides whether to answer.
 */
export const MESSAGE_LIMIT = 1000;

type Sender = { id: string; email: string };

type Claim = {
  recipient_email: string | null;
  recipient_name: string;
  sender_name: string;
  sender_place: string;
  alert_moderators: boolean;
};

const NOT_SET_UP = new RequestFailure(503, "Messages are not switched on yet.");

function relayClient() {
  const supabase = serviceClient();
  if (!supabase || !emailIsConfigured()) throw NOT_SET_UP;
  return supabase;
}

async function verifiedSender(supabase: ReturnType<typeof relayClient>, accessToken: string): Promise<Sender> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  const user = data.user;
  if (error || !user) throw new RequestFailure(401, "Your sign-in has expired. Sign in again.", "not_signed_in");
  if (!user.email || !user.email_confirmed_at) {
    throw new RequestFailure(403, "Confirm your email address before sending messages.");
  }
  return { id: user.id, email: user.email };
}

function messageText(claim: Claim, message: string): string {
  return [
    `${claim.sender_name} in ${claim.sender_place} sent you a message through ${SITE.host.name}.`,
    "",
    message,
    "",
    `Reply to this email to answer ${claim.sender_name}. Your address stays private unless you do.`,
    "",
    `You got this because your pin is on the map at ${appUrl("/map")}. Take your pin off to stop messages.`,
  ].join("\n");
}

export async function sendContactMessage(accessToken: string, seq: number, message: string): Promise<void> {
  const supabase = relayClient();
  const sender = await verifiedSender(supabase, accessToken);

  const { data, error } = await supabase
    .rpc("claim_contact_message", { p_sender: sender.id, p_pin_seq: seq, p_body_length: message.length })
    .maybeSingle<Claim>();
  assertNoDatabaseError(error);
  if (!data?.recipient_email) throw new RequestFailure(404, "That person cannot get messages right now.");

  const delivered = await sendEmail({
    to: data.recipient_email,
    replyTo: sender.email,
    subject: `${data.sender_name} sent you a message on ${SITE.host.name}`,
    text: messageText(data, message),
  });
  if (!delivered) throw new RequestFailure(502, "Your message did not send. Try again in a little while.");

  if (data.alert_moderators) {
    await notifyModerators(`${data.sender_name} is sending a lot of messages`, [
      `${data.sender_name} (${data.sender_place}) has sent five messages in the last hour.`,
      "That can be fine. The queue lists everyone sending this many.",
    ]);
  }
}
