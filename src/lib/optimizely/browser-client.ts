import { createInstance, createStaticProjectConfigManager } from "@optimizely/optimizely-sdk";

const DATAFILE_URL = `https://cdn.optimizely.com/datafiles/${process.env.NEXT_PUBLIC_OPTIMIZELY_FX_SDK_KEY}.json`;

type OptimizelyClient = ReturnType<typeof createInstance>;
let clientPromise: Promise<OptimizelyClient | null> | null = null;

export function getOptimizelyBrowserClient(): Promise<OptimizelyClient | null> {
  if (!clientPromise) {
    clientPromise = fetch(DATAFILE_URL)
      .then((res) => res.text())
      .then((datafile) =>
        createInstance({
          projectConfigManager: createStaticProjectConfigManager({ datafile }),
        })
      )
      .catch(() => null);
  }
  return clientPromise;
}
