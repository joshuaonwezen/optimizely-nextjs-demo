import { graphqlFetch } from "@/lib/optimizely/client";

// ---------------------------------------------------------------------------
// Public type — used by the demo page
// ---------------------------------------------------------------------------

export interface Referral {
  key: string;
  displayName: string;
  lastModified: string;
  name: string;
  comment: string;
}

// ---------------------------------------------------------------------------
// Raw GraphQL response types
// ---------------------------------------------------------------------------

interface RawReferral {
  _itemMetadata?: {
    key?: string | null;
    displayName?: string | null;
    lastModified?: string | null;
  } | null;
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

export const GET_REFERRALS_QUERY = /* GraphQL */ `
  query GetReferrals {
    Referral(limit: 100) {
      items {
        _itemMetadata {
          key
          displayName
          lastModified
        }
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
    key:          raw._itemMetadata?.key          ?? "",
    displayName:  raw._itemMetadata?.displayName  ?? "",
    lastModified: raw._itemMetadata?.lastModified ?? "",
    name:         raw.name                        ?? "",
    comment:      raw.comment                     ?? "",
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
  {
    key: "1",
    displayName: "Referral from Sarah Chen",
    lastModified: "",
    name: "Sarah Chen",
    comment: "Switched our content team from Contentful to Optimizely SaaS CMS. The Visual Builder makes it trivial for editors to create new pages without any engineer support.",
  },
  {
    key: "2",
    displayName: "Referral from Marcus Webb",
    lastModified: "",
    name: "Marcus Webb",
    comment: "The @recursive GraphQL directive saved us three days of nav implementation work. Fetches 5 levels of nested content in a single round-trip.",
  },
  {
    key: "3",
    displayName: "Referral from Aisha Okafor",
    lastModified: "",
    name: "Aisha Okafor",
    comment: "Optimizely Graph's ISR plus on-demand revalidation gives us the best of both worlds — fast static pages that update the moment editors publish.",
  },
  {
    key: "4",
    displayName: "Referral from Tom Hartley",
    lastModified: "",
    name: "Tom Hartley",
    comment: "We migrated our product catalog to the Graph Content Source API. Data syncs from our PIM in real-time and is immediately queryable via GraphQL.",
  },
  {
    key: "5",
    displayName: "Referral from Priya Sharma",
    lastModified: "",
    name: "Priya Sharma",
    comment: "Feature Experimentation and CMS in one platform is a genuine game changer. We A/B test content variations without ever leaving the same toolchain.",
  },
  {
    key: "6",
    displayName: "Referral from Daniel Reeves",
    lastModified: "",
    name: "Daniel Reeves",
    comment: "Preview mode was clean to implement. Pass a previewToken, swap to no-store caching, and editors see unpublished changes instantly in the live app.",
  },
];
