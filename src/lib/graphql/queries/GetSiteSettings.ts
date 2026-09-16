import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import { DEFAULT_SITE_SETTINGS, type SiteSettingsStrings } from "@/lib/siteSettings";

interface SiteSettingsItem {
  logoTextPrimary?: string | null;
  logoTextSecondary?: string | null;
  searchPlaceholder?: string | null;
  searchLoadingText?: string | null;
  searchNoResultsText?: string | null;
  searchMinCharsText?: string | null;
}

interface GetSiteSettingsResult {
  SiteSettings?: {
    items?: Array<SiteSettingsItem | null> | null;
  } | null;
}

const GET_SITE_SETTINGS_QUERY = /* GraphQL */ `
  query GetSiteSettings($locale: [Locales]) {
    # Newest first: deleted blocks can linger in the Graph index after a
    # re-seed; ordering by lastModified guarantees the live block wins.
    SiteSettings(locale: $locale, orderBy: { _metadata: { lastModified: DESC } }, limit: 1) {
      items {
        logoTextPrimary
        logoTextSecondary
        searchPlaceholder
        searchLoadingText
        searchNoResultsText
        searchMinCharsText
      }
    }
  }
`;

// See fetchFooter in GetFooter.ts: the SDK's request() does not forward Next.js
// fetch options, so the cache boundary is the function, not the fetch.
async function fetchSiteSettings(locale: string): Promise<GetSiteSettingsResult> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_SITE_SETTINGS_QUERY, { locale: [locale] });
  } catch (error) {
    return cachedQueryFailed("fetchSiteSettings", error);
  }
}

/**
 * Fetch the SiteSettings singleton and merge it field-wise onto the hardcoded
 * defaults, so consumers always get a complete object and never null-check.
 *
 * Cached for 1 hour with a "settings" tag - the publish webhook calls
 * revalidateTag("settings") to bust on demand.
 */
export async function getSiteSettings(options: { locale?: string } = {}): Promise<{
  settings: SiteSettingsStrings;
  fromCms: boolean;
}> {
  const { locale = "en" } = options;
  try {
    const data = await fetchSiteSettings(locale);
    const item = data?.SiteSettings?.items?.[0];
    if (!item) return { settings: DEFAULT_SITE_SETTINGS, fromCms: false };
    return {
      settings: {
        logoTextPrimary: item.logoTextPrimary ?? DEFAULT_SITE_SETTINGS.logoTextPrimary,
        logoTextSecondary: item.logoTextSecondary ?? DEFAULT_SITE_SETTINGS.logoTextSecondary,
        searchPlaceholder: item.searchPlaceholder ?? DEFAULT_SITE_SETTINGS.searchPlaceholder,
        searchLoadingText: item.searchLoadingText ?? DEFAULT_SITE_SETTINGS.searchLoadingText,
        searchNoResultsText: item.searchNoResultsText ?? DEFAULT_SITE_SETTINGS.searchNoResultsText,
        searchMinCharsText: item.searchMinCharsText ?? DEFAULT_SITE_SETTINGS.searchMinCharsText,
      },
      fromCms: true,
    };
  } catch (error) {
    console.error("[getSiteSettings] Falling back to default settings:", error);
    return { settings: DEFAULT_SITE_SETTINGS, fromCms: false };
  }
}
