import "server-only";
import { createHash, timingSafeEqual } from "crypto";

export interface MarkWorkflowTarget {
  url: string;
  authHeaderName: string;
  authHeaderValue: string;
}

function target(
  url: string | undefined,
  authHeaderValue: string | undefined,
  authHeaderName: string | undefined
): MarkWorkflowTarget | null {
  if (!url) return null;
  return {
    url,
    authHeaderName: authHeaderName || "Authorization",
    authHeaderValue: authHeaderValue ?? "",
  };
}

function minutes(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// The webhook URLs and header values are secrets: Mark runs a paid workflow for
// anyone who can POST to them. Read on every call so a test can swap them.
export function markWorkflowConfig() {
  const reviewStatuses = list(process.env.MARK_REVIEW_STATUSES);
  const translateLocales = list(process.env.MARK_TRANSLATE_LOCALES);
  return {
    enabled: process.env.MARK_WORKFLOWS_ENABLED !== "false",
    onPublish: target(
      process.env.MARK_ON_PUBLISH_URL,
      process.env.MARK_ON_PUBLISH_AUTH,
      process.env.MARK_ON_PUBLISH_AUTH_HEADER
    ),
    onReview: target(
      process.env.MARK_ON_REVIEW_URL,
      process.env.MARK_ON_REVIEW_AUTH,
      process.env.MARK_ON_REVIEW_AUTH_HEADER
    ),
    onTranslate: target(
      process.env.MARK_ON_TRANSLATE_URL,
      process.env.MARK_ON_TRANSLATE_AUTH,
      process.env.MARK_ON_TRANSLATE_AUTH_HEADER
    ),
    // A page is translated from its source locale into each of these it has no
    // version in yet. `en` is the primary locale on every instance.
    translateSourceLocale: process.env.MARK_TRANSLATE_SOURCE_LOCALE || "en",
    translateLocales: translateLocales.length > 0 ? translateLocales : ["nl"],
    // Graph's status names. "Ready" adds pages marked ready to publish on an
    // instance (or branch of the tree) that has no approval sequence.
    reviewStatuses: reviewStatuses.length > 0 ? reviewStatuses : ["InReview"],
    triggerUsers: list(process.env.MARK_TRIGGER_USERS).map((user) => user.toLowerCase()),
    debounceMinutes: minutes(process.env.MARK_DEBOUNCE_MINUTES, 2),
    freshMinutes: minutes(process.env.MARK_FRESH_MINUTES, 10),
  };
}

export type MarkWorkflowConfig = ReturnType<typeof markWorkflowConfig>;

export function markToolsConfigured(): boolean {
  return Boolean(process.env.MARK_TOOLS_BEARER);
}

// Constant-time check of the bearer token the Tool Registry entry sends. Fails
// closed when MARK_TOOLS_BEARER is unset: the tools return unpublished content.
export function isValidToolsBearer(authorization: string | null): boolean {
  const expected = process.env.MARK_TOOLS_BEARER;
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization.slice("Bearer ".length)), digest(expected));
}
