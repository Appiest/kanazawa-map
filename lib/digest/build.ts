import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_NAME } from "@/lib/config";
import { emailIsConfigured, sendEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/paths";
import { serviceClient } from "@/lib/supabase/server";

/** Near enough to walk or drive to without thinking about it. */
const NEARBY_KM = 40;
const MIN_NEW_NEIGHBOURS = 1;

export type DigestOutcome = {
  considered: number;
  sent: number;
  skipped: number;
  dryRun: boolean;
};

type PinRow = {
  seq: number;
  owner_id: string;
  display_name: string;
  neighborhood: string;
  lng: number;
  lat: number;
};

/** Great-circle distance, which is plenty for "is this person nearby". */
function kilometresBetween(a: PinRow, b: PinRow): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** People who arrived near this person since they were last written to. */
function neighboursNewTo(person: PinRow, everyone: PinRow[], since: number): PinRow[] {
  return everyone.filter(
    (other) =>
      other.seq > since &&
      other.owner_id !== person.owner_id &&
      kilometresBetween(person, other) <= NEARBY_KM,
  );
}

function requireServiceClient(): SupabaseClient {
  const supabase = serviceClient();
  if (!supabase) throw new Error("Digests need a service role key");
  return supabase;
}

function digestBody(name: string, newcomers: PinRow[]): string {
  const places = [...new Set(newcomers.map((pin) => pin.neighborhood))].slice(0, 3);
  const where = places.length === 1 ? places[0] : `${places.slice(0, -1).join(", ")} and ${places.at(-1)}`;
  const count =
    newcomers.length === 1 ? "One person has" : `${newcomers.length} people have`;

  return [
    `Hello ${name},`,
    "",
    `${count} added themselves near you since you last heard from us, in ${where}.`,
    "",
    `Have a look: ${appUrl("/map")}`,
    "",
    "If you would rather not get these, take your pin off the map and they stop.",
  ].join("\n");
}

async function readEveryone(supabase: SupabaseClient): Promise<PinRow[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("seq, owner_id, display_name, neighborhood, lng, lat")
    .order("seq", { ascending: true });
  if (error) throw new Error(`Could not read pins (${error.code})`);
  return (data ?? []) as PinRow[];
}

async function readLastSeen(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("digest_sends").select("user_id, last_pin_seq");
  if (error) throw new Error(`Could not read digest history (${error.code})`);
  return new Map((data ?? []).map((row) => [row.user_id as string, row.last_pin_seq as number]));
}

/** The address comes from auth.users, the only place an email is kept. */
async function addressOf(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

async function deliver(supabase: SupabaseClient, person: PinRow, body: string): Promise<boolean> {
  const to = await addressOf(supabase, person.owner_id);
  if (!to) return false;
  return sendEmail({ to, subject: `Someone new is on the ${APP_NAME} map near you`, text: body });
}

async function recordSend(supabase: SupabaseClient, person: PinRow, newest: number): Promise<void> {
  const { error } = await supabase.from("digest_sends").upsert({
    user_id: person.owner_id,
    last_pin_seq: newest,
    last_sent_at: new Date().toISOString(),
  });
  if (error) console.error("[digest] could not record a send:", error.code);
}

/**
 * One note per person, only when somebody new is actually near them, and never
 * twice about the same arrivals. Without a mail provider this reports what it
 * would have sent.
 */
export async function buildDigests({ dryRun }: { dryRun: boolean }): Promise<DigestOutcome> {
  const supabase = requireServiceClient();
  const sending = !dryRun && emailIsConfigured();

  const everyone = await readEveryone(supabase);
  const lastSeen = await readLastSeen(supabase);
  const newest = everyone.reduce((high, pin) => Math.max(high, pin.seq), 0);
  let sent = 0;

  for (const person of everyone) {
    const newcomers = neighboursNewTo(person, everyone, lastSeen.get(person.owner_id) ?? 0);
    if (newcomers.length < MIN_NEW_NEIGHBOURS) continue;

    if (sending && (await deliver(supabase, person, digestBody(person.display_name, newcomers)))) {
      await recordSend(supabase, person, newest);
    }
    sent += 1;
  }

  return { considered: everyone.length, sent, skipped: everyone.length - sent, dryRun: !sending };
}
