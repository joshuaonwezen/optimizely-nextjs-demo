import { graphqlFetch } from "@/lib/optimizely/client";

export interface BankLocation {
  branchName: string;
  city: string;
  country: string;
  phone: string;
  services: string;
  lat: number | null;
  lon: number | null;
}

interface RawLocation {
  branchName?: string | null;
  city?:       string | null;
  country?:    string | null;
  phone?:      string | null;
  services?:   string | null;
  location?:   { lat?: number | null; lon?: number | null } | null;
}

interface GetLocationsResult {
  BankLocation?: {
    items?: Array<RawLocation | null> | null;
  } | null;
}

const LOCATION_FIELDS = /* GraphQL */ `
  branchName
  city
  country
  phone
  services
  location {
    lat
    lon
  }
`;

export const GET_LOCATIONS_QUERY = /* GraphQL */ `
  query GetBankLocations {
    BankLocation(limit: 20, orderBy: { city: ASC }) {
      items {
        ${LOCATION_FIELDS}
      }
    }
  }
`;

// Geo search: branches within $radius km of the origin, ranked nearest-first.
export const GET_NEARBY_LOCATIONS_QUERY = /* GraphQL */ `
  query GetNearbyBankLocations($lat: Float!, $lon: Float!, $radius: Int) {
    BankLocation(
      where: { location: { distance: { origin: { lat: $lat, lon: $lon }, radius: $radius, unit: KM } } }
      orderBy: { location: { origin: { lat: $lat, lon: $lon } } }
    ) {
      items {
        ${LOCATION_FIELDS}
      }
    }
  }
`;

function toLocation(raw: RawLocation): BankLocation {
  return {
    branchName: raw.branchName        ?? "",
    city:       raw.city              ?? "",
    country:    raw.country           ?? "",
    phone:      raw.phone             ?? "",
    services:   raw.services          ?? "",
    lat:        raw.location?.lat     ?? null,
    lon:        raw.location?.lon     ?? null,
  };
}

export async function getLocations(): Promise<{ items: BankLocation[]; fromGraph: boolean }> {
  try {
    const result = await graphqlFetch<GetLocationsResult>(
      GET_LOCATIONS_QUERY,
      {},
      { next: { revalidate: 60, tags: ["locations"] } }
    );

    const raw   = result.data?.BankLocation?.items ?? [];
    const items = raw
      .filter((l): l is RawLocation => l !== null)
      .map(toLocation)
      .filter((l) => l.branchName !== "");

    if (items.length === 0) return { items: [], fromGraph: false };
    return { items, fromGraph: true };
  } catch {
    return { items: [], fromGraph: false };
  }
}

export async function getNearbyLocations(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<{ items: BankLocation[]; fromGraph: boolean }> {
  try {
    const result = await graphqlFetch<GetLocationsResult>(
      GET_NEARBY_LOCATIONS_QUERY,
      { lat, lon, radius: Math.round(radiusKm) },
      { next: { revalidate: 60, tags: ["locations"] } }
    );

    const raw   = result.data?.BankLocation?.items ?? [];
    const items = raw
      .filter((l): l is RawLocation => l !== null)
      .map(toLocation)
      .filter((l) => l.branchName !== "");

    return { items, fromGraph: items.length > 0 };
  } catch {
    return { items: [], fromGraph: false };
  }
}
