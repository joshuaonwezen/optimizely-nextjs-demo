import "server-only";
import { getSiteUrl } from "@/lib/siteUrl";
import { keyFromTermUri } from "@/lib/taxonomy";
import type { PageFacts, PendingDraft } from "./audit";
import { keysMissingFromCms } from "./cms";
import { markGraph } from "./graph";
import { imagesWithoutAlt, stripHtml, visibleText, wordCount } from "./text";

// Every routable page type extends the SEO contract, so Graph's `SEO` type is
// "all pages" and `types` containing "SEO" is the page test for a single item.
const PAGE_TYPE = "SEO";
const UNPUBLISHED = ["Draft", "Ready", "InReview"];
const PAGE_SIZE = 100;
const MAX_PAGES = 2000;
const KEY_PATTERN = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

const PAGE_FIELDS = /* GraphQL */ `
  _metadata {
    key version locale status displayName types lastModified lastModifiedBy expired locales variation
    url { default base }
  }
  _itemMetadata { categories }
`;

const LIST_PAGES_QUERY = /* GraphQL */ `
  query MarkListPages($where: SEOWhereInput, $skip: Int) {
    SEO(where: $where, limit: ${PAGE_SIZE}, skip: $skip, orderBy: { _metadata: { key: ASC } }) {
      items {
        ${PAGE_FIELDS}
        _fulltext
        metaTitle
        metaDescription
        ogImage { key }
      }
    }
  }
`;

const PAGE_VERSIONS_QUERY = /* GraphQL */ `
  query MarkPageVersions($where: _ContentWhereInput) {
    _Content(where: $where, limit: 50, orderBy: { _metadata: { lastModified: DESC } }) {
      items {
        ${PAGE_FIELDS}
        ... on ISEO { metaTitle metaDescription ogImage { key } }
      }
    }
  }
`;

const PAGE_DOCUMENT_QUERY = /* GraphQL */ `
  query MarkPageDocument($where: _ContentWhereInput) {
    _Content(where: $where, limit: 1) {
      item { _json }
    }
  }
`;

const FIND_BY_URL_QUERY = /* GraphQL */ `
  query MarkFindPageByUrl($urls: [String!]) {
    _Content(where: { _metadata: { status: { eq: "Published" }, url: { default: { in: $urls } } } }, limit: 20) {
      items { _metadata { key locale types url { base } } }
    }
  }
`;

interface GraphPage {
  _metadata: {
    key: string;
    version: string;
    locale: string;
    status: string;
    displayName: string | null;
    types: string[] | null;
    lastModified: string | null;
    lastModifiedBy: string | null;
    expired: string | null;
    locales: string[] | null;
    variation: string | null;
    url: { default: string | null; base: string | null } | null;
  };
  _itemMetadata: { categories: string[] | null } | null;
  _fulltext?: string[] | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: { key: string | null } | null;
}

/** One version of one item in one locale, as Graph indexes it. */
export interface PageVersion {
  facts: PageFacts;
  isPage: boolean;
  variation: string | null;
  siteBase: string | null;
}

function hostOf(base: string | null | undefined): string | null {
  if (!base) return null;
  try {
    return new URL(base).host;
  } catch {
    return null;
  }
}

// One CMS can serve several sites (joshCMS does). A page with no base at all
// counts as this site's, as it does for ownSiteItems() in the catch-all.
export function isThisSite(base: string | null): boolean {
  return !base || hostOf(base) === new URL(getSiteUrl()).host;
}

function toVersion(item: GraphPage): PageVersion {
  const meta = item._metadata;
  const base = meta.url?.base ?? null;
  const path = meta.url?.default ?? null;
  return {
    facts: {
      contentKey: meta.key,
      version: meta.version,
      locale: meta.locale,
      status: meta.status,
      name: meta.displayName ?? "",
      contentType: meta.types?.[0] ?? "",
      url: path ? `${base ?? ""}${path}` : null,
      lastModified: meta.lastModified,
      lastModifiedBy: meta.lastModifiedBy,
      expires: meta.expired,
      locales: meta.locales ?? [],
      metaTitle: item.metaTitle ?? null,
      metaDescription: item.metaDescription ?? null,
      hasShareImage: Boolean(item.ogImage?.key),
      categories: (item._itemMetadata?.categories ?? [])
        .map((uri) => keyFromTermUri(uri))
        .filter((key): key is string => Boolean(key)),
      wordCount: wordCount(stripHtml((item._fulltext ?? []).join(" "))),
      pendingDraft: null,
    },
    isPage: Boolean(meta.types?.includes(PAGE_TYPE)),
    variation: meta.variation,
    siteBase: base,
  };
}

function toPendingDraft({ facts }: PageVersion): PendingDraft {
  return {
    version: facts.version,
    status: facts.status,
    lastModified: facts.lastModified,
    lastModifiedBy: facts.lastModifiedBy,
    hasCategories: facts.categories.length > 0,
    hasMetaTitle: Boolean(facts.metaTitle?.trim()),
    hasMetaDescription: Boolean(facts.metaDescription?.trim()),
  };
}

// Version numbers grow across the whole CMS, so "newer" is a plain comparison.
function isNewer(a: PageVersion, b: PageVersion): boolean {
  return Number(a.facts.version) > Number(b.facts.version);
}

function newest(versions: PageVersion[]): PageVersion | undefined {
  return versions.reduce<PageVersion | undefined>(
    (latest, version) => (!latest || isNewer(version, latest) ? version : latest),
    undefined
  );
}

// The newest unpublished version above `published`, in the shape the audit reads.
export function pendingDraftFor(published: PageVersion, versions: PageVersion[]): PendingDraft | null {
  const draft = newest(
    versions.filter(
      (version) =>
        version.facts.status !== "Published" &&
        version.facts.contentKey === published.facts.contentKey &&
        version.facts.locale === published.facts.locale
    )
  );
  return draft && isNewer(draft, published) ? toPendingDraft(draft) : null;
}

async function listByStatus(statuses: string[], base: string | null): Promise<PageVersion[]> {
  const where = {
    _metadata: {
      status: { in: statuses },
      ...(base ? { url: { base: { eq: base } } } : {}),
    },
  };
  const out: PageVersion[] = [];
  for (let skip = 0; skip < MAX_PAGES; skip += PAGE_SIZE) {
    const data = await markGraph<{ SEO: { items: GraphPage[] } }>(LIST_PAGES_QUERY, { where, skip });
    out.push(...data.SEO.items.map(toVersion));
    if (data.SEO.items.length < PAGE_SIZE) break;
  }
  return out;
}

export interface PublishedPages {
  pages: PageFacts[];
  siteBase: string | null;
  /** Rows Graph listed that the CMS does not have. Null: the CMS could not be asked. */
  notInCms: number | null;
}

// Every published page of this site, one row per locale, with its pending draft.
// Rows are limited to this site's `url.base`. A CMS whose pages carry another
// base (local development against a deployed instance) falls back to every page.
export async function listPublishedPages(): Promise<PublishedPages> {
  let siteBase: string | null = getSiteUrl();
  let listed = await listByStatus(["Published"], siteBase);
  if (listed.length === 0) {
    siteBase = null;
    listed = await listByStatus(["Published"], siteBase);
  }

  const gone = await keysMissingFromCms(listed.map((page) => page.facts.contentKey));
  const published = gone ? listed.filter((page) => !gone.has(page.facts.contentKey)) : listed;

  const drafts = await listByStatus(UNPUBLISHED, siteBase);
  const draftsByPage = new Map<string, PageVersion[]>();
  for (const draft of drafts) {
    const id = `${draft.facts.contentKey}:${draft.facts.locale}`;
    draftsByPage.set(id, [...(draftsByPage.get(id) ?? []), draft]);
  }

  const pages = published.map((page) => ({
    ...page.facts,
    pendingDraft: pendingDraftFor(page, draftsByPage.get(`${page.facts.contentKey}:${page.facts.locale}`) ?? []),
  }));
  return { pages, siteBase, notInCms: gone ? listed.length - published.length : null };
}

// Every base version of one item (optionally one locale) that is published or
// waiting to be: Published, Draft, Ready and InReview. Variations are left out.
export async function getPageVersions(contentKey: string, locale?: string): Promise<PageVersion[]> {
  const where = {
    _metadata: {
      key: { eq: contentKey },
      status: { in: ["Published", ...UNPUBLISHED] },
      ...(locale ? { locale: { eq: locale } } : {}),
    },
  };
  const data = await markGraph<{ _Content: { items: GraphPage[] } }>(PAGE_VERSIONS_QUERY, { where });
  return data._Content.items.map(toVersion).filter((version) => !version.variation);
}

// Also reads a shared block's document: only the version's identity is used.
export async function getPageDocument({
  facts,
}: {
  facts: Pick<PageFacts, "contentKey" | "version" | "locale" | "status">;
}): Promise<unknown> {
  const where = {
    _metadata: {
      key: { eq: facts.contentKey },
      version: { eq: facts.version },
      locale: { eq: facts.locale },
      status: { eq: facts.status },
    },
  };
  const data = await markGraph<{ _Content: { item: { _json: unknown } | null } }>(PAGE_DOCUMENT_QUERY, { where });
  return data._Content.item?._json ?? null;
}

export interface PageRef {
  contentKey: string;
  locale?: string;
}

// Tools take either a content key (what a webhook payload carries) or the
// page's address (what an editor pastes into chat).
export async function resolvePage(page: string, locale?: string): Promise<PageRef | null> {
  const value = page.trim();
  if (KEY_PATTERN.test(value)) return { contentKey: value.replace(/-/g, "").toLowerCase(), locale };

  let path: string;
  try {
    path = new URL(value, getSiteUrl()).pathname;
  } catch {
    return null;
  }
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  const clean = trimmed ? `/${trimmed}/` : "/";
  // The same page indexes as /en/x/ on one instance and /x/ on another.
  const urls = [...new Set([clean, `/en${clean}`, clean.replace(/^\/en\//, "/")])];
  const data = await markGraph<{ _Content: { items: GraphPage[] } }>(FIND_BY_URL_QUERY, { urls });
  const matches = data._Content.items.filter((item) => item._metadata.types?.includes(PAGE_TYPE));
  const own = matches.filter((item) => isThisSite(item._metadata.url?.base ?? null));
  const match = (own.length > 0 ? own : matches)[0];
  return match ? { contentKey: match._metadata.key, locale: locale ?? match._metadata.locale } : null;
}

export interface LoadedPage {
  facts: PageFacts;
  text: string;
  document: unknown;
  published: PageVersion | null;
}

// One version of one page with its copy: the published version by default, or
// the version asked for.
export async function loadPage(ref: PageRef, version?: string): Promise<LoadedPage | { error: string }> {
  const locale = ref.locale ?? "en";
  const versions = await getPageVersions(ref.contentKey, locale);
  if (versions.length === 0) {
    return { error: `No page with key ${ref.contentKey} in locale '${locale}'.` };
  }
  const published = versions.find((entry) => entry.facts.status === "Published") ?? null;
  const target = version
    ? versions.find((entry) => entry.facts.version === version)
    : (published ?? newest(versions));
  if (!target) {
    return { error: `Version ${version} of ${ref.contentKey} ('${locale}') was not found. It may have been replaced by a newer one.` };
  }
  if (!target.isPage) {
    return { error: `'${target.facts.name}' (${target.facts.contentType}) is not a page.` };
  }
  if ((await keysMissingFromCms([ref.contentKey]))?.has(ref.contentKey)) {
    return {
      error:
        `'${target.facts.name}' is still in the search index but is not a page in the CMS, so it cannot be edited. ` +
        "It was deleted from the CMS, or it is a blueprint (a page template).",
    };
  }

  const document = await getPageDocument(target);
  const text = visibleText(document);
  return {
    facts: {
      ...target.facts,
      wordCount: wordCount(text),
      imagesWithoutAlt: imagesWithoutAlt(document),
      pendingDraft: pendingDraftFor(target, versions),
    },
    text,
    document,
    published,
  };
}
