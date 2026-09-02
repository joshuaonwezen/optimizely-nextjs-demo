import { GraphClient } from "@optimizely/cms-sdk";
import { applyDamMetaProbe } from "./graphPreviewPatches";

let cached: GraphClient | null = null;

export function getPreviewClient(): GraphClient {
  if (cached) return cached;
  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "", {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
  });
  applyDamMetaProbe(client);
  cached = client;
  return client;
}
