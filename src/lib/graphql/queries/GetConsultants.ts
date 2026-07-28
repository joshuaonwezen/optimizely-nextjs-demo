import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

export interface Consultant {
  name: string;
  jobTitle: string;
  summary: string;
  expertise: string[];
  url: string;
}

interface RawConsultant {
  name?: string | null;
  jobTitle?: string | null;
  summary?: string | null;
  expertise?: Array<string | null> | null;
  _metadata?: { url?: { default?: string | null } | null } | null;
}

interface GetConsultantsResult {
  ConsultantPage?: {
    items?: Array<RawConsultant | null> | null;
  } | null;
}

export const GET_CONSULTANTS_QUERY = /* GraphQL */ `
  query GetConsultants {
    ConsultantPage(limit: 100, orderBy: { name: { value: ASC } }) {
      items {
        name
        jobTitle
        summary
        expertise
        _metadata { url { default } }
      }
    }
  }
`;

export async function getConsultants(): Promise<Consultant[]> {
  try {
    const result = await graphqlFetch<GetConsultantsResult>(
      GET_CONSULTANTS_QUERY,
      {},
      { next: { revalidate: CACHE_TTL, tags: ["consultants"] } }
    );

    return (result.data?.ConsultantPage?.items ?? [])
      .filter((c): c is RawConsultant => c !== null)
      .map((c) => ({
        name:      c.name      ?? "",
        jobTitle:  c.jobTitle  ?? "",
        summary:   c.summary   ?? "",
        expertise: (c.expertise ?? []).filter((e): e is string => e !== null),
        url:       c._metadata?.url?.default ?? "",
      }))
      .filter((c) => c.name !== "");
  } catch {
    return [];
  }
}
