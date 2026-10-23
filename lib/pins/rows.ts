import { keepKnownConnections } from "@/lib/connections";
import { keepKnown } from "@/lib/interests";
import type { PinDetail } from "./types";

export type PinRow = {
  seq: number;
  display_name: string;
  neighborhood: string;
  note: string | null;
  interests: string[] | null;
  connections: string[] | null;
};

export const PIN_DETAIL_COLUMNS = "seq, display_name, neighborhood, note, interests, connections";

export function fromRow(row: PinRow): PinDetail {
  return {
    seq: row.seq,
    displayName: row.display_name,
    neighborhood: row.neighborhood,
    note: row.note?.trim() ? row.note : null,
    interests: keepKnown(row.interests ?? []),
    connections: keepKnownConnections(row.connections ?? []),
  };
}
