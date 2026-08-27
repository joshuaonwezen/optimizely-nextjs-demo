/**
 * Targeted link-ref patch.
 *
 * Rewrites internal path-string values in type:"url" link fields
 * (ctaLink, link, linkUrl, ctaUrl) to stable `cms://content/{key}` references,
 * WITHOUT reseeding content. Walks every page's composition plus standalone
 * shared blocks, resolves each internal path to a page key via Graph, and
 * PATCHes only the changed field.
 *
 * Idempotent: values already in cms:// form (or external/unresolvable) are left
 * untouched, so re-running finds nothing to change.
 *
 * Dry-run by default (reports what would change). Pass --apply to write.
 *
 * Run:  npx tsx scripts/patch-link-refs.ts [--apply]
 * Uses the base OPTIMIZELY_* vars in .env.local (target one instance at a time).
 */

import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";
import {
  CONTENT_ENDPOINT,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  discoverGlobalRoot,
  findPageKeyByUrl,
} from "./_shared";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const LINK_FIELDS = new Set(["ctaLink", "link", "linkUrl", "ctaUrl"]);

// path string -> cms://content/{key} (or null when unresolvable). Cached.
const refCache = new Map<string, string | null>();

async function resolveRef(pathVal: string): Promise<string | null> {
  if (refCache.has(pathVal)) return refCache.get(pathVal)!;
  const variants = pathVal.endsWith("/")
    ? [pathVal, pathVal.slice(0, -1)]
    : [pathVal, `${pathVal}/`];
  const key = await findPageKeyByUrl(variants);
  const ref = key ? `cms://content/${key}` : null;
  refCache.set(pathVal, ref);
  return ref;
}

// An internal path we should try to resolve (not already a ref, not external).
function isInternalPath(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.startsWith("/") &&
    !v.startsWith("//") &&
    !v.startsWith("cms://") &&
    !v.startsWith("http")
  );
}

// A stored property value is either a raw scalar or the wrapped { value }.
// Read/replace transparently, returning the (possibly new) wrapper.
function readProp(p: unknown): unknown {
  return p && typeof p === "object" && "value" in (p as any) ? (p as any).value : p;
}
function writeProp(p: unknown, next: unknown): unknown {
  return p && typeof p === "object" && "value" in (p as any) ? { ...(p as any), value: next } : next;
}

interface Change {
  where: string;
  field: string;
  from: string;
  to: string;
}

// Walk a properties bag; fix any link field holding an internal path.
async function fixProps(
  props: Record<string, unknown> | undefined,
  where: string,
  changes: Change[],
): Promise<boolean> {
  if (!props) return false;
  let changed = false;
  for (const field of Object.keys(props)) {
    if (!LINK_FIELDS.has(field)) continue;
    const val = readProp(props[field]);
    if (!isInternalPath(val)) continue;
    const ref = await resolveRef(val);
    if (!ref) continue; // external / unresolvable -> leave as-is
    props[field] = writeProp(props[field], ref);
    changes.push({ where, field, from: val, to: ref });
    changed = true;
  }
  return changed;
}

// Recurse a composition node tree, fixing component properties.
async function fixNodes(
  nodes: any[] | undefined,
  where: string,
  changes: Change[],
): Promise<boolean> {
  if (!Array.isArray(nodes)) return false;
  let changed = false;
  for (const node of nodes) {
    if (node?.component?.properties) {
      const label = `${where} > ${node.component.contentType ?? node.nodeType ?? "node"}`;
      if (await fixProps(node.component.properties, label, changes)) changed = true;
    }
    if (await fixNodes(node?.nodes, where, changes)) changed = true;
  }
  return changed;
}

async function getLatestVersion(token: string, key: string): Promise<any | null> {
  const res = await fetch(`${CONTENT_ENDPOINT}/${key}/locales/en?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: any[] };
  return data.items?.[0] ?? null;
}

async function patchVersion(
  token: string,
  key: string,
  version: string,
  body: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${key}/${version}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const pub = await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pub.ok) console.warn(`  [warn] republish ${key}: ${pub.status}`);
}

async function graphKeys(query: string, pick: (d: any) => string[]): Promise<string[]> {
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return [];
  return pick(await res.json());
}

// Every page key (compositions live here). Paginated - Graph caps limit/cost,
// so a single large limit errors and returns nothing.
async function allPageKeys(): Promise<string[]> {
  const out: string[] = [];
  for (let skip = 0; ; skip += 100) {
    const q = `query { _Page(limit: 100, skip: ${skip}) { items { _metadata { key } } } }`;
    const batch = await graphKeys(q, (d) =>
      (d?.data?._Page?.items ?? []).map((i: any) => i?._metadata?.key).filter(Boolean),
    );
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

// Recursively collect content keys under a container (for shared blocks).
async function itemKeysUnder(token: string, container: string, out: Set<string>): Promise<void> {
  let pageIndex = 0;
  for (;;) {
    const res = await fetch(
      `${CONTENT_ENDPOINT}/${container}/items?pageSize=100&pageIndex=${pageIndex}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return;
    const data = (await res.json()) as { items?: Array<{ key?: string; contentType?: string }> };
    const items = data.items ?? [];
    if (items.length === 0) return;
    for (const it of items) {
      if (!it.key) continue;
      out.add(it.key);
      // Recurse into folders (their own items may be blocks too).
      await itemKeysUnder(token, it.key, out);
    }
    if (items.length < 100) return;
    pageIndex++;
  }
}

async function main() {
  console.log(`=== Patch link refs (${APPLY ? "APPLY" : "DRY-RUN"}) ===\n`);
  const token = await getManagementToken();

  const pageKeys = await allPageKeys();
  const blockRoot = await discoverGlobalRoot();
  const blockKeys = new Set<string>();
  await itemKeysUnder(token, blockRoot, blockKeys);

  const keys = new Set<string>([...pageKeys, ...blockKeys]);
  console.log(`Scanning ${pageKeys.length} pages + ${blockKeys.size} shared-block items (${keys.size} unique)…\n`);

  const allChanges: Change[] = [];
  let patched = 0;

  for (const key of keys) {
    const v = await getLatestVersion(token, key);
    if (!v?.version) continue;

    const changes: Change[] = [];
    const label = `${v.displayName ?? key}`;
    const propsChanged = await fixProps(v.properties, label, changes);
    const compChanged = await fixNodes(v.composition?.nodes, label, changes);
    if (!propsChanged && !compChanged) continue;

    for (const c of changes) {
      console.log(`  [${label}] ${c.field}: ${c.from}  ->  ${c.to}`);
    }
    allChanges.push(...changes);

    if (APPLY) {
      const body: Record<string, unknown> = {};
      if (propsChanged) body.properties = v.properties;
      if (compChanged) body.composition = v.composition;
      await patchVersion(token, key, v.version, body);
      patched++;
    }
  }

  console.log(
    `\n=== ${APPLY ? "Patched" : "Would patch"} ${allChanges.length} link(s) across ${
      APPLY ? patched : new Set(allChanges.map((c) => c.where)).size
    } item(s) ===`,
  );
  if (!APPLY && allChanges.length) console.log("Re-run with --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
