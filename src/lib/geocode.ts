export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

// Server-side geocoding via OpenStreetMap Nominatim (no API key required).
// Nominatim's usage policy requires a descriptive User-Agent and limits
// requests to ~1/sec - fine for this demo. Swap this out for a keyed
// geocoder (Google, Mapbox) if higher volume is ever needed.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "mosey-bank-demo/1.0 (nearest-branch finder)";

export async function geocodeQuery(q: string): Promise<GeocodeResult | null> {
  const query = q.trim();
  if (!query) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const results = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;

    const hit = results[0];
    if (!hit?.lat || !hit?.lon) return null;

    const lat = parseFloat(hit.lat);
    const lon = parseFloat(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

    return { lat, lon, label: hit.display_name ?? query };
  } catch {
    return null;
  }
}
