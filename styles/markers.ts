import { hexOf } from "./palette.ts";

/**
 * Every marker on the map, drawn once as SVG path data. The map paints these
 * onto a canvas through Path2D and the pages render them as inline SVG, so the
 * legend, the landing page and the map can never drift apart.
 *
 * People are plant tags pushed into the ground and stay put. Events are
 * tickets on a broken stake, because they come down once they have happened.
 * Places are small buildings with a lit roof and a shaded side, so they read as
 * solid things on the paper rather than as another tag.
 */
export type MarkerKind = "person" | "person-selected" | "event" | "place" | "cluster";

type MarkerPart = { d: string; fill: string };
export type MarkerShape = { width: number; height: number; parts: MarkerPart[] };

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const side = w - 2 * r;
  const rise = h - 2 * r;
  return (
    `M${x + r} ${y}h${side}a${r} ${r} 0 0 1 ${r} ${r}v${rise}a${r} ${r} 0 0 1 -${r} ${r}` +
    `h-${side}a${r} ${r} 0 0 1 -${r} -${r}v-${rise}a${r} ${r} 0 0 1 ${r} -${r}z`
  );
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;
}

const STAKE = "M9.25 10h1.5v16h-1.5z";
const TAG = roundedRect(2, 0, 16, 11, 2);
const HOLE = circle(10, 5.5, 1.6);

function tag(face: string, stake: string, hole: string): MarkerShape {
  return {
    width: 20,
    height: 26,
    parts: [
      { d: STAKE, fill: stake },
      { d: TAG, fill: face },
      { d: HOLE, fill: hole },
    ],
  };
}

const event: MarkerShape = {
  width: 20,
  height: 26,
  parts: [
    { d: "M9.25 10h1.5v4h-1.5zM9.25 16h1.5v3.5h-1.5zM9.25 21.5h1.5v4.5h-1.5z", fill: hexOf("clay", 700) },
    { d: "M2 0H18V3.5A2 2 0 0 0 18 7.5V11H2V7.5A2 2 0 0 0 2 3.5Z", fill: hexOf("clay", 500) },
    { d: "M6.5 1.25h1v1.75h-1zM6.5 4.6h1v1.8h-1zM6.5 8h1v1.75h-1z", fill: hexOf("paper", 50) },
    { d: circle(12.5, 5.5, 1.5), fill: hexOf("paper", 50) },
  ],
};

const place: MarkerShape = {
  width: 24,
  height: 26,
  parts: [
    { d: "M3 23.5a9 2.25 0 1 0 18 0a9 2.25 0 1 0 -18 0z", fill: `${hexOf("paper", 900)}2e` },
    { d: "M2 7L12 12L12 23L2 18Z", fill: hexOf("land", 300) },
    { d: "M22 7L12 12L12 23L22 18Z", fill: hexOf("land", 500) },
    { d: "M12 2L22 7L12 12L2 7Z", fill: hexOf("paper", 50) },
    { d: "M4 11.2L10 14.2L10 16L4 13Z", fill: hexOf("paper", 800) },
    { d: "M15 16.5L18.5 14.75L18.5 19.25L15 21Z", fill: hexOf("paper", 900) },
  ],
};

const cluster: MarkerShape = {
  width: 34,
  height: 26,
  parts: [
    { d: "M10.25 13h1.5v13h-1.5zM16.25 13h1.5v13h-1.5zM22.25 13h1.5v13h-1.5z", fill: hexOf("green", 700) },
    { d: roundedRect(1, 0, 32, 14, 2), fill: hexOf("green", 600) },
  ],
};

export const MARKERS: Record<MarkerKind, MarkerShape> = {
  person: tag(hexOf("green", 600), hexOf("green", 700), hexOf("green", 100)),
  "person-selected": tag(hexOf("paper", 900), hexOf("paper", 900), hexOf("paper", 100)),
  event,
  place,
  cluster,
};
