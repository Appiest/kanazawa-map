import { keepKnownConnections } from "@/lib/connections";
import { keepKnown } from "@/lib/interests";
import { callerClient } from "@/lib/server/callerClient";
import { assertNoDatabaseError } from "@/lib/server/failure";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createLocalPin } from "./repository";
import { fromRow, type PinRow } from "./rows";
import type { ContactHandles, HandleSettings, NewPin, OwnPin, PinDetail, Precision } from "./types";

/**
 * The signed-in person's own pin. Every call goes to a database function that
 * reads the caller from the token, so nothing here can name another account.
 */
export async function savePin(input: NewPin, accessToken: string | null): Promise<PinDetail> {
  if (!isSupabaseConfigured) return createLocalPin(input);

  const { data, error } = await callerClient(accessToken)
    .rpc("save_my_pin", {
      p_display_name: input.displayName,
      p_neighborhood: input.neighborhood,
      p_note: input.note,
      p_lng: input.lng,
      p_lat: input.lat,
      p_precision: input.precision,
      p_interests: keepKnown(input.interests),
      p_connections: keepKnownConnections(input.connections),
    })
    .single<PinRow>();

  assertNoDatabaseError(error);
  return fromRow(data as PinRow);
}

type OwnPinRow = PinRow & {
  lng: number;
  lat: number;
  location_precision: Precision;
  instagram: string | null;
  website: string | null;
  share_handles: boolean;
};

function toOwnPin(row: OwnPinRow): OwnPin {
  return {
    ...fromRow(row),
    lng: row.lng,
    lat: row.lat,
    precision: row.location_precision,
    handles: { instagram: row.instagram, website: row.website, share: row.share_handles },
  };
}

export async function findOwnPin(accessToken: string): Promise<OwnPin | null> {
  const { data, error } = await callerClient(accessToken).rpc("my_pin").maybeSingle<OwnPinRow>();
  assertNoDatabaseError(error);
  return data ? toOwnPin(data) : null;
}

export async function saveHandles(accessToken: string, settings: HandleSettings): Promise<void> {
  const { error } = await callerClient(accessToken).rpc("save_my_handles", {
    p_instagram: settings.instagram,
    p_website: settings.website,
    p_share: settings.share,
  });
  assertNoDatabaseError(error);
}

/** Taking yourself off the map. The contact row goes with it, by cascade. */
export async function deleteOwnPin(accessToken: string): Promise<void> {
  const { error } = await callerClient(accessToken).rpc("delete_my_pin");
  assertNoDatabaseError(error);
}

/**
 * Another member's handles, when they chose to share them. Null when they did
 * not. The database refuses callers who are not on the map themselves.
 */
export async function findPinHandles(accessToken: string, seq: number): Promise<ContactHandles | null> {
  const { data, error } = await callerClient(accessToken)
    .rpc("pin_handles", { p_seq: seq })
    .maybeSingle<ContactHandles>();
  assertNoDatabaseError(error);
  return data ?? null;
}
