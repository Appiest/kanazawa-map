/**
 * One email through Resend. Mail always leaves from DIGEST_FROM, which should
 * be a no-reply address; a reply goes wherever `replyTo` says.
 */
export type Email = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
};

export function emailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.DIGEST_FROM);
}

function resendPayload(from: string, email: Email) {
  const payload = { from, to: email.to, subject: email.subject, text: email.text };
  return email.replyTo ? { ...payload, reply_to: email.replyTo } : payload;
}

export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM;
  if (!apiKey || !from) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(resendPayload(from, email)),
  }).catch(() => null);

  if (response?.ok) return true;
  console.error("[email] Resend refused a message:", response?.status ?? "no response");
  return false;
}
