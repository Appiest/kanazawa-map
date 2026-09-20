import seedPins from "@/data/seed-pins.json";
import anchorPlaces from "@/data/anchor-places.json";
import { readOnlyClient } from "@/lib/supabase/server";
import type { PinPoint } from "./format";

export type PinDetail = {
  seq: number;
  displayName: string;
  neighborhood: string;
  note: string | null;
};

export type AnchorPlace = {
  id: string;
  name: string;
  blurb: string;
  lng: number;
  lat: number;
};

type SeedPin = PinDetail & { lng: number; lat: number };

const seed = seedPins as SeedPin[];

/**
 * Without Supabase the map runs on data/seed-pins.json, so the interface can be
 * built and reviewed before the database exists. Nothing else in the app knows
 * which source it got.
 */
export async function listPinPoints(): Promise<PinPoint[]> {
  const supabase = readOnlyClient();
  if (!supabase) {
    return seed.map(({ seq, lng, lat }) => ({ seq, lng, lat }));
  }

  const { data, error } = await supabase
    .from("pins")
    .select("seq, lng, lat")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Could not load pins: ${error.message}`);
  return data ?? [];
}

export async function findPinDetail(seq: number): Promise<PinDetail | null> {
  const supabase = readOnlyClient();
  if (!supabase) {
    const match = seed.find((pin) => pin.seq === seq);
    return match ? toDetail(match) : null;
  }

  const { data, error } = await supabase
    .from("pins")
    .select("seq, display_name, neighborhood, note")
    .eq("seq", seq)
    .maybeSingle();

  if (error) throw new Error(`Could not load pin ${seq}: ${error.message}`);
  if (!data) return null;
  return {
    seq: data.seq,
    displayName: data.display_name,
    neighborhood: data.neighborhood,
    note: data.note,
  };
}

function toDetail(pin: SeedPin): PinDetail {
  return {
    seq: pin.seq,
    displayName: pin.displayName,
    neighborhood: pin.neighborhood,
    note: pin.note?.trim() ? pin.note : null,
  };
}

export function listAnchorPlaces(): AnchorPlace[] {
  return anchorPlaces as AnchorPlace[];
}
