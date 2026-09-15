import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TTL } from "@/lib/optimizely/client";
import { graphClient } from "@/lib/optimizely/graphClient";
import { resolveCategoryUris } from "@/lib/taxonomy";

export interface ArticleListItem {
  title?: string | null;
  summary?: string | null;
  /** Legacy enum property, kept as a fallback for untagged content. */
  category?: string | null;
  /** Category term URIs resolved from the taxonomy, with the legacy fallback applied. */
  categoryUris: string[];
  _metadata?: {
    published?: string | null;
    url?: { default?: string | null } | null;
  } | null;
}

export interface ArticleFacetBucket {
  /** A category term URI (cms://taxonomy/categories/<key>). */
  name: string;
  count: number;
}

export interface ArticleListResult {
  items: ArticleListItem[];
  total: number;
  nextCursor: string | null;
  facets: { category: ArticleFacetBucket[] };
  fromCms: boolean;
}

// A single query serves both the filtered and unfiltered cases: Graph ignores a
// filter whose variable is null, so passing `categories: null` returns
// everything. Facets always come back so the sidebar can show counts.
const GET_ARTICLES_QUERY = /* GraphQL */ `
  query GetArticles($limit: Int, $cursor: String, $categories: [String]) {
    ArticlePage(
      limit: $limit
      cursor: $cursor
      orderBy: { _metadata: { published: DESC } }
      where: {
        _metadata: { url: { default: { exist: true } } }
        _itemMetadata: { categories: { in: $categories } }
      }
    ) {
      total
      cursor
      items {
        title
        summary
        category
        _itemMetadata { categories }
        _metadata { published url { default } }
      }
      facets {
        _itemMetadata {
          categories(orderType: COUNT, orderBy: DESC, limit: 30) { name count }
        }
      }
    }
  }
`;

interface GraphResponse {
  ArticlePage?: {
    total?: number | null;
    cursor?: string | null;
    items?: Array<{
      title?: string | null;
      summary?: string | null;
      category?: string | null;
      _itemMetadata?: { categories?: string[] | null } | null;
      _metadata?: {
        published?: string | null;
        url?: { default?: string | null } | null;
      } | null;
    }> | null;
    facets?: {
      _itemMetadata?: {
        categories?: Array<{ name?: string | null; count?: number | null }> | null;
      } | null;
    } | null;
  } | null;
}

const EMPTY: ArticleListResult = {
  items: [],
  total: 0,
  nextCursor: null,
  facets: { category: [] },
  fromCms: false,
};

function mapResponse(data: GraphResponse | null): ArticleListResult {
  const page = data?.ArticlePage;
  if (!page) return EMPTY;
  return {
    items: (page.items ?? []).filter(Boolean).map((item) => ({
      title: item.title,
      summary: item.summary,
      category: item.category,
      categoryUris: resolveCategoryUris(item._itemMetadata?.categories, item.category),
      _metadata: item._metadata,
    })),
    total: page.total ?? 0,
    nextCursor: page.cursor ?? null,
    facets: {
      category: (page.facets?._itemMetadata?.categories ?? [])
        .filter((b): b is { name: string; count: number } => !!b.name && b.count != null)
        .map((b) => ({ name: b.name, count: b.count })),
    },
    fromCms: (page.items?.length ?? 0) > 0,
  };
}

// Cached at the function, not the fetch: the SDK's request() does not forward
// next: { revalidate, tags }. The three args form the cache key.
async function fetchArticles(
  limit: number,
  cursor: string | null | undefined,
  categories: string[] | null
): Promise<GraphResponse> {
  "use cache";
  cacheTag("page");
  cacheLife({ stale: 300, revalidate: CACHE_TTL, expire: CACHE_TTL * 24 });

  try {
    return await graphClient().request(GET_ARTICLES_QUERY, {
    limit,
    cursor: cursor ?? undefined,
    categories,
  });
  } catch (error) {
    // Caught HERE, inside the cache scope, not at the call site: a rejected
    // promise inside "use cache" fails static generation outright ("Error
    // occurred prerendering page") and no downstream try/catch can rescue it.
    // Returning an empty result lets the caller's existing fallback path run.
    console.error("[fetchArticles] Graph query failed:", error);
    return {};
  }
}

export async function getArticles(options?: {
  limit?: number;
  cursor?: string | null;
  /** Category term URIs to filter by. Null or empty returns everything. */
  category?: string[] | null;
}): Promise<ArticleListResult> {
  const { limit = 6, cursor, category } = options ?? {};
  try {
    const res = await fetchArticles(limit, cursor, category?.length ? category : null);
    return mapResponse(res);
  } catch (error) {
    console.error("[getArticles] Returning empty result:", error);
    return EMPTY;
  }
}
