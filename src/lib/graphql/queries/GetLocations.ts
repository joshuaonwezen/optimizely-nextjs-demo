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
  lat?:        number | null;
  lon?:        number | null;
}

interface GetLocationsResult {
  BankLocation?: {
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
        lat
        lon
      }
    }
  }
`;

function toLocation(raw: RawLocation): BankLocation {
  return {
    branchName: raw.branchName ?? "",
    city:       raw.city       ?? "",
    country:    raw.country    ?? "",
    phone:      raw.phone      ?? "",
    services:   raw.services   ?? "",
    lat:        raw.lat        ?? null,
    lon:        raw.lon        ?? null,
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
