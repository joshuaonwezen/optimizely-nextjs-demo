/**
 * Shared utilities for Optimizely CMS Management API seed scripts.
 *
 * New seed scripts should import constants, types, and helpers from here.
 * Existing seed scripts (seed-content, seed-nav, seed-faqs) inline their own
 * copies of these helpers — kept untouched to avoid behavioral regressions.
 */

import { randomUUID } from "crypto";
import { config as loadEnv } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";

// Load .env.local before anyone reads env-derived constants below.
// Safe to call multiple times — dotenv is a no-op once vars are set.
loadEnv({ path: ".env.local" });

export { getManagementToken };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const API_BASE = "https://api.cms.optimizely.com";
export const CONTENT_ENDPOINT = `${API_BASE}/preview3/experimental/content`;
export const GRAPH_ENDPOINT =
  process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
export const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

// Root container for all seeded content. This container must be created manually
// in the CMS UI (the Management API cannot create containers). Copy its key from
// the CMS and set OPTIMIZELY_ROOT_CONTAINER in .env.local before running seeds.
export const CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

/** UUID with hyphens — the composition API expects this format for node IDs. */
export function uid(): string {
  return randomUUID();
}

/** UUID without hyphens — used as content keys. */
export function noHyphens(): string {
  return randomUUID().replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// Composition node builders
// ---------------------------------------------------------------------------

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
    component: { contentType, properties },
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
    component: { contentType, properties },
  };
}

// ---------------------------------------------------------------------------
// Generic Management API helpers
// ---------------------------------------------------------------------------

/**
 * POST a new content item.
 * Returns the parsed response on success or null if the API reports the
 * routeSegment is already in use (treated as a soft-skip for idempotency).
 */
export async function createContent(
  payload: Record<string, unknown>,
  context = "content item"
): Promise<Record<string, unknown> | null> {
  const token = await getManagementToken();
  const res = await fetch(CONTENT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 400 && text.includes("is already in use")) {
      console.log(`  [skipped] ${context} — routeSegment already in use`);
      return null;
    }
    throw new Error(`POST ${context} failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

/**
 * Delete every content item directly under a container. Returns a map of
 * display name → key for items that could not be deleted (e.g. start pages
 * the CMS refuses to remove).
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

  const data = (await res.json()) as { items?: Array<{ key: string; locales?: Record<string, { displayName?: string }> }> };
  for (const item of data.items ?? []) {
    const displayName = item.locales?.en?.displayName ?? item.key;
    const delRes = await fetch(
      `${CONTENT_ENDPOINT}/${item.key}?permanent=true`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!delRes.ok) undeletable.set(displayName, item.key);
    console.log(`  [deleted] ${displayName} (${delRes.status})`);
  }
  return undeletable;
}

/**
 * Delete a specific content item by key. Silently succeeds if the item is
 * already gone.
 */
export async function deleteContentByKey(key: string): Promise<void> {
  const token = await getManagementToken();
  await fetch(`${CONTENT_ENDPOINT}/${key}?permanent=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * PATCH an existing content item's properties. Uses merge-patch+json so only
 * the provided fields are touched. Tries multiple endpoint variants because
 * the right one depends on whether the item is draft-only or has a published
 * version. Mirrors the strategy in scripts/seed-faqs.ts and scripts/seed-content.ts.
 */
export async function patchContentProperties(
  key: string,
  properties: Record<string, unknown>,
  locale = "en"
): Promise<void> {
  const token = await getManagementToken();
  const body = JSON.stringify({ properties });
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/merge-patch+json",
  };

  // Try locale-scoped first, then bare key. The 404 happens when the content
  // item has no draft for the current locale; the bare-key path resolves it.
  const candidates = [
    `${CONTENT_ENDPOINT}/${key}/${locale}`,
    `${CONTENT_ENDPOINT}/${key}`,
  ];

  let lastStatus = 0;
  let lastBody = "";
  for (const url of candidates) {
    const res = await fetch(url, { method: "PATCH", headers, body });
    if (res.ok) return;
    lastStatus = res.status;
    lastBody = await res.text();
  }
  throw new Error(`PATCH ${key} failed: ${lastStatus} ${lastBody}`);
}

/**
 * Look up the CMS key for a page by URL via Optimizely Graph. Returns null
 * if no page exists at any of the given URLs.
 *
 * Use this when seed scripts need to reference (or clean up) a page that was
 * created in an earlier script — keys aren't shared across script runs, but
 * URLs are stable.
 */
export async function findPageKeyByUrl(urls: string[]): Promise<string | null> {
  if (urls.length === 0) return null;
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
 * If a page exists at any of the given URLs, delete it. Useful for idempotent
 * cleanup of pages created in other containers (where
 * `findItemsInContainerByName` against root can't reach them).
 */
export async function deletePageByUrlIfExists(urls: string[]): Promise<void> {
  const key = await findPageKeyByUrl(urls);
  if (key) await deleteContentByKey(key);
}

/**
 * Find items in a container whose display name matches a predicate.
 * Useful for idempotent cleanup of named blocks/pages before re-seeding.
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
  const data = (await res.json()) as { items?: Array<{ key: string; locales?: Record<string, { displayName?: string }> }> };
  return (data.items ?? [])
    .map((item) => ({
      key: item.key,
      displayName: item.locales?.en?.displayName ?? item.key,
    }))
    .filter((item) => predicate(item.displayName));
}
