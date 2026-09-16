import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import type { TaxonomyTermMeta } from "@/lib/taxonomy";

export const GET_TAXONOMY_TERMS_QUERY = /* GraphQL */ `
  query GetTaxonomyTerms($locale: [Locales]) {
    _TaxonomyTerm(limit: 100, locale: $locale) {
      total
      items {
        _metadata {
          key
          taxonomy
          displayName
          description
          usage
          parent
        }
      }
    }
  }
`;

export interface TaxonomyTermsResult {
  terms: TaxonomyTermMeta[];
  total: number;
  fromCms: boolean;
}

interface GraphResponse {
  _TaxonomyTerm?: {
    total?: number | null;
    items?: Array<{
      _metadata?: {
        key?: string | null;
        taxonomy?: string | null;
        displayName?: string | null;
        description?: string | null;
        usage?: string | null;
        parent?: string | null;
      } | null;
    }> | null;
  } | null;
}

const EMPTY: TaxonomyTermsResult = { terms: [], total: 0, fromCms: false };

// The SDK's generated page query does not select _itemMetadata, so a page that
// wants to render its own category chips fetches them by key. Both root fields
// travel in one request so this costs a single round trip.
export const GET_CONTENT_TAXONOMY_QUERY = /* GraphQL */ `
  query GetContentTaxonomy($key: String!, $locale: [Locales]) {
    _Content(where: { _metadata: { key: { eq: $key } } }, limit: 1, locale: $locale) {
      items {
        _itemMetadata { categories }
      }
    }
    _TaxonomyTerm(limit: 100, locale: $locale) {
      items {
        _metadata { key displayName usage parent }
      }
    }
  }
`;

export interface ContentTaxonomyResult {
  /** Category term URIs assigned to the content item. */
  uris: string[];
  terms: TaxonomyTermMeta[];
}

const EMPTY_CONTENT_TAXONOMY: ContentTaxonomyResult = { uris: [], terms: [] };

// Both queries cache at the function, not the fetch: the SDK's request() does
// not forward next: { revalidate, tags }. Args form the cache key, so they must
// stay serializable.
async function fetchContentTaxonomy(
  key: string,
  locale: string
): Promise<{
  _Content?: {
    items?: Array<{ _itemMetadata?: { categories?: string[] | null } | null }> | null;
  } | null;
  _TaxonomyTerm?: GraphResponse["_TaxonomyTerm"];
}> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_CONTENT_TAXONOMY_QUERY, { key, locale: [locale] });
  } catch (error) {
    return cachedQueryFailed("fetchContentTaxonomy", error);
  }
}

async function fetchTaxonomyTerms(locale: string): Promise<GraphResponse> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_TAXONOMY_TERMS_QUERY, { locale: [locale] });
  } catch (error) {
    return cachedQueryFailed("fetchTaxonomyTerms", error);
  }
}

export async function getContentTaxonomy(
  key: string | null | undefined,
  options?: { locale?: string }
): Promise<ContentTaxonomyResult> {
  if (!key) return EMPTY_CONTENT_TAXONOMY;
  const { locale = "en" } = options ?? {};
  try {
    const res = await fetchContentTaxonomy(key, locale);

    const uris = res?._Content?.items?.[0]?._itemMetadata?.categories ?? [];
    const byKey = new Map<string, TaxonomyTermMeta>();
    for (const item of res?._TaxonomyTerm?.items ?? []) {
      const m = item?._metadata;
      if (!m?.key || byKey.has(m.key)) continue;
      byKey.set(m.key, {
        key: m.key,
        displayName: m.displayName ?? m.key,
        usage: m.usage,
        parent: m.parent,
      });
    }
    return { uris, terms: [...byKey.values()] };
  } catch {
    return EMPTY_CONTENT_TAXONOMY;
  }
}

export async function getTaxonomyTerms(options?: {
  locale?: string;
}): Promise<TaxonomyTermsResult> {
  const { locale = "en" } = options ?? {};
  try {
    const res = await fetchTaxonomyTerms(locale);

    const items = res?._TaxonomyTerm?.items ?? [];
    // Graph stores one term document per locale, so the same key can come back
    // more than once even with a locale filter. Keep the first of each key.
    const byKey = new Map<string, TaxonomyTermMeta>();
    for (const item of items) {
      const m = item?._metadata;
      if (!m?.key || byKey.has(m.key)) continue;
      byKey.set(m.key, {
        key: m.key,
        displayName: m.displayName ?? m.key,
        description: m.description,
        usage: m.usage,
        parent: m.parent,
      });
    }

    const terms = [...byKey.values()];
    return { terms, total: terms.length, fromCms: terms.length > 0 };
  } catch {
    return EMPTY;
  }
}
