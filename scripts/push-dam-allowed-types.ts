/**
 * Lets editors pick CMP DAM images, as well as CMS media, in every image field below,
 * on every instance whose CMS has the DAM integration. The rest keep "_image" only.
 *
 * The DAM asset type (graph:cmp_PublicImageAsset) cannot live in the code config:
 * a CMS without the DAM integration rejects it ("has a dependency on
 * 'graph:cmp_PublicImageAsset' that could not be resolved"), and that one error fails
 * the whole content-type import. So the config keeps "_image" only and this script
 * adds the DAM type where the CMS can resolve it, skipping the instances where it
 * cannot. The CMS's own answer is the capability check.
 *
 * A normal opti:push resets these fields to "_image", so re-run this after one (the
 * seed runner does, as the first of its optional steps). Instances with DAM as of
 * 2026-10-15: joshCMS, harryNewCMS, mostinNewCMS, toddCMS.
 *
 * Run: npx tsx scripts/push-dam-allowed-types.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getManagementToken } from "../src/lib/optimizely/auth";
import { API_BASE, apiFetch } from "./_shared";

const CMS_IMAGE_TYPE = "_image";
const DAM_IMAGE_TYPE = "graph:cmp_PublicImageAsset";

// contentType key -> image properties that also take DAM images. A contract key
// (SEO, EditorialContent) also covers every type that extends it.
const DAM_IMAGE_FIELDS: Record<string, string[]> = {
  SEO: ["ogImage"],
  EditorialContent: ["heroImage"],
  BlogExperience: ["heroImage"],
  TraditionalPage: ["heroImage"],
  ConsultantPage: ["photo"],
  HeroBlock: ["backgroundImage"],
  ImageBlock: ["image"],
  RenditionImageBlock: ["image"],
  SpotlightBlock: ["image"],
  TestimonialBlock: ["authorImage"],
  TeamMemberBlock: ["photo"],
  AuthorBlock: ["avatar"],
  LogoGridBlock: ["logos"],
};

type Property = { type?: string; allowedTypes?: string[]; items?: { allowedTypes?: string[] } };
type ContentType = { key: string; isContract?: boolean; contracts?: string[]; properties?: Record<string, Property> };

async function call(method: string, path: string, body?: unknown, contentType = "application/json") {
  const token = await getManagementToken();
  const res = await apiFetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType, Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

async function getContentType(key: string): Promise<ContentType> {
  const res = await call("GET", `/v1/contenttypes/${key}`);
  if (res.status >= 300) throw new Error(`GET ${key}: ${res.status} ${res.text.slice(0, 200)}`);
  return JSON.parse(res.text) as ContentType;
}

// The keys of the types that extend `contract`. Key casing differs per instance
// (joshCMS has "spotlightBlock"), so match case-insensitively; GET by key already is.
async function implementersOf(contract: string): Promise<string[]> {
  const keys: string[] = [];
  let seen = 0;
  for (let pageIndex = 0; ; pageIndex++) {
    const res = await call("GET", `/v1/contenttypes?pageSize=100&pageIndex=${pageIndex}`);
    if (res.status >= 300) throw new Error(`GET contenttypes: ${res.status} ${res.text.slice(0, 200)}`);
    const page = JSON.parse(res.text) as { items?: ContentType[]; totalCount?: number };
    for (const t of page.items ?? []) {
      if (t.contracts?.some((c) => c.toLowerCase() === contract.toLowerCase())) keys.push(t.key);
    }
    seen += page.items?.length ?? 0;
    if (!page.items?.length || seen >= (page.totalCount ?? 0)) return keys;
  }
}

async function allowDam(type: ContentType, field: string) {
  // A content area (LogoGridBlock.logos) keeps its constraint on the items.
  const property = type.properties?.[field];
  const isArray = property?.type === "array";
  const allowed = (isArray ? property?.items?.allowedTypes : property?.allowedTypes) ?? [];
  if (allowed.includes(CMS_IMAGE_TYPE) && allowed.includes(DAM_IMAGE_TYPE)) {
    console.log(`  [ok] ${type.key}.${field} already allows CMS and DAM images`);
    return;
  }
  // Merge-patch through v1 (never preview3, which resets allowedTypes): only this
  // property's allowedTypes changes.
  const next = [...new Set([CMS_IMAGE_TYPE, ...allowed, DAM_IMAGE_TYPE])];
  const constraint = { allowedTypes: next };
  const patch = await call(
    "PATCH",
    `/v1/contenttypes/${type.key}`,
    { properties: { [field]: isArray ? { items: constraint } : constraint } },
    "application/merge-patch+json"
  );
  if (patch.status < 300) {
    console.log(`  [patched] ${type.key}.${field}: ${JSON.stringify(allowed)} -> ${JSON.stringify(next)}`);
  } else if (/could not be resolved|unable to find|invalid content type/i.test(patch.text)) {
    const reason = (patch.text.match(/"(?:detail|message)"\s*:\s*"([^"]+)"/) ?? [])[1] ?? patch.text.slice(0, 160);
    console.log(`  [skip] ${type.key}.${field}: no DAM integration on this CMS - ${reason}`);
  } else {
    throw new Error(`PATCH ${type.key}.${field}: ${patch.status} ${patch.text.slice(0, 400)}`);
  }
}

async function main() {
  console.log("=== Allowing DAM images in image fields ===\n");

  for (const [typeKey, fields] of Object.entries(DAM_IMAGE_FIELDS)) {
    const type = await getContentType(typeKey);
    // A type that extends a contract keeps its own copy of the contract's properties:
    // patching the contract alone leaves ArticlePage.ogImage etc. unchanged.
    const implementers = type.isContract ? await implementersOf(typeKey) : [];
    for (const target of [type, ...(await Promise.all(implementers.map(getContentType)))]) {
      for (const field of fields) await allowDam(target, field);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
