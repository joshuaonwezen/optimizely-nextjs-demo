/**
 * CMS cleanup script — two jobs:
 *   1. Delete CMS content types that are no longer used by this app
 *   2. Delete orphaned NavigationItems left behind from manual CMS editing
 *
 * Run: npx tsx scripts/cleanup-types.ts
 */

import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

const API_BASE = "https://api.cms.optimizely.com";
const TYPES_ENDPOINT = `${API_BASE}/v1/contenttypes`;
const CONTENT_ENDPOINT = `${API_BASE}/v1/content`;

// ---------------------------------------------------------------------------
// Content types actively used by this application — keep all of these.
// ---------------------------------------------------------------------------

const KEEP = new Set([
  // Page / experience types (optimizely.config.mjs)
  "DynamicExperience",
  "LandingPage",
  // Block types (src/components/blocks/)
  "HeroBlock",
  "CallToAction",
  "TextBlock",
  "ProductCardBlock",
  "ProductHeroBlock",
  "FeatureItemBlock",
  "SectionHeadingBlock",
  "TestimonialBlock",
  "StatsCounterBlock",
  "ImageBlock",
  "FormContainerBlock",
  "FormTextInput",
  "FormTextArea",
  "FormSelect",
  "FormSubmitButton",
  "FaqContainerBlock",
  "FaqItemBlock",
  "FeaturedContentBlock",
  "LogoGridBlock",
  // Navigation types (src/components/blocks/NavigationItemBlock/)
  "NavigationItem",
  "Navigation",
  // Layout types (src/components/layout/)
  "SiteBanner",
  // Built-in Optimizely system types — never delete these
  "BlankExperience",
  "BlankSection",
  "_Component",
  "_Content",
  "_Experience",
  "_Image",
  "_Media",
  "_Page",
  "_Video",
  "GenericMedia",
  "ImageMedia",
  "VideoMedia",
  "SysContentFolder",
  "Content",
  "Image",
  "Media",
  "Video",
]);

// ---------------------------------------------------------------------------
// Orphaned NavigationItems created manually in the CMS (no longer referenced
// by any Navigation block). Container: e56f85d0e8334e02976a2d11fe4d598c
// ---------------------------------------------------------------------------

const ORPHANED_NAV_ITEM_KEYS = [
  "9c38633f13404395bb7a5ac61e58348c", // 1st Level Navigation - Product
  "d01e71c3701e44f0a9bcc66a6acb7a9a", // 1st Level Navigation - Resources
  "ebbd383b35bf47c6b444534988ae7aec", // 2nd Level Navigation - CMS
  "0e06b87393a64d89ac93df2b011bbf23", // 2nd Level Navigation - Documentation
  "4f044c56bbde4ca1a8c558c32d73fe26", // 2nd Level Navigation - Experimentation
];

// ---------------------------------------------------------------------------
// Display templates actively used by this application — keep all of these.
// ---------------------------------------------------------------------------

const KEEP_TEMPLATES = new Set([
  "HeroCenteredTemplate",
  "ProductHeroCompactTemplate",
  "SectionHeadingCenteredTemplate",
  "TextBlockNarrowTemplate",
  "CallToActionOutlineTemplate",
  "CallToActionSurfaceTemplate",
  "ProductCardDefaultTemplate",
  "ProductCardFeaturedTemplate",
  "FeatureItemOutlinedTemplate",
  "FeatureItemFlatTemplate",
  "TestimonialCardTemplate",
  "TestimonialMinimalTemplate",
  "StatsCounterHighlightTemplate",
  "AuthorInlineTemplate",
  "FaqItemFlatTemplate",
  "LogoGridColorTemplate",
  "ImageBlockRoundedTemplate",
  "OutcomeItemBrandTemplate",
  "PricingTierCompactTemplate",
  "TeamMemberHorizontalTemplate",
  "FeaturedContentCardTemplate",
  "DefaultRowTemplate",
  "DefaultColumnTemplate",
  "DefaultSectionTemplate",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deleteItem(token: string, key: string, label: string): Promise<"deleted" | "gone" | "error"> {
  const res = await fetch(`${CONTENT_ENDPOINT}/${key}?permanent=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    console.log(`  [deleted] ${label} (${res.status})`);
    return "deleted";
  }
  if (res.status === 404) {
    console.log(`  [already gone] ${label}`);
    return "gone";
  }
  const body = await res.text();
  console.warn(`  [error] ${label}: ${res.status} ${body.slice(0, 120)}`);
  return "error";
}

// ---------------------------------------------------------------------------
// Part 1 — Content type cleanup
// ---------------------------------------------------------------------------

async function cleanupContentTypes(token: string): Promise<void> {
  console.log("--- Part 1: Content type audit ---");

  const listRes = await fetch(TYPES_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    const text = await listRes.text();
    if (listRes.status === 404) {
      console.log("  [skip] v1/contenttypes not available on this CMS instance.");
      return;
    }
    throw new Error(`List types failed: ${listRes.status} ${text.slice(0, 200)}`);
  }
  const listData = await listRes.json();
  const allTypes: Array<{ key: string; displayName?: string }> = listData.items ?? listData ?? [];
  if (!Array.isArray(allTypes) || allTypes.length === 0) {
    console.log("  [skip] No content types returned (unexpected response format).");
    return;
  }

  console.log(`  Found ${allTypes.length} content types in CMS.`);

  const toDelete = allTypes.filter(
    (t) => !KEEP.has(t.key) && !t.key.startsWith("_") && !t.key.includes(":")
  );

  if (toDelete.length === 0) {
    console.log("  All types are in use — nothing to remove.\n");
    return;
  }

  console.log(`  Removing ${toDelete.length} unused type(s):`);
  const needsRecycleBinClear: string[] = [];
  for (const type of toDelete) {
    const res = await fetch(`${TYPES_ENDPOINT}/${type.key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 404) {
      console.log(`    [deleted] ${type.key} (${type.displayName ?? ""})`);
    } else {
      const body = await res.text();
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(body); } catch { /* ignore */ }
      if (res.status === 409) {
        console.warn(`    [blocked] ${type.key} — content instances exist in the Recycle Bin (must be purged first)`);
        needsRecycleBinClear.push(type.key);
      } else {
        console.warn(`    [skip]    ${type.key}: ${res.status} ${(parsed.detail as string ?? body).slice(0, 120)}`);
      }
    }
  }
  if (needsRecycleBinClear.length > 0) {
    console.log(`
  ⚠️  ${needsRecycleBinClear.length} type(s) cannot be removed until the Recycle Bin is emptied:
     ${needsRecycleBinClear.join(", ")}

  To fix:
    1. Open the Optimizely CMS admin UI
    2. Go to Settings → Recycle Bin (or search for Trash / Recycle Bin)
    3. Empty the Recycle Bin (permanently delete all soft-deleted items)
    4. Re-run this script: npx tsx scripts/cleanup-types.ts
`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Part 2 — Orphaned NavigationItem cleanup
// ---------------------------------------------------------------------------

async function cleanupOrphanedNavItems(token: string): Promise<void> {
  console.log("--- Part 2: Orphaned NavigationItems ---");
  let deleted = 0, gone = 0, errors = 0;

  for (const key of ORPHANED_NAV_ITEM_KEYS) {
    const result = await deleteItem(token, key, key.slice(0, 8) + "…");
    if (result === "deleted") deleted++;
    else if (result === "gone") gone++;
    else errors++;
  }

  console.log(`  Summary: ${deleted} deleted, ${gone} already gone, ${errors} errors.\n`);
}

// ---------------------------------------------------------------------------
// Part 3 — Display template cleanup
// ---------------------------------------------------------------------------

async function cleanupDisplayTemplates(token: string): Promise<void> {
  console.log("--- Part 3: Display template audit ---");

  const listRes = await fetch(TYPES_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    const text = await listRes.text();
    if (listRes.status === 404) {
      console.log("  [skip] v1/contenttypes not available on this CMS instance.");
      return;
    }
    throw new Error(`List types failed: ${listRes.status} ${text.slice(0, 200)}`);
  }
  const listData = await listRes.json();
  const allTypes: Array<{ key: string }> = listData.items ?? listData ?? [];
  if (!Array.isArray(allTypes) || allTypes.length === 0) {
    console.log("  [skip] No content types returned.\n");
    return;
  }

  let totalDeleted = 0, totalErrors = 0;

  for (const type of allTypes) {
    const tmplRes = await fetch(`${TYPES_ENDPOINT}/${type.key}/displaytemplates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!tmplRes.ok) continue;

    const tmplData = await tmplRes.json();
    const templates: Array<{ key: string; displayName?: string }> = tmplData.items ?? tmplData ?? [];
    if (!Array.isArray(templates) || templates.length === 0) continue;

    const stale = templates.filter((t) => !KEEP_TEMPLATES.has(t.key));
    if (stale.length === 0) continue;

    console.log(`  ${type.key}: removing ${stale.length} stale template(s)`);
    for (const tmpl of stale) {
      const delRes = await fetch(`${TYPES_ENDPOINT}/${type.key}/displaytemplates/${tmpl.key}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (delRes.ok || delRes.status === 404) {
        console.log(`    [deleted] ${tmpl.key} (${tmpl.displayName ?? ""})`);
        totalDeleted++;
      } else {
        const body = await delRes.text();
        console.warn(`    [error]   ${tmpl.key}: ${delRes.status} ${body.slice(0, 120)}`);
        totalErrors++;
      }
    }
  }

  if (totalDeleted === 0 && totalErrors === 0) {
    console.log("  All display templates are in use — nothing to remove.");
  } else {
    console.log(`  Summary: ${totalDeleted} deleted, ${totalErrors} errors.`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== CMS Cleanup ===\n");
  const token = await getManagementToken();
  await cleanupContentTypes(token);
  await cleanupOrphanedNavItems(token);
  await cleanupDisplayTemplates(token);
  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
