import { graphqlFetch } from "@/lib/optimizely/client";

// ---------------------------------------------------------------------------
// Public type — used by the demo page
// ---------------------------------------------------------------------------

export interface Referral {
  name: string;
  comment: string;
}

// ---------------------------------------------------------------------------
// Raw GraphQL response types
// ---------------------------------------------------------------------------

interface RawReferral {
  name?: string | null;
  comment?: string | null;
}

interface GetReferralsResult {
  Referral?: {
    items?: Array<RawReferral | null> | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

// _itemMetadata fields are searchable:true in the global _Metadata contract so the
// CMS can identify external items — but searchable:true causes those fields to return
// null from external sources in Graph queries. Query custom properties instead.
export const GET_REFERRALS_QUERY = /* GraphQL */ `
  query GetReferrals {
    Referral(limit: 100, orderBy: { name: { value: ASC } }) {
      items {
        name
        comment
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Response mapper
// ---------------------------------------------------------------------------

export function toReferral(raw: RawReferral): Referral {
  return {
    name:    raw.name    ?? "",
    comment: raw.comment ?? "",
  };
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

/**
 * Fetch all Referral items synced via the Graph Content Source API.
 *
 * Cached for 60s with a "referrals" tag — call revalidateTag("referrals")
 * to bust on demand.
 *
 * Falls back to DEMO_REFERRALS when Graph hasn't indexed the data yet.
 */
export async function getReferrals(): Promise<{ items: Referral[]; fromGraph: boolean }> {
  try {
    const result = await graphqlFetch<GetReferralsResult>(
      GET_REFERRALS_QUERY,
      {},
      { next: { revalidate: 60, tags: ["referrals"] } }
    );

    const raw = result.data?.Referral?.items ?? [];
    const items = raw
      .filter((r): r is RawReferral => r !== null)
      .map(toReferral)
      .filter((r) => r.name !== "");

    if (items.length === 0) return { items: DEMO_REFERRALS, fromGraph: false };
    return { items, fromGraph: true };
  } catch {
    return { items: DEMO_REFERRALS, fromGraph: false };
  }
}

// ---------------------------------------------------------------------------
// Static fallback — mirrors the seed data in seed-referrals.ts
// ---------------------------------------------------------------------------

export const DEMO_REFERRALS: Referral[] = [
  { name: "Sarah Chen",   comment: "Switched our content team from Contentful to Optimizely SaaS CMS. The Visual Builder makes it trivial for editors to create new pages without any engineer support." },
  { name: "Marcus Webb",  comment: "The @recursive GraphQL directive saved us three days of nav implementation work. Fetches 5 levels of nested content in a single round-trip." },
  { name: "Aisha Okafor", comment: "Optimizely Graph's ISR plus on-demand revalidation gives us the best of both worlds — fast static pages that update the moment editors publish." },
  { name: "Tom Hartley",  comment: "We migrated our product catalog to the Graph Content Source API. Data syncs from our PIM in real-time and is immediately queryable via GraphQL." },
  { name: "Priya Sharma", comment: "Feature Experimentation and CMS in one platform is a genuine game changer. We A/B test content variations without ever leaving the same toolchain." },
  { name: "Daniel Reeves", comment: "Preview mode was clean to implement. Pass a previewToken, swap to no-store caching, and editors see unpublished changes instantly in the live app." },
];
