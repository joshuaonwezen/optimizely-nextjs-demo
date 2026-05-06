/**
 * Deletes content types from the CMS that are no longer used by this application.
 *
 * Run: npx tsx scripts/cleanup-types.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const API_BASE = "https://api.cms.optimizely.com";
const TOKEN_ENDPOINT = `${API_BASE}/oauth/token`;
const TYPES_ENDPOINT = `${API_BASE}/v1/contenttypes`;

const CLIENT_ID = process.env.OPTIMIZELY_CMS_CLIENT_ID!;
const CLIENT_SECRET = process.env.OPTIMIZELY_CMS_CLIENT_SECRET!;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing OPTIMIZELY_CMS_CLIENT_ID or OPTIMIZELY_CMS_CLIENT_SECRET");
  process.exit(1);
}

// Content types actively used by this application — do NOT delete these.
const KEEP = new Set([
  // SDK-defined types (in optimizely.config.mjs or block files)
  "DynamicExperience",
  "LandingPage",
  "HeroBlock",
  "Hero",
  "CallToAction",
  "CallToActionBlock",
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
  "NavigationItem",
  "NavigationRoot",
  // Built-in Optimizely types — never delete these
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

async function getToken(): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  console.log("  [auth] Token obtained");
  return data.access_token;
}

async function main() {
  console.log("=== Content Type Cleanup ===\n");

  const token = await getToken();

  // Fetch all content types
  const listRes = await fetch(TYPES_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    throw new Error(`List types failed: ${listRes.status} ${await listRes.text()}`);
  }
  const listData = await listRes.json();
  const allTypes: Array<{ key: string; displayName?: string }> = listData.items ?? listData ?? [];

  console.log(`Found ${allTypes.length} content types in CMS.\n`);

  // Skip types that start with _ (built-in bases) or contain : (namespaced/system types)
  const toDelete = allTypes.filter((t) => !KEEP.has(t.key) && !t.key.startsWith("_") && !t.key.includes(":"));
  const toKeep = allTypes.filter((t) => KEEP.has(t.key) || t.key.startsWith("_") || t.key.includes(":"));

  console.log(`Keeping ${toKeep.length} types, deleting ${toDelete.length} types.\n`);

  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  console.log("--- Deleting unused types ---");
  let deleted = 0;
  let failed = 0;

  for (const type of toDelete) {
    const res = await fetch(`${TYPES_ENDPOINT}/${type.key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 404) {
      console.log(`  [deleted] ${type.key} (${type.displayName ?? ""})`);
      deleted++;
    } else {
      const body = await res.text();
      console.warn(`  [skip]    ${type.key}: ${res.status} ${body.slice(0, 120)}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${deleted} deleted, ${failed} skipped ===`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
