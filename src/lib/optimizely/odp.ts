const ODP_API_HOST = process.env.OPTIMIZELY_ODP_API_HOST ?? "https://api.zaius.com";
const ODP_API_KEY  = process.env.OPTIMIZELY_ODP_API_KEY  ?? "";

const SEGMENT_QUERY = `
  query GetSegments($userId: String!, $segmentFilter: [String!]!) {
    customer(vuid: $userId) {
      audiences(subset: $segmentFilter) {
        edges { node { name state } }
      }
    }
  }
`;

// Queries ODP for the segments in ODP_SEGMENT_TO_VARIATION that the visitor qualifies for.
// The subset is derived from the mapping keys so we only ask ODP about segments we actually use.
export async function queryOdpSegments(userId: string): Promise<string[]> {
  if (!ODP_API_KEY) return [];
  const segmentFilter = Object.keys(ODP_SEGMENT_TO_VARIATION);
  if (segmentFilter.length === 0) return [];
  try {
    const res = await fetch(`${ODP_API_HOST}/v3/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ODP_API_KEY },
      body: JSON.stringify({ query: SEGMENT_QUERY, variables: { userId, segmentFilter } }),
      next: { revalidate: 300 },
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
  business_banking_customer: "business",
  personal_banking_customers: "personal",
  // No ODP audience exists for these yet - the CMS variation is seeded but will never be
  // served until an audience is created and mapped here:
  //   "<mortgage-intent-audience>":  "mortgages",
  //   "<investor-audience>":         "investments",
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
