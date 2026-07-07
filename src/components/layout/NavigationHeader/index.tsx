import { getNavigation } from "@/lib/graphql/queries/GetNavigation";
import { getSiteSettings } from "@/lib/graphql/queries/GetSiteSettings";
import { getDemoCategories } from "@/lib/getDemoLinks";
import { getSupportedLocales } from "@/lib/graphql/queries/GetSupportedLocales";
import type { SiteSettingsStrings } from "@/lib/siteSettings";
import NavItems from "./NavItems";
import HomeLogoLink from "./HomeLogoLink";

// Nav tree + locales come from the CMS (ISR-cacheable). The nav_search_style and
// mobile_nav experiments, plus logged-in state, are resolved client-side in NavItems
// so this stays out of the cookie-reading server render path.
export default async function NavigationHeader() {
  const [{ tree }, locales, { settings: siteSettings }] = await Promise.all([
    getNavigation(),
    getSupportedLocales(),
    getSiteSettings(),
  ]);
  const demoCategories = getDemoCategories();

  // Localized nav trees + settings for non-English locales (seeded by
  // scripts/seed-localization.ts). Locales without CMS content fall back
  // to the English data client-side, so this is safe before that seed runs.
  const localizedTrees: Record<string, typeof tree> = {};
  const localizedSiteSettings: Record<string, SiteSettingsStrings> = {};
  await Promise.all(
    locales
      .filter((l) => l.code !== "en")
      .map(async (l) => {
        const [{ tree: localizedTree, fromCms }, { settings, fromCms: settingsFromCms }] =
          await Promise.all([
            getNavigation({ locale: l.code }),
            getSiteSettings({ locale: l.code }),
          ]);
        if (fromCms) localizedTrees[l.code] = localizedTree;
        if (settingsFromCms) localizedSiteSettings[l.code] = settings;
      })
  );

  return (
    <header data-component="NavigationHeader" className="sticky top-0 z-50 backdrop-blur-[20px] bg-nav-glass">
      <nav data-track-event="mb_nav_click" data-track-tags={JSON.stringify({ source: "header" })} className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <HomeLogoLink logoText={{ primary: siteSettings.logoTextPrimary, secondary: siteSettings.logoTextSecondary }} />
        <NavItems
          tree={tree}
          localizedTrees={localizedTrees}
          demoCategories={demoCategories}
          locales={locales}
          siteSettings={siteSettings}
          localizedSiteSettings={localizedSiteSettings}
        />
      </nav>
    </header>
  );
}
