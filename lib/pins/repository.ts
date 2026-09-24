import seedPins from "@/data/seed-pins.json";
import anchorPlaces from "@/data/anchor-places.json";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientForToken, isSupabaseConfigured, readOnlyClient } from "@/lib/supabase/server";
import type { PinPoint } from "./format";
import { enforceRateLimit } from "./rateLimit";
import { keepKnown, type InterestId } from "@/lib/interests";

export type PinDetail = {
  seq: number;
  displayName: string;
  neighborhood: string;
  note: string | null;
  interests: InterestId[];
};

export type AnchorPlace = {
  id: string;
  name: string;
  blurb: string;
  lng: number;
  lat: number;
};

/** How truthfully a pin reports where somebody is. */
export type Precision = "neighborhood" | "exact";

export type NewPin = {
  displayName: string;
  neighborhood: string;
  note: string | null;
  interests: InterestId[];
  /**
   * Already reduced to what will be stored. A neighborhood pin carries the
   * neighborhood's centre, so the precise spot never reaches the server at all
   * and cannot leak from a table nobody meant to expose.
   */
  lng: number;
  lat: number;
  precision: Precision;
};

type StoredPin = Omit<PinDetail, "interests"> & {
  lng: number;
  lat: number;
  precision?: Precision;
  interests?: string[];
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
  };
}

/**
 * Without Supabase the map runs on data/seed-pins.json, so the interface can be
 * built and reviewed before the database exists. Nothing else knows which
 * source it got.
 */
export async function listPinPoints(interests: InterestId[] = []): Promise<PinPoint[]> {
  const wanted = keepKnown(interests);
  const supabase = readOnlyClient();

  if (!supabase) {
    return allLocalPins()
      .filter((pin) => wanted.length === 0 || keepKnown(pin.interests ?? []).some((id) => wanted.includes(id)))
      .map(({ seq, lng, lat }) => ({ seq, lng, lat }));
  }

  // Narrowed in the database rather than the browser, so the payload stays the
  // size of the answer rather than the size of the map.
  const query = supabase.from("pins").select("seq, lng, lat").order("created_at", { ascending: true });
  const { data, error } = wanted.length > 0 ? await query.overlaps("interests", wanted) : await query;

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
    .select("seq, display_name, neighborhood, note, interests")
    .eq("seq", seq)
    .maybeSingle();

  if (error) throw new Error(`Could not load pin ${seq}: ${error.message}`);
  if (!data) return null;

  return {
    seq: data.seq,
    displayName: data.display_name,
    neighborhood: data.neighborhood,
    note: data.note,
    interests: keepKnown(data.interests ?? []),
  };
}

/** Several pins at once, for the keyboard layer's labels. */
export async function findPinDetails(seqs: number[]): Promise<PinDetail[]> {
  const supabase = readOnlyClient();
  if (!supabase) {
    const wanted = new Set(seqs);
    return allLocalPins().filter((pin) => wanted.has(pin.seq)).map(toDetail);
  }

  const { data, error } = await supabase
    .from("pins")
    .select("seq, display_name, neighborhood, note, interests")
    .in("seq", seqs);

  if (error) throw new Error(`Could not load pins: ${error.message}`);
  return (data ?? []).map((row) => ({
    seq: row.seq,
    displayName: row.display_name,
    neighborhood: row.neighborhood,
    note: row.note,
    interests: keepKnown(row.interests ?? []),
  }));
}

function nextLocalSeq(): number {
  return allLocalPins().reduce((highest, pin) => Math.max(highest, pin.seq), 0) + 1;
}

function createLocalPin(input: NewPin): PinDetail {
  if (!usingSampleData) throw new Error("Pins cannot be saved until Supabase is configured");
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
  await enforceRateLimit(supabase, ownerId, "pin.write");

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
        location_precision: input.precision,
        interests: keepKnown(input.interests),
      },
      { onConflict: "owner_id" },
    )
    .select("id, seq, display_name, neighborhood, note, interests")
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
    interests: keepKnown(data.interests ?? []),
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

export type OwnPin = {
  seq: number;
  displayName: string;
  neighborhood: string;
  note: string | null;
  lng: number;
  lat: number;
  precision: Precision;
  interests: InterestId[];
  instagram: string | null;
  website: string | null;
};

type OwnPinRow = {
  seq: number;
  display_name: string;
  neighborhood: string;
  note: string | null;
  lng: number;
  lat: number;
  location_precision: Precision;
  interests: string[] | null;
  pin_contacts: { instagram: string | null; website: string | null } | null;
};

/** The signed-in person's own pin, so they can change or remove it. */
export async function findOwnPin(accessToken: string): Promise<OwnPin | null> {
  const supabase = signedInClient(accessToken);
  const owner = await requireOwner(supabase);

  const { data } = await supabase
    .from("pins")
    .select("seq, display_name, neighborhood, note, lng, lat, location_precision, interests, pin_contacts (instagram, website)")
    .eq("owner_id", owner.id)
    .maybeSingle<OwnPinRow>();

  if (!data) return null;
  return {
    seq: data.seq,
    displayName: data.display_name,
    neighborhood: data.neighborhood,
    note: data.note,
    lng: data.lng,
    lat: data.lat,
    precision: data.location_precision,
    interests: keepKnown(data.interests ?? []),
    instagram: data.pin_contacts?.instagram ?? null,
    website: data.pin_contacts?.website ?? null,
  };
}

export type ContactHandles = { instagram: string | null; website: string | null };

export async function updateOwnContact(accessToken: string, handles: ContactHandles): Promise<void> {
  const supabase = signedInClient(accessToken);
  const owner = await requireOwner(supabase);

  const { error } = await supabase
    .from("pin_contacts")
    .update(handles)
    .eq("owner_id", owner.id);

  if (error) throw new Error(error.message);
}

/** Taking yourself off the map. The contact row goes with it, by cascade. */
export async function deleteOwnPin(accessToken: string): Promise<void> {
  const supabase = signedInClient(accessToken);
  const owner = await requireOwner(supabase);

  const { error } = await supabase.from("pins").delete().eq("owner_id", owner.id);
  if (error) throw new Error(error.message);
}

/** How many people are on the map, for the landing page. */
export async function countPins(): Promise<number> {
  const supabase = readOnlyClient();
  if (!supabase) return allLocalPins().length;

  const { count } = await supabase.from("pins").select("seq", { count: "exact", head: true });
  return count ?? 0;
}

export type OpenReport = {
  id: string;
  reason: string;
  createdAt: string;
  pin: { seq: number; displayName: string; neighborhood: string; note: string | null } | null;
};

/** Filed by anyone signed in; readable only by a moderator. */
export async function reportPin(accessToken: string, seq: number, reason: string): Promise<void> {
  const supabase = signedInClient(accessToken);
  const owner = await requireOwner(supabase);
  await enforceRateLimit(supabase, owner.id, "pin.report");

  const { data: pin } = await supabase.from("pins").select("id").eq("seq", seq).maybeSingle();
  if (!pin) throw new Error("No pin with that number");

  const { error } = await supabase
    .from("pin_reports")
    .insert({ pin_id: pin.id, reporter_id: owner.id, reason });
  if (error) throw new Error(error.message);
}

export async function isModerator(accessToken: string): Promise<boolean> {
  const supabase = signedInClient(accessToken);
  const { data } = await supabase.rpc("is_moderator");
  return data === true;
}

export async function listOpenReports(accessToken: string): Promise<OpenReport[]> {
  const supabase = signedInClient(accessToken);

  const { data, error } = await supabase
    .from("pin_reports")
    .select("id, reason, created_at, pins (seq, display_name, neighborhood, note)")
    .is("resolved_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);

  type PinRow = { seq: number; display_name: string; neighborhood: string; note: string | null };
  type Row = { id: string; reason: string; created_at: string; pins: PinRow | PinRow[] | null };

  // A joined row arrives as an object or a single-element array depending on
  // how the relationship is inferred, so both shapes are read the same way.
  const first = (pins: Row["pins"]): PinRow | null =>
    Array.isArray(pins) ? (pins[0] ?? null) : pins;

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const pin = first(row.pins);
    return {
      id: row.id,
      reason: row.reason,
      createdAt: row.created_at,
      pin: pin
        ? {
            seq: pin.seq,
            displayName: pin.display_name,
            neighborhood: pin.neighborhood,
            note: pin.note,
          }
        : null,
    };
  });
}

/** Dismissing leaves the pin up; removing takes it down and closes the report. */
export async function resolveReport(
  accessToken: string,
  reportId: string,
  outcome: "dismiss" | "remove",
): Promise<void> {
  const supabase = signedInClient(accessToken);

  if (outcome === "remove") {
    const { data: report } = await supabase
      .from("pin_reports")
      .select("pin_id")
      .eq("id", reportId)
      .maybeSingle();
    if (report?.pin_id) {
      const { error } = await supabase.from("pins").delete().eq("id", report.pin_id);
      if (error) throw new Error(error.message);
    }
  }

  const { error } = await supabase
    .from("pin_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
}

export function listAnchorPlaces(): AnchorPlace[] {
  return anchorPlaces as AnchorPlace[];
}
