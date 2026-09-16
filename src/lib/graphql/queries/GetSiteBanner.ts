import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

export interface SiteBannerItem {
  message?: string | null;
  enabled?: boolean | null;
  variant?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
}

interface GetSiteBannerResult {
  SiteBanner?: {
    items?: Array<SiteBannerItem | null> | null;
  } | null;
}

// No Graph-side filter on enabled: a where clause on a field the Graph schema
// hasn't marked queryable errors the whole query, so the enabled check happens
// here instead. Newest first so a re-seeded banner wins over stale index docs.
const GET_SITE_BANNER_QUERY = /* GraphQL */ `
  query GetSiteBanner($locale: [Locales]) {
    SiteBanner(locale: $locale, orderBy: { _metadata: { lastModified: DESC } }, limit: 10) {
      items {
        message
        enabled
        variant
        linkText
        linkUrl
      }
    }
  }
`;

// The cache boundary is this function, not the fetch: the SDK's request() does
// not forward next: { revalidate, tags }, but "use cache" caches the returned
// value, so cacheTag/cacheLife apply over any client.
async function fetchSiteBanner(locale: string): Promise<GetSiteBannerResult> {
  "use cache";
  cacheTag(CACHE_TAGS.banner);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_SITE_BANNER_QUERY, { locale: [locale] });
  } catch (error) {
    return cachedQueryFailed("fetchSiteBanner", error);
  }
}

export async function getSiteBanner(options: { locale?: string } = {}): Promise<SiteBannerItem | null> {
  const { locale = "en" } = options;
  try {
    const data = await fetchSiteBanner(locale);
    return data?.SiteBanner?.items?.find((item) => item?.enabled) ?? null;
  } catch (error) {
    // Only reachable for mapping errors: fetchSiteBanner already swallows Graph
    // failures inside the cache scope, because it has to (see its comment).
    console.error("[getSiteBanner] No banner rendered:", error);
    return null;
  }
}
