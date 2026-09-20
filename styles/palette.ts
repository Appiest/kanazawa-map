type Matrix = readonly (readonly [number, number, number])[];

const OKLAB_TO_LMS: Matrix = [
  [1.0, 0.3963377774, 0.2158037573],
  [1.0, -0.1055613458, -0.0638541728],
  [1.0, -0.0894841775, -1.291485548],
];

const LMS_TO_LINEAR_RGB: Matrix = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];

const apply = (m: Matrix, v: readonly [number, number, number]) =>
  m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as unknown as [number, number, number];

const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

function oklchToLinearRgb(l: number, c: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const lms = apply(OKLAB_TO_LMS, [l, c * Math.cos(rad), c * Math.sin(rad)]);
  return apply(LMS_TO_LINEAR_RGB, [lms[0] ** 3, lms[1] ** 3, lms[2] ** 3]);
}

export function isInGamut(l: number, c: number, h: number): boolean {
  return oklchToLinearRgb(l, c, h).every((v) => v >= -0.0005 && v <= 1.0005);
}

/** Largest chroma that still renders inside sRGB at this lightness and hue. */
export function maxChroma(l: number, h: number): number {
  let low = 0;
  let high = 0.4;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (isInGamut(l, mid, h)) low = mid;
    else high = mid;
  }
  return low;
}

export function oklchToHex(l: number, c: number, h: number): string {
  const channels = oklchToLinearRgb(l, c, h)
    .map(linearToSrgb)
    .map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255));
  return `#${channels.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Perceived-lightness steps. Denser at the light end, wider at the dark end. */
const LIGHTNESS = {
  50: 0.985, 100: 0.9585, 200: 0.928, 300: 0.882, 400: 0.8, 500: 0.7,
  600: 0.596, 650: 0.538, 700: 0.487, 800: 0.384, 900: 0.286, 950: 0.205,
} as const;

/** Chroma peaks mid-ramp and falls off at both ends. */
const CHROMA_SHAPE = {
  50: 0.3, 100: 0.34, 200: 0.42, 300: 0.55, 400: 0.75, 500: 0.92,
  600: 1.0, 650: 1.0, 700: 0.94, 800: 0.8, 900: 0.62, 950: 0.45,
} as const;

export type Step = keyof typeof LIGHTNESS;

type RampSpec = { hue: number; maxChroma: number; steps: readonly Step[] };

const RAMPS = {
  paper: { hue: 87.6, maxChroma: 0.016, steps: [50, 100, 200, 300, 400, 500, 600, 650, 700, 800, 900, 950] },
  green: { hue: 152, maxChroma: 0.145, steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] },
  water: { hue: 232, maxChroma: 0.055, steps: [100, 200, 300, 400, 700] },
  clay: { hue: 35, maxChroma: 0.145, steps: [500, 700] },
} as const satisfies Record<string, RampSpec>;

export type RampName = keyof typeof RAMPS;

function chromaAt(spec: RampSpec, step: Step): number {
  const wanted = spec.maxChroma * CHROMA_SHAPE[step];
  return Math.min(wanted, maxChroma(LIGHTNESS[step], spec.hue) * 0.97);
}

export function oklchOf(ramp: RampName, step: Step): string {
  const spec = RAMPS[ramp];
  return `oklch(${LIGHTNESS[step]} ${chromaAt(spec, step).toFixed(4)} ${spec.hue})`;
}

export function hexOf(ramp: RampName, step: Step): string {
  const spec = RAMPS[ramp];
  return oklchToHex(LIGHTNESS[step], chromaAt(spec, step), spec.hue);
}

export function eachSwatch(): { name: string; oklch: string; hex: string }[] {
  return Object.entries(RAMPS).flatMap(([ramp, spec]) =>
    spec.steps.map((step) => ({
      name: `${ramp}-${step}`,
      oklch: oklchOf(ramp as RampName, step),
      hex: hexOf(ramp as RampName, step),
    })),
  );
}
