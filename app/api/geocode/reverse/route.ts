/**
 * Turns a dropped pin into a neighborhood name so nobody has to type one.
 * Proxied rather than called from the browser so the request carries a real
 * user agent and can be cached, which Nominatim's usage policy asks for.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Kanazawa/0.1 (community map; contact brendan@g.studio)";

/** Most specific first: a neighborhood beats a city, a city beats a county. */
const NAME_FIELDS = ["neighbourhood", "suburb", "quarter", "village", "town", "city_district", "city", "county"];

type NominatimAddress = Record<string, string | undefined>;

function pickPlaceName(address: NominatimAddress): string | null {
  for (const field of NAME_FIELDS) {
    const value = address[field];
    if (value) return value;
  }
  return null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "Pass lat and lng" }, { status: 400 });
  }

  const query = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "14",
    addressdetails: "1",
  });

  try {
    const response = await fetch(`${NOMINATIM}?${query}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);

    const body = (await response.json()) as { address?: NominatimAddress };
    return Response.json(
      { name: pickPlaceName(body.address ?? {}) },
      { headers: { "Cache-Control": "public, s-maxage=86400" } },
    );
  } catch {
    // A missing suggestion is not an error worth showing; the field stays typed.
    return Response.json({ name: null });
  }
}
