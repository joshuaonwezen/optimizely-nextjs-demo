// The rule checks behind the Mark audit tools. Deterministic and pure: one call
// scores every page, and the model is left to judge only what rules cannot
// (tone, accuracy, compliance).

export interface PendingDraft {
  version: string;
  status: string;
  lastModified: string | null;
  lastModifiedBy: string | null;
  hasCategories: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
}

export interface PageFacts {
  contentKey: string;
  version: string;
  locale: string;
  status: string;
  name: string;
  contentType: string;
  url: string | null;
  lastModified: string | null;
  lastModifiedBy: string | null;
  expires: string | null;
  locales: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  hasShareImage: boolean;
  /** Category term keys, without the cms://taxonomy/categories/ prefix. */
  categories: string[];
  wordCount: number;
  /** Counted from the full document, so only set when one page is loaded. */
  imagesWithoutAlt?: number;
  /** A newer unpublished version of this page in the same locale. */
  pendingDraft: PendingDraft | null;
}

export type Severity = "high" | "medium" | "low" | "info";

export interface Finding {
  check: string;
  severity: Severity;
  message: string;
}

export interface AuditOptions {
  staleAfterDays: number;
  now?: Date;
}

const PENALTY: Record<Severity, number> = { high: 20, medium: 10, low: 5, info: 0 };
const META_TITLE = { min: 30, max: 60 };
const META_DESCRIPTION = { min: 70, max: 160 };
const THIN_COPY_WORDS = 120;
const EXPIRES_SOON_DAYS = 30;
const DAY_MS = 86_400_000;

// What Mark's tagger can fill in. A page missing any of these is "incomplete",
// which is also the test the publish trigger uses.
export function missingFields(page: PageFacts): string[] {
  const missing: string[] = [];
  if (page.categories.length === 0) missing.push("categories");
  if (!page.metaTitle?.trim()) missing.push("metaTitle");
  if (!page.metaDescription?.trim()) missing.push("metaDescription");
  return missing;
}

// The same fields, minus what a pending draft already fills in. Stops the weekly
// audit from tagging a page again while its first draft still waits for an editor.
export function missingAfterDraft(page: PageFacts): string[] {
  const draft = page.pendingDraft;
  return missingFields(page).filter((field) => {
    if (!draft) return true;
    if (field === "categories") return !draft.hasCategories;
    if (field === "metaTitle") return !draft.hasMetaTitle;
    return !draft.hasMetaDescription;
  });
}

function lengthFinding(
  check: string,
  label: string,
  value: string | null,
  range: { min: number; max: number }
): Finding | null {
  const text = value?.trim() ?? "";
  if (!text) return { check, severity: "high", message: `No ${label}.` };
  if (text.length < range.min || text.length > range.max) {
    return {
      check,
      severity: "low",
      message: `The ${label} is ${text.length} characters; aim for ${range.min}-${range.max}.`,
    };
  }
  return null;
}

export function auditPage(page: PageFacts, options: AuditOptions): { score: number; findings: Finding[] } {
  const now = (options.now ?? new Date()).getTime();
  const findings: Finding[] = [];
  const add = (finding: Finding | null) => {
    if (finding) findings.push(finding);
  };

  add(lengthFinding("meta-title", "meta title", page.metaTitle, META_TITLE));
  add(lengthFinding("meta-description", "meta description", page.metaDescription, META_DESCRIPTION));

  if (page.categories.length === 0) {
    add({ check: "categories", severity: "medium", message: "No categories, so the page is missing from category-filtered lists." });
  }
  if (page.wordCount < THIN_COPY_WORDS) {
    add({ check: "thin-copy", severity: "medium", message: `Only about ${page.wordCount} ${page.wordCount === 1 ? "word" : "words"} of copy.` });
  }
  if (page.imagesWithoutAlt) {
    add({ check: "image-alt", severity: "medium", message: `${page.imagesWithoutAlt} image(s) have no alt text.` });
  }

  const expires = page.expires ? Date.parse(page.expires) : NaN;
  if (!Number.isNaN(expires) && expires - now < EXPIRES_SOON_DAYS * DAY_MS) {
    add({ check: "expiring", severity: "medium", message: `Stops being published on ${page.expires?.slice(0, 10)}.` });
  }

  const modified = page.lastModified ? Date.parse(page.lastModified) : NaN;
  if (!Number.isNaN(modified)) {
    const days = Math.floor((now - modified) / DAY_MS);
    if (days > options.staleAfterDays) {
      add({ check: "stale", severity: "low", message: `Last changed ${days} days ago.` });
    }
  }

  if (!page.hasShareImage) {
    add({ check: "share-image", severity: "info", message: "No social share image." });
  }
  if (page.pendingDraft) {
    const by = page.pendingDraft.lastModifiedBy ? ` by ${page.pendingDraft.lastModifiedBy}` : "";
    add({
      check: "pending-draft",
      severity: "info",
      message: `A newer ${page.pendingDraft.status.toLowerCase()} version (${page.pendingDraft.version}${by}) is waiting to be published.`,
    });
  }

  const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + PENALTY[finding.severity], 0));
  return { score, findings };
}

export interface SiteAuditRow {
  contentKey: string;
  locale: string;
  name: string;
  url: string | null;
}

export function auditSite(pages: PageFacts[], options: AuditOptions & { worstPages: number }) {
  const audited = pages.map((page) => ({ page, ...auditPage(page, options) }));
  const row = (page: PageFacts): SiteAuditRow => ({
    contentKey: page.contentKey,
    locale: page.locale,
    name: page.name,
    url: page.url,
  });

  const failing = new Map<string, number>();
  for (const { findings } of audited) {
    for (const finding of findings) {
      if (finding.severity === "info") continue;
      failing.set(finding.check, (failing.get(finding.check) ?? 0) + 1);
    }
  }

  const total = audited.reduce((sum, entry) => sum + entry.score, 0);
  return {
    pagesAudited: audited.length,
    averageScore: audited.length > 0 ? Math.round(total / audited.length) : 0,
    failingChecks: [...failing.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([check, pageCount]) => ({ check, pages: pageCount })),
    worstPages: [...audited]
      .sort((a, b) => a.score - b.score || a.page.name.localeCompare(b.page.name))
      .slice(0, options.worstPages)
      .map(({ page, score, findings }) => ({
        ...row(page),
        score,
        findings: findings.filter((finding) => finding.severity !== "info").map((finding) => finding.message),
      })),
    pagesMissingCategories: audited
      .filter(({ page }) => missingAfterDraft(page).includes("categories"))
      .map(({ page }) => row(page)),
    pagesMissingMetadata: audited
      .filter(({ page }) => missingAfterDraft(page).some((field) => field !== "categories"))
      .map(({ page }) => row(page)),
  };
}
