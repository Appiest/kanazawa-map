import type { SupabaseClient } from "@supabase/supabase-js";
import { clientForToken, readOnlyClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/pins/rateLimit";

export type Gathering = {
  seq: number;
  title: string;
  place: string;
  note: string | null;
  lng: number;
  lat: number;
  startsAt: string;
  mine: boolean;
};

export type NewGathering = {
  title: string;
  place: string;
  note: string | null;
  lng: number;
  lat: number;
  startsAt: string;
};

/** Nothing further ahead than this; a map of next year is not a reason to return. */
const HORIZON_DAYS = 60;

type Row = {
  seq: number;
  title: string;
  place: string;
  note: string | null;
  lng: number;
  lat: number;
  starts_at: string;
  host_id: string;
};

function toGathering(row: Row, viewerId: string | null): Gathering {
  return {
    seq: row.seq,
    title: row.title,
    place: row.place,
    note: row.note,
    lng: row.lng,
    lat: row.lat,
    startsAt: row.starts_at,
    mine: row.host_id === viewerId,
  };
}

function signedIn(accessToken: string): SupabaseClient {
  const supabase = clientForToken(accessToken);
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

/** What is still ahead. A gathering that has started is no longer an invitation. */
export async function listUpcoming(accessToken: string | null): Promise<Gathering[]> {
  const supabase = accessToken ? clientForToken(accessToken) : readOnlyClient();
  if (!supabase) return [];

  const horizon = new Date(Date.now() + HORIZON_DAYS * 86400000).toISOString();
  const { data, error } = await supabase
    .from("gatherings")
    .select("seq, title, place, note, lng, lat, starts_at, host_id")
    .gte("starts_at", new Date().toISOString())
    .lte("starts_at", horizon)
    .order("starts_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);

  const viewer = accessToken ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
  return ((data ?? []) as Row[]).map((row) => toGathering(row, viewer));
}

export async function createGathering(accessToken: string, input: NewGathering): Promise<Gathering> {
  const supabase = signedIn(accessToken);
  const { data: session } = await supabase.auth.getUser();
  const hostId = session.user?.id;
  if (!hostId) throw new Error("That sign-in has expired");

  await enforceRateLimit(supabase, hostId, "gathering.write");

  const { data, error } = await supabase
    .from("gatherings")
    .insert({
      host_id: hostId,
      title: input.title,
      place: input.place,
      note: input.note,
      lng: input.lng,
      lat: input.lat,
      starts_at: input.startsAt,
    })
    .select("seq, title, place, note, lng, lat, starts_at, host_id")
    .single();

  if (error) throw new Error(error.message);
  return toGathering(data as Row, hostId);
}

export async function cancelGathering(accessToken: string, seq: number): Promise<void> {
  const supabase = signedIn(accessToken);
  const { error } = await supabase.from("gatherings").delete().eq("seq", seq);
  if (error) throw new Error(error.message);
}
