/**
 * Site settings seeding script — creates:
 *   1. A SiteSettings shared block ("Site Settings") with the chrome's UI
 *      strings (search overlay text + logo wordmark)
 *   2. A SiteBanner shared block ("Site Banner"), enabled. The banner is not
 *      rendered site-wide — editors place it on specific pages via Visual
 *      Builder (rendered by SiteBannerBlock); the Enabled toggle hides it.
 *
 * Prerequisites:
 *   - `npm run opti:push` must have run (SiteSettings type registered)
 *
 * No Graph lookups — safe to run immediately after the type push.
 *
 * Run: npx tsx scripts/seed-settings.ts
 */

import { config } from "dotenv";
import {
  createContent,
  discoverGlobalRoot,
  noHyphens,
  sweepMisplacedSharedBlocks,
} from "./_shared";

config({ path: ".env.local" });

let BLOCKS_CONTAINER = "";

// Values mirror DEFAULT_SITE_SETTINGS in src/lib/siteSettings.ts — the seeded
// block starts identical to the hardcoded fallbacks, so editors see the live
// strings and can change them from a familiar baseline.
const SITE_SETTINGS = {
  logoTextPrimary: "Mosey",
  logoTextSecondary: "Bank",
  searchPlaceholder: "Search pages…",
  searchLoadingText: "Searching…",
  searchNoResultsText: "No results for “{query}”",
  searchMinCharsText: "Type at least 2 characters to search",
};

const SITE_BANNER = {
  message: "New: instant payments are now available",
  enabled: true,
  variant: "info",
  linkText: "Learn more",
  linkUrl: "/personal/current-account/instant-payments",
};

async function main() {
  console.log("=== Site Settings Seeding Script ===\n");

  console.log("--- Discovering shared-blocks container ---");
  BLOCKS_CONTAINER = await discoverGlobalRoot();
  console.log(`  blocks container (For All Applications): ${BLOCKS_CONTAINER}`);

  console.log("--- Cleaning up existing SiteSettings / SiteBanner items ---");
  await sweepMisplacedSharedBlocks(["SiteSettings", "SiteBanner"]);
  await new Promise((r) => setTimeout(r, 3000));

  console.log("--- Creating SiteSettings block ---");
  const settingsKey = noHyphens();
  await createContent({
    key: settingsKey,
    contentType: "SiteSettings",
    container: BLOCKS_CONTAINER,
    locale: "en",
    displayName: "Site Settings",
    properties: SITE_SETTINGS,
  }, "SiteSettings block");
  console.log(`  [settings] Created "Site Settings" (key ${settingsKey})`);

  console.log("--- Creating SiteBanner block ---");
  const bannerKey = noHyphens();
  await createContent({
    key: bannerKey,
    contentType: "SiteBanner",
    container: BLOCKS_CONTAINER,
    locale: "en",
    displayName: "Site Banner",
    properties: SITE_BANNER,
  }, "SiteBanner block");
  console.log(`  [banner] Created "Site Banner" (key ${bannerKey}, enabled)`);

  console.log("\n=== Done ===");
  console.log("Wait 30-60 s for Graph to index, then reload any page: the banner strip");
  console.log("appears at the top, and the search overlay strings come from the CMS.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
