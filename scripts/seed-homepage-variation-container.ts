/**
 * Appends the savings_offer Variation Container to the very bottom of every page the app
 * serves as a homepage ("/" and "/en/" - on joshCMS those are two different pages).
 *
 * BASE VERSIONS ONLY. Persona variations (personal, business, ...) must be done in
 * Visual Builder: the Management API reads a variation version back as the base
 * structure with no properties, so writing one publishes empty blocks, and creating a
 * variation draft overwrites the live variation at once (both seen 2026-10-15).
 *
 * Reuses the three shared Variations seed-variation-container.ts creates (run that
 * first), so a visitor sees the same offer here as on /savings-offer. The flag's
 * cms_route covers /savings-offer only, so on the homepage the browser decides: adding
 * "/" would put a __v_ segment on every homepage request, and the catch-all only runs
 * its ODP-direct homepage fallback when there is none.
 *
 * Each base version is snapshotted, checked for dangling references (the API refuses to
 * save those) before any draft exists, patched with its own composition plus the
 * container, read back, and published only when it has exactly one more node. The CMS
 * drops display settings the current templates no longer define on any save; those
 * were checked to be visually inert.
 *
 * Idempotent: a version that already holds the container, or has it in a draft awaiting
 * approval, is skipped.
 *
 * Run: npx tsx scripts/seed-homepage-variation-container.ts [--dry-run]
 */

import { config } from "dotenv";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getManagementToken } from "../src/lib/optimizely/auth";
import {
  CONTENT_ENDPOINT,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  apiFetch,
  contentKeyExists,
  isApprovalRequired,
  rootComponent,
  type CompNode,
} from "./_shared";
import { FLAG_KEY, variationRefs } from "./variation-container-data";

config({ path: ".env.local" });

const LOCALE = "en";
const NODE_NAME = "Savings Offer Experiment";
const DRY_RUN = process.argv.includes("--dry-run");

interface Version {
  version: string;
  status: string;
  variation?: string | null;
  displayName?: string;
  routeSegment?: string;
  properties?: Record<string, unknown>;
  composition?: { nodes?: CompNode[] } & Record<string, unknown>;
}

async function call(method: string, url: string, body?: unknown, contentType = "application/json") {
  const token = await getManagementToken();
  const res = await apiFetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": contentType }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, ok: res.ok, text: await res.text() };
}

/**
 * Every page the app serves as a homepage. The catch-all resolves "/" from these URLs in
 * this order, and a locale root ("/en") from "/en/" first - so on an instance where "/"
 * and "/en/" are different pages (joshCMS), both are homepages a visitor can land on.
 */
async function findServedHomepages(): Promise<string[]> {
  const keys: string[] = [];
  for (const url of ["/", "/en/", "/en/homepage/"]) {
    const res = await apiFetch(GRAPH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
      body: JSON.stringify({
        query: `query($u: [String]) { _Page(where: { _metadata: { url: { default: { in: $u } } } }, limit: 1) { items { _metadata { key } } } }`,
        variables: { u: [url] },
      }),
    });
    if (!res.ok) continue;
    const data = (await res.json()) as { data?: { _Page?: { items?: Array<{ _metadata?: { key?: string } }> } } };
    const key = data.data?._Page?.items?.[0]?._metadata?.key;
    if (key && !keys.includes(key)) {
      console.log(`  homepage: ${key} (served at ${url})`);
      keys.push(key);
    }
  }
  return keys;
}

async function localeVersions(key: string): Promise<Version[]> {
  const res = await call("GET", `${CONTENT_ENDPOINT}/${key}/locales/${LOCALE}?pageSize=100`);
  if (!res.ok) throw new Error(`GET versions ${key}: ${res.status} ${res.text.slice(0, 200)}`);
  return ((JSON.parse(res.text) as { items?: Version[] }).items ?? []);
}

/** The newest published version of the base (null) and of every variation. */
function latestPublished(versions: Version[]): Map<string | null, Version> {
  const latest = new Map<string | null, Version>();
  for (const v of versions) {
    if (v.status !== "published") continue;
    const tag = v.variation ?? null;
    const current = latest.get(tag);
    if (!current || Number(v.version) > Number(current.version)) latest.set(tag, v);
  }
  return latest;
}

/** Any Variation Container at all, whatever its flag - including a broken, empty one. */
function hasAnyContainer(nodes: CompNode[]): boolean {
  return nodes.some((n) => (n.component as { contentType?: string } | undefined)?.contentType === "VariationContainerBlock");
}

function hasContainer(nodes: CompNode[]): boolean {
  return nodes.some((n) => {
    const c = n.component as { contentType?: string; properties?: { flagKey?: { value?: string } } } | undefined;
    return c?.contentType === "VariationContainerBlock" && c.properties?.flagKey?.value === FLAG_KEY;
  });
}

/**
 * The draft POST /versions just created. Its response carries the version when it has a
 * body; otherwise poll the locale listing, which lags a fresh draft by a moment.
 */
async function findNewDraft(
  key: string,
  postBody: string,
  existingDrafts: Set<string>,
  variation: string | null
): Promise<Version | null> {
  let fromResponse: string | undefined;
  try {
    fromResponse = postBody.trim() ? String((JSON.parse(postBody) as { version?: string | number }).version ?? "") : undefined;
  } catch {
    fromResponse = undefined;
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const draft = (await localeVersions(key)).find((v) =>
      v.status === "draft" &&
      !existingDrafts.has(v.version) &&
      (fromResponse ? v.version === fromResponse : (v.variation ?? null) === variation)
    );
    if (draft) return draft;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

/** Every cms://content key in the value that no longer resolves. */
async function deadReferences(value: unknown): Promise<string[]> {
  const keys = new Set(
    [...JSON.stringify(value ?? null).matchAll(/cms:\/\/content\/([0-9a-f-]{32,36})/gi)].map((m) => m[1].replace(/-/g, ""))
  );
  const dead: string[] = [];
  for (const key of keys) if (!(await contentKeyExists(key))) dead.push(key);
  return dead;
}

async function deleteDraft(key: string, version: string) {
  const res = await call("DELETE", `${CONTENT_ENDPOINT}/${key}/versions/${version}`);
  console.warn(`    [cleanup] deleted draft ${version} (${res.status})`);
}

/** Adds the container to one published version. Returns a one-word outcome. */
async function addToVersion(
  key: string,
  published: Version,
  pendingDrafts: Version[],
  snapshotDir: string
): Promise<string> {
  const label = published.variation ?? "base";
  const nodes = published.composition?.nodes ?? [];

  // Base versions only. Variations cannot be written safely through the Management API:
  // reading a variation version returns the BASE structure with no properties (seen on
  // joshCMS 2026-10-15, even for variations nobody had touched), so a read-modify-write
  // publishes empty blocks; and merely creating a variation draft overwrites the live
  // variation. Add the section to persona variations in Visual Builder instead.
  if (published.variation) {
    console.log(`  [skip] ${label}: variation - add the section in Visual Builder; nothing was written`);
    return "skipped";
  }
  if (nodes.length === 0) {
    // Some variations come back with no composition at all, though Graph serves one.
    // Writing would replace whatever they show with the container alone.
    console.warn(`  [skip] ${label}: the API returned no composition for v${published.version}; nothing was written`);
    return "blocked";
  }

  writeFileSync(join(snapshotDir, `${key}-${label}-v${published.version}.json`), JSON.stringify(published, null, 2));

  if (hasContainer(nodes)) {
    console.log(`  [ok] ${label}: already has the container`);
    return "present";
  }
  if (hasAnyContainer(nodes)) {
    // e.g. a variation left holding a copy of the base composition, whose container has
    // no properties. Writing would publish that broken state - leave it for a human.
    console.warn(`  [skip] ${label}: holds a Variation Container without the ${FLAG_KEY} flag - check it in Visual Builder; nothing was written`);
    return "blocked";
  }
  if (pendingDrafts.some((d) => (d.variation ?? null) === (published.variation ?? null) && hasContainer(d.composition?.nodes ?? []))) {
    console.log(`  [ok] ${label}: already in a draft awaiting approval`);
    return "pending";
  }
  // Check every reference BEFORE creating a draft. Creating a draft of a variation
  // replaces that variation's live composition with the base one at once - no publish
  // needed - and deleting the draft does not put it back. The API refuses to save a
  // composition holding a dangling reference, so a variation with one would be left
  // showing base content.
  const dead = await deadReferences(published.composition);
  if (dead.length > 0) {
    console.warn(`  [skip] ${label}: dangling reference(s) ${dead.join(", ")} - fix them in Visual Builder first; nothing was written`);
    return "blocked";
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] ${label}: v${published.version}, ${nodes.length} nodes -> ${nodes.length + 1}`);
    return "planned";
  }

  const composition = { ...published.composition, nodes: [...nodes, rootComponent("VariationContainerBlock", NODE_NAME, { flagKey: FLAG_KEY, variations: variationRefs() })] };

  // A new draft of a variation is tagged with the variation but carries the BASE
  // composition, and starts with no properties - both are overwritten below.
  const draftBody: Record<string, unknown> = { locale: LOCALE };
  if (published.displayName !== undefined) draftBody.displayName = published.displayName;
  if (published.routeSegment !== undefined) draftBody.routeSegment = published.routeSegment;
  if (published.variation) draftBody.variation = published.variation;
  // Drafts that already exist (an editor's) must never be mistaken for ours.
  const existingDrafts = new Set((await localeVersions(key)).filter((v) => v.status === "draft").map((v) => v.version));
  const created = await call("POST", `${CONTENT_ENDPOINT}/${key}/versions`, draftBody);
  if (!created.ok) {
    console.warn(`  [skip] ${label}: could not create a draft (${created.status} ${created.text.slice(0, 160)})`);
    return "failed";
  }
  const draft = await findNewDraft(key, created.text, existingDrafts, published.variation ?? null);
  if (!draft) {
    // Never leave this unreported: a variation draft carries the BASE composition.
    console.warn(`  [skip] ${label}: created a draft but could not identify it - check for a stray "${label}" draft before anyone publishes it`);
    return "failed";
  }

  const patch = await call(
    "PATCH",
    `${CONTENT_ENDPOINT}/${key}/versions/${draft.version}`,
    { properties: published.properties ?? {}, composition },
    "application/merge-patch+json"
  );
  if (!patch.ok) {
    // e.g. a live composition holding a dangling reference the API refuses on write.
    console.warn(`  [skip] ${label}: PATCH refused (${patch.status} ${patch.text.slice(0, 200)})`);
    await deleteDraft(key, draft.version);
    return "failed";
  }

  // Read the draft back before publishing anything - straight from the version, and more
  // than once: a read right after the PATCH has come back with the pre-PATCH composition.
  let check: Version | undefined;
  let checkNodes: CompNode[] = [];
  let tagOk = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const read = await call("GET", `${CONTENT_ENDPOINT}/${key}/versions/${draft.version}`);
    check = read.ok ? (JSON.parse(read.text) as Version) : undefined;
    checkNodes = check?.composition?.nodes ?? [];
    tagOk = (check?.variation ?? null) === (published.variation ?? null);
    if (check && tagOk && checkNodes.length === nodes.length + 1 && hasContainer(checkNodes)) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!check || !tagOk || checkNodes.length !== nodes.length + 1 || !hasContainer(checkNodes)) {
    console.warn(`  [skip] ${label}: draft ${draft.version} failed verification (variation=${check?.variation ?? null}, nodes=${checkNodes.length}, expected ${nodes.length + 1})`);
    await deleteDraft(key, draft.version);
    return "failed";
  }

  const pub = await call("POST", `${CONTENT_ENDPOINT}/${key}/versions/${draft.version}:publish`);
  if (pub.ok) {
    console.log(`  [published] ${label}: v${draft.version} (${nodes.length} -> ${checkNodes.length} nodes)`);
    return "published";
  }
  if (isApprovalRequired(pub.status, pub.text)) {
    console.warn(`  [skipped-publish] ${label}: v${draft.version} - approval workflow requires review; left as draft`);
    return "draft";
  }
  console.warn(`  [skip] ${label}: publish failed (${pub.status} ${pub.text.slice(0, 200)})`);
  return "failed";
}

async function main() {
  console.log(`=== seed-homepage-variation-container.ts${DRY_RUN ? " (dry run)" : ""} ===\n`);

  const keys = await findServedHomepages();
  if (keys.length === 0) {
    console.warn("  [skip] no homepage found in Graph at /, /en/ or /en/homepage/");
    return;
  }

  const snapshotDir = mkdtempSync(join(tmpdir(), "homepage-vc-"));
  console.log(`  snapshots: ${snapshotDir}`);

  const outcomes: string[] = [];
  for (const key of keys) {
    const versions = await localeVersions(key);
    const pendingDrafts = versions.filter((v) => v.status === "draft");
    for (const published of latestPublished(versions).values()) {
      outcomes.push(await addToVersion(key, published, pendingDrafts, snapshotDir));
    }
  }

  console.log(`\n=== Done: ${outcomes.join(", ")} ===`);
  if (outcomes.includes("failed")) process.exitCode = 1;
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
