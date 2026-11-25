import "server-only";
import { buildExternalPreviewQuery } from "@/lib/preview/shareLink";
import { getSiteUrl } from "@/lib/siteUrl";
import { missingFields } from "./audit";
import { markWorkflowConfig, type MarkWorkflowConfig, type MarkWorkflowTarget } from "./config";
import { getPageVersions, isThisSite, pendingDraftFor, type PageVersion } from "./pages";

// Starts Mark (Agent Platform) workflows from the Graph webhook this site already
// receives. Graph sends one doc.updated event per indexed document, and the docId
// alone says what happened:
//   {guid}_{locale}_Published              the live version of a page
//   {guid}_{version}_{locale}_{Status}     any other version (Draft, InReview, ...)
// with `_{variationKey}` appended for a variation. A Mark run costs credits, so
// every guard below exists to keep an event from starting one by accident.

export interface TriggerOutcome {
  action: "sent" | "skipped" | "failed";
  workflow?: "publish" | "translate" | "review";
  reason?: string;
}

interface ParsedDocId {
  contentKey: string;
  version?: string;
  locale: string;
  status: string;
  variation: boolean;
}

// Per server instance, so best effort on serverless. The freshness and
// pending-draft guards are the ones that hold across instances.
const recent = new Map<string, number>();

export function parseDocId(docId: string): ParsedDocId | null {
  const parts = docId.split("_");
  if (parts.length < 3) return null;
  const contentKey = parts[0].replace(/-/g, "").toLowerCase();
  // A locale is never all digits, so a numeric second part is a version.
  if (/^\d+$/.test(parts[1])) {
    if (parts.length < 4) return null;
    return { contentKey, version: parts[1], locale: parts[2], status: parts[3], variation: parts.length > 4 };
  }
  return { contentKey, locale: parts[1], status: parts[2], variation: parts.length > 3 };
}

function docIdOf(event: unknown): string | null {
  const body = event as { type?: { subject?: string; action?: string }; data?: { docId?: unknown } } | null;
  if (body?.type?.subject !== "doc" || body.type.action !== "updated") return null;
  return typeof body.data?.docId === "string" ? body.data.docId : null;
}

function alreadyHandled(key: string, windowMs: number): boolean {
  const now = Date.now();
  for (const [entry, at] of recent) {
    if (now - at > 3_600_000) recent.delete(entry);
  }
  const last = recent.get(key);
  if (last !== undefined && now - last < windowMs) return true;
  recent.set(key, now);
  return false;
}

// Seed scripts, extensions and other API clients save under a client id; a
// person saves under their Opti ID sign-in, which is an email address.
function isPerson(user: string | null): user is string {
  return Boolean(user?.includes("@"));
}

// Blocks, media and another site's pages reach this webhook too. They are not
// worth a log line each.
function isOwnPage(page: PageVersion): boolean {
  return page.isPage && isThisSite(page.siteBase);
}

function skipReason({ facts }: PageVersion, config: MarkWorkflowConfig): string | null {
  const age = Date.now() - Date.parse(facts.lastModified ?? "");
  if (!(age <= config.freshMinutes * 60_000)) {
    return `last changed ${facts.lastModified}, so this is Graph re-indexing it, not a new ${facts.status === "Published" ? "publish" : "submission"}`;
  }
  if (!isPerson(facts.lastModifiedBy)) return `saved by API client ${facts.lastModifiedBy}`;
  if (config.triggerUsers.length > 0 && !config.triggerUsers.includes(facts.lastModifiedBy.toLowerCase())) {
    return `'${facts.lastModifiedBy}' is not in MARK_TRIGGER_USERS`;
  }
  return null;
}

async function send(target: MarkWorkflowTarget, payload: Record<string, unknown>): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(target.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", [target.authHeaderName]: target.authHeaderValue },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return null;
      // A 4xx is our mistake (wrong key, deleted trigger) and will not get better.
      if (response.status < 500 || attempt === 2) return `HTTP ${response.status}`;
    } catch (error) {
      if (attempt === 2) return error instanceof Error ? error.message : String(error);
    }
  }
  return "no response";
}

function basePayload(event: string, docId: string, { facts }: PageVersion) {
  return {
    event,
    contentKey: facts.contentKey,
    version: facts.version,
    locale: facts.locale,
    name: facts.name,
    contentType: facts.contentType,
    url: facts.url,
    triggeredBy: facts.lastModifiedBy,
    docId,
  };
}

async function onPublish(
  docId: string,
  published: PageVersion,
  versions: PageVersion[],
  config: MarkWorkflowConfig
): Promise<TriggerOutcome> {
  const workflow = "publish" as const;
  if (!config.onPublish) return { action: "skipped" };

  const skip = skipReason(published, config);
  if (skip) return { action: "skipped", workflow, reason: skip };

  // Also the loop breaker: once an editor publishes Mark's draft the page is complete.
  const missing = missingFields(published.facts);
  if (missing.length === 0) return { action: "skipped", workflow, reason: "the page already has categories and metadata" };

  // Saving a draft makes Graph re-send the Published document, and Mark's own
  // draft is such a save. Without this check that event would start a second run.
  const draft = pendingDraftFor(published, versions);
  if (draft) return { action: "skipped", workflow, reason: `version ${draft.version} (${draft.status}) is already newer` };

  const { contentKey, locale, version } = published.facts;
  if (alreadyHandled(`publish:${contentKey}:${locale}:${version}`, 3_600_000)) {
    return { action: "skipped", workflow, reason: `version ${version} already started a run` };
  }
  if (alreadyHandled(`publish:${contentKey}:${locale}`, config.debounceMinutes * 60_000)) {
    return { action: "skipped", workflow, reason: `published again within ${config.debounceMinutes} minutes` };
  }

  const failure = await send(config.onPublish, { ...basePayload("published", docId, published), missing });
  return failure ? { action: "failed", workflow, reason: failure } : { action: "sent", workflow };
}

// A first translation only: a locale the page already has a version in, even a
// draft, is left to its editor. That is also the loop breaker, because Mark's
// draft in the target locale is such a version.
async function onTranslate(
  docId: string,
  published: PageVersion,
  versions: PageVersion[],
  config: MarkWorkflowConfig
): Promise<TriggerOutcome> {
  const workflow = "translate" as const;
  if (!config.onTranslate || published.facts.locale !== config.translateSourceLocale) return { action: "skipped" };

  const skip = skipReason(published, config);
  if (skip) return { action: "skipped", workflow, reason: skip };

  const existing = new Set(versions.map((version) => version.facts.locale));
  const targetLocales = config.translateLocales.filter((locale) => !existing.has(locale));
  if (targetLocales.length === 0) {
    return { action: "skipped", workflow, reason: `the page already has a version in ${config.translateLocales.join(", ")}` };
  }

  // Tagging goes first, so that the translation carries the categories and
  // metadata. The publish of Mark's tagged draft is what starts this run.
  if (config.onPublish && missingFields(published.facts).length > 0) {
    return { action: "skipped", workflow, reason: "waiting for categories and metadata: the tagging run comes first" };
  }

  const { contentKey, locale, version } = published.facts;
  if (alreadyHandled(`translate:${contentKey}:${locale}:${version}`, 3_600_000)) {
    return { action: "skipped", workflow, reason: `version ${version} already started a run` };
  }

  const failure = await send(config.onTranslate, { ...basePayload("published", docId, published), targetLocales });
  return failure ? { action: "failed", workflow, reason: failure } : { action: "sent", workflow };
}

// One Graph lookup serves both publish workflows: every locale's versions of the
// item, which the translate guard needs and the tagging guard narrows down.
async function onPublished(docId: string, parsed: ParsedDocId, config: MarkWorkflowConfig): Promise<TriggerOutcome[]> {
  if (!config.onPublish && !config.onTranslate) return [];

  const versions = await getPageVersions(parsed.contentKey);
  const inLocale = versions.filter((version) => version.facts.locale === parsed.locale);
  const published = inLocale.find((version) => version.facts.status === "Published");
  if (!published || !isOwnPage(published)) return [];

  return Promise.all([
    onPublish(docId, published, inLocale, config),
    onTranslate(docId, published, versions, config),
  ]);
}

async function onReview(docId: string, parsed: ParsedDocId, config: MarkWorkflowConfig): Promise<TriggerOutcome> {
  const workflow = "review" as const;
  if (!config.onReview) return { action: "skipped" };

  const versions = await getPageVersions(parsed.contentKey, parsed.locale);
  const submitted = versions.find(
    (version) => version.facts.version === parsed.version && version.facts.status === parsed.status
  );
  if (!submitted || !isOwnPage(submitted)) return { action: "skipped" };

  const skip = skipReason(submitted, config);
  if (skip) return { action: "skipped", workflow, reason: skip };

  // A resubmission changes lastModified, so it gets its own run. Reviews are not
  // debounced by time: each submission is one deliberate act by an editor.
  const { contentKey, locale, version, lastModified, status } = submitted.facts;
  if (alreadyHandled(`review:${contentKey}:${version}:${lastModified}`, 3_600_000)) {
    return { action: "skipped", workflow, reason: "this submission already started a run" };
  }

  const preview = buildExternalPreviewQuery({ key: contentKey, loc: locale, ver: version });
  const failure = await send(config.onReview, {
    ...basePayload("submittedForReview", docId, submitted),
    status,
    previewUrl: preview ? `${getSiteUrl()}/preview/share${preview}` : null,
  });
  return failure ? { action: "failed", workflow, reason: failure } : { action: "sent", workflow };
}

function log(docId: string, outcome: TriggerOutcome): void {
  // console.error is the one console method the production build keeps. The CMS
  // autosaves, and each save re-sends the Published document, so the same skip
  // would otherwise be logged every few seconds while someone edits a page.
  if (outcome.action === "sent") {
    console.error(`[mark] started on-${outcome.workflow} for ${docId}`);
  } else if (outcome.reason && !alreadyHandled(`log:${docId}:${outcome.workflow}:${outcome.reason}`, 600_000)) {
    console.error(`[mark] ${outcome.action} ${outcome.workflow ?? "event"} ${docId}: ${outcome.reason}`);
  }
}

export async function forwardGraphEventToMark(event: unknown): Promise<TriggerOutcome[]> {
  const config = markWorkflowConfig();
  if (!config.enabled) return [];

  const docId = docIdOf(event);
  const parsed = docId ? parseDocId(docId) : null;
  // A variation is never tagged, translated or reviewed on its own: Mark's draft
  // goes on the base version, and the API cannot write a variation safely.
  if (!docId || !parsed || parsed.variation) return [];

  let outcomes: TriggerOutcome[];
  try {
    if (parsed.status === "Published") outcomes = await onPublished(docId, parsed, config);
    else if (parsed.version && config.reviewStatuses.includes(parsed.status)) outcomes = [await onReview(docId, parsed, config)];
    else return [];
  } catch (error) {
    outcomes = [{ action: "failed", reason: error instanceof Error ? error.message : String(error) }];
  }

  for (const outcome of outcomes) log(docId, outcome);
  return outcomes;
}
