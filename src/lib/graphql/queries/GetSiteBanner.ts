import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

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

export async function getSiteBanner(options: { locale?: string } = {}): Promise<SiteBannerItem | null> {
  const { locale = "en" } = options;
  try {
    const result = await graphqlFetch<GetSiteBannerResult>(
      GET_SITE_BANNER_QUERY,
      { locale: [locale] },
      { next: { revalidate: CACHE_TTL, tags: ["banner"] } }
    );
    return result.data?.SiteBanner?.items?.find((item) => item?.enabled) ?? null;
  } catch {
    return null;
  }
}
