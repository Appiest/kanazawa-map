import seedPins from "@/data/seed-pins.json";
import anchorPlaces from "@/data/anchor-places.json";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientForToken, isSupabaseConfigured, readOnlyClient } from "@/lib/supabase/server";
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

export type NewPin = {
  displayName: string;
  neighborhood: string;
  note: string | null;
  lng: number;
  lat: number;
};

type StoredPin = PinDetail & { lng: number; lat: number };

const seed = seedPins as StoredPin[];

/**
 * Pins planted while Supabase is unconfigured. They live for the life of the
 * server process so the flow can be walked end to end in development; nothing
 * reads this path once credentials exist.
 */
const devPins: StoredPin[] = [];

function allLocalPins(): StoredPin[] {
  return [...seed, ...devPins];
}

function toDetail(pin: StoredPin): PinDetail {
  return {
    seq: pin.seq,
    displayName: pin.displayName,
    neighborhood: pin.neighborhood,
    note: pin.note?.trim() ? pin.note : null,
  };
}

/**
 * Without Supabase the map runs on data/seed-pins.json, so the interface can be
 * built and reviewed before the database exists. Nothing else knows which
 * source it got.
 */
export async function listPinPoints(): Promise<PinPoint[]> {
  const supabase = readOnlyClient();
  if (!supabase) {
    return allLocalPins().map(({ seq, lng, lat }) => ({ seq, lng, lat }));
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
    const match = allLocalPins().find((pin) => pin.seq === seq);
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

function nextLocalSeq(): number {
  return allLocalPins().reduce((highest, pin) => Math.max(highest, pin.seq), 0) + 1;
}

function createLocalPin(input: NewPin): PinDetail {
  const stored: StoredPin = { ...input, seq: nextLocalSeq() };
  devPins.push(stored);
  return toDetail(stored);
}

type Owner = { id: string; email: string | null };

async function requireOwner(supabase: SupabaseClient): Promise<Owner> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("That sign-in link has expired");
  return { id: user.id, email: user.email ?? null };
}

function signedInClient(accessToken: string | null): SupabaseClient {
  if (!accessToken) throw new Error("Sign in before planting a pin");
  const supabase = clientForToken(accessToken);
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function createPin(input: NewPin, accessToken: string | null): Promise<PinDetail> {
  if (!isSupabaseConfigured) return createLocalPin(input);

  const supabase = signedInClient(accessToken);
  const owner = await requireOwner(supabase);
  const ownerId = owner.id;

  // Row-level security also enforces one pin per person; upsert keeps a second
  // visit from failing on the unique owner constraint.
  const { data, error } = await supabase
    .from("pins")
    .upsert(
      {
        owner_id: ownerId,
        display_name: input.displayName,
        neighborhood: input.neighborhood,
        note: input.note,
        lng: input.lng,
        lat: input.lat,
      },
      { onConflict: "owner_id" },
    )
    .select("id, seq, display_name, neighborhood, note")
    .single();

  if (error) throw new Error(error.message);

  // Signing in already told us how to reach this person, so nobody is asked
  // for an email twice.
  await supabase
    .from("pin_contacts")
    .upsert({ pin_id: data.id, owner_id: ownerId, email: owner.email });

  return {
    seq: data.seq,
    displayName: data.display_name,
    neighborhood: data.neighborhood,
    note: data.note,
  };
}

export type PinContact = { email: string | null; instagram: string | null; website: string | null };

/**
 * Contact details for one pin. The row-level policy does the gating: a caller
 * who has not planted a pin of their own reads nothing back, whatever they ask
 * for, so this route cannot leak by being called directly.
 */
export async function findPinContact(seq: number, accessToken: string): Promise<PinContact | null> {
  const supabase = clientForToken(accessToken);
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("pins")
    .select("pin_contacts (email, instagram, website)")
    .eq("seq", seq)
    .maybeSingle();

  if (error || !data) return null;
  const contact = (data as { pin_contacts: PinContact | PinContact[] | null }).pin_contacts;
  return Array.isArray(contact) ? (contact[0] ?? null) : contact;
}

/**
 * Makes sure the caller's own pin has a contact row. Pins planted before
 * contact details existed have none, and re-placing a pin to get one would be
 * a silly thing to ask of anyone.
 */
export async function ensureOwnContact(accessToken: string): Promise<boolean> {
  const supabase = signedInClient(accessToken);
  const owner = await requireOwner(supabase);

  const { data: pin } = await supabase
    .from("pins")
    .select("id")
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (!pin) return false;

  await supabase
    .from("pin_contacts")
    .upsert({ pin_id: pin.id, owner_id: owner.id, email: owner.email });
  return true;
}

export function listAnchorPlaces(): AnchorPlace[] {
  return anchorPlaces as AnchorPlace[];
}
