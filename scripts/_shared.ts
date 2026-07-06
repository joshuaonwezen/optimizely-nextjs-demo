/**
 * Shared utilities for Optimizely CMS Management API seed scripts.
 * All seed scripts import constants, types, and helpers from here.
 */

import { randomUUID } from "crypto";
import { config as loadEnv } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";

// Load .env.local before anyone reads env-derived constants below.
// Safe to call multiple times — dotenv is a no-op once vars are set.
loadEnv({ path: ".env.local" });

export { getManagementToken };

export const API_BASE = "https://api.cms.optimizely.com";
export const CONTENT_ENDPOINT = `${API_BASE}/v1/content`;
export const GRAPH_ENDPOINT =
  process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
export const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

// Root container for all seeded content. If this env var is not set, the seed
// scripts call discoverRootContainer() to look it up via GET /v1/applications.
export const CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";

// ID helpers

/** UUID with hyphens — the composition API expects this format for node IDs. */
export function uid(): string {
  return randomUUID();
}

/** UUID without hyphens — used as content keys. */
export function noHyphens(): string {
  return randomUUID().replace(/-/g, "");
}

/**
 * Wraps every value in a flat properties object into the v1 PropertyData format.
 *
 * The v1 Management API requires each property value to be `{ value: <actual> }`
 * rather than a bare value. This applies to both initialVersion.properties and
 * inline composition component properties.
 */
export function wrapProps(
  props: Record<string, unknown>
): Record<string, { value: unknown }> {
  const out: Record<string, { value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    out[k] = { value: v };
  }
  return out;
}

// Composition node builders

export interface CompNode {
  id: string;
  displayName: string;
  nodeType: string;
  component?: { contentType: string; properties: Record<string, unknown> };
  nodes?: CompNode[];
  layoutType?: string;
}

/** A single-column section wrapping one full-width element. */
export function sectionComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return gridSection(displayName, [
    elementComponent(contentType, displayName, properties),
  ]);
}

/** A section containing a row of element components in a grid layout. */
export function gridSection(displayName: string, items: CompNode[]): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "section",
    layoutType: "grid",
    component: { contentType: "BlankSection", properties: {} },
    nodes: [
      {
        id: uid(),
        displayName: "Row",
        nodeType: "row",
        nodes: items.map((item) => ({
          id: uid(),
          displayName: "Column",
          nodeType: "column",
          nodes: [item],
        })),
      },
    ],
  };
}

/** An element-level component (must be elementEnabled in its contentType). */
export function elementComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "component",
    component: { contentType, properties: wrapProps(properties) },
  };
}

/** A root-level component for sectionEnabled blocks that aren't elementEnabled. */
export function rootComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "component",
    component: { contentType, properties: wrapProps(properties) },
  };
}

// Root container auto-discovery

/**
 * Returns the root container key for the current CMS instance.
 *
 * Reads OPTIMIZELY_ROOT_CONTAINER from the environment first. If it is not
 * set, calls GET /v1/applications to find the default application's start page
 * (entryPoint URI) and extracts its content key.
 */
export async function discoverRootContainer(): Promise<string> {
  const envKey = (process.env.OPTIMIZELY_ROOT_CONTAINER ?? "").replace(/-/g, "");
  if (envKey) return envKey;

  const token = await getManagementToken();
  const res = await fetch(`${API_BASE}/v1/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GET /v1/applications failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    items?: Array<{ isDefault?: boolean; entryPoint?: string }>;
  };
  const items = data.items ?? [];
  if (items.length === 0) throw new Error("No applications found in CMS");

  const app = items.find((a) => a.isDefault) ?? items[0];
  if (!app.entryPoint) throw new Error("CMS application has no entryPoint URI");

  // entryPoint format: "cms://content/{key}" — extract the last path segment.
  const raw = app.entryPoint.split("/").pop() ?? "";
  const key = raw.replace(/-/g, "");
  if (!key) throw new Error(`Could not extract key from entryPoint: ${app.entryPoint}`);

  console.log(`  [auto-discovered] root container: ${key} (from entryPoint: ${app.entryPoint})`);
  return key;
}

let cachedGlobalRoot = "";

// Well-known key of the "For All Applications" SysContentFolder — used as a
// fallback when the top-level root's children cannot be listed.
const FOR_ALL_APPLICATIONS_KEY = "e56f85d0e8334e02976a2d11fe4d598c";

/**
 * Returns the key of the "For All Applications" shared-blocks folder (the
 * SysContentFolder child of the top-level content root).
 *
 * The CMS distinguishes two kinds of items: SHARED BLOCKS live inside this
 * system folder and show up in the "Shared Blocks" tab, where editors can bind
 * them into content areas (`type: "array"` of `content`). CONTENT ITEMS live
 * anywhere else in the tree, show up in the Content Manager tab, and are the
 * targets of `contentReference` properties. Blocks created directly under the
 * top-level root are plain content items — they never appear in the Shared
 * Blocks tab, so every seeded shared block must use this folder as container.
 *
 * Discovered by walking up the container chain from the entry point to the
 * top-level root, then selecting its SysContentFolder child.
 */
export async function discoverGlobalRoot(): Promise<string> {
  if (cachedGlobalRoot) return cachedGlobalRoot;

  const token = await getManagementToken();
  const entryPoint = await discoverRootContainer();

  // Walk up from the entry point to the top-level global root. If that chain is broken
  // (e.g. the entry point's own container was deleted), recover by walking up from a
  // stable seeded item instead - so a corrupted/repointed instance still resolves.
  let globalRoot = await walkToGlobalRoot(token, entryPoint);
  if (!globalRoot) {
    for (const anchor of RECOVERY_ANCHORS) {
      globalRoot = await walkToGlobalRoot(token, anchor);
      if (globalRoot) break;
    }
  }
  if (!globalRoot) {
    throw new Error(
      `Could not determine the global root from entry point ${entryPoint} or seeded anchors.`,
    );
  }

  const blocksFolder = await findSharedBlocksFolder(token, globalRoot);
  cachedGlobalRoot = blocksFolder;
  console.log(`  [auto-discovered] shared blocks folder (For All Applications): ${blocksFolder}`);
  return blocksFolder;
}

/**
 * Returns the key of the SysContentFolder child of the top-level root — the
 * folder the Shared Blocks tab renders as "For All Applications". Falls back
 * to the well-known key when the listing fails.
 */
async function findSharedBlocksFolder(token: string, topRoot: string): Promise<string> {
  const res = await fetch(`${CONTENT_ENDPOINT}/${topRoot}/items?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const data = (await res.json()) as { items?: Array<{ key: string; contentType?: string }> };
    const folder = (data.items ?? []).find((i) => i.contentType === "SysContentFolder");
    if (folder) return folder.key.replace(/-/g, "");
  }
  console.warn(
    `  [warn] Could not find a SysContentFolder under root ${topRoot} — falling back to well-known key`,
  );
  return FOR_ALL_APPLICATIONS_KEY;
}

/**
 * Returns the top-level content root key (the item with no container). This is
 * NOT where shared blocks belong — see discoverGlobalRoot — but earlier seed
 * versions created blocks here, so migration sweeps need it.
 */
export async function discoverTopLevelRoot(): Promise<string> {
  const token = await getManagementToken();
  const entryPoint = await discoverRootContainer();
  let topRoot = await walkToGlobalRoot(token, entryPoint);
  if (!topRoot) {
    for (const anchor of RECOVERY_ANCHORS) {
      topRoot = await walkToGlobalRoot(token, anchor);
      if (topRoot) break;
    }
  }
  if (!topRoot) {
    throw new Error(
      `Could not determine the top-level root from entry point ${entryPoint} or seeded anchors.`,
    );
  }
  return topRoot;
}

/**
 * Migration + idempotency sweep for seeded shared blocks. Permanently deletes
 * items of the given content types found (a) directly under the top-level root,
 * where earlier seed versions created them as plain content items (the UI never
 * creates blocks there, so everything of these types at the root is seed
 * legacy), and (b) inside the shared-blocks folder, so re-runs don't pile up
 * duplicates. Pass `includeBlocksFolder: false` when the folder may hold
 * manually created blocks of the same types that must survive — the caller is
 * then responsible for folder-side cleanup (e.g. by display-name sentinel).
 */
export async function sweepMisplacedSharedBlocks(
  contentTypes: string[],
  options: { includeBlocksFolder?: boolean } = {}
): Promise<void> {
  const token = await getManagementToken();
  const topRoot = await discoverTopLevelRoot();
  const blocksFolder = await discoverGlobalRoot();
  const wanted = new Set(contentTypes);
  const containers = options.includeBlocksFolder === false ? [topRoot] : [topRoot, blocksFolder];

  for (const container of containers) {
    const res = await fetch(`${CONTENT_ENDPOINT}/${container}/items?pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const data = (await res.json()) as { items?: Array<{ key: string; contentType?: string }> };
    for (const item of data.items ?? []) {
      if (!wanted.has(item.contentType ?? "")) continue;
      const del = await fetch(`${CONTENT_ENDPOINT}/${item.key}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "cms-permanent-delete": "true" },
      });
      console.log(`  [sweep] deleted ${item.contentType} ${item.key} from ${container} (${del.status})`);
    }
  }
}

// Stable content keys that survive re-seeds (the shared FAQ items, preserved by
// cleanSharedBlocks). Used to recover the global root by walking up their container
// chain when the app entry point is missing or points at deleted content.
const RECOVERY_ANCHORS = [
  "fb900000000000000000000000000001",
  "fb900000000000000000000000000002",
  "fb900000000000000000000000000003",
];

/**
 * Walk up the `container` chain from `startKey` to the top-level content root - the
 * item that has no `container` (the global "For All Applications" root). Returns "" if
 * the start item is missing or the chain is broken. Capped to avoid looping forever on
 * a corrupted (cyclic) hierarchy.
 */
async function walkToGlobalRoot(token: string, startKey: string): Promise<string> {
  let key = (startKey ?? "").replace(/-/g, "");
  const seen = new Set<string>();
  for (let i = 0; i < 12 && key && !seen.has(key); i++) {
    seen.add(key);
    const r = await fetch(`${CONTENT_ENDPOINT}/${key}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return "";
    const c = (await r.json()) as { container?: string };
    const parent = (c.container ?? "").replace(/-/g, "");
    if (!parent) return key; // no container -> this is the global root
    key = parent;
  }
  return "";
}

/** Point the given application's start page (entry point) at a content key. */
async function patchEntryPoint(token: string, appKey: string, contentKey: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/applications/${appKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ entryPoint: `cms://content/${contentKey}` }),
  });
  if (!res.ok) {
    throw new Error(
      `PATCH /v1/applications/${appKey} entryPoint failed: ${res.status} ${(await res.text()).slice(0, 300)}`,
    );
  }
}

/**
 * Returns the key of a DynamicExperience that is the site start page, CREATING one
 * and pointing the default application at it when the current entry point is missing
 * or is not a DynamicExperience (e.g. a BlankExperience folder, which cannot hold a
 * homepage composition and does not render at /).
 *
 * The Management API can set the start page - this avoids the manual "create a
 * DynamicExperience and set it as Settings > Site > Start page" onboarding step:
 *   PATCH /v1/applications/{key}  (application/merge-patch+json)
 *   { "entryPoint": "cms://content/{key}" }   -> 204
 *
 * Handles four cases:
 *  - entry point is a DynamicExperience  -> reuse it as-is (fresh or populated instance)
 *  - entry point is a BlankExperience    -> walk up to the global root, create/reuse a
 *                                           DynamicExperience there, repoint the app
 *  - entry point is missing/deleted      -> recover the global root by walking up from a
 *                                           stable seeded item, then create/reuse + repoint
 *  - nothing recoverable                 -> throw with a clear manual-fix message
 *
 * The start page lives directly under the global root (alongside shared blocks). All page
 * seeding then uses this key as the root container, and the homepage becomes its composition.
 */
export async function ensureExperienceStartPage(): Promise<string> {
  const token = await getManagementToken();

  const appsRes = await fetch(`${API_BASE}/v1/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!appsRes.ok) {
    throw new Error(`GET /v1/applications failed: ${appsRes.status} ${await appsRes.text()}`);
  }
  const appData = (await appsRes.json()) as {
    items?: Array<{ key: string; isDefault?: boolean; entryPoint?: string }>;
  };
  const apps = appData.items ?? [];
  if (apps.length === 0) {
    throw new Error(
      "No applications found in CMS - create a website/application in the CMS first (the API cannot create one).",
    );
  }
  const app = apps.find((a) => a.isDefault) ?? apps[0];
  const entryKey = (app.entryPoint?.split("/").pop() ?? "").replace(/-/g, "");

  // If a root container is explicitly provided (OPTIMIZELY_ROOT_CONTAINER / the seed
  // tool's Root Container field), honor it so every seed script agrees on the root. It
  // must be an existing DynamicExperience; we point the app start page at it.
  const envKey = (process.env.OPTIMIZELY_ROOT_CONTAINER ?? "").replace(/-/g, "");
  if (envKey) {
    const cRes = await fetch(`${CONTENT_ENDPOINT}/${envKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!cRes.ok) {
      throw new Error(
        `OPTIMIZELY_ROOT_CONTAINER ${envKey} was not found (${cRes.status}). Use an existing DynamicExperience ` +
        `key, or leave the Root Container field blank to auto-provision one.`,
      );
    }
    const c = (await cRes.json()) as { contentType?: string };
    if (c.contentType !== "DynamicExperience") {
      throw new Error(
        `OPTIMIZELY_ROOT_CONTAINER ${envKey} is a ${c.contentType ?? "?"}, not a DynamicExperience. Use a ` +
        `DynamicExperience key, or leave the Root Container field blank to auto-provision one.`,
      );
    }
    if (entryKey !== envKey) {
      await patchEntryPoint(token, app.key, envKey);
      console.log(`  [start-page] pointed the '${app.key}' start page at provided DynamicExperience ${envKey}`);
    }
    return envKey;
  }

  // Find the global root to create the start page under. If the entry point is already
  // a DynamicExperience, use it as-is (fresh or populated instance).
  let globalRoot = "";
  if (entryKey) {
    const cRes = await fetch(`${CONTENT_ENDPOINT}/${entryKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (cRes.ok) {
      const c = (await cRes.json()) as { contentType?: string };
      if (c.contentType === "DynamicExperience") return entryKey;
      console.log(
        `  [start-page] entry point ${entryKey} is a ${c.contentType ?? "?"}, not a DynamicExperience - creating one`,
      );
      globalRoot = await walkToGlobalRoot(token, entryKey);
    }
  }

  // Entry point missing or deleted (broken instance): recover the global root by
  // walking up from a stable seeded item so we can still create a start page.
  if (!globalRoot) {
    for (const anchor of RECOVERY_ANCHORS) {
      globalRoot = await walkToGlobalRoot(token, anchor);
      if (globalRoot) break;
    }
    if (globalRoot) {
      console.log(`  [start-page] entry point missing or deleted - recovered global root ${globalRoot} from a seeded item`);
    }
  }

  if (!globalRoot) {
    throw new Error(
      "Could not determine the content root to create a start page under (entry point is broken and no seeded " +
      "anchor was found). In the CMS, set Settings > Site > Start page to a valid DynamicExperience, then reseed.",
    );
  }

  // Reuse an existing DynamicExperience directly under the global root if one is there
  // (from a prior recovery), so repeated recovery runs don't pile up duplicate start
  // pages. Otherwise create a fresh one.
  let newKey = "";
  const itemsRes = await fetch(`${CONTENT_ENDPOINT}/${globalRoot}/items?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (itemsRes.ok) {
    const d = (await itemsRes.json()) as { items?: Array<{ key: string; contentType?: string }> };
    const existing = (d.items ?? []).find((i) => i.contentType === "DynamicExperience");
    if (existing) {
      newKey = existing.key.replace(/-/g, "");
      console.log(`  [start-page] reusing existing DynamicExperience ${newKey} under the global root`);
    }
  }
  if (!newKey) {
    newKey = noHyphens();
    await createContent(
      {
        key: newKey,
        contentType: "DynamicExperience",
        container: globalRoot,
        locale: "en",
        displayName: "Home",
      },
      "Home (site start page)",
    );
  }

  // Point the default application at the DynamicExperience.
  await patchEntryPoint(token, app.key, newKey);

  console.log(`  [start-page] pointed the '${app.key}' start page at DynamicExperience ${newKey}`);
  return newKey;
}

// Generic Management API helpers

/**
 * POST a new content item using the v1 API.
 *
 * The payload uses the same field names as before (locale, displayName,
 * routeSegment, properties, composition, status, etc.). This function
 * re-maps them to the v1 NewContent shape:
 *
 *   { key, contentType, container, initialVersion: { locale, displayName, ... } }
 *
 * After creation the initial draft version is immediately published via
 * POST /content/{key}/versions/{version}:publish.
 *
 * Returns the parsed NewContentNode on success, null on idempotent skip
 * (routeSegment already in use, or 409 key conflict).
 */
export async function createContent(
  payload: Record<string, unknown>,
  context = "content item",
  options: { skipPublish?: boolean } = {}
): Promise<Record<string, unknown> | null> {
  const token = await getManagementToken();

  // Split payload into outer NewContent fields and initialVersion fields.
  const {
    key, contentType, container, owner,
    locale, displayName, routeSegment, simpleRoute,
    variation, properties, composition, media, binding,
    // status is readOnly in v1 — ignored here, published via :publish below
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    status: _status,
    // Catch-all: any remaining fields are dropped (v1 additionalProperties: false)
    ...rest
  } = payload;

  // Suppress TS warning for intentionally unused rest
  void rest;

  const initialVersion: Record<string, unknown> = {};
  if (locale !== undefined)      initialVersion.locale      = locale;
  if (displayName !== undefined) initialVersion.displayName = displayName;
  if (routeSegment !== undefined) initialVersion.routeSegment = routeSegment;
  if (simpleRoute !== undefined) initialVersion.simpleRoute = simpleRoute;
  if (variation !== undefined)   initialVersion.variation   = variation;
  if (properties !== undefined)  initialVersion.properties  = wrapProps(properties as Record<string, unknown>);
  if (composition !== undefined) initialVersion.composition = composition;
  if (media !== undefined)       initialVersion.media       = media;
  if (binding !== undefined)     initialVersion.binding     = binding;

  const body: Record<string, unknown> = { contentType, initialVersion };
  if (key !== undefined)       body.key       = key;
  if (container !== undefined) body.container = container;
  if (owner !== undefined)     body.owner     = owner;

  const res = await fetch(CONTENT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();

  if (!res.ok) {
    if (res.status === 409) {
      console.log(`  [skipped] ${context} — key already exists (409)`);
      return null;
    }
    if (res.status === 400 && text.includes("is already in use")) {
      console.log(`  [skipped] ${context} — routeSegment already in use`);
      return null;
    }
    throw new Error(`POST ${context}: ${res.status} ${text.slice(0, 300)}`);
  }

  // v1 API sometimes returns 201 with no body — look up the version separately.
  let result: Record<string, unknown>;
  let contentKey: string;
  let versionId: string | undefined;

  if (!text.trim()) {
    const inferredKey = body.key as string | undefined;
    if (!inferredKey) throw new Error(`POST ${context}: 201 with empty body and no key in request`);
    contentKey = inferredKey;
    const vRes = await fetch(`${CONTENT_ENDPOINT}/${contentKey}/versions?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (vRes.ok) {
      const vData = (await vRes.json()) as { items?: Array<{ version?: string }> };
      versionId = vData.items?.[0]?.version;
    }
    result = { key: contentKey };
  } else {
    result = JSON.parse(text) as Record<string, unknown>;
    contentKey = result.key as string;
    versionId = (result.initialVersion as Record<string, unknown> | undefined)
      ?.version as string | undefined;
  }

  if (versionId && !options.skipPublish) {
    const pubRes = await fetch(
      `${CONTENT_ENDPOINT}/${contentKey}/versions/${versionId}:publish`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!pubRes.ok) {
      const pubText = await pubRes.text();
      throw new Error(`Publish ${context}: ${pubRes.status} ${pubText.slice(0, 300)}`);
    }
  }

  return result;
}

/**
 * Delete every content item directly under a container. Returns a map of
 * key → key for items that could not be deleted (e.g. start pages the CMS
 * refuses to remove).
 */
export async function deleteAllInContainer(
  container: string = CONTAINER
): Promise<Map<string, string>> {
  const token = await getManagementToken();
  const undeletable = new Map<string, string>();

  const res = await fetch(`${CONTENT_ENDPOINT}/${container}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undeletable;

  const data = (await res.json()) as { items?: Array<{ key: string }> };
  for (const item of data.items ?? []) {
    const delRes = await fetch(`${CONTENT_ENDPOINT}/${item.key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "cms-permanent-delete": "true" },
    });
    if (!delRes.ok) undeletable.set(item.key, item.key);
    console.log(`  [deleted] ${item.key} (${delRes.status})`);
  }
  return undeletable;
}

/**
 * Delete a specific content item by key. Silently succeeds if the item is
 * already gone.
 */
export async function deleteContentByKey(key: string): Promise<void> {
  const token = await getManagementToken();
  await fetch(`${CONTENT_ENDPOINT}/${key}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "cms-permanent-delete": "true" },
  });
}

/**
 * PATCH an existing content item's properties. Uses merge-patch+json so only
 * the provided fields are touched.
 *
 * Fetches the latest version for the given locale, PATCHes it, then
 * re-publishes if the PATCH moved the version out of published state.
 */
export async function patchContentProperties(
  key: string,
  properties: Record<string, unknown>,
  locale = "en"
): Promise<void> {
  const token = await getManagementToken();

  // Find the latest version for this locale (any status).
  const vRes = await fetch(
    `${CONTENT_ENDPOINT}/${key}/locales/${locale}?pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!vRes.ok) {
    throw new Error(`GET locales/${locale} for ${key}: ${vRes.status}`);
  }
  const vData = (await vRes.json()) as {
    items?: Array<{ version?: string; status?: string }>;
  };
  const versionItem = vData.items?.[0];
  if (!versionItem?.version) throw new Error(`No version for ${key}/${locale}`);

  const { version } = versionItem;

  const patchRes = await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/merge-patch+json",
    },
    body: JSON.stringify({ properties: wrapProps(properties) }),
  });
  if (!patchRes.ok) {
    const txt = await patchRes.text();
    throw new Error(`PATCH ${key}/versions/${version}: ${patchRes.status} ${txt.slice(0, 200)}`);
  }

  const patchBody = await patchRes.text();
  const patched = patchBody.trim()
    ? (JSON.parse(patchBody) as { version?: string; status?: string })
    : { version: undefined, status: undefined };

  // Always republish after patching (original may have been draft or published).
  if (patched.status !== "published") {
    const vToPublish = patched.version ?? version;
    const pubRes = await fetch(
      `${CONTENT_ENDPOINT}/${key}/versions/${vToPublish}:publish`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!pubRes.ok) {
      console.warn(
        `  [warn] republish ${key} after property patch: ${pubRes.status}`
      );
    }
  }
}

/**
 * Look up the CMS key for a page by URL via Optimizely Graph. Returns null
 * if no page exists at any of the given URLs.
 */
export async function findPageKeyByUrl(urls: string[]): Promise<string | null> {
  if (urls.length === 0) return null;
  // Graph indexes URLs with or without the /en/ prefix depending on the
  // instance's locale/host configuration (publishing a second locale can flip
  // this). Try both shapes for every candidate.
  urls = [
    ...new Set(
      urls.flatMap((u) => [
        u,
        u.startsWith("/en/") ? u.replace(/^\/en\//, "/") : `/en${u}`,
      ])
    ),
  ];
  const query = `query FindPageKey($urls: [String]) {
    _Page(where: { _metadata: { url: { default: { in: $urls } } } }, limit: 1) {
      items { _metadata { key } }
    }
  }`;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `epi-single ${SINGLE_KEY}`,
    },
    body: JSON.stringify({ query, variables: { urls } }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { _Page?: { items?: Array<{ _metadata?: { key?: string } }> } };
  };
  return data.data?._Page?.items?.[0]?._metadata?.key ?? null;
}

/**
 * If a page exists at any of the given URLs, delete it.
 */
export async function deletePageByUrlIfExists(urls: string[]): Promise<void> {
  const key = await findPageKeyByUrl(urls);
  if (key) await deleteContentByKey(key);
}

/**
 * Find items in a container whose display name matches a predicate.
 *
 * In v1, GET /content/{key}/items returns ContentNode (no displayName).
 * This function fetches the latest version for each item to get its display
 * name, then filters by the predicate.
 */
export async function findItemsInContainerByName(
  predicate: (displayName: string) => boolean,
  container: string = CONTAINER
): Promise<Array<{ key: string; displayName: string }>> {
  const token = await getManagementToken();
  const res = await fetch(`${CONTENT_ENDPOINT}/${container}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { items?: Array<{ key: string }> };
  const result: Array<{ key: string; displayName: string }> = [];

  for (const item of data.items ?? []) {
    const vRes = await fetch(
      `${CONTENT_ENDPOINT}/${item.key}/versions?pageSize=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    let displayName = item.key;
    if (vRes.ok) {
      const vData = (await vRes.json()) as {
        items?: Array<{ displayName?: string }>;
      };
      displayName = vData.items?.[0]?.displayName ?? item.key;
    }
    if (predicate(displayName)) result.push({ key: item.key, displayName });
  }
  return result;
}
