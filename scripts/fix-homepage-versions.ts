/**
 * Fixes the homepage 404 caused by multiple published versions without variation names.
 *
 * Root cause: update-homepage-variations.ts published versions 1306 and 1307 with
 * status: "published" but no variation name. Graph now has 3+ published "base" versions
 * for the same key and URL. _Content.item (used internally by the SDK) returns null
 * when multiple items match the filter — causing a 404 on every page load.
 *
 * This script lists all published versions, identifies extras (published without a
 * variation name, newer than the base), and depublishes or deletes them so only
 * one canonical published version remains.
 *
 * Run:
 *   OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/fix-homepage-versions.ts
 *
 * Add --delete to permanently delete the extra versions instead of setting to draft:
 *   OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/fix-homepage-versions.ts --delete
 */

import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

const CONTENT_ENDPOINT = "https://api.cms.optimizely.com/preview3/experimental/content";
const HOMEPAGE_KEY = "3525e1552b6f46158be2850ff6e6fb74";
const DELETE_MODE = process.argv.includes("--delete");

interface VersionEntry {
  version: number | string;
  status: string;
  locale?: string;
  variation?: string | null;
  saved?: string;
  created?: string;
}

async function listVersions(token: string): Promise<VersionEntry[]> {
  const res = await fetch(`${CONTENT_ENDPOINT}/${HOMEPAGE_KEY}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET versions failed ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  // Response may be { items: [...] } or directly an array
  return Array.isArray(data) ? data : (data.items ?? data.versions ?? []);
}

async function depublishVersion(token: string, version: string | number): Promise<void> {
  const url = `${CONTENT_ENDPOINT}/${HOMEPAGE_KEY}/versions/${version}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "draft" }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`  ✓ v${version} set to draft`);
  } else {
    console.warn(`  ✗ v${version} PATCH to draft failed (${res.status}): ${text.slice(0, 200)}`);
    console.warn(`    Trying DELETE instead…`);
    await deleteVersion(token, version);
  }
}

async function deleteVersion(token: string, version: string | number): Promise<void> {
  const url = `${CONTENT_ENDPOINT}/${HOMEPAGE_KEY}/versions/${version}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (res.ok || res.status === 204) {
    console.log(`  ✓ v${version} deleted`);
  } else {
    console.error(`  ✗ v${version} DELETE failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function main() {
  console.log("=== Fix Homepage Versions ===\n");
  const token = await getManagementToken();

  const versions = await listVersions(token);
  console.log(`Found ${versions.length} version(s) total:\n`);

  for (const v of versions) {
    const variationLabel = v.variation ? `variation="${v.variation}"` : "no variation (base)";
    console.log(`  v${v.version}  status=${v.status}  ${variationLabel}`);
  }

  // Published versions with no variation name
  const publishedBase = versions.filter(
    (v) =>
      (v.status?.toLowerCase() === "published") &&
      !v.variation
  );

  if (publishedBase.length <= 1) {
    console.log("\n✓ Only one published base version — no cleanup needed.");
    return;
  }

  // Keep the lowest version number (the original), clean up the rest
  const sorted = [...publishedBase].sort((a, b) => Number(a.version) - Number(b.version));
  const keep = sorted[0];
  const extras = sorted.slice(1);

  console.log(`\n${publishedBase.length} published base versions found.`);
  console.log(`Keeping v${keep.version} (original), cleaning up ${extras.length} extra(s):\n`);

  for (const v of extras) {
    if (DELETE_MODE) {
      await deleteVersion(token, v.version);
    } else {
      await depublishVersion(token, v.version);
    }
  }

  console.log("\n=== Done ===");
  console.log("Wait 30–60s for Graph to re-index, then reload the homepage.");
  console.log("If the page still 404s, run with --delete to permanently remove the extra versions.");
}

main().catch((err) => {
  console.error("\n[ERROR]", err.message);
  process.exit(1);
});
