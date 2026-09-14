/**
 * Pushes the Product Landing content types (src/lib/optimizely/productLandingTypes.mjs)
 * to the CMS instance the env vars point at, and allows ProductLandingExperience as a
 * child of the root DynamicExperience. Skips instances whose CMS does not support
 * `type: "composition"` properties (apjCMS at time of writing).
 *
 * These types are deliberately outside optimizely.config.mjs, so a normal opti:push
 * never carries them anywhere. A normal opti:push also resets
 * DynamicExperience.mayContainTypes, so re-run this after one.
 *
 * Run: npx tsx scripts/push-product-landing-types.ts
 *      npx tsx scripts/product-landing-instances.ts   (every instance)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { mapContentToManifest } from "@optimizely/cms-cli/dist/mapper/contentToPackage.js";
import { getManagementToken } from "../src/lib/optimizely/auth";
import {
  PRODUCT_LANDING_CONTENT_TYPES,
  PRODUCT_LANDING_DISPLAY_TEMPLATES,
} from "../src/lib/optimizely/productLandingTypes.mjs";
import { API_BASE, apiFetch } from "./_shared";

const ROOT_TYPE = "DynamicExperience";
const CHILD_TYPE = "ProductLandingExperience";

type Typed = { key: string; baseType?: string; mayContainTypes?: string[]; [field: string]: unknown };

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
  const ours = PRODUCT_LANDING_CONTENT_TYPES as unknown as Typed[];
  const ourKeys = new Set(ours.map((t) => t.key));
  const standIns = [...new Set(ours.flatMap((t) => t.mayContainTypes ?? []))]
    .filter((key) => !key.startsWith("_") && !ourKeys.has(key))
    .map((key) => ({ key, __type: "contentType", properties: {} }));
  return (mapContentToManifest([...ours, ...standIns] as never) as Typed[])
    .filter((t) => ourKeys.has(t.key))
    .map(withoutSdkMarker);
}

// A manifest import answers 200 even when it imported nothing: the body carries
// `outcomes` and `errors` per section, and the CLI reports those. Treat any error
// as a failure, otherwise a "successful" push silently creates no types.
async function pushManifest(label: string, contentTypes: Typed[], displayTemplates: Typed[]) {
  const res = await call(
    "POST",
    "/v1/manifest",
    { contentTypes, displayTemplates, propertyGroups: [] },
    "application/vnd.optimizely.cms.v1.manifest+json"
  );
  if (res.status >= 300) throw new Error(`${label}: ${res.status} ${res.text}`);
  const body = res.text.trim() ? JSON.parse(res.text) : {};
  const errors: Array<{ message: string; resource?: string }> = body.errors ?? [];
  if (errors.length > 0) {
    throw new Error(`${label}:\n${errors.map((e) => `    - ${e.resource ?? ""}: ${e.message}`).join("\n")}`);
  }
  console.log(`  [pushed] ${label}`);
}

// The import is eventually consistent, and a type is only usable as another type's
// allowed composition type once the CMS can see it.
async function waitForTypes(keys: string[]) {
  for (const key of keys) {
    let visible = false;
    for (let attempt = 0; attempt < 15 && !visible; attempt++) {
      const probe = await call("GET", `/v1/contenttypes/${key}`);
      visible = probe.status < 300;
      if (!visible) await new Promise((r) => setTimeout(r, 2000));
    }
    if (!visible) throw new Error(`${key} never became visible after its push`);
  }
}

async function main() {
  console.log("=== Pushing Product Landing content types ===\n");

  // The Composition property format is only listed on preview3, and it is the
  // signal that this instance supports `type: "composition"` properties at all.
  const formats = await call("GET", "/preview3/propertyformats");
  const supported = formats.status < 300 &&
    (JSON.parse(formats.text).items ?? []).some((f: { key: string }) => f.key === "Composition");
  if (!supported) {
    console.warn("  [skip] this CMS has no 'Composition' property format - nothing pushed.");
    return;
  }

  // Phased on purpose. Inside one manifest the experience's allowed composition
  // types are validated against what the CMS already has, so a combined push fails
  // on a fresh instance with "ArticleListBlock cannot be used in a ... composition",
  // and the display template fails with "Unable to find a content type".
  const contentTypes = manifestContentTypes();
  const components = contentTypes.filter((t) => t.baseType === "_component");
  const experiences = contentTypes.filter((t) => t.baseType !== "_component");
  const displayTemplates = (PRODUCT_LANDING_DISPLAY_TEMPLATES as unknown as Typed[]).map(withoutSdkMarker);

  if (components.length > 0) {
    await pushManifest(components.map((t) => t.key).join(", "), components, []);
    await waitForTypes(components.map((t) => t.key));
  }
  if (experiences.length > 0) {
    await pushManifest(experiences.map((t) => t.key).join(", "), experiences, []);
    await waitForTypes(experiences.map((t) => t.key));
  }
  if (displayTemplates.length > 0) {
    await pushManifest(`${displayTemplates.length} display template(s)`, [], displayTemplates);
  }

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
