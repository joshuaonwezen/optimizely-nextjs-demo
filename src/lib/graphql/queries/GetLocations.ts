import { graphqlFetch } from "@/lib/optimizely/client";

export interface BankLocation {
  branchName: string;
  city: string;
  country: string;
  phone: string;
  services: string;
  coordinates: { lat: number; lon: number } | null;
}

interface RawLocation {
  branchName?: string | null;
  city?:       string | null;
  country?:    string | null;
  phone?:      string | null;
  services?:   string | null;
  coordinates?: { lat?: number | null; lon?: number | null } | null;
}

interface GetLocationsResult {
  BankLocation?: {
    items?: Array<RawLocation | null> | null;
  } | null;
}

interface GetGeoSearchResult {
  BankLocation?: {
    total?: number | null;
    items?: Array<RawLocation | null> | null;
  } | null;
}

export const GET_LOCATIONS_QUERY = /* GraphQL */ `
  query GetBankLocations {
    BankLocation(limit: 20, orderBy: { city: ASC }) {
      items {
        branchName
        city
        country
        phone
        services
        coordinates { lat lon }
      }
    }
  }
`;

export const GEO_SEARCH_TEST_QUERY = /* GraphQL */ `
  query GeoSearchTest {
    BankLocation(
      where: {
        coordinates: {
          distance: {
            origin: { lat: 52.3676, lon: 4.9041 }
            radius: 500
            unit: KM
          }
        }
      }
    ) {
      total
      items {
        branchName
        city
        country
      }
    }
  }
`;

function toLocation(raw: RawLocation): BankLocation {
  return {
    branchName:  raw.branchName  ?? "",
    city:        raw.city        ?? "",
    country:     raw.country     ?? "",
    phone:       raw.phone       ?? "",
    services:    raw.services    ?? "",
    coordinates:
      raw.coordinates?.lat != null && raw.coordinates?.lon != null
        ? { lat: raw.coordinates.lat, lon: raw.coordinates.lon }
        : null,
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

export interface GeoSearchOutcome {
  success: boolean;
  total: number;
  items: Pick<BankLocation, "branchName" | "city" | "country">[];
  error: string | null;
}

export async function testGeoSearch(): Promise<GeoSearchOutcome> {
  try {
    const result = await graphqlFetch<GetGeoSearchResult>(
      GEO_SEARCH_TEST_QUERY,
      {},
      { next: { revalidate: 60, tags: ["locations-geo"] } }
    );

    if (result.errors?.length) {
      return {
        success: false,
        total:   0,
        items:   [],
        error:   result.errors[0].message,
      };
    }

    const raw   = result.data?.BankLocation?.items ?? [];
    const items = raw
      .filter((l): l is RawLocation => l !== null)
      .map((l) => ({
        branchName: l.branchName ?? "",
        city:       l.city       ?? "",
        country:    l.country    ?? "",
      }));

    return {
      success: true,
      total:   result.data?.BankLocation?.total ?? items.length,
      items,
      error:   null,
    };
  } catch (err) {
    return {
      success: false,
      total:   0,
      items:   [],
      error:   err instanceof Error ? err.message : String(err),
    };
  }
}
