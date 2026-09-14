/**
 * Pushes the personal-instance-only content types (src/lib/optimizely/personalOnlyTypes.mjs)
 * to the personal CMS, and allows ProductLandingExperience as a child of the root
 * DynamicExperience. Refuses to run against any other instance.
 *
 * These types are deliberately outside optimizely.config.mjs, so a normal opti:push
 * never carries them anywhere. A normal opti:push to personal also resets
 * DynamicExperience.mayContainTypes, so re-run this after it.
 *
 * Run: npx tsx scripts/push-personal-types.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { mapContentToManifest } from "@optimizely/cms-cli/dist/mapper/contentToPackage.js";
import { getManagementToken } from "../src/lib/optimizely/auth";
import { isPersonalInstance } from "../src/lib/optimizely/personalInstance";
import {
  PERSONAL_ONLY_CONTENT_TYPES,
  PERSONAL_ONLY_DISPLAY_TEMPLATES,
} from "../src/lib/optimizely/personalOnlyTypes.mjs";
import { API_BASE, apiFetch } from "./_shared";

const ROOT_TYPE = "DynamicExperience";
const CHILD_TYPE = "ProductLandingExperience";

type Typed = { key: string; mayContainTypes?: string[]; [field: string]: unknown };

async function call(method: string, path: string, body?: unknown, contentType = "application/json") {
  const token = await getManagementToken();
  const res = await apiFetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType, Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

function withoutSdkMarker(item: Typed): Typed {
  return Object.fromEntries(Object.entries(item).filter(([field]) => field !== "__type")) as Typed;
}

// Maps our types with the CLI's own mapper so contracts and allowed types come out
// exactly as opti:push would send them. The mapper rejects mayContainTypes keys it
// was not given, so add empty stand-ins for the (already existing) child types and
// keep only our types in the result.
function manifestContentTypes(): Typed[] {
  const ours = PERSONAL_ONLY_CONTENT_TYPES as unknown as Typed[];
  const ourKeys = new Set(ours.map((t) => t.key));
  const referenced = new Set(ours.flatMap((t) => t.mayContainTypes ?? []));
  const standIns = [...referenced]
    .filter((key) => !key.startsWith("_") && !ourKeys.has(key))
    .map((key) => ({ key, __type: "contentType", properties: {} }));
  return (mapContentToManifest([...ours, ...standIns] as never) as Typed[])
    .filter((t) => ourKeys.has(t.key))
    .map(withoutSdkMarker);
}

async function main() {
  console.log("=== Pushing personal-only content types ===\n");

  if (!isPersonalInstance()) {
    console.warn("  [skip] personal-instance only; OPTIMIZELY_CMS_URL points elsewhere.");
    return;
  }

  const contentTypes = manifestContentTypes();
  const displayTemplates = (PERSONAL_ONLY_DISPLAY_TEMPLATES as unknown as Typed[]).map(withoutSdkMarker);

  const push = await call(
    "POST",
    "/v1/manifest",
    { contentTypes, displayTemplates, propertyGroups: [] },
    "application/vnd.optimizely.cms.v1.manifest+json"
  );
  if (push.status >= 300) throw new Error(`manifest push: ${push.status} ${push.text}`);
  console.log(`  [pushed] ${contentTypes.map((t) => t.key).join(", ")} + ${displayTemplates.length} display template(s)`);

  const root = await call("GET", `/v1/contenttypes/${ROOT_TYPE}`);
  const allowed: string[] = JSON.parse(root.text).mayContainTypes ?? [];
  if (allowed.includes(CHILD_TYPE)) {
    console.log(`  [ok] ${ROOT_TYPE} already allows ${CHILD_TYPE}`);
  } else {
    const patch = await call("PATCH", `/v1/contenttypes/${ROOT_TYPE}`, { mayContainTypes: [...allowed, CHILD_TYPE] }, "application/merge-patch+json");
    if (patch.status >= 300) throw new Error(`patch ${ROOT_TYPE}: ${patch.status} ${patch.text}`);
    console.log(`  [patched] ${ROOT_TYPE}.mayContainTypes += ${CHILD_TYPE}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
