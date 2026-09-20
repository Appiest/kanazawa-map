/**
 * MapLibre 6 ships its worker as a separate module and resolves it with
 * `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Turbopack rewrites
 * module URLs and never emits that chunk, so the worker is never fetched, the
 * style never finishes loading, and the map stays blank with no error at all.
 *
 * Copying the worker pair to public/ and pointing setWorkerUrl at it keeps the
 * lookup off the bundler entirely.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const distDir = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
const outDir = join(process.cwd(), "public", "maplibre");

mkdirSync(outDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(distDir, file), join(outDir, file));
}
console.log("Copied the MapLibre worker pair into public/maplibre.");
