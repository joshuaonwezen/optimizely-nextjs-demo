import { config, getClient, type GraphClient } from "@optimizely/cms-sdk";

// getClient() throws when config() has not run. componentRegistry.ts configures the
// client, but only page routes import it - site chrome (NavigationHeader, Footer)
// renders from layout.tsx, which does not. So any query reached from the layout must
// go through this accessor instead of calling getClient() directly, or it throws on
// every route that skips the registry (all of /demo/*) and falls back to static data.
// setGraphConfig is a plain assignment, so re-configuring with the same values is a no-op.
let configured = false;

export function graphClient(): GraphClient {
  if (!configured) {
    config({
      apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "",
      graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
    });
    configured = true;
  }
  return getClient();
}
