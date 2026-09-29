import { GraphClient } from "@optimizely/cms-sdk";
import { resolveDamMode } from "./damMode";

let cached: GraphClient | null = null;

// Async because the DAM mode has to be probed before the client is constructed:
// `fragment` settings are fixed for a client's lifetime and cannot be overridden
// per request. See damMode.ts for why we do not let the SDK probe for us.
export async function getPreviewClient(): Promise<GraphClient> {
  if (cached) return cached;
  cached = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "", {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
    fragment: { dam: await resolveDamMode() },
  });
  return cached;
}
