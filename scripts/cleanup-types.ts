/**
 * CMS cleanup script — two jobs:
 *   1. Delete CMS content types that are no longer used by this app
 *   2. Delete orphaned NavigationItems left behind from manual CMS editing
 *
 * Run: npx tsx scripts/cleanup-types.ts
 */

import { config } from "dotenv";
import { execSync } from "child_process";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

const API_BASE = "https://api.cms.optimizely.com";
const TYPES_ENDPOINT = `${API_BASE}/v1/contenttypes`;
const CONTENT_ENDPOINT = `${API_BASE}/v1/content`;

// Content types actively used by this application — keep all of these.

const KEEP = new Set([
  // Experience / page types — use the content type KEY, not the variable name
  "DynamicExperience",
  "TraditionalPage",   // LandingPageType.key in optimizely.config.mjs
  "ArticlePage",
  "CaseStudyPage",
  // Block types (src/components/blocks/) — all registered in componentRegistry.ts
  "HeroBlock",
  "Hero",              // legacy key still referenced by some CMS entries
  "CallToAction",
  "TextBlock",
  "ProductCardBlock",
  "ProductHeroBlock",
  "FeatureItemBlock",
  "SectionHeadingBlock",
  "TestimonialBlock",
  "StatsCounterBlock",
  "ImageBlock",
  "RenditionImageBlock",
  "FaqContainerBlock",
  "FaqItemBlock",
  "FeaturedContentBlock",
  "LogoGridBlock",
  "AuthorBlock",
  "OutcomeItemBlock",
  "PricingTierBlock",
  "TimelineMilestoneBlock",
  "TimelineBlock",
  "TeamMemberBlock",
  "TeamGridBlock",
  "ComparisonTableBlock",
  "CalloutBlock",
  "ContactFormBlock",
  "BranchFinderBlock",
  // Optimizely Forms native types (activated via CMS Settings → Forms)
  "OptiFormsContainerData",
  "OptiFormsTextboxElement",
  "OptiFormsTextareaElement",
  "OptiFormsSelectionElement",
  "OptiFormsSubmitElement",
  // Navigation types (src/components/blocks/NavigationItemBlock/)
  "NavigationItem",
  "Navigation",
  // Layout types (src/components/layout/)
  "SiteBanner",
  "Footer",
  "SiteSettings",
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

// Orphaned NavigationItems created manually in the CMS (no longer referenced
// by any Navigation block). Container: e56f85d0e8334e02976a2d11fe4d598c

const ORPHANED_NAV_ITEM_KEYS = [
  "9c38633f13404395bb7a5ac61e58348c", // 1st Level Navigation - Product
  "d01e71c3701e44f0a9bcc66a6acb7a9a", // 1st Level Navigation - Resources
  "ebbd383b35bf47c6b444534988ae7aec", // 2nd Level Navigation - CMS
  "0e06b87393a64d89ac93df2b011bbf23", // 2nd Level Navigation - Documentation
  "4f044c56bbde4ca1a8c558c32d73fe26", // 2nd Level Navigation - Experimentation
];

// Display templates actively used by this application — keep all of these.

const KEEP_TEMPLATES = new Set([
  "HeroBlockDefaultTemplate",
  "ProductHeroCompactTemplate",
  "SectionHeadingDefaultTemplate",
  "SectionHeadingCenteredTemplate",
  "TextBlockNarrowTemplate",
  "CallToActionOutlineTemplate",
  "CallToActionSurfaceTemplate",
  "CallToActionGhostTemplate",
  "BranchFinderBlockDefaultTemplate",
  "ProductCardDefaultTemplate",
  "ProductCardFeaturedTemplate",
  "FeatureItemOutlinedTemplate",
  "FeatureItemFlatTemplate",
  "FeatureItemBrandTemplate",
  "TestimonialCardTemplate",
  "TestimonialMinimalTemplate",
  "StatsCounterHighlightTemplate",
  "StatsCounterAccentTemplate",
  "AuthorInlineTemplate",
  "AuthorProfileTemplate",
  "FaqItemFlatTemplate",
  "LogoGridColorTemplate",
  "ImageBlockRoundedTemplate",
  "OutcomeItemBrandTemplate",
  "OutcomeItemInlineTemplate",
  "PricingTierCompactTemplate",
  "TeamMemberHorizontalTemplate",
  "FeaturedContentCardTemplate",
  "DefaultRowTemplate",
  "DefaultColumnTemplate",
  "DefaultSectionTemplate",
]);

/**
 * Returns true if the given key appears as a string literal anywhere in src/.
 * Used as a last-resort safety net before deleting a type or template that is
 * absent from the KEEP / KEEP_TEMPLATES set — prevents accidental deletion when
 * those sets fall out of sync with the codebase.
 */
function isKeyInSource(key: string): boolean {
  try {
    const result = execSync(
      `grep -r '"${key}"' src/ --include="*.tsx" --include="*.ts" --include="*.mjs" -l`,
      { cwd: process.cwd(), encoding: "utf8" }
    );
    return result.trim().length > 0;
  } catch {
    // grep exits with code 1 (throws via execSync) when no matches are found
    return false;
  }
}

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

// Part 1 — Content type cleanup

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

  // Safety net: skip any type whose key still appears in the source tree,
  // even if it's absent from the KEEP set (catches set drift on new blocks).
  const safeToDelete: typeof toDelete = [];
  for (const type of toDelete) {
    if (isKeyInSource(type.key)) {
      console.log(`    [skip-safe] ${type.key} — found in src/ (add to KEEP set)`);
    } else {
      safeToDelete.push(type);
    }
  }

  if (safeToDelete.length === 0) {
    console.log("  All remaining types are protected by source-grep — nothing to remove.\n");
    return;
  }

  console.log(`  Removing ${safeToDelete.length} unused type(s):`);
  const needsRecycleBinClear: string[] = [];
  for (const type of safeToDelete) {
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

// Part 2 — Orphaned NavigationItem cleanup

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

// Part 3 — Display template cleanup

async function cleanupDisplayTemplates(token: string): Promise<void> {
  console.log("--- Part 3: Display template audit ---");

  const TEMPLATES_ENDPOINT = `${API_BASE}/v1/displaytemplates`;
  const listRes = await fetch(`${TEMPLATES_ENDPOINT}?limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    const text = await listRes.text();
    if (listRes.status === 404) {
      console.log("  [skip] v1/displaytemplates not available on this CMS instance.");
      return;
    }
    throw new Error(`List display templates failed: ${listRes.status} ${text.slice(0, 200)}`);
  }
  const listData = await listRes.json();
  const allTemplates: Array<{ key: string; displayName?: string }> = listData.items ?? listData ?? [];
  if (!Array.isArray(allTemplates) || allTemplates.length === 0) {
    console.log("  [skip] No display templates returned.\n");
    return;
  }

  console.log(`  Found ${allTemplates.length} display templates in CMS.`);
  const stale = allTemplates.filter((t) => !KEEP_TEMPLATES.has(t.key));

  if (stale.length === 0) {
    console.log("  All display templates are in use — nothing to remove.\n");
    return;
  }

  // Safety net: skip any template whose key still appears in source.
  const safeStale = stale.filter((t) => {
    if (isKeyInSource(t.key)) {
      console.log(`    [skip-safe] ${t.key} — found in src/ (add to KEEP_TEMPLATES set)`);
      return false;
    }
    return true;
  });

  if (safeStale.length === 0) {
    console.log("  All remaining templates are protected by source-grep — nothing to remove.\n");
    return;
  }

  console.log(`  Removing ${safeStale.length} stale template(s):`);
  let totalDeleted = 0, totalErrors = 0;
  for (const tmpl of safeStale) {
    const delRes = await fetch(`${TEMPLATES_ENDPOINT}/${tmpl.key}`, {
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
  console.log(`  Summary: ${totalDeleted} deleted, ${totalErrors} errors.\n`);
}

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
