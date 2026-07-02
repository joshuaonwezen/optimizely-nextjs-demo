import { type NextRequest, NextResponse } from "next/server";
import { getNearbyLocations, type BankLocation } from "@/lib/graphql/queries/GetLocations";
import { geocodeQuery } from "@/lib/geocode";
import { haversineKm } from "@/lib/geo";

const DEFAULT_RADIUS_KM = 500;
const MAX_RADIUS_KM = 5000;

export interface NearbyLocation extends BankLocation {
  distanceKm: number | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const radius = Math.min(
    MAX_RADIUS_KM,
    Math.max(1, parseFloat(searchParams.get("radius") ?? String(DEFAULT_RADIUS_KM)) || DEFAULT_RADIUS_KM)
  );

  if (q.length < 2) {
    return NextResponse.json({ origin: null, items: [] });
  }

  try {
    const origin = await geocodeQuery(q);
    if (!origin) {
      return NextResponse.json({ origin: null, items: [], error: "Location not found" });
    }

    const { items } = await getNearbyLocations(origin.lat, origin.lon, radius);

    const withDistance: NearbyLocation[] = items.map((loc) => ({
      ...loc,
      distanceKm:
        loc.lat != null && loc.lon != null
          ? Math.round(haversineKm({ lat: origin.lat, lon: origin.lon }, { lat: loc.lat, lon: loc.lon }))
          : null,
    }));

    return NextResponse.json({
      origin: { lat: origin.lat, lon: origin.lon, label: origin.label },
      items: withDistance,
    });
  } catch (error) {
    console.error("[Locations/nearby] Query failed:", error);
    return NextResponse.json({ error: "Nearby search failed" }, { status: 500 });
  }
}
