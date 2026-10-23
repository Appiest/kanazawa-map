import seedPins from "@/data/seed-pins.json";
import anchorPlaces from "@/data/anchor-places.json";
import { isSupabaseConfigured, readOnlyClient } from "@/lib/supabase/server";
import { keepKnown, type InterestId } from "@/lib/interests";
import { keepKnownConnections } from "@/lib/connections";
import { assertNoDatabaseError } from "@/lib/server/failure";
import type { PinPoint } from "./format";
import { fromRow, PIN_DETAIL_COLUMNS, type PinRow } from "./rows";
import type { AnchorPlace, NewPin, PinDetail } from "./types";

/**
 * Public reads. Everything here goes through public.map_pins, which has no
 * owner, no internal id and no timestamps, so nothing this file returns can
 * tie a pin to an account.
 */
type StoredPin = Omit<PinDetail, "interests" | "connections"> & {
  lng: number;
  lat: number;
  interests?: string[];
  connections?: string[];
};

const seed = seedPins as StoredPin[];

/**
 * Pins planted while Supabase is unconfigured. They live for the life of the
 * server process so the flow can be walked end to end in development; nothing
 * reads this path once credentials exist.
 */
const devPins: StoredPin[] = [];

/**
 * The stand-in people in data/seed-pins.json are invented. Serving them where
 * anyone could take them for real members would be a lie the nonprofit has to
 * answer for, so outside development the map is empty until Supabase answers.
 */
export const usingSampleData = !isSupabaseConfigured && process.env.NODE_ENV !== "production";

function allLocalPins(): StoredPin[] {
  if (!usingSampleData) {
    console.error("Supabase is not configured. The map will stay empty rather than show sample people.");
    return [];
  }
  return [...seed, ...devPins];
}

function toDetail(pin: StoredPin): PinDetail {
  return {
    seq: pin.seq,
    displayName: pin.displayName,
    neighborhood: pin.neighborhood,
    note: pin.note?.trim() ? pin.note : null,
    interests: keepKnown(pin.interests ?? []),
    connections: keepKnownConnections(pin.connections ?? []),
  };
}

function localPinsMatching(wanted: InterestId[]): PinPoint[] {
  return allLocalPins()
    .filter((pin) => wanted.length === 0 || keepKnown(pin.interests ?? []).some((id) => wanted.includes(id)))
    .map(({ seq, lng, lat }) => ({ seq, lng, lat }));
}

/**
 * Without Supabase the map runs on data/seed-pins.json, so the interface can be
 * built and reviewed before the database exists. Nothing else knows which
 * source it got.
 */
export async function listPinPoints(interests: InterestId[] = []): Promise<PinPoint[]> {
  const wanted = keepKnown(interests);
  const supabase = readOnlyClient();
  if (!supabase) return localPinsMatching(wanted);

  // Narrowed in the database rather than the browser, so the payload stays the
  // size of the answer rather than the size of the map.
  const query = supabase.from("map_pins").select("seq, lng, lat").order("seq", { ascending: true });
  const { data, error } = wanted.length > 0 ? await query.overlaps("interests", wanted) : await query;

  assertNoDatabaseError(error);
  return data ?? [];
}

export async function findPinDetail(seq: number): Promise<PinDetail | null> {
  const supabase = readOnlyClient();
  if (!supabase) {
    const match = allLocalPins().find((pin) => pin.seq === seq);
    return match ? toDetail(match) : null;
  }

  const { data, error } = await supabase
    .from("map_pins")
    .select(PIN_DETAIL_COLUMNS)
    .eq("seq", seq)
    .maybeSingle<PinRow>();

  assertNoDatabaseError(error);
  return data ? fromRow(data) : null;
}

/** Several pins at once, for the keyboard layer's labels. */
export async function findPinDetails(seqs: number[]): Promise<PinDetail[]> {
  const supabase = readOnlyClient();
  if (!supabase) {
    const wanted = new Set(seqs);
    return allLocalPins().filter((pin) => wanted.has(pin.seq)).map(toDetail);
  }

  const { data, error } = await supabase.from("map_pins").select(PIN_DETAIL_COLUMNS).in("seq", seqs);

  assertNoDatabaseError(error);
  return ((data ?? []) as PinRow[]).map(fromRow);
}

/** How many people are on the map. */
export async function countPins(): Promise<number> {
  const supabase = readOnlyClient();
  if (!supabase) return allLocalPins().length;

  const { count, error } = await supabase.from("map_pins").select("seq", { count: "exact", head: true });
  assertNoDatabaseError(error);
  return count ?? 0;
}

function nextLocalSeq(): number {
  return allLocalPins().reduce((highest, pin) => Math.max(highest, pin.seq), 0) + 1;
}

/** Development only: a pin that lives in memory until the server restarts. */
export function createLocalPin(input: NewPin): PinDetail {
  if (!usingSampleData) throw new Error("Pins cannot be saved until Supabase is configured");
  const stored: StoredPin = { ...input, seq: nextLocalSeq() };
  devPins.push(stored);
  return toDetail(stored);
}

export function listAnchorPlaces(): AnchorPlace[] {
  return anchorPlaces as AnchorPlace[];
}
