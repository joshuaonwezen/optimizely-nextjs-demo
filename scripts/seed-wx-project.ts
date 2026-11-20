/**
 * Builds the site's Web Experimentation project from scripts/wx-project-data.ts:
 * snippet settings, attributes, audiences, pages, then each experiment with its
 * variations, changes and metrics (FX events, attached as cross-project events), and
 * each personalization campaign with its experiences, and starts them. Then writes
 * scripts/wx-project-ids.json, which the daily seeder (send-experiment-odp-events.mjs)
 * reads so it needs no API token in CI.
 *
 * Create-only upsert: pages by key, audiences by name, experiments and campaigns by the
 * id recorded in the ids file (by name for one the file does not list yet), so a rename
 * in the console does not make a duplicate. Anything that exists is left as it is, so
 * re-running is safe and never overwrites an edit made in the WX console. The ids file
 * is always rewritten from what the project holds.
 *
 * Run:
 *   npx tsx scripts/seed-wx-project.ts                      # everything
 *   npx tsx scripts/seed-wx-project.ts --dry-run            # report what would be created
 *   npx tsx scripts/seed-wx-project.ts --only=help_faq_open_ab_test
 *   npx tsx scripts/seed-wx-project.ts --no-start           # create experiments, leave them unstarted
 *   npx tsx scripts/seed-wx-project.ts --sync-code          # also push the spec's variation code
 *                                                           # to existing experiments (overwrites
 *                                                           # changes edited in the WX console)
 *
 * Reads OPTIMIZELY_FX_API_TOKEN (a personal access token for the account that owns
 * both projects), OPTIMIZELY_WX_PROJECT_ID and OPTIMIZELY_FX_PROJECT_ID (where the
 * metric events live) from .env.local.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { apiFetch } from "./_shared";
import {
  WX_ATTRIBUTES,
  WX_AUDIENCES,
  WX_CAMPAIGNS,
  WX_EXPERIMENTS,
  WX_PAGES,
  WX_SNIPPET_SETTINGS,
  pageConditions,
  variationCode,
  type WxAudienceRef,
  type WxExperiment,
  type WxMetric,
  type WxPageRef,
  type WxPersonalization,
  type WxVariation,
} from "./wx-project-data";

const V2 = "https://api.optimizely.com/v2";
const SITE = "https://optimizely-onboarding.vercel.app";
const IDS_FILE = "scripts/wx-project-ids.json";

const TOKEN = process.env.OPTIMIZELY_FX_API_TOKEN;
const PROJECT_ID = process.env.OPTIMIZELY_WX_PROJECT_ID;
const FX_PROJECT_ID = process.env.OPTIMIZELY_FX_PROJECT_ID;
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_START = args.includes("--no-start");
const SYNC_CODE = args.includes("--sync-code");
const ONLY = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",").filter(Boolean) ?? [];

if (!TOKEN || !PROJECT_ID || !FX_PROJECT_ID) {
  console.error("Missing OPTIMIZELY_FX_API_TOKEN, OPTIMIZELY_WX_PROJECT_ID or OPTIMIZELY_FX_PROJECT_ID in .env.local");
  process.exit(1);
}

async function req<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  // The URL never carries the token, so it is safe to put in the error.
  if (!res.ok) throw new Error(`${method} ${url.replace(/^https:\/\/api\.optimizely\.com/, "")} -> ${res.status}: ${text.slice(0, 400)}`);
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

const would = (what: string) => console.log(`  ${DRY_RUN ? "[dry-run] would create" : "created"} ${what}`);

interface Project {
  account_id: number;
  web_snippet?: Record<string, unknown>;
}

interface ApiCampaign {
  id: number;
  name: string;
  status: string;
  type: string;
  holdback: number;
  experiment_priorities?: number[][];
}

interface ApiExperiment {
  id: number;
  campaign_id: number;
  name: string;
  status: string;
  type: string;
  audience_conditions?: string;
  metrics?: Array<{ event_id?: number }>;
  variations: Array<{ variation_id: number; name: string; weight: number; actions?: Array<{ page_id: number; changes: unknown[] }> }>;
}

async function seedSnippetSettings(): Promise<Project> {
  console.log("\nSnippet settings");
  const project = await req<Project>(`${V2}/projects/${PROJECT_ID}`);
  const changed = Object.entries(WX_SNIPPET_SETTINGS).filter(([k, v]) => project.web_snippet?.[k] !== v);
  if (changed.length === 0) return project;
  if (!DRY_RUN) await req(`${V2}/projects/${PROJECT_ID}`, "PATCH", { web_snippet: Object.fromEntries(changed) });
  console.log(`  ${DRY_RUN ? "[dry-run] would set" : "set"} ${changed.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  return project;
}

async function seedAttributes(): Promise<void> {
  console.log("\nAttributes");
  const existing = new Set((await listV2<{ key: string }>(`/attributes?project_id=${PROJECT_ID}`)).map((a) => a.key));
  for (const a of WX_ATTRIBUTES) {
    if (existing.has(a.key)) continue;
    if (!DRY_RUN) await req(`${V2}/attributes`, "POST", { project_id: Number(PROJECT_ID), key: a.key, name: a.name, description: a.description });
    would(a.key);
  }
}

async function seedAudiences(): Promise<Map<WxAudienceRef, number>> {
  console.log("\nAudiences");
  const byName = new Map<string, number>();
  for (const a of await listV2<{ name: string; id: number; archived?: boolean }>(`/audiences?project_id=${PROJECT_ID}`)) {
    if (!a.archived) byName.set(a.name, a.id);
  }
  const ids = new Map<WxAudienceRef, number>();
  for (const [ref, a] of Object.entries(WX_AUDIENCES) as [WxAudienceRef, (typeof WX_AUDIENCES)[WxAudienceRef]][]) {
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

async function seedPages(): Promise<Map<WxPageRef, number>> {
  console.log("\nPages");
  const byKey = new Map<string, number>();
  for (const p of await listV2<{ key: string; id: number; archived?: boolean }>(`/pages?project_id=${PROJECT_ID}`)) {
    if (!p.archived) byKey.set(p.key, p.id);
  }
  const ids = new Map<WxPageRef, number>();
  for (const [ref, page] of Object.entries(WX_PAGES) as [WxPageRef, (typeof WX_PAGES)[WxPageRef]][]) {
    let id = byKey.get(page.key);
    if (id === undefined) {
      if (!DRY_RUN) {
        const created = await req<{ id: number }>(`${V2}/pages`, "POST", {
          project_id: Number(PROJECT_ID),
          key: page.key,
          name: page.name,
          edit_url: `${SITE}${page.editPath}`,
          category: page.category,
          page_type: "url_set",
          activation_type: page.activation,
          conditions: pageConditions(page),
        });
        id = created.id;
      }
      would(`page ${page.key} (${page.activation})`);
    }
    if (id !== undefined) ids.set(ref, id);
  }
  return ids;
}

/** key -> id of the FX project's events, which the experiments use as metrics. */
async function fxEventIds(): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const e of await listV2<{ key: string; id: number; archived?: boolean }>(`/events?project_id=${FX_PROJECT_ID}&include_classic=false`)) {
    if (!e.archived) ids.set(e.key, e.id);
  }
  return ids;
}

interface IdsFile {
  experiments?: Array<{ key: string; experimentId: string }>;
  campaigns?: Array<{ key: string; campaignId: string; experiences: Array<{ key: string; experimentId: string }> }>;
}

/** What the last run recorded, so experiments are found by id even after a rename. */
function previousIds(): IdsFile {
  try {
    return JSON.parse(readFileSync(IDS_FILE, "utf8")) as IdsFile;
  } catch {
    return {};
  }
}

function pageIdsFor(refs: WxPageRef[], pageIds: Map<WxPageRef, number>): number[] {
  return refs.map((ref) => {
    const id = pageIds.get(ref);
    if (id === undefined) throw new Error(`Page "${ref}" has no id`);
    return id;
  });
}

/** WX requires visitor scope on an experiment's metrics and session scope on a campaign's. */
function metricsFor(metrics: WxMetric[], eventIds: Map<string, number>, scope: "visitor" | "session" = "visitor") {
  return metrics.map((m) => {
    const id = eventIds.get(m.event);
    if (id === undefined) throw new Error(`FX event "${m.event}" not found in project ${FX_PROJECT_ID}`);
    return { event_id: id, aggregator: "unique", scope, winning_direction: m.direction ?? "increasing" };
  });
}

function audienceCondition(ref: WxAudienceRef | undefined, audienceIds: Map<WxAudienceRef, number>): string {
  if (!ref) return "everyone";
  const id = audienceIds.get(ref);
  if (id === undefined) throw new Error(`Audience "${WX_AUDIENCES[ref].name}" has no id`);
  return JSON.stringify(["and", { audience_id: id }]);
}

function variationBody(owner: { key: string; pages: WxPageRef[] }, v: WxVariation, pages: number[], weight: number) {
  const code = variationCode(owner, v);
  const changes = code ? [{ type: "custom_code", value: code }] : [];
  // Web projects require an action per page even when it changes nothing.
  return { name: v.name, weight, actions: pages.map((page_id) => ({ page_id, changes })) };
}

/** Fail loudly if the API silently dropped a metric on another project's event. */
function checkMetrics(key: string, sent: Array<{ event_id: number }>, kept: Array<{ event_id?: number }> | undefined): void {
  const ids = new Set((kept ?? []).map((m) => m.event_id));
  const missing = sent.filter((m) => !ids.has(m.event_id));
  if (missing.length > 0) throw new Error(`${key}: the API dropped cross-project metric(s) ${missing.map((m) => m.event_id).join(", ")}`);
}

function checkDryRunMetrics(key: string, metrics: WxMetric[], eventIds: Map<string, number>): void {
  const missing = metrics.filter((m) => !eventIds.has(m.event)).map((m) => m.event);
  if (missing.length > 0) throw new Error(`${key}: FX event(s) ${missing.join(", ")} not found in project ${FX_PROJECT_ID}`);
}

function experimentBody(exp: WxExperiment, pageIds: Map<WxPageRef, number>, audienceIds: Map<WxAudienceRef, number>, eventIds: Map<string, number>) {
  const pages = pageIdsFor(exp.pages, pageIds);
  const share = Math.floor(10000 / exp.variations.length);
  return {
    project_id: Number(PROJECT_ID),
    name: exp.name,
    description: exp.description,
    type: exp.type,
    page_ids: pages,
    holdback: 0,
    audience_conditions: audienceCondition(exp.audience, audienceIds),
    metrics: metricsFor(exp.metrics, eventIds),
    variations: exp.variations.map((v, i) => variationBody(exp, v, pages, i === 0 ? 10000 - share * (exp.variations.length - 1) : share)),
  };
}

/**
 * --sync-code: replace each variation's changes with the spec's code, matched by
 * variation name, keeping its id and weight. Publishes, so a running test picks it up.
 */
async function syncCode(owner: { key: string; pages: WxPageRef[] }, current: ApiExperiment, specs: WxVariation[], pageIds: Map<WxPageRef, number>): Promise<void> {
  if (!SYNC_CODE) return;
  const pages = pageIdsFor(owner.pages, pageIds);
  const variations = current.variations.map((v) => {
    const spec = specs.find((s) => s.name === v.name);
    if (!spec) throw new Error(`${owner.key}: variation "${v.name}" is not in the spec`);
    return { ...variationBody(owner, spec, pages, v.weight), variation_id: v.variation_id };
  });
  // The API adds id/async/dependencies to each change it returns, so compare type + value.
  const code = (changes: unknown[] | undefined) => (changes ?? []).map((c) => [(c as { type?: string }).type, (c as { value?: string }).value]);
  const same =
    JSON.stringify(current.variations.map((v) => v.actions?.map((a) => code(a.changes)))) ===
    JSON.stringify(variations.map((v) => v.actions.map((a) => code(a.changes))));
  if (same) return;
  if (!DRY_RUN) await req(`${V2}/experiments/${current.id}?action=publish`, "PATCH", { variations });
  console.log(`  ${DRY_RUN ? "[dry-run] would sync" : "synced"} code of ${current.name}`);
}

async function listExperiments(): Promise<ApiExperiment[]> {
  return (await listV2<ApiExperiment>(`/experiments?project_id=${PROJECT_ID}`)).filter((e) => e.status !== "archived");
}

async function seedExperiments(pageIds: Map<WxPageRef, number>, audienceIds: Map<WxAudienceRef, number>, eventIds: Map<string, number>): Promise<Map<string, ApiExperiment>> {
  console.log("\nExperiments");
  const all = await listExperiments();
  const byId = new Map(all.map((e) => [String(e.id), e]));
  const byName = new Map(all.map((e) => [e.name, e]));
  const recorded = new Map((previousIds().experiments ?? []).map((e) => [e.key, e.experimentId]));
  const found = new Map<string, ApiExperiment>();
  for (const exp of WX_EXPERIMENTS) {
    let current = byId.get(recorded.get(exp.key) ?? "") ?? byName.get(exp.name);
    if (ONLY.length > 0 && !ONLY.includes(exp.key)) {
      if (current) found.set(exp.key, current);
      continue;
    }
    if (!current) {
      if (DRY_RUN) {
        // Pages and audiences a dry run would create have no ids yet.
        checkDryRunMetrics(exp.key, exp.metrics, eventIds);
        would(`${exp.type} ${exp.key} "${exp.name}" (${exp.variations.length} variations, metrics: ${exp.metrics.map((m) => m.event).join(", ")})`);
        continue;
      }
      const body = experimentBody(exp, pageIds, audienceIds, eventIds);
      current = await req<ApiExperiment>(`${V2}/experiments`, "POST", body);
      would(`${exp.type} ${exp.key} (id ${current.id})`);
      checkMetrics(exp.key, body.metrics, current.metrics);
    }
    found.set(exp.key, current);
    await syncCode(exp, current, exp.variations, pageIds);
    if (current.status === "not_started" && !NO_START && !DRY_RUN) {
      await req(`${V2}/experiments/${current.id}?action=start`, "PATCH", {});
      console.log(`  started ${exp.key}`);
    } else if (current.status !== "not_started") {
      console.log(`  ${exp.key}: ${current.status}`);
    }
  }
  return found;
}

interface SeededCampaign {
  campaign: ApiCampaign;
  experiences: Map<string, ApiExperiment>;
}

async function seedCampaign(
  spec: WxPersonalization,
  pageIds: Map<WxPageRef, number>,
  audienceIds: Map<WxAudienceRef, number>,
  eventIds: Map<string, number>,
  campaigns: ApiCampaign[],
  experiments: ApiExperiment[]
): Promise<SeededCampaign | null> {
  const recorded = (previousIds().campaigns ?? []).find((c) => c.key === spec.key);
  let campaign = campaigns.find((c) => String(c.id) === recorded?.campaignId) ?? campaigns.find((c) => c.name === spec.name);
  if (!campaign && DRY_RUN) {
    checkDryRunMetrics(spec.key, spec.metrics, eventIds);
    would(`personalization ${spec.key} "${spec.name}" (${spec.experiences.length} experiences, holdback ${spec.holdback / 100}%)`);
    return null;
  }
  const pages = pageIdsFor(spec.pages, pageIds);
  if (!campaign) {
    const metrics = metricsFor(spec.metrics, eventIds, "session");
    campaign = await req<ApiCampaign>(`${V2}/campaigns`, "POST", {
      project_id: Number(PROJECT_ID),
      name: spec.name,
      description: spec.description,
      type: "personalization",
      page_ids: pages,
      holdback: spec.holdback,
      metrics,
    });
    would(`personalization ${spec.key} (id ${campaign.id})`);
    checkMetrics(spec.key, metrics, (campaign as ApiCampaign & { metrics?: Array<{ event_id?: number }> }).metrics);
  }

  // Experiences: one experiment per audience, each serving one variation to everyone in it.
  const campaignId = campaign.id;
  const inCampaign = experiments.filter((e) => e.campaign_id === campaignId);
  const recordedExperiences = new Map((recorded?.experiences ?? []).map((e) => [e.key, e.experimentId]));
  const experiences = new Map<string, ApiExperiment>();
  for (const x of spec.experiences) {
    let current = inCampaign.find((e) => String(e.id) === recordedExperiences.get(x.key)) ?? inCampaign.find((e) => e.name === x.name);
    if (!current) {
      if (DRY_RUN) {
        would(`  experience ${x.key} (${WX_AUDIENCES[x.audience].name})`);
        continue;
      }
      current = await req<ApiExperiment>(`${V2}/experiments`, "POST", {
        project_id: Number(PROJECT_ID),
        campaign_id: campaign.id,
        name: x.name,
        audience_conditions: audienceCondition(x.audience, audienceIds),
        variations: [variationBody(spec, x, pages, 10000)],
      });
      would(`  experience ${x.key} (id ${current.id})`);
    }
    experiences.set(x.key, current);
    await syncCode(spec, current, [x], pageIds);
  }
  if (DRY_RUN) return { campaign, experiences };

  // First matching experience wins, so the spec order is the priority order.
  const wanted = spec.experiences.map((x) => [experiences.get(x.key)!.id]);
  if (JSON.stringify(campaign.experiment_priorities ?? []) !== JSON.stringify(wanted)) {
    campaign = await req<ApiCampaign>(`${V2}/campaigns/${campaign.id}`, "PATCH", { experiment_priorities: wanted });
    console.log(`  experience order set: ${spec.experiences.map((x) => x.key).join(" > ")}`);
  }
  if (campaign.status === "not_started" && !NO_START) {
    campaign = await req<ApiCampaign>(`${V2}/campaigns/${campaign.id}?action=start`, "PATCH", {});
    console.log(`  started ${spec.key}`);
  } else {
    console.log(`  ${spec.key}: ${campaign.status}`);
  }
  return { campaign, experiences };
}

async function seedCampaigns(pageIds: Map<WxPageRef, number>, audienceIds: Map<WxAudienceRef, number>, eventIds: Map<string, number>): Promise<Map<string, SeededCampaign>> {
  console.log("\nPersonalization campaigns");
  const campaigns = (await listV2<ApiCampaign>(`/campaigns?project_id=${PROJECT_ID}`)).filter((c) => c.status !== "archived" && c.type === "personalization");
  const experiments = await listExperiments();
  const found = new Map<string, SeededCampaign>();
  for (const spec of WX_CAMPAIGNS) {
    if (ONLY.length > 0 && !ONLY.includes(spec.key)) continue;
    const seeded = await seedCampaign(spec, pageIds, audienceIds, eventIds, campaigns, experiments);
    if (seeded) found.set(spec.key, seeded);
  }
  return found;
}

/** The ids the daily seeder needs, read back from the project rather than the spec. */
async function writeIds(project: Project, experiments: Map<string, ApiExperiment>, campaigns: Map<string, SeededCampaign>): Promise<void> {
  const attributes = Object.fromEntries(
    (await listV2<{ key: string; id: number; archived?: boolean }>(`/attributes?project_id=${PROJECT_ID}`)).filter((a) => !a.archived).map((a) => [a.key, String(a.id)])
  );
  // A run limited by --only keeps what the file already lists for everything else.
  const previous = previousIds() as IdsFile & { experiments?: Array<Record<string, unknown> & { key: string }>; campaigns?: Array<Record<string, unknown> & { key: string }> };
  const latest = new Map((await listExperiments()).map((e) => [e.id, e]));
  const experimentIds = WX_EXPERIMENTS.flatMap((exp) => {
    const seeded = experiments.get(exp.key);
    const e = seeded && (latest.get(seeded.id) ?? seeded);
    if (!e) return previous.experiments?.filter((p) => p.key === exp.key) ?? [];
    return [
      {
        key: exp.key,
        name: e.name,
        campaignId: String(e.campaign_id),
        experimentId: String(e.id),
        audience: exp.audience ?? null,
        exposure: exp.exposure,
        metrics: exp.metrics.map((m) => ({ key: m.event, direction: m.direction ?? "increasing" })),
        variations: e.variations.map((v) => ({ id: String(v.variation_id), key: exp.variations.find((s) => s.name === v.name)?.key ?? v.name, name: v.name, weight: v.weight })),
      },
    ];
  });
  const campaignIds = WX_CAMPAIGNS.flatMap((spec) => {
    const seeded = campaigns.get(spec.key);
    if (!seeded) return previous.campaigns?.filter((p) => p.key === spec.key) ?? [];
    return [
      {
        key: spec.key,
        name: seeded.campaign.name,
        campaignId: String(seeded.campaign.id),
        holdback: seeded.campaign.holdback,
        exposure: spec.exposure,
        metrics: spec.metrics.map((m) => ({ key: m.event, direction: m.direction ?? "increasing" })),
        experiences: spec.experiences.flatMap((x) => {
          const e = seeded.experiences.get(x.key);
          return e ? [{ key: x.key, name: x.name, audience: x.audience, experimentId: String(e.id), variationId: String(e.variations[0].variation_id) }] : [];
        }),
      },
    ];
  });
  const ids = { accountId: String(project.account_id), projectId: String(PROJECT_ID), attributes, experiments: experimentIds, campaigns: campaignIds };
  writeFileSync(IDS_FILE, `${JSON.stringify(ids, null, 2)}\n`);
  console.log(`\nWrote ${IDS_FILE} (${experimentIds.length} experiments, ${campaignIds.length} personalization campaigns)`);
}

async function main(): Promise<void> {
  const keys = [...WX_EXPERIMENTS.map((e) => e.key), ...WX_CAMPAIGNS.map((c) => c.key)];
  const unknown = ONLY.filter((key) => !keys.includes(key));
  if (unknown.length > 0) throw new Error(`Unknown experiment/campaign key(s): ${unknown.join(", ")}`);

  console.log(`${DRY_RUN ? "[dry-run] " : ""}Seeding WX project ${PROJECT_ID} (metrics from FX project ${FX_PROJECT_ID})`);
  const project = await seedSnippetSettings();
  await seedAttributes();
  const audienceIds = await seedAudiences();
  const pageIds = await seedPages();
  const eventIds = await fxEventIds();
  const experiments = await seedExperiments(pageIds, audienceIds, eventIds);
  const campaigns = await seedCampaigns(pageIds, audienceIds, eventIds);
  if (!DRY_RUN) await writeIds(project, experiments, campaigns);

  console.log("\nDone. The snippet republishes within a few minutes.");
  console.log(`Experiments: https://app.optimizely.com/v2/projects/${PROJECT_ID}/experiments`);
}

main().catch((err) => {
  console.error("\n[ERROR]", err instanceof Error ? err.message : err);
  process.exit(1);
});
