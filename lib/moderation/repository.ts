import { callerClient } from "@/lib/server/callerClient";
import { assertNoDatabaseError } from "@/lib/server/failure";
import { serviceClient } from "@/lib/supabase/server";

export type OpenReport = {
  id: string;
  reason: string;
  createdAt: string;
  pin: { seq: number; displayName: string; neighborhood: string; note: string | null } | null;
};

export type BusySender = { seq: number; displayName: string; neighborhood: string; messagesToday: number };

type ReportRow = {
  id: string;
  reason: string;
  created_at: string;
  pin_seq: number | null;
  display_name: string | null;
  neighborhood: string | null;
  note: string | null;
};

function toReport(row: ReportRow): OpenReport {
  return {
    id: row.id,
    reason: row.reason,
    createdAt: row.created_at,
    pin:
      row.pin_seq === null
        ? null
        : {
            seq: row.pin_seq,
            displayName: row.display_name ?? "",
            neighborhood: row.neighborhood ?? "",
            note: row.note,
          },
  };
}

export async function isModerator(accessToken: string): Promise<boolean> {
  const { data, error } = await callerClient(accessToken).rpc("is_moderator");
  if (error) return false;
  return data === true;
}

export async function listOpenReports(accessToken: string): Promise<OpenReport[]> {
  const { data, error } = await callerClient(accessToken).rpc("moderation_open_reports");
  assertNoDatabaseError(error);
  return ((data ?? []) as ReportRow[]).map(toReport);
}

type BusyRow = { pin_seq: number; display_name: string; neighborhood: string; messages_today: number };

export async function listBusySenders(accessToken: string): Promise<BusySender[]> {
  const { data, error } = await callerClient(accessToken).rpc("moderation_busy_senders");
  assertNoDatabaseError(error);
  return ((data ?? []) as BusyRow[]).map((row) => ({
    seq: row.pin_seq,
    displayName: row.display_name,
    neighborhood: row.neighborhood,
    messagesToday: Number(row.messages_today),
  }));
}

export async function dismissReport(accessToken: string, reportId: string): Promise<void> {
  const { error } = await callerClient(accessToken).rpc("moderation_dismiss_report", { p_report_id: reportId });
  assertNoDatabaseError(error);
}

/**
 * Supabase Auth can refuse a sign-in outright. The banned_accounts row already
 * stops every write; this also stops the person signing in at all. A failure
 * here is logged rather than thrown, because the ban itself has landed.
 */
async function blockSignIn(userId: string): Promise<void> {
  const supabase = serviceClient();
  if (!supabase) return;
  const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (error) console.error("[moderation] could not block sign-in:", error.status);
}

export async function removePin(accessToken: string, seq: number, ban: boolean): Promise<void> {
  const { data, error } = await callerClient(accessToken).rpc("moderation_remove_pin", { p_seq: seq, p_ban: ban });
  assertNoDatabaseError(error);
  if (typeof data === "string") await blockSignIn(data);
}
