// Client-safe module: imported by client components (SearchOverlay, NavItems),
// so it must not pull in the Graph client. The fetch helper lives in
// src/lib/graphql/queries/GetSiteSettings.ts.

export interface SiteSettingsStrings {
  logoTextPrimary: string;
  logoTextSecondary: string;
  searchPlaceholder: string;
  searchLoadingText: string;
  /** "{query}" is replaced with the typed search query. */
  searchNoResultsText: string;
  searchMinCharsText: string;
}

// Hardcoded fallbacks - the exact strings the chrome rendered before the
// SiteSettings block existed, so the site looks identical without CMS data.
export const DEFAULT_SITE_SETTINGS: SiteSettingsStrings = {
  logoTextPrimary: "Mosey",
  logoTextSecondary: "Bank",
  searchPlaceholder: "Search pages…",
  searchLoadingText: "Searching…",
  searchNoResultsText: "No results for “{query}”",
  searchMinCharsText: "Type at least 2 characters to search",
};
