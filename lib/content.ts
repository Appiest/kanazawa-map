/**
 * Words the map shows outside its own panels. The introduction, the benefits
 * and the sign-up pitch live on the Nikkei Nexus website, which embeds this
 * map, so only what the map itself needs is kept here. Colors live in
 * app/theme.css under "Brand".
 */
export const SITE = {
  /** The website this map is served inside, at /counts. */
  host: {
    name: "Nikkei Counts",
    href: process.env.NEXT_PUBLIC_HOST_URL ?? null,
  },
  sponsor: "Nikkei Nexus",
  tagline: "Find Asian Americans near you, and let them find you.",
  privacy:
    "Your name and city or region show on the map. Your email is never shown to anyone. People " +
    "reach you through the map, and you choose whether to reply. You can take yourself off at any time.",
};
