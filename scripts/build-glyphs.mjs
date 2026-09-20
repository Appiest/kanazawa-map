/**
 * Renders Archivo into the SDF glyph ranges MapLibre requests for map labels.
 * Map labels have to match the UI family, and the public Protomaps glyph CDN
 * only carries Noto, so the ranges are built from the instanced TTFs in
 * assets/fonts. Ranges Archivo has no glyphs for are skipped: 244 of 256 come
 * back empty, and a label needing one of them could not render either way.
 *
 * Usage: node scripts/build-glyphs.mjs [fonts-dir] [out-dir]
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import fontnik from "fontnik";

const fontsDir = process.argv[2] ?? "assets/fonts";
const outDir = process.argv[3] ?? "public/glyphs";

const STACKS = [
  ["Archivo Regular", "Archivo-Regular.ttf"],
  ["Archivo Medium", "Archivo-Medium.ttf"],
];

const LAST_RANGE_START = 65280;
/** A range with no glyphs still encodes a short header; anything at or under this is empty. */
const EMPTY_RANGE_BYTES = 200;

const renderRange = (buffer, start) =>
  new Promise((resolve, reject) => {
    fontnik.range({ font: buffer, start, end: start + 255 }, (err, data) =>
      err ? reject(err) : resolve(data),
    );
  });

async function buildStack(stackName, fileName) {
  const buffer = readFileSync(join(fontsDir, fileName));
  const stackDir = join(outDir, stackName);
  mkdirSync(stackDir, { recursive: true });

  let written = 0;
  let bytes = 0;
  for (let start = 0; start <= LAST_RANGE_START; start += 256) {
    const data = await renderRange(buffer, start);
    if (data.length <= EMPTY_RANGE_BYTES) continue;
    writeFileSync(join(stackDir, `${start}-${start + 255}.pbf`), data);
    written += 1;
    bytes += data.length;
  }
  console.log(`${stackName}: ${written} ranges, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

for (const [stackName, fileName] of STACKS) {
  await buildStack(stackName, fileName);
}
