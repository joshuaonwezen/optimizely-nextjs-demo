import type { GraphClient } from "@optimizely/cms-sdk";

type MetaProbe = (...a: unknown[]) => Promise<{ damEnabled: boolean }>;

// The SDK probes the base "cmp_Asset" type to decide damEnabled, but the query it
// then builds references the concrete "cmp_Public*Asset" delivery types. Some
// instances expose cmp_Asset but NOT the concrete types, so getPreviewContent's
// query 400s ("Unknown type cmp_PublicImageAsset" x3) and the preview falls back
// to "No content found". Re-probe the concrete type the query actually uses so
// damEnabled is only true when the DAM fragments will validate.
//
// getContentMetaData is TS-private; patch the instance so getPreviewContent's
// internal `this.getContentMetaData(...)` call resolves to the corrected version.
// Re-verified against cms-sdk 2.2.0: still private, still called via `this.` in
// getPreviewContent, same 4-arg signature.
export function applyDamMetaProbe(client: GraphClient): void {
  const holder = client as unknown as { getContentMetaData: MetaProbe };
  const orig = holder.getContentMetaData.bind(client);
  holder.getContentMetaData = async (input, token, cache, slot) => {
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
}
