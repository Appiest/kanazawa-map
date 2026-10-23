import { z } from "zod";
import { keepKnownConnections } from "@/lib/connections";
import { keepKnown } from "@/lib/interests";
import { safeUrl } from "@/lib/safeUrl";
import { PRECISIONS } from "./types";

/**
 * Two decimal places is about a kilometre, coarser than any street. The
 * database rounds the same way in a trigger, so this only saves a round trip.
 */
export function snapCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export const newPinSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  neighborhood: z.string().trim().min(1).max(60),
  note: z.string().trim().max(180).nullable(),
  lng: z.number().min(-180).max(180).transform(snapCoordinate),
  lat: z.number().min(-90).max(90).transform(snapCoordinate),
  // There is no exact option. Every level is the middle of an area.
  precision: z.enum(PRECISIONS).default("city"),
  // Anything outside the vocabulary is dropped rather than stored.
  interests: z.array(z.string()).max(20).default([]).transform(keepKnown),
  connections: z.array(z.string()).max(10).default([]).transform(keepKnownConnections),
});

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const WEBSITE = /^https?:\/\/[^\s<>"'`]+$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

/** The same shapes the database CHECK constraints accept. */
export const handleSettingsSchema = z.object({
  instagram: optionalText(31)
    .transform((value) => value?.replace(/^@/, "") || null)
    .refine((value) => value === null || INSTAGRAM_HANDLE.test(value), "That does not look like an Instagram handle"),
  website: optionalText(200)
    .transform(safeUrl)
    .refine((value) => value === null || (value.length <= 200 && WEBSITE.test(value)), "That does not look like a website"),
  share: z.boolean().default(false),
});
