/**
 * Every headline and paragraph a visitor reads outside the map's own panels.
 * Edit the words here and every page that shows them follows. Colors live in
 * app/theme.css under "Brand".
 */
export const SITE = {
  /** The site this map lives inside. Set `href` to link the frame back to it. */
  host: { name: "Nikkei Counts", href: null as string | null },
  sponsor: "Nikkei Nexus",
  tagline: "Find Asian Americans near you, and let them find you.",
};

export const LANDING = {
  headline: "Find Asian Americans near you, and let them find you.",
  intro:
    "Los Angeles has no single Japantown any more. Sawtelle and Little Tokyo are still here, but " +
    "the community they once held is spread across the basin, and most cities have the same " +
    "story. This is a map of where people actually are, wherever you live.",
  privacy:
    "Your name and city or region show on the map. Your email is never shown to anyone. People " +
    "reach you through the map, and you choose whether to reply. You can take yourself off at any time.",
  benefits: [
    {
      markers: ["person"],
      title: "Pin yourself",
      detail: "Your tag sits on your city or region, never on your street.",
    },
    {
      markers: ["cluster"],
      title: "See and find community",
      detail: "Filter by what people are into and reach out to anyone nearby.",
    },
    {
      markers: ["place", "event"],
      title: "Spotlight events and places",
      detail: "Japantowns, museums and memorial sites stay put. Gatherings come down once they happen.",
    },
  ],
} as const;

/** Reads as a sentence, and says nothing when there is nobody to count yet. */
export function peopleLine(count: number): string | null {
  if (count === 0) return null;
  if (count === 1) return "One person is on the map so far.";
  return `${count.toLocaleString()} people are on the map.`;
}
