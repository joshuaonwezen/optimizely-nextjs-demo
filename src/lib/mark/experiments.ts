import "server-only";
import { fetchDatafile } from "@/lib/optimizely/datafile";
import { CONTROL_VARIATION_KEY, FLAG_VAR_SEP, routeMatches } from "@/lib/optimizely/variationPath";
import { isWxVariation, WX_VARIATION_PREFIX } from "@/lib/optimizely/wxVariation";
import { keysMissingFromCms } from "./cms";
import { summarizeResults, type RawResults, type ResultsSummary, type RuleVariation } from "./experimentResults";
import { markGraph } from "./graph";
import { resolvePage, type PageRef } from "./pages";
import { changedFields, visibleText, type FieldChange } from "./text";

// What a page's experiments look like from both sides: the CMS variations an editor
// (or Mark) wrote, and the Feature Experimentation rules that serve them. The FX
// Experiments CMS extension creates those rules; nothing here writes anywhere.

const FX_API = "https://api.optimizely.com";
const PAGE_TYPE = "SEO";
const EXPERIENCE_TYPE = "_Experience";
const LIVE_OR_WAITING = ["Published", "Draft", "Ready", "InReview"];
const MARKER_VARIABLE = "cms_flag";
const ROUTE_VARIABLE = "cms_route";
const CACHE_MS = 60_000;
const MAX_TEXT = 6_000;
const MAX_LINES = 12;
const MAX_LINE = 400;
const MAX_DRAFTS_COMPARED = 3;
// The results endpoint can answer with a calculation that is days old and only then
// start a new one (seen 2026-11-25: a first read ended five days back, the next one
// was current). A result this old is asked for once more.
const STALE_RESULTS_MS = 36 * 3_600_000;
const RECALCULATION_WAIT_MS = 1_500;

const RESERVED_NAMES = [CONTROL_VARIATION_KEY, "on", "off"];
const NAME_RULES =
  `Lowercase letters, digits and underscores, starting with a letter, 2 to 50 characters, and no "${FLAG_VAR_SEP}". ` +
  `Not ${RESERVED_NAMES.map((name) => `"${name}"`).join(", ")}, not starting with "${WX_VARIATION_PREFIX}", and not a name already taken. ` +
  "It becomes the Feature Experimentation variation key, so name the idea, e.g. benefit_led.";

interface DatafileRule {
  id: string;
  key: string;
  status?: string;
  audienceIds?: string[];
  variations?: Array<{ id: string; key: string; featureEnabled?: boolean }>;
}

interface Datafile {
  projectId?: string;
  environmentKey?: string;
  featureFlags?: Array<{
    key: string;
    experimentIds?: string[];
    rolloutId?: string;
    variables?: Array<{ id: string; key: string; type: string; defaultValue: string }>;
  }>;
  experiments?: DatafileRule[];
  rollouts?: Array<{ id: string; experiments?: DatafileRule[] }>;
  audiences?: Array<{ id: string; name: string }>;
  typedAudiences?: Array<{ id: string; name: string }>;
}

interface FxRuleDetail {
  key: string;
  name?: string;
  type?: string;
  status?: string;
  days_running?: number | null;
  updated_time?: string | null;
  layer_experiment_id?: number | string | null;
  fetch_results_ui_url?: string | null;
  audience_ids?: Array<number | string>;
}

interface FxFlag {
  key: string;
  name?: string;
  variable_definitions?: Record<string, { type?: string; default_value?: string }>;
  environments?: Record<string, { enabled?: boolean; rules_detail?: FxRuleDetail[] }>;
}

interface FxRuleset {
  rules?: Record<string, { variations?: Record<string, { key: string; name?: string; variation_id?: number | string }> }>;
}

export type RuleStatus = "running" | "paused" | "not_started";

/** One Feature Experimentation rule that serves CMS variations. */
export interface CmsRule {
  flagKey: string;
  ruleKey: string;
  name: string;
  /** A delivery serves one variation to an audience and measures nothing. */
  kind: "experiment" | "delivery";
  status: RuleStatus;
  /** The flag's cms_route. Empty means every page. */
  route: string;
  variations: RuleVariation[];
  audiences: string[];
  daysRunning: number | null;
  updatedTime: string | null;
  resultsId: string | null;
  resultsUrl: string | null;
}

function fxToken(): string | null {
  return process.env.OPTIMIZELY_FX_API_TOKEN || null;
}

async function fxGet<T>(path: string): Promise<T> {
  const response = await fetch(`${FX_API}${path}`, {
    headers: { Authorization: `Bearer ${fxToken()}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Feature Experimentation API answered ${response.status} for ${path.split("?")[0]}`);
  }
  return (await response.json()) as T;
}

async function loadDatafile(): Promise<Datafile | null> {
  const text = await fetchDatafile();
  if (!text) return null;
  try {
    return JSON.parse(text) as Datafile;
  } catch {
    return null;
  }
}

function audienceNames(datafile: Datafile | null, ids: Array<number | string> | undefined): string[] {
  const all = [...(datafile?.audiences ?? []), ...(datafile?.typedAudiences ?? [])];
  return (ids ?? [])
    .map((id) => all.find((audience) => audience.id === String(id))?.name)
    .filter((name): name is string => Boolean(name) && !/^Optimizely-Generated/i.test(name ?? ""));
}

// Every rule the datafile carries for a CMS flag. Only running rules are in a
// datafile, and it has no names and no results: the fallback for a deployment
// without an API token.
function rulesFromDatafile(datafile: Datafile): CmsRule[] {
  const experiments = new Map((datafile.experiments ?? []).map((rule) => [rule.id, rule]));
  const rollouts = new Map((datafile.rollouts ?? []).map((rollout) => [rollout.id, rollout]));
  const rules: CmsRule[] = [];

  for (const flag of datafile.featureFlags ?? []) {
    const marker = flag.variables?.find((variable) => variable.key === MARKER_VARIABLE);
    // The same test as rulesFromApi: the marker is a boolean whose default is true.
    // A flag that turns it on per variation is a block-level test (the Variation
    // Container), which has no page variations to write.
    if (marker?.type !== "boolean" || marker.defaultValue !== "true") continue;
    const route = (flag.variables?.find((variable) => variable.key === ROUTE_VARIABLE)?.defaultValue ?? "").trim();

    const consider = (rule: DatafileRule, kind: CmsRule["kind"]) => {
      if (rule.status && rule.status !== "Running") return;
      const served = (rule.variations ?? []).filter((variation) => variation.featureEnabled && variation.key !== "off");
      if (served.length === 0) return;
      rules.push({
        flagKey: flag.key,
        ruleKey: rule.key,
        name: rule.key,
        kind,
        status: "running",
        route,
        variations: served.map((variation) => ({ key: variation.key, name: variation.key, id: variation.id })),
        audiences: audienceNames(datafile, rule.audienceIds),
        daysRunning: null,
        updatedTime: null,
        resultsId: kind === "experiment" ? rule.id : null,
        resultsUrl: null,
      });
    };

    for (const id of flag.experimentIds ?? []) {
      const rule = experiments.get(id);
      if (rule) consider(rule, "experiment");
    }
    for (const rule of rollouts.get(flag.rolloutId ?? "")?.experiments ?? []) consider(rule, "delivery");
  }
  return rules;
}

let flagsCache: { at: number; project: string; flags: FxFlag[] } | null = null;
const rulesetCache = new Map<string, { at: number; ruleset: FxRuleset }>();

async function listFlags(project: string): Promise<FxFlag[]> {
  if (flagsCache && flagsCache.project === project && Date.now() - flagsCache.at < CACHE_MS) return flagsCache.flags;
  const flags: FxFlag[] = [];
  // Paging is `page_window`; `page=` is a 400.
  for (let page = 1; page <= 20; page += 1) {
    const data = await fxGet<{ items?: FxFlag[]; total_pages?: number }>(
      `/flags/v1/projects/${project}/flags?per_page=100&archived=false&page_window=${page}`
    );
    flags.push(...(data.items ?? []));
    if (page >= (data.total_pages ?? 1)) break;
  }
  flagsCache = { at: Date.now(), project, flags };
  return flags;
}

async function getRuleset(project: string, environment: string, flagKey: string): Promise<FxRuleset> {
  const id = `${project}:${environment}:${flagKey}`;
  const hit = rulesetCache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.ruleset;
  const ruleset = await fxGet<FxRuleset>(
    `/flags/v1/projects/${project}/flags/${flagKey}/environments/${environment}/ruleset`
  );
  rulesetCache.set(id, { at: Date.now(), ruleset });
  return ruleset;
}

function ruleStatus(detail: FxRuleDetail, environmentOn: boolean): RuleStatus {
  if (detail.status === "running") return environmentOn ? "running" : "paused";
  return detail.status === "paused" ? "paused" : "not_started";
}

// Every rule of every CMS flag, running or ended, with names and result ids. A CMS
// flag carries the boolean marker with default "true"; the FX Experiments extension
// always sets the marker and the route as defaults.
async function rulesFromApi(datafile: Datafile, covers: (route: string) => boolean): Promise<CmsRule[]> {
  const project = datafile.projectId ?? "";
  const environment = datafile.environmentKey ?? "production";
  const rules: CmsRule[] = [];

  for (const flag of await listFlags(project)) {
    const marker = flag.variable_definitions?.[MARKER_VARIABLE];
    if (marker?.type !== "boolean" || marker.default_value !== "true") continue;
    const route = (flag.variable_definitions?.[ROUTE_VARIABLE]?.default_value ?? "").trim();
    if (!covers(route)) continue;

    const env = flag.environments?.[environment];
    const details = env?.rules_detail ?? [];
    if (details.length === 0) continue;
    const ruleset = await getRuleset(project, environment, flag.key);

    for (const detail of details) {
      const kind = detail.type === "a/b" || detail.type === "multi_armed_bandit" ? "experiment" : "delivery";
      const variations = Object.values(ruleset.rules?.[detail.key]?.variations ?? {}).map((variation) => ({
        key: variation.key,
        name: variation.name ?? variation.key,
        id: String(variation.variation_id ?? ""),
      }));
      rules.push({
        flagKey: flag.key,
        ruleKey: detail.key,
        name: detail.name ?? detail.key,
        kind,
        status: ruleStatus(detail, Boolean(env?.enabled)),
        route,
        variations,
        audiences: audienceNames(datafile, detail.audience_ids),
        daysRunning: detail.days_running ?? null,
        updatedTime: detail.updated_time ?? null,
        resultsId: kind === "experiment" && detail.layer_experiment_id ? String(detail.layer_experiment_id) : null,
        resultsUrl: detail.fetch_results_ui_url ?? null,
      });
    }
  }
  return rules;
}

interface LoadedRules {
  rules: CmsRule[];
  /** False when only the datafile could be read: no ended rules and no results. */
  complete: boolean;
  notes: string[];
}

async function loadRules(covers: (route: string) => boolean): Promise<LoadedRules> {
  const datafile = await loadDatafile();
  if (!datafile) {
    return { rules: [], complete: false, notes: ["Could not read the Feature Experimentation datafile, so no tests are listed."] };
  }
  if (!fxToken()) {
    return {
      rules: rulesFromDatafile(datafile).filter((rule) => covers(rule.route)),
      complete: false,
      notes: [
        "OPTIMIZELY_FX_API_TOKEN is not set on this site, so only running tests are listed and their results cannot be read. " +
          "Open the results from the Feature Experimentation panel in the CMS instead.",
      ],
    };
  }
  try {
    return { rules: await rulesFromApi(datafile, covers), complete: true, notes: [] };
  } catch (error) {
    console.error("[mark] could not list Feature Experimentation rules:", error);
    return {
      rules: rulesFromDatafile(datafile).filter((rule) => covers(rule.route)),
      complete: false,
      notes: ["The Feature Experimentation API could not be reached, so only running tests are listed, without results."],
    };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readResults(rule: CmsRule, flatAfterDays: number): Promise<ResultsSummary | null> {
  if (rule.kind !== "experiment" || !rule.resultsId || !fxToken() || rule.status === "not_started") return null;
  try {
    const path = `/v2/experiments/${rule.resultsId}/results`;
    let raw = await fxGet<RawResults>(path);
    const age = raw.end_time ? Date.now() - Date.parse(raw.end_time) : 0;
    if (rule.status === "running" && age > STALE_RESULTS_MS) {
      await sleep(RECALCULATION_WAIT_MS);
      raw = await fxGet<RawResults>(path);
    }
    return summarizeResults(raw, rule.variations, {
      originalKey: CONTROL_VARIATION_KEY,
      daysRunning: rule.daysRunning,
      flatAfterDays,
    });
  } catch (error) {
    // Some rules answer 400 "Invalid experiment configuration"; the test still exists.
    console.error(`[mark] could not read results of ${rule.flagKey}/${rule.ruleKey}:`, error);
    return null;
  }
}

const VARIATION_VERSIONS_QUERY = /* GraphQL */ `
  query MarkPageVariations($where: _ContentWhereInput) {
    _Content(variation: { include: ALL, includeOriginal: true }, where: $where, limit: 100) {
      items {
        _metadata {
          key version locale status displayName variation types lastModified lastModifiedBy
          url { default base }
        }
      }
    }
  }
`;

const VERSION_DOCUMENT_QUERY = /* GraphQL */ `
  query MarkVersionDocument($where: _ContentWhereInput) {
    _Content(variation: { include: ALL, includeOriginal: true }, where: $where, limit: 1) {
      item { _json }
    }
  }
`;

interface VersionRow {
  version: string;
  status: string;
  name: string;
  variation: string | null;
  types: string[];
  lastModified: string | null;
  lastModifiedBy: string | null;
  path: string | null;
  base: string | null;
}

interface GraphVersion {
  _metadata: {
    version: string;
    status: string;
    displayName: string | null;
    variation: string | null;
    types: string[] | null;
    lastModified: string | null;
    lastModifiedBy: string | null;
    url: { default: string | null; base: string | null } | null;
  };
}

// Every version of the item in one language that is live or waiting to be: the
// original's and each variation's. Without the variation argument Graph returns
// the original's only.
async function listVersions(contentKey: string, locale: string): Promise<VersionRow[]> {
  const where = { _metadata: { key: { eq: contentKey }, locale: { eq: locale }, status: { in: LIVE_OR_WAITING } } };
  const data = await markGraph<{ _Content: { items: GraphVersion[] } }>(VARIATION_VERSIONS_QUERY, { where });
  return data._Content.items.map(({ _metadata: meta }) => ({
    version: meta.version,
    status: meta.status,
    name: meta.displayName ?? "",
    variation: meta.variation,
    types: meta.types ?? [],
    lastModified: meta.lastModified,
    lastModifiedBy: meta.lastModifiedBy,
    path: meta.url?.default ?? null,
    base: meta.url?.base ?? null,
  }));
}

async function versionDocument(contentKey: string, locale: string, row: VersionRow): Promise<unknown> {
  const where = {
    _metadata: {
      key: { eq: contentKey },
      locale: { eq: locale },
      version: { eq: row.version },
      status: { eq: row.status },
    },
  };
  const data = await markGraph<{ _Content: { item: { _json: unknown } | null } }>(VERSION_DOCUMENT_QUERY, { where });
  return data._Content.item?._json ?? null;
}

const byNewest = (a: VersionRow, b: VersionRow) => Number(b.version) - Number(a.version);

// The paths a visitor can request this page at. The site answers an English page
// with and without the /en prefix, and a rule's route is matched against either.
function visitorPaths(path: string): string[] {
  const clean = path.replace(/\/+$/, "") || "/";
  const bare = clean.replace(/^\/en(?=\/|$)/, "") || "/";
  return [...new Set([clean, bare])];
}

interface CopyDiff {
  removed: string[];
  added: string[];
}

// The lines of copy a variation drops and adds. On an experience the one changed
// field is the whole layout, and a before/after of its first lines would hide a
// change further down the page.
function copyDiff(before: unknown, after: unknown): CopyDiff {
  const original = visibleText(before).split("\n").filter(Boolean);
  const changed = visibleText(after).split("\n").filter(Boolean);
  const clip = (line: string) => (line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)}...` : line);
  return {
    removed: original.filter((line) => !changed.includes(line)).slice(0, MAX_LINES).map(clip),
    added: changed.filter((line) => !original.includes(line)).slice(0, MAX_LINES).map(clip),
  };
}

interface VariationState {
  name: string;
  status: string;
  publishedVersion: string | null;
  /** Unpublished versions, newest first. The CMS editor opens one of them. */
  drafts: Array<{ version: string; status: string; lastModified: string | null; lastModifiedBy: string | null; changes: number }>;
  /** When the published version was last saved: how long visitors have seen this wording. */
  lastChanged: string | null;
  url: string | null;
  sameUrlAsPage: boolean;
  /** What the version that would go live next changes against the original page. */
  changedFields: FieldChange[];
  copyChanges: CopyDiff;
  servedBy: string[];
  problems: string[];
}

async function describeVariation(
  contentKey: string,
  locale: string,
  name: string,
  rows: VersionRow[],
  original: { row: VersionRow; document: unknown },
  rules: CmsRule[]
): Promise<VariationState> {
  const published = rows.find((row) => row.status === "Published") ?? null;
  const drafts = rows
    .filter((row) => row.status !== "Published" && (!published || Number(row.version) > Number(published.version)))
    .sort(byNewest);
  const [publishedDocument, ...draftDocuments] = await Promise.all(
    [published, ...drafts.slice(0, MAX_DRAFTS_COMPARED)].map((row) =>
      row ? versionDocument(contentKey, locale, row) : null
    )
  );
  const publishedChanges = published ? changedFields(original.document, publishedDocument) : null;
  const draftChanges = draftDocuments.map((document) => changedFields(original.document, document));
  // What an editor would publish next: the newest draft, else what is live.
  const next = drafts[0] ?? published;
  const nextChanges = drafts[0] ? draftChanges[0] : (publishedChanges ?? []);
  const nextDocument = drafts[0] ? draftDocuments[0] : publishedDocument;

  const pagePath = original.row.path;
  const problems: string[] = [];
  const segment = pagePath?.split("/").filter(Boolean).pop() ?? "";
  for (const row of [published, ...drafts].filter((entry): entry is VersionRow => Boolean(entry))) {
    if (row.path === pagePath) continue;
    problems.push(
      `Version ${row.version} (${row.status}) has the URL ${row.path}, not the page's ${pagePath}. ` +
        "Visitors in this group would get the original page while the test counts them in the variation. " +
        `Set that version's URL segment ("Name in URL") to "${segment}".`
    );
  }
  if (drafts.length > 1) {
    const withChanges = drafts.find((_, index) => (draftChanges[index]?.length ?? 0) > 0);
    problems.push(
      `It has ${drafts.length} unpublished versions (${drafts.map((row) => row.version).join(", ")}). Only one goes live. ` +
        (withChanges ? `Version ${withChanges.version} holds the changes; ` : "") +
        "publish that one and delete the others, or an empty one may be published by mistake."
    );
  }
  if (published && (publishedChanges?.length ?? 0) === 0) {
    problems.push(
      `The published version (${published.version}) is identical to the original page, so a test of it measures nothing.` +
        (drafts.length > 0 ? " The changes are in a draft that is not published." : "")
    );
  }
  if (!published && nextChanges.length === 0) problems.push("It has no changes against the original page yet.");
  if (!published) {
    problems.push("It is not published. The Feature Experimentation panel cannot start a test with it until it is.");
  }

  return {
    name,
    status: published ? "Published" : (drafts[0]?.status ?? "Draft"),
    publishedVersion: published?.version ?? null,
    drafts: drafts.map((row, index) => ({
      version: row.version,
      status: row.status,
      lastModified: row.lastModified,
      lastModifiedBy: row.lastModifiedBy,
      changes: draftChanges[index]?.length ?? 0,
    })),
    lastChanged: published?.lastModified ?? null,
    url: next?.path ?? null,
    sameUrlAsPage: next?.path === pagePath,
    changedFields: nextChanges,
    copyChanges: next ? copyDiff(original.document, nextDocument) : { removed: [], added: [] },
    servedBy: rules
      .filter((rule) => rule.variations.some((variation) => variation.key === name))
      .map((rule) => `${rule.name} (${rule.status.replace("_", " ")})`),
    problems,
  };
}

// wait: nothing to write now. revise_variation: change a variation that is in a
// running test and is not winning; the test and its rule stay as they are, and the new
// wording goes live when an editor publishes the draft. write_new_variation: no test is
// in progress, so the next one needs a variation of its own.
type PageAction = "wait" | "revise_variation" | "write_new_variation";

interface Decision {
  action: PageAction;
  reason: string;
  /** Set for revise_variation: the variation, and the published version to base the draft on. */
  variationToRevise?: { name: string; basedOnVersion: string };
}

interface DescribedRule extends Omit<CmsRule, "variations" | "resultsId"> {
  variations: string[];
  results: ResultsSummary | null;
}

function daysSince(timestamp: string | null): number | null {
  const then = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(then) ? Math.floor((Date.now() - then) / 86_400_000) : null;
}

function decideAction(
  variations: VariationState[],
  experiments: DescribedRule[],
  complete: boolean,
  reviseAfterDays: number
): Decision {
  const wait = (reason: string): Decision => ({ action: "wait", reason });
  // A wx_ variation belongs to Web Experimentation and is never written here.
  const own = variations.filter((variation) => !isWxVariation(variation.name));

  // Never a draft on top of a draft: an editor has not seen the last one yet.
  const drafted = own.find((variation) => variation.drafts.length > 0 || !variation.publishedVersion);
  if (drafted) {
    return wait(
      `"${drafted.name}" has an unpublished draft (version ${drafted.drafts[0]?.version ?? "unknown"}) waiting for an editor to review and publish.` +
        (drafted.problems.length > 0 ? " It has problems to fix first: see its `problems`." : "")
    );
  }

  const unserved = own.filter((variation) => variation.servedBy.length === 0);
  if (unserved.length > 0) {
    return wait(
      `${unserved.map((variation) => `"${variation.name}"`).join(", ")} ${unserved.length === 1 ? "is" : "are"} published but not in a test. ` +
        "An editor adds it to a test in the Feature Experimentation panel on this page." +
        (complete ? "" : " (Ended tests could not be read, so a variation of an ended test also shows here.)")
    );
  }

  for (const test of experiments.filter((entry) => entry.status !== "paused")) {
    if (test.status === "not_started") return wait(`"${test.name}" is set up but has not been started.`);
    const results = test.results;
    if (!results) return wait(`"${test.name}" is running and its results could not be read.`);
    if (results.conclusion === "running" || results.conclusion === "no_results") {
      return wait(`"${test.name}" is not settled yet. ${results.summary} Give it more time.`);
    }
    if (results.conclusion === "winner") {
      return wait(
        `${results.summary} An editor ships "${results.winner}" from the Feature Experimentation panel (End experiment). Nothing to write until then.`
      );
    }

    // Flat, or the original wins: the variation is not earning its place. The one
    // doing worst is revised, if it is one of this page's own.
    const trailing = (results.primary?.arms ?? [])
      .filter((arm) => !arm.isOriginal && own.some((variation) => variation.name === arm.key))
      .sort((a, b) => Number(b.comparedToOriginal === "worse") - Number(a.comparedToOriginal === "worse"))[0];
    const variation = own.find((entry) => entry.name === trailing?.key);
    if (!variation?.publishedVersion) continue;
    const age = daysSince(variation.lastChanged);
    if (age !== null && age < reviseAfterDays) {
      return wait(
        `"${variation.name}" was last changed ${age} day(s) ago. Give that version ${reviseAfterDays} days before changing it again.`
      );
    }
    return {
      action: "revise_variation",
      variationToRevise: { name: variation.name, basedOnVersion: variation.publishedVersion },
      reason:
        `${results.summary} Revise "${variation.name}": keep its idea and say it better, or try a clearly different angle. ` +
        `The test "${test.name}" keeps running and nothing changes in Feature Experimentation; the new wording goes live when an editor publishes the draft. ` +
        "Its numbers cover every visitor since the test started, including those who saw the earlier wording.",
    };
  }

  const ended = experiments
    .filter((test) => test.status === "paused")
    .sort((a, b) => (b.updatedTime ?? "").localeCompare(a.updatedTime ?? ""))[0];
  return {
    action: "write_new_variation",
    reason:
      (ended
        ? `The last test here, "${ended.name}", has ended. ${ended.results?.summary ?? "Its results could not be read."} Build on what won and do not repeat what lost. `
        : "No test has run on this page. ") +
      "Write a new variation. An editor publishes it and starts the test from the Feature Experimentation panel on this page.",
  };
}

export interface BriefOptions {
  /**
   * Days a test runs without a significant result before its variation is revised,
   * and days a revised variation is left alone before it is revised again.
   */
  reviseAfterDays: number;
}

// Everything that decides whether and what to test next on one page.
export async function getExperimentBrief(ref: PageRef, options: BriefOptions) {
  const locale = ref.locale ?? "en";
  const rows = await listVersions(ref.contentKey, locale);
  const originalRow = rows.find((row) => !row.variation && row.status === "Published");
  if (!originalRow) {
    return {
      error:
        rows.length === 0
          ? `No page with key ${ref.contentKey} in locale '${locale}'.`
          : `The page with key ${ref.contentKey} ('${locale}') has no published version. A variation is tested against the published page, so publish it first.`,
    };
  }
  if (!originalRow.types.includes(PAGE_TYPE)) {
    return { error: `'${originalRow.name}' (${originalRow.types[0] ?? "unknown type"}) is not a page. Only pages have variations.` };
  }
  if ((await keysMissingFromCms([ref.contentKey]))?.has(ref.contentKey)) {
    return { error: `'${originalRow.name}' is still in the search index but is not a page in the CMS, so it cannot have variations.` };
  }

  const paths = originalRow.path ? visitorPaths(originalRow.path) : [];
  const [originalDocument, loaded] = await Promise.all([
    versionDocument(ref.contentKey, locale, originalRow),
    loadRules((route) => paths.some((path) => routeMatches(path, route))),
  ]);
  const original = { row: originalRow, document: originalDocument };

  const names = [...new Set(rows.map((row) => row.variation).filter((name): name is string => Boolean(name)))].sort();
  const [variations, results] = await Promise.all([
    Promise.all(
      names.map((name) =>
        describeVariation(ref.contentKey, locale, name, rows.filter((row) => row.variation === name), original, loaded.rules)
      )
    ),
    Promise.all(loaded.rules.map((rule) => readResults(rule, options.reviseAfterDays))),
  ]);

  const described: DescribedRule[] = loaded.rules.map((rule, index) => ({
    flagKey: rule.flagKey,
    ruleKey: rule.ruleKey,
    name: rule.name,
    kind: rule.kind,
    status: rule.status,
    route: rule.route,
    variations: rule.variations.map((variation) => variation.key),
    audiences: rule.audiences,
    daysRunning: rule.daysRunning,
    updatedTime: rule.updatedTime,
    resultsUrl: rule.resultsUrl,
    results: results[index],
  }));
  const tests = described.filter((rule) => rule.kind === "experiment");
  const pendingOriginal = rows.filter((row) => !row.variation && row.status !== "Published").sort(byNewest)[0];
  const text = visibleText(originalDocument);
  const taken = [...new Set([...names, ...loaded.rules.flatMap((rule) => rule.variations.map((v) => v.key))])].sort();

  return {
    page: {
      contentKey: ref.contentKey,
      locale,
      name: originalRow.name,
      contentType: originalRow.types[0] ?? "",
      // An experience keeps its copy in the Visual Builder layout, not in properties.
      isExperience: originalRow.types.includes(EXPERIENCE_TYPE),
      url: originalRow.path ? `${originalRow.base ?? ""}${originalRow.path}` : null,
      publishedVersion: originalRow.version,
      pendingDraftOfOriginal: pendingOriginal?.version ?? null,
    },
    ...decideAction(variations, tests, loaded.complete, options.reviseAfterDays),
    ...(loaded.notes.length > 0 ? { notes: loaded.notes } : {}),
    tests,
    // Deliveries serve one variation to an audience and measure nothing.
    personalization: described
      .filter((rule) => rule.kind === "delivery")
      .map((rule) => ({ name: rule.name, status: rule.status, audiences: rule.audiences, serves: rule.variations })),
    variations,
    naming: { rules: NAME_RULES, taken },
    originalText: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}...` : text,
  };
}

export interface ListOptions extends BriefOptions {
  maxPages: number;
}

// Every test on a CMS page of this site, and the pages where a variation should be
// revised or written now.
export async function listExperiments(options: ListOptions) {
  const loaded = await loadRules(() => true);
  const routes = [...new Set(loaded.rules.filter((rule) => rule.kind === "experiment").map((rule) => rule.route))];

  const refs = new Map<string, PageRef>();
  const unresolved: string[] = [];
  for (const route of routes) {
    // "/help, /en/help" names one page twice; "/products/*" and "" name no single page.
    const entry = route.split(",").map((part) => part.trim()).find((part) => part && !part.endsWith("*"));
    const ref = entry ? await resolvePage(entry) : null;
    if (ref) refs.set(`${ref.contentKey}:${ref.locale ?? "en"}`, ref);
    else unresolved.push(route || "(every page)");
  }

  const briefs = await Promise.all(
    [...refs.values()].slice(0, options.maxPages).map((ref) => getExperimentBrief(ref, options))
  );
  const pages = briefs.filter((brief): brief is Exclude<typeof brief, { error: string }> => !("error" in brief));

  return {
    ...(loaded.notes.length > 0 ? { notes: loaded.notes } : {}),
    ...(unresolved.length > 0 ? { routesWithoutOnePage: unresolved } : {}),
    tests: pages.flatMap((brief) =>
      brief.tests.map((test) => ({
          page: brief.page.name,
          contentKey: brief.page.contentKey,
          locale: brief.page.locale,
          url: brief.page.url,
          test: test.name,
          status: test.status,
          daysRunning: test.daysRunning,
          audiences: test.audiences,
          primaryMetric: test.results?.primary?.metric ?? null,
          conclusion: test.results?.conclusion ?? "no_results",
          winner: test.results?.winner ?? null,
          summary: test.results?.summary ?? "Results could not be read.",
          resultsUrl: test.resultsUrl,
        }))
    ),
    pagesWithProblems: pages
      .filter((brief) => brief.variations.some((variation) => variation.problems.length > 0))
      .map((brief) => ({
        page: brief.page.name,
        contentKey: brief.page.contentKey,
        problems: brief.variations.flatMap((variation) => variation.problems.map((problem) => `${variation.name}: ${problem}`)),
      })),
    pagesToContinue: pages
      .filter((brief) => brief.action !== "wait")
      .map((brief) => ({
        contentKey: brief.page.contentKey,
        locale: brief.page.locale,
        name: brief.page.name,
        action: brief.action,
        variation: brief.variationToRevise?.name ?? null,
        reason: brief.reason,
      })),
  };
}
