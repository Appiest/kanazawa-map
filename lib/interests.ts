import { vocabulary } from "./vocabulary";

/**
 * What people can say they are into.
 *
 * A fixed vocabulary rather than free text, for three reasons: filtering only
 * works if two people who mean the same thing pick the same word, a free field
 * is another thing to moderate, and a list can be read in a few seconds where
 * a blank box has to be thought about.
 *
 * This is the only place the list exists. Widening it beyond Japanese culture,
 * which the rest of the product is not limited to, is an edit to this array.
 */
export const INTERESTS = [
  { id: "food", label: "Food and cooking" },
  { id: "tea", label: "Tea culture" },
  { id: "history", label: "History and family stories" },
  { id: "language", label: "Language" },
  { id: "anime", label: "Anime and manga" },
  { id: "music", label: "Music" },
  { id: "taiko", label: "Taiko" },
  { id: "martial-arts", label: "Martial arts" },
  { id: "crafts", label: "Crafts and ceramics" },
  { id: "gardens", label: "Gardens and bonsai" },
  { id: "festivals", label: "Festivals" },
  { id: "film", label: "Film and books" },
] as const;

export type InterestId = (typeof INTERESTS)[number]["id"];

const interests = vocabulary<InterestId>(INTERESTS);

export const INTEREST_IDS = interests.ids;
export const keepKnown = interests.keepKnown;
export const labelFor = interests.labelFor;

/** How many someone has to pick before they can carry on. */
export const MIN_INTERESTS = 1;
