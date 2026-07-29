import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

// External "Spotlight" content (Content Source API, source `sptl`). Fields are
// person + quote; normalized to { name, text } to share the CustomerVoices UI
// with Quotes. Falls back to DEMO_SPOTLIGHTS if the source isn't populated.
export interface Spotlight {
  name: string;
  text: string;
}

interface RawSpotlight {
  person?: string | null;
  quote?: string | null;
}

interface GetSpotlightsResult {
  Spotlight?: {
    items?: Array<RawSpotlight | null> | null;
  } | null;
}

export const GET_SPOTLIGHTS_QUERY = /* GraphQL */ `
  query GetSpotlights {
    Spotlight(limit: 100, orderBy: { person: { value: ASC } }) {
      items {
        person
        quote
      }
    }
  }
`;

export function toSpotlight(raw: RawSpotlight): Spotlight {
  return {
    name: raw.person ?? "",
    text: raw.quote ?? "",
  };
}

export async function getSpotlights(): Promise<{ items: Spotlight[]; fromGraph: boolean }> {
  try {
    const result = await graphqlFetch<GetSpotlightsResult>(
      GET_SPOTLIGHTS_QUERY,
      {},
      { next: { revalidate: CACHE_TTL, tags: ["spotlights"] } }
    );

    const raw = result.data?.Spotlight?.items ?? [];
    const items = raw
      .filter((s): s is RawSpotlight => s !== null)
      .map(toSpotlight)
      .filter((s) => s.name !== "");

    if (items.length === 0) return { items: DEMO_SPOTLIGHTS, fromGraph: false };
    return { items, fromGraph: true };
  } catch {
    return { items: DEMO_SPOTLIGHTS, fromGraph: false };
  }
}

export const DEMO_SPOTLIGHTS: Spotlight[] = [
  { name: "Elena Ruiz",     text: "Mosey helped me buy my first flat at 26. The adviser broke every step down so I actually understood my mortgage - not just signed it." },
  { name: "Jamal Osei",     text: "I run a small design studio. Mosey's business account and instant invoicing mean I finally spend evenings designing instead of doing admin." },
  { name: "Fen Li",         text: "After moving countries twice, Mosey was the first bank that made cross-border transfers feel simple and transparent." },
  { name: "Grace Adeyemi",  text: "The savings goals feature nudged me into an emergency fund without thinking about it. I hit six months of expenses this year." },
  { name: "Noah Bergström",  text: "When my card was cloned abroad, the fraud team called me before I even noticed. New card waiting at my hotel the next morning." },
  { name: "Priya Nair",     text: "As a freelancer my income is lumpy. Mosey's spending insights smooth it out so I always know what's safe to spend." },
];
