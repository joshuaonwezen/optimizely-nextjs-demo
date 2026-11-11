/**
 * Builds the site's Feature Experimentation project from scripts/fx-project-data.ts:
 * attributes, events, audiences, then each flag with its variables, variations and
 * production rules (metrics attached, priorities in spec order).
 *
 * Create-only upsert by key (audiences by name): anything that exists is left as it
 * is, so re-running is safe and never overwrites an edit made in the FX console.
 *
 * Run:
 *   npx tsx scripts/seed-fx-project.ts                      # everything
 *   npx tsx scripts/seed-fx-project.ts --dry-run            # report what would be created
 *   npx tsx scripts/seed-fx-project.ts --only=banner,homepage
 *
 * Reads OPTIMIZELY_FX_API_TOKEN and OPTIMIZELY_FX_PROJECT_ID from .env.local. FX only
 * archives a deleted attribute, so one removed from the spec stays in the datafile.
 */

import { apiFetch } from "./_shared";
import { FX_ATTRIBUTES, FX_AUDIENCES, FX_EVENTS, FX_FLAGS, type AudienceRef, type FxFlag, type FxRule } from "./fx-project-data";

const V2 = "https://api.optimizely.com/v2";
const FLAGS = "https://api.optimizely.com/flags/v1";
const ENVIRONMENT = "production";

const TOKEN = process.env.OPTIMIZELY_FX_API_TOKEN;
const PROJECT_ID = process.env.OPTIMIZELY_FX_PROJECT_ID;
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",").filter(Boolean) ?? [];

if (!TOKEN || !PROJECT_ID) {
  console.error("Missing OPTIMIZELY_FX_API_TOKEN or OPTIMIZELY_FX_PROJECT_ID in .env.local");
  process.exit(1);
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  // The URL never carries the token, so it is safe to put in the error.
  if (!res.ok) throw new HttpError(res.status, `${method} ${url.replace(/^https:\/\/api\.optimizely\.com/, "")} -> ${res.status}: ${text.slice(0, 400)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

/** Every page of a v2 list endpoint (they page with page/per_page and return a bare array). */
async function listV2<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const items = await req<T[]>(`${V2}${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    all.push(...items);
    if (items.length < 100) return all;
  }
}

/** GET that answers null on 404 instead of throwing. */
async function find<T>(url: string): Promise<T | null> {
  try {
    return await req<T>(url);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return null;
    throw err;
  }
}

const flagUrl = (path = "") => `${FLAGS}/projects/${PROJECT_ID}${path}`;
const would = (what: string) => console.log(`  ${DRY_RUN ? "[dry-run] would create" : "created"} ${what}`);

async function seedAttributes(): Promise<void> {
  console.log("\nAttributes");
  const existing = new Set((await listV2<{ key: string }>(`/attributes?project_id=${PROJECT_ID}`)).map((a) => a.key));
  for (const a of FX_ATTRIBUTES) {
    if (existing.has(a.key)) continue;
    if (!DRY_RUN) await req(`${V2}/attributes`, "POST", { project_id: Number(PROJECT_ID), key: a.key, name: a.name, description: a.description });
    would(a.key);
  }
}

/** Creates missing events and returns key -> id for every spec event that exists. */
async function seedEvents(): Promise<Map<string, number>> {
  console.log("\nEvents");
  const ids = new Map<string, number>();
  for (const e of await listV2<{ key: string; id: number }>(`/events?project_id=${PROJECT_ID}&include_classic=false`)) ids.set(e.key, e.id);
  for (const e of FX_EVENTS) {
    if (ids.has(e.key)) continue;
    if (!DRY_RUN) {
      const created = await req<{ id: number }>(`${V2}/projects/${PROJECT_ID}/custom_events`, "POST", {
        key: e.key,
        name: e.name,
        description: e.description,
        category: e.category,
        event_type: "custom",
      });
      ids.set(e.key, created.id);
    }
    would(`${e.key} ("${e.name}")`);
  }
  return ids;
}

/** Creates missing audiences and returns spec ref -> audience id. */
async function seedAudiences(): Promise<Map<AudienceRef, number>> {
  console.log("\nAudiences");
  const byName = new Map<string, number>();
  for (const a of await listV2<{ name: string; id: number; archived?: boolean }>(`/audiences?project_id=${PROJECT_ID}`)) {
    if (!a.archived) byName.set(a.name, a.id);
  }
  const ids = new Map<AudienceRef, number>();
  for (const [ref, a] of Object.entries(FX_AUDIENCES) as [AudienceRef, (typeof FX_AUDIENCES)[AudienceRef]][]) {
    let id = byName.get(a.name);
    if (id === undefined) {
      if (!DRY_RUN) {
        const created = await req<{ id: number }>(`${V2}/audiences`, "POST", {
          project_id: Number(PROJECT_ID),
          name: a.name,
          description: a.description,
          conditions: JSON.stringify(a.conditions),
        });
        id = created.id;
      }
      would(`"${a.name}"`);
    }
    if (id !== undefined) ids.set(ref, id);
  }
  return ids;
}

/** FX's rule audience format: one audience as ["or", ...], several as ["and", ...]. */
function audienceConditions(refs: AudienceRef[], audienceIds: Map<AudienceRef, number>): unknown[] {
  const ids = refs.map((r) => {
    const id = audienceIds.get(r);
    if (id === undefined) throw new Error(`Audience "${FX_AUDIENCES[r].name}" has no id`);
    return { audience_id: id };
  });
  if (ids.length === 0) return [];
  return [ids.length === 1 ? "or" : "and", ...ids];
}

function ruleValue(flag: FxFlag, rule: FxRule, eventIds: Map<string, number>, audienceIds: Map<AudienceRef, number>) {
  const variationName = (key: string) => flag.variations.find((v) => v.key === key)?.name ?? (key === "off" ? "Off" : key);
  const conditions = audienceConditions(rule.audiences, audienceIds);
  return {
    key: rule.key,
    name: rule.name,
    type: rule.type,
    ...(rule.type === "a/b" ? { distribution_mode: "manual" } : {}),
    percentage_included: 10000,
    audience_conditions: conditions,
    audience_ids: conditions.slice(1).map((c) => (c as { audience_id: number }).audience_id),
    variations: Object.fromEntries(
      Object.entries(rule.variations).map(([key, weight]) => [key, { key, name: variationName(key), percentage_included: weight }])
    ),
    metrics: (rule.metrics ?? []).map((key) => {
      const id = eventIds.get(key);
      if (id === undefined) throw new Error(`Event "${key}" has no id`);
      const name = FX_EVENTS.find((e) => e.key === key)!.name;
      return { event_id: id, event_type: "custom", scope: "visitor", aggregator: "unique", winning_direction: "increasing", display_title: name };
    }),
  };
}

async function seedFlag(flag: FxFlag, eventIds: Map<string, number>, audienceIds: Map<AudienceRef, number>): Promise<void> {
  console.log(`\nFlag ${flag.key}`);

  // The flag. Creating one also creates "off" and "on" variations from the defaults;
  // "off" is required, but an "on" no rule serves would only clutter the dashboard.
  if (!(await find(flagUrl(`/flags/${flag.key}`)))) {
    if (!DRY_RUN) {
      await req(flagUrl("/flags"), "POST", {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        variable_definitions: Object.fromEntries(flag.variables.map((v) => [v.key, v])),
      });
      if (!flag.variations.some((v) => v.key === "on")) await req(flagUrl(`/flags/${flag.key}/variations/on`), "DELETE");
    }
    would("flag");
    if (DRY_RUN) {
      // Nothing below can be read for a flag that does not exist yet.
      for (const v of flag.variations) would(`variation ${v.key}`);
      for (const r of flag.rules) would(`${r.type} rule ${r.key}${r.metrics?.length ? ` (metrics: ${r.metrics.join(", ")})` : ""}`);
      return;
    }
  }

  for (const v of flag.variations) {
    if (await find(flagUrl(`/flags/${flag.key}/variations/${v.key}`))) continue;
    if (!DRY_RUN) {
      await req(flagUrl(`/flags/${flag.key}/variations`), "POST", {
        key: v.key,
        name: v.name,
        variables: Object.fromEntries(Object.entries(v.variables ?? {}).map(([k, value]) => [k, { value }])),
      });
    }
    would(`variation ${v.key}`);
  }

  const rulesetUrl = flagUrl(`/flags/${flag.key}/environments/${ENVIRONMENT}/ruleset`);
  const ruleset = await req<{ rules?: Record<string, unknown>; rule_priorities?: string[]; enabled?: boolean }>(rulesetUrl);
  for (const rule of flag.rules) {
    if (ruleset.rules?.[rule.key]) continue;
    if (!DRY_RUN) {
      // The ruleset PATCH is JSON Patch (RFC 6902). A new rule is a draft until enabled,
      // and a draft is left out of the datafile even when the ruleset is on.
      await req(rulesetUrl, "PATCH", [{ op: "add", path: `/rules/${rule.key}`, value: ruleValue(flag, rule, eventIds, audienceIds) }]);
      await req(rulesetUrl, "PATCH", [{ op: "replace", path: `/rules/${rule.key}/enabled`, value: true }]);
    }
    would(`${rule.type} rule ${rule.key}${rule.metrics?.length ? ` (metrics: ${rule.metrics.join(", ")})` : ""}`);
  }
  if (DRY_RUN) return;

  // First matching rule wins, so the order is part of the spec.
  const current = (await req<{ rule_priorities?: string[] }>(rulesetUrl)).rule_priorities ?? [];
  const wanted = [...flag.rules.map((r) => r.key), ...current.filter((k) => !flag.rules.some((r) => r.key === k))];
  if (current.join() !== wanted.join()) {
    await req(rulesetUrl, "PATCH", [{ op: "replace", path: "/rule_priorities", value: wanted }]);
    console.log(`  rule order set: ${wanted.join(" > ")}`);
  }

  if (!ruleset.enabled) {
    await req(`${rulesetUrl}/enabled`, "POST");
    console.log(`  ruleset enabled in ${ENVIRONMENT}`);
  }
}

async function main(): Promise<void> {
  const unknown = ONLY.filter((key) => !FX_FLAGS.some((f) => f.key === key));
  if (unknown.length > 0) throw new Error(`Unknown flag key(s): ${unknown.join(", ")}`);

  console.log(`${DRY_RUN ? "[dry-run] " : ""}Seeding FX project ${PROJECT_ID}`);
  await seedAttributes();
  const eventIds = await seedEvents();
  const audienceIds = await seedAudiences();
  // Naming flags limits the run to them, so a rule removed on purpose from another flag
  // is not re-added.
  for (const flag of ONLY.length > 0 ? FX_FLAGS.filter((f) => ONLY.includes(f.key)) : FX_FLAGS) {
    await seedFlag(flag, eventIds, audienceIds);
  }

  console.log("\nDone. The datafile refreshes within about 60s.");
  console.log(`Flags: https://app.optimizely.com/v2/projects/${PROJECT_ID}/flags/list`);
}

main().catch((err) => {
  console.error("\n[ERROR]", err instanceof Error ? err.message : err);
  process.exit(1);
});
