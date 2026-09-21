import { createClient } from "@supabase/supabase-js";
import { APP_NAME } from "@/lib/config";

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

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Digests need a service role key");
  return createClient(url, key, { auth: { persistSession: false } });
}

function digestBody(name: string, newcomers: PinRow[], siteUrl: string): string {
  const places = [...new Set(newcomers.map((pin) => pin.neighborhood))].slice(0, 3);
  const where = places.length === 1 ? places[0] : `${places.slice(0, -1).join(", ")} and ${places.at(-1)}`;
  const count =
    newcomers.length === 1 ? "One person has" : `${newcomers.length} people have`;

  return [
    `Hello ${name},`,
    "",
    `${count} added themselves near you since you last heard from us, in ${where}.`,
    "",
    `Have a look: ${siteUrl}/map`,
    "",
    "If you would rather not get these, take your pin off the map and they stop.",
  ].join("\n");
}

/**
 * One note per person, only when somebody new is actually near them, and never
 * twice about the same arrivals. Sending is left to whatever mail provider is
 * configured; without one this reports what it would have sent.
 */
type ServiceClient = ReturnType<typeof serviceClient>;

async function readEveryone(supabase: ServiceClient): Promise<PinRow[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("seq, owner_id, display_name, neighborhood, lng, lat")
    .order("seq", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PinRow[];
}

async function readLastSeen(supabase: ServiceClient): Promise<Map<string, number>> {
  const { data } = await supabase.from("digest_sends").select("user_id, last_pin_seq");
  return new Map((data ?? []).map((row) => [row.user_id as string, row.last_pin_seq as number]));
}

export async function buildDigests({ dryRun }: { dryRun: boolean }): Promise<DigestOutcome> {
  const supabase = serviceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const everyone = await readEveryone(supabase);
  const lastSeen = await readLastSeen(supabase);

  const newest = everyone.reduce((high, pin) => Math.max(high, pin.seq), 0);
  let sent = 0;

  for (const person of everyone) {
    const newcomers = neighboursNewTo(person, everyone, lastSeen.get(person.owner_id) ?? 0);
    if (newcomers.length < MIN_NEW_NEIGHBOURS) continue;

    if (!dryRun) {
      await deliver(supabase, person, digestBody(person.display_name, newcomers, siteUrl));
      await supabase.from("digest_sends").upsert({
        user_id: person.owner_id,
        last_pin_seq: newest,
        last_sent_at: new Date().toISOString(),
      });
    }
    sent += 1;
  }

  return { considered: everyone.length, sent, skipped: everyone.length - sent, dryRun };
}

async function deliver(supabase: ServiceClient, person: PinRow, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM;
  if (!apiKey || !from) return;

  const { data } = await supabase
    .from("pin_contacts")
    .select("email")
    .eq("owner_id", person.owner_id)
    .maybeSingle();
  if (!data?.email) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: data.email,
      subject: `Someone new is on the ${APP_NAME} map near you`,
      text: body,
    }),
  }).catch(() => undefined);
}
