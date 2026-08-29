const ODP_API_HOST = process.env.OPTIMIZELY_ODP_API_HOST ?? "https://api.zaius.com";
const ODP_API_KEY  = process.env.OPTIMIZELY_ODP_API_KEY  ?? "";

// Look up membership by fs_user_id: OdpSetup stitches the FX visitor id (optimizelyEndUserId)
// into ODP as fs_user_id, so the profile lives under that identifier - NOT vuid. Querying by
// vuid here returns an empty customer and no audiences ever resolve.
const SEGMENT_QUERY = `
  query GetSegments($userId: String!, $segmentFilter: [String!]!) {
    customer(fs_user_id: $userId) {
      audiences(subset: $segmentFilter) {
        edges { node { name state } }
      }
    }
  }
`;

// Lists every audience `name` defined on the ODP account. Used to build the "all audiences"
// subset for the verification panel - ODP's `audiences(subset:)` requires an explicit list.
const ALL_AUDIENCES_QUERY = `{ audiences { edges { node { name } } } }`;

async function listAudienceNames(fresh = false): Promise<string[]> {
  if (!ODP_API_KEY) return [];
  try {
    const res = await fetch(`${ODP_API_HOST}/v3/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ODP_API_KEY },
      body: JSON.stringify({ query: ALL_AUDIENCES_QUERY }),
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 3600 } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.audiences?.edges ?? []).map((e: { node: { name: string } }) => e.node.name);
  } catch {
    return [];
  }
}

// Queries ODP for which of `subset` the visitor currently qualifies for. `fresh` bypasses the
// 5-min fetch cache (used by the live verification panel, which must reflect current state).
async function querySegments(userId: string, subset: string[], fresh: boolean): Promise<string[]> {
  if (!ODP_API_KEY || subset.length === 0) return [];
  try {
    const res = await fetch(`${ODP_API_HOST}/v3/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ODP_API_KEY },
      body: JSON.stringify({ query: SEGMENT_QUERY, variables: { userId, segmentFilter: subset } }),
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (
      (data.data?.customer?.audiences?.edges ?? [])
        .filter((e: { node: { state: string } }) => e.node.state === "qualified")
        .map((e: { node: { name: string } }) => e.node.name)
    );
  } catch {
    return [];
  }
}

// Production path: only asks ODP about the segments in ODP_SEGMENT_TO_VARIATION (the ones that
// actually drive a homepage variation).
export async function queryOdpSegments(userId: string, fresh = false): Promise<string[]> {
  return querySegments(userId, Object.keys(ODP_SEGMENT_TO_VARIATION), fresh);
}

// Verification path: every ODP audience the visitor qualifies for, whether mapped or not. Lets
// the switcher panel show the full picture (e.g. "in active_visitors, just not a mapped one").
export async function queryAllQualifiedSegments(userId: string, fresh = false): Promise<string[]> {
  const all = await listAudienceNames(fresh);
  return querySegments(userId, all, fresh);
}

// The explicit contract between ODP audience identifiers and CMS variation names.
// This is the only place to update when either side renames something. Keys are the exact
// ODP audience `name` (case-sensitive - list them with `npx tsx scripts/test-odp.ts`);
// values are the CMS variation names, which must match the homepage CMS Variations exactly.
//
// Today the two sides are named differently (`business_banking_customer` -> `business`), so an
// explicit value is needed. When they are renamed to match (audience `business` -> variation
// `business`), you can leave the value blank ("") - resolveVariationKey falls back to the
// audience name itself, so identical naming needs no paired value. Either style works.
//
// The homepage in the CMS carries four variations: business, personal, mortgages, investments.
// ODP only has audiences for business/personal, so only those two resolve today. Mortgages and
// investments are seeded in the CMS but have no backing ODP audience yet - the variation exists
// but is never selected. That "half-configured" state is intentional (see below); create the
// audiences in ODP and add their identifiers here to light them up.
export const ODP_SEGMENT_TO_VARIATION: Record<string, string> = {
  // Batch audiences (recompute on ODP's schedule - fine for returning-visitor personalization).
  business_banking_customer: "business",
  personal_banking_customers: "personal",
  // Realtime segments (evaluate on the live event stream - qualify within a session). Named
  // differently from the batch audiences above, so both are listed and either one resolves.
  business_visitors: "business",
  mortgage_visitors: "mortgages",
  // Still unmapped - no backing audience/segment yet:
  //   "<investor-audience>": "investments",
};

// Resolves the first qualifying ODP audience to a CMS variation key. A blank map value means
// "the audience and variation share a name" - fall back to the audience name itself. The `map`
// parameter defaults to the module map and exists so the resolution logic can be unit-tested.
export function resolveVariationKey(
  segments: string[],
  map: Record<string, string> = ODP_SEGMENT_TO_VARIATION,
): string | undefined {
  for (const segment of segments) {
    if (segment in map) return map[segment] || segment;
  }
}
