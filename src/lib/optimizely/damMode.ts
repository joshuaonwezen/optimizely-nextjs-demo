import { GraphClient } from "@optimizely/cms-sdk";
import type { GraphOptions } from "@optimizely/cms-sdk";

type DamMode = NonNullable<NonNullable<GraphOptions["fragment"]>["dam"]>;

// The SDK decides whether to attach DAM asset fragments by probing the BASE
// "cmp_Asset" type, but the query it then builds references the CONCRETE
// "cmp_Public*Asset" delivery types. Some instances expose cmp_Asset without the
// concrete types, so the generated query 400s ("Unknown type cmp_PublicImageAsset")
// and a preview renders as "No content found".
//
// cms-sdk 3.0.0 still probes cmp_Asset, but it added `fragment.dam`, and the forced
// 'on'/'off' modes skip the probe entirely. So we run the probe the query actually
// needs and pin the result, using only public API.
//
// Until 3.0.0 this was a monkey-patch on the TS-private getContentMetaData
// (graphPreviewPatches.ts). That method is no longer on the class - it is a
// module-private function in graph/operations.js - so there is nothing left to patch.
const PROBE = `query DamConcreteType { __type(name: "cmp_PublicImageAsset") { __typename } }`;

let cached: Promise<DamMode> | null = null;

/**
 * Whether this instance's Graph exposes the concrete DAM asset types the SDK's
 * generated queries reference. Probed once per process; a failed probe answers
 * "off", which costs DAM renditions rather than breaking the whole query.
 */
export function resolveDamMode(): Promise<DamMode> {
  cached ??= probe();
  return cached;
}

async function probe(): Promise<DamMode> {
  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "", {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
    // An introspection probe must not itself carry DAM fragments, or it would
    // depend on the very types it is checking for.
    fragment: { dam: "off" },
  });

  try {
    const data = (await client.request(PROBE, {}, undefined, true)) as { __type?: unknown } | null;
    return data?.__type != null ? "on" : "off";
  } catch (error) {
    console.error("[damMode] concrete-type probe failed, assuming no DAM:", error);
    return "off";
  }
}
