import type { ConnectionId } from "@/lib/connections";
import type { InterestId } from "@/lib/interests";

/** What anybody looking at the map can read about a pin. */
export type PinDetail = {
  seq: number;
  displayName: string;
  neighborhood: string;
  note: string | null;
  interests: InterestId[];
  connections: ConnectionId[];
};

export type AnchorPlace = {
  id: string;
  name: string;
  blurb: string;
  lng: number;
  lat: number;
};

/**
 * Where a pin sits. A pin is always stored on the middle of an area, never on
 * the spot somebody dropped it, so there is no way to publish a home address.
 * `neighborhood` only survives on pins planted before city and region existed.
 */
export const PRECISIONS = ["city", "region", "neighborhood"] as const;
export type Precision = (typeof PRECISIONS)[number];
export type ChosenPrecision = Exclude<Precision, "neighborhood">;

export type NewPin = {
  displayName: string;
  neighborhood: string;
  note: string | null;
  interests: InterestId[];
  connections: ConnectionId[];
  /**
   * Already reduced to the middle of the chosen city or region, so the spot
   * somebody dropped their tag never reaches the server at all.
   */
  lng: number;
  lat: number;
  precision: Precision;
};

/** Instagram and website, which other members see only when shared. */
export type ContactHandles = {
  instagram: string | null;
  website: string | null;
};

export type HandleSettings = ContactHandles & { share: boolean };

export type OwnPin = PinDetail & {
  lng: number;
  lat: number;
  precision: Precision;
  handles: HandleSettings;
};
