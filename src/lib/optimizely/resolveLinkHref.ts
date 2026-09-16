import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

// Cached per content key, so a page with many internal links costs one Graph call
// per distinct target instead of one per link per render. Tagged "page" so a
// publish that moves the target also refreshes the link.
async function fetchContentUrl(key: string): Promise<string | null> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    const target: { _metadata?: { url?: { default?: string | null } | null } | null } | null =
      await graphClient().getContent({ key });
    return target?._metadata?.url?.default ?? null;
  } catch (error) {
    cachedQueryFailed("resolveLinkHref", error);
    return null;
  }
}

// A type:"url" field pointing at internal content resolves to a
// cms://content/{key} reference, not a navigable path. Turn it into the target
// page's real URL; external URLs and already-resolved paths pass through.
// Returns undefined when empty so callers can hide the link.
export async function resolveLinkHref(
  link?: { default?: string | null; hierarchical?: string | null } | null,
): Promise<string | undefined> {
  const raw = link?.hierarchical ?? link?.default ?? null;
  if (!raw) return undefined;
  if (!raw.startsWith("cms://content/")) return raw;
  const key = raw.slice("cms://content/".length).split(/[?#]/)[0];
  return (await fetchContentUrl(key)) ?? undefined;
}
