import { createInstance, createStaticProjectConfigManager } from "@optimizely/optimizely-sdk";

const DATAFILE_URL = `https://cdn.optimizely.com/datafiles/${process.env.NEXT_PUBLIC_OPTIMIZELY_FX_SDK_KEY}.json`;

type OptimizelyClient = ReturnType<typeof createInstance>;
let clientPromise: Promise<OptimizelyClient | null> | null = null;

export function getOptimizelyBrowserClient(): Promise<OptimizelyClient | null> {
  if (!clientPromise) {
    // Bypass the browser HTTP cache — the datafile CDN sends cache-control:
    // max-age=120, so a plain fetch serves a datafile up to 2 min stale and the
    // static config manager then freezes it for the tab session, causing stale
    // decisions right after an FX change. no-store makes every fresh load pull
    // the current datafile.
    clientPromise = fetch(DATAFILE_URL, { cache: "no-store" })
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
