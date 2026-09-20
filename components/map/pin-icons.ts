import { hexOf } from "@/styles/palette";

/**
 * The motif: a plant tag on a stake, pressed into the ground. Drawn on a canvas
 * rather than shipped as a sprite so every variant stays tied to the palette.
 * Logical size; the canvas is scaled by the device pixel ratio it is given.
 */
const TAG_WIDTH = 16;
const TAG_HEIGHT = 11;
const TAG_RADIUS = 2;
const STAKE_WIDTH = 1.5;
const TOTAL_WIDTH = 20;
const TOTAL_HEIGHT = 26;

export type PinVariant = "person" | "person-selected" | "anchor";

type PinPaint = { tag: string; stake: string; notch: string };

const PAINT: Record<PinVariant, PinPaint> = {
  person: { tag: hexOf("green", 600), stake: hexOf("green", 700), notch: hexOf("green", 100) },
  "person-selected": { tag: hexOf("paper", 900), stake: hexOf("paper", 900), notch: hexOf("paper", 100) },
  anchor: { tag: hexOf("paper", 200), stake: hexOf("paper", 500), notch: hexOf("paper", 500) },
};

function tagPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, TAG_RADIUS);
}

function drawPin(ctx: CanvasRenderingContext2D, paint: PinPaint) {
  const tagX = (TOTAL_WIDTH - TAG_WIDTH) / 2;
  const centerX = TOTAL_WIDTH / 2;

  ctx.fillStyle = paint.stake;
  ctx.fillRect(centerX - STAKE_WIDTH / 2, TAG_HEIGHT - 1, STAKE_WIDTH, TOTAL_HEIGHT - TAG_HEIGHT + 1);

  ctx.fillStyle = paint.tag;
  tagPath(ctx, tagX, 0, TAG_WIDTH, TAG_HEIGHT);
  ctx.fill();

  // The punched hole a real plant tag hangs by, kept as a single readable dot.
  ctx.fillStyle = paint.notch;
  ctx.beginPath();
  ctx.arc(centerX, TAG_HEIGHT / 2, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

export function renderPin(variant: PinVariant, pixelRatio: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = TOTAL_WIDTH * pixelRatio;
  canvas.height = TOTAL_HEIGHT * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable for pin rendering");
  ctx.scale(pixelRatio, pixelRatio);
  drawPin(ctx, PAINT[variant]);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** A cluster is a bundle of stakes; the count is drawn by the symbol layer's text. */
export function renderCluster(pixelRatio: number): ImageData {
  const width = 34;
  const height = 26;
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable for cluster rendering");
  ctx.scale(pixelRatio, pixelRatio);

  ctx.fillStyle = hexOf("green", 700);
  for (const offset of [-6, 0, 6]) {
    ctx.fillRect(width / 2 + offset - STAKE_WIDTH / 2, 13, STAKE_WIDTH, height - 13);
  }

  ctx.fillStyle = hexOf("green", 600);
  tagPath(ctx, 1, 0, width - 2, 14);
  ctx.fill();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export const PIN_ICON_SIZE = { width: TOTAL_WIDTH, height: TOTAL_HEIGHT };
