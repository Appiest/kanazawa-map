import { MARKERS, type MarkerKind } from "@/styles/markers";

/**
 * Paints a marker from styles/markers.ts onto a canvas for MapLibre. Drawn
 * rather than shipped as a sprite so every marker stays tied to the palette.
 * The canvas is scaled by the device pixel ratio it is given.
 */
export function renderMarker(kind: MarkerKind, pixelRatio: number): ImageData {
  const shape = MARKERS[kind];
  const canvas = document.createElement("canvas");
  canvas.width = shape.width * pixelRatio;
  canvas.height = shape.height * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable for marker rendering");
  ctx.scale(pixelRatio, pixelRatio);
  for (const part of shape.parts) {
    ctx.fillStyle = part.fill;
    ctx.fill(new Path2D(part.d));
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
