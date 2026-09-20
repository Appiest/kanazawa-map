/**
 * Writes data/seed-pins.json, the stand-in map data used when Supabase is not
 * configured. These are invented people at scattered coordinates, not records
 * of anyone; they exist so the map, the clustering and the card can be worked
 * on and reviewed without a database.
 *
 * Usage: node scripts/generate-seed.ts [count]
 */
import { writeFileSync } from "node:fs";

type Metro = { name: string; lng: number; lat: number; spread: number; weight: number };

/** Real metro centers, with a spread in degrees that roughly covers the built area. */
const METROS: Metro[] = [
  { name: "Los Angeles", lng: -118.3, lat: 34.05, spread: 0.42, weight: 26 },
  { name: "Orange County", lng: -117.9, lat: 33.72, spread: 0.22, weight: 9 },
  { name: "San Gabriel Valley", lng: -118.05, lat: 34.08, spread: 0.16, weight: 11 },
  { name: "San Francisco", lng: -122.42, lat: 37.77, spread: 0.22, weight: 10 },
  { name: "San Jose", lng: -121.89, lat: 37.34, spread: 0.24, weight: 9 },
  { name: "Seattle", lng: -122.33, lat: 47.6, spread: 0.26, weight: 7 },
  { name: "New York", lng: -73.97, lat: 40.73, spread: 0.3, weight: 12 },
  { name: "Chicago", lng: -87.65, lat: 41.87, spread: 0.26, weight: 5 },
  { name: "Houston", lng: -95.37, lat: 29.76, spread: 0.3, weight: 5 },
  { name: "Honolulu", lng: -157.85, lat: 21.31, spread: 0.12, weight: 3 },
  { name: "Portland", lng: -122.68, lat: 45.52, spread: 0.2, weight: 3 },
  { name: "Boston", lng: -71.06, lat: 42.36, spread: 0.2, weight: 4 },
  { name: "Atlanta", lng: -84.39, lat: 33.75, spread: 0.26, weight: 3 },
  { name: "Denver", lng: -104.99, lat: 39.74, spread: 0.2, weight: 2 },
  { name: "Minneapolis", lng: -93.27, lat: 44.98, spread: 0.2, weight: 2 },
];

const NAMES = [
  "Mika", "Kenji", "Aiko", "Thuy", "Jae", "Linh", "Hana", "Rohan", "Mei",
  "Daniel", "Priya", "Sun", "Emi", "Vincent", "Anjali", "Haruto", "Grace",
  "Minh", "Sora", "Arjun", "Yuki", "Chloe", "Tomoko", "Ravi", "Joon",
  "Naomi", "Bao", "Ellie", "Hiro", "Sanjay", "Kaori", "Dev", "June",
  "Lien", "Theo", "Ayaka", "Nina", "Quan", "Reina", "Sam",
];

const NOTES = [
  "Looking for a taiko group that takes beginners.",
  "I cook a lot and always make too much. Come eat.",
  "Second gen, still working on my Japanese. Happy to practice with anyone.",
  "Moved here last year and don't know many people yet.",
  "I run a small ceramics studio out of my garage.",
  "Trying to start a weekend hiking group.",
  "Grew up in the 626, now out here and missing it.",
  "Board games most Fridays. There's always room.",
  "Looking for other Viet families with kids around six.",
  "I play in a band and we need a bass player.",
  "Happy to help anyone new figure out the neighborhood.",
  "Learning to make my grandmother's recipes properly.",
  "Film photography, mostly around the city on weekends.",
  "Organizing a monthly potluck. Message me.",
  "New parent, mostly free during the day.",
  "I teach a free Saturday calligraphy class.",
  "Looking for a badminton partner who is also not very good.",
  "Third gen, trying to find my way back to the community.",
  "",
  "",
];

/** Deterministic, so a regenerated seed does not churn the diff. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = makeRandom(20260920);

/** Two uniforms into a normal, so pins cluster toward the center of a metro. */
function gaussian(): number {
  const u = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

function pickMetro(): Metro {
  const total = METROS.reduce((sum, metro) => sum + metro.weight, 0);
  let target = random() * total;
  for (const metro of METROS) {
    target -= metro.weight;
    if (target <= 0) return metro;
  }
  return METROS[0];
}

const count = Number(process.argv[2] ?? 900);
const pins = Array.from({ length: count }, (_, index) => {
  const metro = pickMetro();
  return {
    seq: index + 1,
    displayName: NAMES[Math.floor(random() * NAMES.length)],
    neighborhood: metro.name,
    note: NOTES[Math.floor(random() * NOTES.length)],
    lng: Number((metro.lng + gaussian() * metro.spread).toFixed(6)),
    lat: Number((metro.lat + gaussian() * metro.spread * 0.75).toFixed(6)),
  };
});

writeFileSync(
  new URL("../data/seed-pins.json", import.meta.url),
  `${JSON.stringify(pins, null, 0)}\n`,
);
console.log(`Wrote ${pins.length} seed pins.`);
