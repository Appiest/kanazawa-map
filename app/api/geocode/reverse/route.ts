/**
 * Turns a dropped tag into the city and the region around it, each with the
 * point a pin at that level is stored on. Proxied rather than called from the
 * browser so the request carries a real user agent and can be cached, which
 * Nominatim's usage policy asks for.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Kanazawa/0.1 (community map; contact brendan@g.studio)";

/** Nominatim's zoom picks the kind of place it answers with. */
const LEVELS = {
  city: { zoom: "10", fields: ["city", "town", "village", "municipality", "hamlet"] },
  region: { zoom: "8", fields: ["county", "state_district", "region", "state"] },
} as const;

type Level = keyof typeof LEVELS;

type NominatimResult = {
  name?: string;
  address?: Record<string, string | undefined>;
  lat?: string;
  lon?: string;
};

export type Area = { name: string; centre: { lng: number; lat: number } };

function pickName(body: NominatimResult, level: Level): string | null {
  const address = body.address ?? {};
  const field = LEVELS[level].fields.find((key) => address[key]);
  return (field ? address[field] : body.name) ?? null;
}

function toArea(body: NominatimResult, level: Level): Area | null {
  const name = pickName(body, level);
  const centre = { lat: Number(body.lat), lng: Number(body.lon) };
  if (!name || !Number.isFinite(centre.lat) || !Number.isFinite(centre.lng)) return null;
  return { name, centre };
}

async function lookUp(lat: number, lng: number, level: Level): Promise<Area | null> {
  const query = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: LEVELS[level].zoom,
    addressdetails: "1",
  });

  try {
    const response = await fetch(`${NOMINATIM}?${query}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    return toArea((await response.json()) as NominatimResult, level);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawLat = Number(params.get("lat"));
  const rawLng = Number(params.get("lng"));

  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
    return Response.json({ error: "Pass lat and lng" }, { status: 400 });
  }

  // Rounded to about a kilometre, which is far finer than a city and collapses
  // nearby requests onto one cache entry. Nominatim asks for at most one call a
  // second, so the two levels are asked one after the other.
  const lat = Math.round(rawLat * 100) / 100;
  const lng = Math.round(rawLng * 100) / 100;

  const city = await lookUp(lat, lng, "city");
  const region = await lookUp(lat, lng, "region");

  return Response.json({ city, region }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
