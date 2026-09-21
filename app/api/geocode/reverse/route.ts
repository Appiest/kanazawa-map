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

type NominatimResult = {
  address?: NominatimAddress;
  lat?: string;
  lon?: string;
};

function pickPlaceName(address: NominatimAddress): string | null {
  for (const field of NAME_FIELDS) {
    const value = address[field];
    if (value) return value;
  }
  return null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawLat = Number(params.get("lat"));
  const rawLng = Number(params.get("lng"));

  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
    return Response.json({ error: "Pass lat and lng" }, { status: 400 });
  }

  // Rounded to about 110 metres, which is far finer than a neighbourhood and
  // collapses nearby requests onto one cache entry. Nominatim asks for at most
  // one call a second, and this keeps a busy map from spending that budget.
  const lat = Math.round(rawLat * 1000) / 1000;
  const lng = Math.round(rawLng * 1000) / 1000;

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

    const body = (await response.json()) as NominatimResult;
    const centre = { lat: Number(body.lat), lng: Number(body.lon) };

    return Response.json(
      {
        name: pickPlaceName(body.address ?? {}),
        // Where the neighborhood itself sits. A pin set to neighborhood
        // precision is stored here instead of on somebody's doorstep.
        centre: Number.isFinite(centre.lat) && Number.isFinite(centre.lng) ? centre : null,
      },
      { headers: { "Cache-Control": "public, s-maxage=86400" } },
    );
  } catch {
    // A missing suggestion is not an error worth showing; the field stays typed.
    return Response.json({ name: null, centre: null });
  }
}
