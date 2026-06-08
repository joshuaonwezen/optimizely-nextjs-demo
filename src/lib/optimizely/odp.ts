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

// The explicit contract between ODP segment names and CMS variation names.
// This is the only place to update when either side renames something.
export const ODP_SEGMENT_TO_VARIATION: Record<string, string> = {
  // "high-value-customers": "business",
  // "retail-consumer":      "personal",
};

export function resolveVariationKey(segments: string[]): string | undefined {
  for (const segment of segments) {
    const key = ODP_SEGMENT_TO_VARIATION[segment];
    if (key) return key;
  }
}
