import "server-only";
import { getCmsUrl } from "@/lib/optimizely/cmsUrl";
import { auditPage, auditSite, missingFields } from "./audit";
import { categoryLabels, listAssignableCategories } from "./categories";
import { listPublishedPages, loadPage, resolvePage } from "./pages";
import { getReviewContext } from "./review";

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

async function pageFor(parameters: Record<string, unknown>) {
  const page = text(parameters, "page");
  if (!page) return { error: "The 'page' parameter is required: a content key or a page address." };
  const ref = await resolvePage(page, text(parameters, "locale"));
  if (!ref) return { error: `No published page found at '${page}'. Pass the content key instead.` };
  return loadPage(ref, text(parameters, "version"));
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
      const { pages, siteBase } = await listPublishedPages();
      const result = auditSite(pages, {
        staleAfterDays: integer(parameters, "stale_after_days", DEFAULT_STALE_DAYS),
        worstPages: Math.min(integer(parameters, "worst_pages", 10), 50),
      });
      return {
        site: siteBase ?? "every site in this CMS",
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
      const page = text(parameters, "page");
      if (!page) return { error: "The 'page' parameter is required: a content key or a page address." };
      const ref = await resolvePage(page, text(parameters, "locale"));
      if (!ref) return { error: `No published page found at '${page}'. Pass the content key instead.` };
      return getReviewContext(ref, text(parameters, "version"));
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
