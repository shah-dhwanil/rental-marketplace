/**
 * OpenStreetMap / Nominatim geocoding utilities.
 *
 * Replaces the previous Mappls (MapMyIndia) integration.
 * No API key required — OSM Nominatim is free and CORS-friendly.
 *
 * Rate limit: ≤ 1 req/s per IP (debounce your callers accordingly).
 */

const NOMINATIM = "https://nominatim.openstreetmap.org";
// Only Accept-Language is safe to set from a browser fetch call.
// User-Agent is a forbidden header name and causes a TypeError.
const HEADERS = { "Accept-Language": "en" };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlaceSuggestion {
  placeId: string;
  displayName: string;
  /** Shortened label: road / suburb / city */
  shortName: string;
  lat: number;
  lng: number;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// ── Place Search (autocomplete) ───────────────────────────────────────────────

/**
 * Returns up to `limit` address suggestions for `query` restricted to India.
 * Returns [] on any error.
 */
export async function searchPlaces(
  query: string,
  limit = 6,
): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];
  try {
    const url = new URL(`${NOMINATIM}/search`);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), { headers: HEADERS });
    if (!res.ok) return [];

    const data = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      address?: { road?: string; suburb?: string; city?: string; town?: string; village?: string };
    }>;

    return data.map((item) => {
      const a = item.address ?? {};
      const short =
        [a.road, a.suburb, a.city ?? a.town ?? a.village]
          .filter(Boolean)
          .join(", ") || item.display_name.split(",").slice(0, 2).join(",");
      return {
        placeId: String(item.place_id),
        displayName: item.display_name,
        shortName: short,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });
  } catch {
    return [];
  }
}

// ── Reverse Geocode ───────────────────────────────────────────────────────────

/**
 * Returns a human-readable address for the given coordinates.
 * Falls back to coordinate string on any error.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const fallback: ReverseGeocodeResult = {
    formattedAddress: `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`,
  };
  try {
    const url = new URL(`${NOMINATIM}/reverse`);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), { headers: HEADERS });
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
      };
    };

    const a = data.address ?? {};
    return {
      formattedAddress: data.display_name ?? fallback.formattedAddress,
      city: a.city ?? a.town ?? a.village,
      state: a.state,
      pincode: a.postcode,
    };
  } catch {
    return fallback;
  }
}
