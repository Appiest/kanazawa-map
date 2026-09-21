import { hexOf } from "@/styles/palette";

/**
 * The motif at rest: tags standing in the lower right, the way pins gather on
 * the real map. It is a backdrop, so it keeps clear of the reading column and
 * never competes with the headline. Decorative, so it carries no name.
 */
const TAGS = [
  { x: 8, y: 62, s: 1.0 }, { x: 15, y: 74, s: 0.8 }, { x: 22, y: 58, s: 0.9 },
  { x: 27, y: 80, s: 0.7 }, { x: 34, y: 68, s: 1.05 }, { x: 41, y: 86, s: 0.75 },
  { x: 46, y: 60, s: 0.85 }, { x: 53, y: 76, s: 1.0 }, { x: 58, y: 64, s: 0.7 },
  { x: 64, y: 88, s: 0.8 }, { x: 69, y: 70, s: 0.95 }, { x: 76, y: 58, s: 0.75 },
  { x: 81, y: 80, s: 0.9 }, { x: 88, y: 66, s: 0.8 }, { x: 94, y: 78, s: 0.7 },
  { x: 37, y: 54, s: 0.6 }, { x: 72, y: 50, s: 0.55 }, { x: 19, y: 92, s: 0.65 },
];

function Grain() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain)" opacity="0.055" />
    </svg>
  );
}

export function TagField() {
  return (
    <>
      <Grain />
      <div
        className="pointer-events-none absolute right-0 bottom-0 hidden h-[72%] w-[52%] lg:block"
        aria-hidden
      >
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet">
          {TAGS.map((tag) => (
            <g key={`${tag.x}-${tag.y}`} transform={`translate(${tag.x} ${tag.y}) scale(${tag.s})`}>
              <rect x="-0.11" y="0" width="0.22" height="4.4" fill={hexOf("green", 700)} />
              <rect x="-1.5" y="-2.7" width="3" height="2.1" rx="0.42" fill={hexOf("green", 600)} />
              <circle cx="0" cy="-1.62" r="0.3" fill={hexOf("green", 100)} />
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}
