import { GraphClient } from "@optimizely/cms-sdk";

// The SDK probes the base "cmp_Asset" type to decide damEnabled, but the query it
// then builds references the concrete "cmp_Public*Asset" delivery types. Under a
// preview token these instances expose cmp_Asset but NOT the concrete types, so
// getPreviewContent's query 400s ("Unknown type cmp_PublicImageAsset" x3) and the
// preview falls back to "No content found". Re-probe the concrete type the query
// actually uses so damEnabled is only true when DAM fragments will validate.
let cached: GraphClient | null = null;

export function getPreviewClient(): GraphClient {
  if (cached) return cached;
  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "", {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
  });
  // getContentMetaData is TS-private; patch the instance so getPreviewContent's
  // internal `this.getContentMetaData(...)` call resolves to our corrected version.
  // Re-verified against cms-sdk 2.2.0 internals: getContentMetaData is still private,
  // still called via `this.` in getPreviewContent, same 4-arg signature, and the
  // base-cmp_Asset-vs-concrete-type DAM mismatch this corrects is unchanged — patch
  // still required and still effective.
  const orig = (client as unknown as { getContentMetaData: (...a: unknown[]) => Promise<{ damEnabled: boolean }> })
    .getContentMetaData.bind(client);
  (client as unknown as { getContentMetaData: (...a: unknown[]) => Promise<{ damEnabled: boolean }> })
    .getContentMetaData = async (input, token, cache, slot) => {
    const res = await orig(input, token, cache, slot);
    if (!res.damEnabled) return res;
    const probe = (await client.request(
      `query { __type(name: "cmp_PublicImageAsset") { __typename } }`,
      {},
      token as string | undefined,
      cache as boolean | undefined,
      slot as never
    )) as { __type?: unknown } | null;
    return { ...res, damEnabled: probe?.__type != null };
  };
  cached = client;
  return client;
}
