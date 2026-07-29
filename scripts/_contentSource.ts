// Shared helper for seeding Optimizely Graph external content sources
// (Content Source API). Registers the source type, pushes NdJSON data, verifies
// it indexed, and self-heals a corrupted ES mapping (200-but-0-indexed) by
// deleting + re-registering the source once. If data still does not index after
// that, it is the account-activation gate (schema registration works without
// setup, but data indexing needs the external-sources pipeline enabled by
// Optimizely) - surfaced loudly, not thrown, so callers stay optional-friendly.

import { config } from "dotenv";

config({ path: ".env.local" });

const GRAPH_BASE = "https://cg.optimizely.com";
const GRAPH_GATEWAY = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";

export interface ExternalRecord {
  /** NdJSON action-line `_id` (unique within the source). */
  id: string | number;
  /** Stable content key, e.g. `qt-1`. */
  key: string;
  /** Human label, indexed as `displayName___searchable`. */
  displayName: string;
  /** Typed field props already keyed `name$$Type`, e.g. { "author$$String": "..." }. */
  fields: Record<string, unknown>;
}

export interface SeedExternalSourceOptions {
  sourceId: string;
  label: string;
  typeName: string;
  properties: Record<string, { type: string }>;
  records: ExternalRecord[];
  languages?: string[];
}

function getAuth(): { basic: string; singleKey: string } {
  const appKey = process.env.OPTIMIZELY_APP_KEY;
  const appSecret = process.env.OPTIMIZELY_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("Missing OPTIMIZELY_APP_KEY / OPTIMIZELY_APP_SECRET (Content Source API Basic auth)");
  }
  return {
    basic: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
    singleKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "",
  };
}

async function registerType(opts: SeedExternalSourceOptions, auth: string): Promise<void> {
  const body = {
    label: opts.label,
    languages: opts.languages ?? ["en"],
    contentTypes: { [opts.typeName]: { contentType: ["_Item"], properties: opts.properties } },
    preset: "next",
    useTypedFieldNames: true,
  };
  const res = await fetch(`${GRAPH_BASE}/api/content/v3/types?id=${opts.sourceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Type registration failed (${opts.sourceId}): ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] ${opts.typeName} type registered (${res.status})`);
}

async function pushData(opts: SeedExternalSourceOptions, auth: string): Promise<void> {
  const now = new Date().toISOString();
  const lines: string[] = [];
  for (const rec of opts.records) {
    lines.push(JSON.stringify({ index: { _id: rec.id, language_routing: "en" } }));
    lines.push(JSON.stringify({
      _rbac: "r:Everyone:Read",
      _itemMetadata: { key: rec.key, displayName___searchable: rec.displayName, lastModified: now, type: opts.typeName },
      _metadata: { types: [opts.typeName, "_Item"], locale: "en", key: rec.key, status: "Published" },
      ...rec.fields,
      ContentType: [opts.typeName],
      Status: "Published",
      Language: { DisplayName: "English", Name: "en" },
    }));
  }
  const res = await fetch(`${GRAPH_BASE}/api/content/v2/data?id=${opts.sourceId}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", "og-job-id": `seed-${opts.sourceId}-${Date.now()}`, Authorization: auth },
    body: lines.join("\n"),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Data sync failed (${opts.sourceId}): ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] ${opts.records.length} ${opts.typeName} records synced (${res.status})`);
}

async function countIndexed(typeName: string, singleKey: string): Promise<number> {
  const res = await fetch(GRAPH_GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${singleKey}` },
    body: JSON.stringify({ query: `query{ ${typeName}(limit: 1){ total } }` }),
  });
  const json = (await res.json()) as { data?: Record<string, { total?: number }>; errors?: unknown };
  if (json.errors) return 0;
  return json.data?.[typeName]?.total ?? 0;
}

async function deleteSource(sourceId: string, auth: string): Promise<void> {
  // id is ALWAYS explicit - an empty id deletes ALL sources.
  if (!sourceId) throw new Error("refusing to DELETE with empty sourceId (would delete ALL sources)");
  const res = await fetch(`${GRAPH_BASE}/api/content/v3/sources?id=${sourceId}`, {
    method: "DELETE",
    headers: { Authorization: auth },
  });
  console.log(`  [recover] deleted source '${sourceId}' (${res.status})`);
}

/** Register + push + verify an external source, self-healing a corrupted mapping once. */
export async function seedExternalSource(opts: SeedExternalSourceOptions): Promise<{ indexed: number; recovered: boolean }> {
  const { basic, singleKey } = getAuth();
  console.log(`--- External source '${opts.sourceId}' (${opts.typeName}) ---`);

  await registerType(opts, basic);
  await pushData(opts, basic);

  console.log("  verifying (waiting 12s for Graph to index)...");
  await new Promise((r) => setTimeout(r, 12000));
  let indexed = await countIndexed(opts.typeName, singleKey);
  if (indexed > 0) {
    console.log(`  [populated] ${opts.typeName} total=${indexed}`);
    return { indexed, recovered: false };
  }

  // 200-but-0: most likely a corrupted ES mapping. Delete + re-register + re-push once.
  console.warn(`  [warn] ${opts.typeName} indexed 0 after sync - attempting mapping recovery (delete + re-register)`);
  await deleteSource(opts.sourceId, basic);
  await registerType(opts, basic);
  await pushData(opts, basic);
  console.log("  re-verifying (waiting 15s)...");
  await new Promise((r) => setTimeout(r, 15000));
  indexed = await countIndexed(opts.typeName, singleKey);
  if (indexed > 0) {
    console.log(`  [recovered] ${opts.typeName} total=${indexed} after re-register`);
    return { indexed, recovered: true };
  }

  console.warn(
    `  [ACTIVATION REQUIRED] ${opts.typeName} still 0 after re-register. Schema registration works, but data\n` +
    `  indexing requires the external content sources pipeline to be ENABLED for this account by Optimizely.\n` +
    `  This is not a code bug - contact Optimizely support to activate external content sources for this instance.`
  );
  return { indexed: 0, recovered: false };
}
