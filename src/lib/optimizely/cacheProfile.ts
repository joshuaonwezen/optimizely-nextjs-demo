import { cacheLife } from "next/cache";
import { CACHE_TTL } from "./client";

// Every cacheTag() in the app. /api/webhooks revalidates all of them on publish, so a
// tag used anywhere else but missing here would pin its data to the CACHE_TTL ceiling.
export const CACHE_TAGS = {
  page: "page",
  navigation: "navigation",
  banner: "banner",
  footer: "footer",
  settings: "settings",
  quotes: "quotes",
  quoteBlocks: "quote-blocks",
  redirects: "redirects",
  locations: "locations",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

// Shared cacheLife settings for "use cache" functions that read published content
// from Graph. Both helpers must be called inside the cache scope.

/** Normal lifetime: the webhook busts tags on publish, CACHE_TTL is the ceiling. */
export function cachePublishedContent(): void {
  cacheLife({ stale: 300, revalidate: CACHE_TTL, expire: CACHE_TTL * 24 });
}

/**
 * Catch handler for a failed Graph query inside a "use cache" function.
 *
 * The error has to be caught inside the cache scope: a rejected promise there
 * fails static generation outright ("Error occurred prerendering page") and no
 * call-site try/catch can rescue it. Returning an empty result lets the caller's
 * fallback path run.
 *
 * The empty result would otherwise be cached for the full CACHE_TTL (and a page
 * built on it could serve a cached 404 for an hour), so this shortens the entry's
 * lifetime - cacheLife keeps the smallest value per field. `expire` stays at 300s,
 * Next's floor below which a cache entry is treated as dynamic during prerender.
 */
export function cachedQueryFailed(scope: string, error: unknown): Record<never, never> {
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  console.error(`[${scope}] Graph query failed:`, error);
  return {};
}
