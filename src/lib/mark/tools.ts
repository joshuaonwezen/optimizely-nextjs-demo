import "server-only";
import { getCmsUrl } from "@/lib/optimizely/cmsUrl";
import { auditPage, auditSite, missingFields } from "./audit";
import { categoryLabels, listAssignableCategories } from "./categories";
import { getExperimentBrief, listExperiments } from "./experiments";
import { listPublishedPages, loadPage, resolvePage, type PageRef } from "./pages";
import { getReviewContext } from "./review";
import { getTranslationPlan } from "./translation";

interface ToolParameter {
  name: string;
  type: "string" | "integer";
  description: string;
  required: boolean;
}

interface MarkTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  run(parameters: Record<string, unknown>): Promise<unknown>;
}

const DEFAULT_STALE_DAYS = 180;
const DEFAULT_REVISE_DAYS = 7;
const MAX_TEXT = 8_000;
const MAX_LISTED = 25;

const PAGE: ToolParameter = {
  name: "page",
  type: "string",
  required: true,
  description:
    "The page: its content key (32 hex characters, `contentKey` in a workflow payload) or its address, e.g. /mortgages/remortgaging or a full URL.",
};

const LOCALE: ToolParameter = {
  name: "locale",
  type: "string",
  required: false,
  description: "Locale of the version to read, e.g. en or nl. Defaults to en.",
};

const STALE_AFTER_DAYS: ToolParameter = {
  name: "stale_after_days",
  type: "integer",
  required: false,
  description: `Days without a change before a page counts as stale. Defaults to ${DEFAULT_STALE_DAYS}.`,
};

const REVISE_AFTER_DAYS: ToolParameter = {
  name: "revise_after_days",
  type: "integer",
  required: false,
  description:
    "Days a test may run without a significant result before its variation should be revised, and days a " +
    `revised variation is left alone before it is revised again. Defaults to ${DEFAULT_REVISE_DAYS}.`,
};

// Mark fills parameters from model output, so a number can arrive as "180".
function text(parameters: Record<string, unknown>, name: string): string | undefined {
  const value = parameters[name];
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function integer(parameters: Record<string, unknown>, name: string, fallback: number): number {
  const value = Number(parameters[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function clip(value: string): string {
  return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT)}...` : value;
}

async function refFor(
  parameters: Record<string, unknown>,
  localeParameter = "locale"
): Promise<PageRef | { error: string }> {
  const page = text(parameters, "page");
  if (!page) return { error: "The 'page' parameter is required: a content key or a page address." };
  const ref = await resolvePage(page, text(parameters, localeParameter));
  return ref ?? { error: `No published page found at '${page}'. Pass the content key instead.` };
}

async function pageFor(parameters: Record<string, unknown>) {
  const ref = await refFor(parameters);
  return "error" in ref ? ref : loadPage(ref, text(parameters, "version"));
}

export const MARK_TOOLS: MarkTool[] = [
  {
    name: "mosey_get_page_profile",
    description:
      "Reads one Mosey Bank page so it can be tagged or given metadata: name, type, public URL, " +
      "its categories, meta title and meta description (null when empty), the page's visible copy, " +
      "and `missing`, the fields that still need a value (categories, metaTitle, metaDescription). " +
      "Read-only. Reads the published version unless a version is given.",
    parameters: [
      PAGE,
      LOCALE,
      {
        name: "version",
        type: "string",
        required: false,
        description: "A version number, to read a draft instead of the published version.",
      },
    ],
    async run(parameters) {
      const loaded = await pageFor(parameters);
      if ("error" in loaded) return loaded;
      const { facts } = loaded;
      return {
        ...facts,
        categoryLabels: await categoryLabels(facts.categories),
        missing: missingFields(facts),
        cmsUrl: `${getCmsUrl()}/ui/cms`,
        text: clip(loaded.text),
      };
    },
  },
  {
    name: "mosey_list_categories",
    description:
      "Lists every category that may be assigned to a Mosey Bank page, each with its path in the " +
      "taxonomy (e.g. 'Product > Borrowing > Mortgages > Remortgaging') and the `uri` to store. " +
      "Grouping terms and internal editorial categories are already left out. To tag a page, set " +
      "its built-in `categories` property to a list of these uri values. Read-only.",
    parameters: [],
    async run() {
      const { categories, selectability } = await listAssignableCategories();
      return {
        property: "categories",
        tagging: "Use the most specific category that fits. Never add its parents as well.",
        ...(selectability === "assumed"
          ? { note: "Could not confirm with the CMS which categories are selectable; the CMS rejects a grouping category on save." }
          : {}),
        categories,
      };
    },
  },
  {
    name: "mosey_audit_page",
    description:
      "Audits one Mosey Bank page against the site's content rules: meta title and description " +
      "(present, sensible length), categories, thin copy, images without alt text, freshness, an " +
      "expiry date and a pending draft. Returns a 0-100 score, the findings with a severity each, " +
      "and the page's visible copy so tone and accuracy can be judged. Read-only.",
    parameters: [PAGE, LOCALE, STALE_AFTER_DAYS],
    async run(parameters) {
      const loaded = await pageFor(parameters);
      if ("error" in loaded) return loaded;
      const { facts } = loaded;
      const audit = auditPage(facts, { staleAfterDays: integer(parameters, "stale_after_days", DEFAULT_STALE_DAYS) });
      return {
        contentKey: facts.contentKey,
        locale: facts.locale,
        version: facts.version,
        name: facts.name,
        contentType: facts.contentType,
        url: facts.url,
        lastModified: facts.lastModified,
        locales: facts.locales,
        metaTitle: facts.metaTitle,
        metaDescription: facts.metaDescription,
        categoryLabels: await categoryLabels(facts.categories),
        wordCount: facts.wordCount,
        ...audit,
        missing: missingFields(facts),
        text: clip(loaded.text),
      };
    },
  },
  {
    name: "mosey_audit_site",
    description:
      "Audits every published page of the Mosey Bank site in one call, with the same rules as " +
      "mosey_audit_page. Returns the number of pages audited, the average score, the checks failing " +
      "on most pages, the lowest-scoring pages with their findings, and the pages still missing " +
      "categories or metadata. Use it instead of auditing pages one at a time. Read-only.",
    parameters: [
      STALE_AFTER_DAYS,
      {
        name: "worst_pages",
        type: "integer",
        required: false,
        description: "How many of the lowest-scoring pages to return. Defaults to 10.",
      },
    ],
    async run(parameters) {
      const { pages, siteBase, notInCms } = await listPublishedPages();
      const result = auditSite(pages, {
        staleAfterDays: integer(parameters, "stale_after_days", DEFAULT_STALE_DAYS),
        worstPages: Math.min(integer(parameters, "worst_pages", 10), 50),
      });
      return {
        site: siteBase ?? "every site in this CMS",
        ...(notInCms === null
          ? { note: "Could not check each page against the CMS. Blueprints and pages deleted from the CMS may be listed; they cannot be edited." }
          : notInCms > 0
            ? { leftOut: `${notInCms} page(s) in the search index are not pages in the CMS (deleted items and blueprints).` }
            : {}),
        ...result,
        pagesMissingCategoriesCount: result.pagesMissingCategories.length,
        pagesMissingCategories: result.pagesMissingCategories.slice(0, MAX_LISTED),
        pagesMissingMetadataCount: result.pagesMissingMetadata.length,
        pagesMissingMetadata: result.pagesMissingMetadata.slice(0, MAX_LISTED),
      };
    },
  },
  {
    name: "mosey_get_review_context",
    description:
      "Reads the version of a Mosey Bank page that an editor submitted for review: who submitted " +
      "it and when, its meta title, meta description and categories, its full visible copy, and " +
      "`changes`, each field that differs from the published page with the text before and after. " +
      "Also returns a preview link to that exact version. Read-only.",
    parameters: [
      PAGE,
      {
        name: "version",
        type: "string",
        required: false,
        description: "The submitted version number (`version` in a workflow payload). Defaults to the newest version waiting for review.",
      },
      LOCALE,
    ],
    async run(parameters) {
      const ref = await refFor(parameters);
      return "error" in ref ? ref : getReviewContext(ref, text(parameters, "version"));
    },
  },
  {
    name: "mosey_get_translation_plan",
    description:
      "Lists everything that must be translated for one Mosey Bank page to show in full in another " +
      "language: the page itself, and every shared block it uses (in a content area, in the Visual " +
      "Builder composition, referenced from a property, or nested inside another block). A shared " +
      "block is a content item with language versions of its own, and one with no version in the " +
      "target language is missing from the page in that language. Each entry has its content key, " +
      "name, type, where it is used, `targetVersion` (what the target language already has, or null) " +
      "and `translate` (true when it needs a first translation). Also returns the page's categories " +
      "and the pages it references that have no published version in the target language. Read-only.",
    parameters: [
      PAGE,
      {
        name: "target_locale",
        type: "string",
        required: true,
        description: "The language to translate into, e.g. nl.",
      },
      {
        name: "source_locale",
        type: "string",
        required: false,
        description: "The language to translate from. Defaults to en.",
      },
    ],
    async run(parameters) {
      const target = text(parameters, "target_locale");
      if (!target) return { error: "The 'target_locale' parameter is required, e.g. nl." };
      const ref = await refFor(parameters, "source_locale");
      return "error" in ref ? ref : getTranslationPlan(ref, target);
    },
  },
  {
    name: "mosey_get_experiment_brief",
    description:
      "Reads the Feature Experimentation results of one Mosey Bank page and says what to write next. " +
      "Returns `action`: wait (nothing to write now), revise_variation (a variation in a running test " +
      "is not winning: change it, `variationToRevise` names it and the version to base the draft on) " +
      "or write_new_variation (no test is in progress); `reason`, why; `tests`, every test that " +
      "serves this page with its status, audiences and results (visitors, conversion rate, lift and " +
      "significance per variation, and a conclusion); `personalization`, the rules that serve a " +
      "variation to an audience without measuring; `variations`, each CMS variation of the page with " +
      "its status, the fields and the lines of copy it changes against the original, what serves " +
      "it, and `problems` (a URL of its own, several drafts, no changes, not published); `naming`, " +
      "the rules for a variation name and the names already taken; and the original page's visible " +
      "copy. Read-only.",
    parameters: [PAGE, LOCALE, REVISE_AFTER_DAYS],
    async run(parameters) {
      const ref = await refFor(parameters);
      if ("error" in ref) return ref;
      return getExperimentBrief(ref, { reviseAfterDays: integer(parameters, "revise_after_days", DEFAULT_REVISE_DAYS) });
    },
  },
  {
    name: "mosey_list_experiments",
    description:
      "Lists every Feature Experimentation test that serves a CMS variation of a Mosey Bank page: the " +
      "page, the test's status, days running, audiences, primary metric, conclusion (running, winner, " +
      "original_wins, flat or no_results), a one-sentence summary, and for each variation in the test " +
      "the version that is live and how many versions have been. Also returns `pagesToContinue`, " +
      "the pages where a variation should be revised or a new one written now, each with its " +
      "`action`, and `pagesWithProblems`, variations that would not be served as they are. Use it " +
      "instead of reading pages one at a time. Read-only.",
    parameters: [
      REVISE_AFTER_DAYS,
      {
        name: "max_pages",
        type: "integer",
        required: false,
        description: "How many tested pages to read at most. Defaults to 10.",
      },
    ],
    async run(parameters) {
      return listExperiments({
        reviseAfterDays: integer(parameters, "revise_after_days", DEFAULT_REVISE_DAYS),
        maxPages: Math.min(integer(parameters, "max_pages", 10), 25),
      });
    },
  },
];

function slug(name: string): string {
  return name.replace(/_/g, "-");
}

export function findMarkTool(nameOrSlug: string): MarkTool | undefined {
  return MARK_TOOLS.find((tool) => tool.name === nameOrSlug || slug(tool.name) === nameOrSlug);
}

// The manifest Mark's Tool Registry reads. Endpoints are relative to the
// discovery URL's folder, the way the Opal Tools SDKs publish them.
export function markDiscoveryManifest() {
  return {
    functions: MARK_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      endpoint: `/tools/${slug(tool.name)}`,
      http_method: "POST",
    })),
  };
}
