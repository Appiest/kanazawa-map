import { callerClient } from "@/lib/server/callerClient";
import { assertNoDatabaseError } from "@/lib/server/failure";

export type Gathering = {
  seq: number;
  title: string;
  place: string;
  note: string | null;
  lng: number;
  lat: number;
  startsAt: string;
  /** Worked out by the database, so the host's account id never leaves it. */
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

type Row = {
  seq: number;
  title: string;
  place: string;
  note: string | null;
  lng: number;
  lat: number;
  starts_at: string;
  mine: boolean;
};

function toGathering(row: Row): Gathering {
  return {
    seq: row.seq,
    title: row.title,
    place: row.place,
    note: row.note,
    lng: row.lng,
    lat: row.lat,
    startsAt: row.starts_at,
    mine: row.mine,
  };
}

/** What is still ahead, up to 60 days out. Signed-in people only. */
export async function listUpcoming(accessToken: string): Promise<Gathering[]> {
  const { data, error } = await callerClient(accessToken).rpc("upcoming_gatherings");
  assertNoDatabaseError(error);
  return ((data ?? []) as Row[]).map(toGathering);
}

export async function createGathering(accessToken: string, input: NewGathering): Promise<Gathering> {
  const { data, error } = await callerClient(accessToken)
    .rpc("post_gathering", {
      p_title: input.title,
      p_place: input.place,
      p_note: input.note,
      p_lng: input.lng,
      p_lat: input.lat,
      p_starts_at: input.startsAt,
    })
    .single<Row>();
  assertNoDatabaseError(error);
  return toGathering(data as Row);
}

/** True when it was the caller's to call off and it is gone. */
export async function cancelGathering(accessToken: string, seq: number): Promise<boolean> {
  const { data, error } = await callerClient(accessToken).rpc("cancel_my_gathering", { p_seq: seq });
  assertNoDatabaseError(error);
  return data === true;
}
