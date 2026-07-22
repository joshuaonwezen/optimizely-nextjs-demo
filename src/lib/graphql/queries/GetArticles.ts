import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

export interface ArticleListItem {
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  _metadata?: {
    published?: string | null;
    url?: { default?: string | null } | null;
  } | null;
}

export interface ArticleFacetBucket {
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

const GET_ARTICLES_QUERY = /* GraphQL */ `
  query GetArticles($limit: Int, $cursor: String) {
    ArticlePage(
      limit: $limit
      cursor: $cursor
      orderBy: { _metadata: { published: DESC } }
      where: { _metadata: { url: { default: { exist: true } } } }
    ) {
      total
      cursor
      items {
        title
        summary
        category
        _metadata { published url { default } }
      }
      facets {
        category { name count }
      }
    }
  }
`;

const GET_ARTICLES_FILTERED_QUERY = /* GraphQL */ `
  query GetArticlesFiltered($limit: Int, $cursor: String, $category: [String]!) {
    ArticlePage(
      limit: $limit
      cursor: $cursor
      orderBy: { _metadata: { published: DESC } }
      where: {
        _metadata: { url: { default: { exist: true } } }
        category: { in: $category }
      }
    ) {
      total
      cursor
      items {
        title
        summary
        category
        _metadata { published url { default } }
      }
      facets {
        category { name count }
      }
    }
  }
`;

interface GraphResponse {
  ArticlePage?: {
    total?: number | null;
    cursor?: string | null;
    items?: Array<ArticleListItem> | null;
    facets?: {
      category?: Array<{ name?: string | null; count?: number | null }> | null;
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
    items: (page.items ?? []).filter(Boolean) as ArticleListItem[],
    total: page.total ?? 0,
    nextCursor: page.cursor ?? null,
    facets: {
      category: (page.facets?.category ?? [])
        .filter((b): b is { name: string; count: number } => !!b.name && b.count != null)
        .map(b => ({ name: b.name, count: b.count })),
    },
    fromCms: (page.items?.length ?? 0) > 0,
  };
}

export async function getArticles(options?: {
  limit?: number;
  cursor?: string | null;
  category?: string[] | null;
}): Promise<ArticleListResult> {
  const { limit = 6, cursor, category } = options ?? {};
  try {
    if (category?.length) {
      const res = await graphqlFetch<GraphResponse>(
        GET_ARTICLES_FILTERED_QUERY,
        { limit, cursor: cursor ?? undefined, category },
        { next: { revalidate: CACHE_TTL, tags: ["page"] } }
      );
      return mapResponse(res.data);
    }
    const res = await graphqlFetch<GraphResponse>(
      GET_ARTICLES_QUERY,
      { limit, cursor: cursor ?? undefined },
      { next: { revalidate: CACHE_TTL, tags: ["page"] } }
    );
    return mapResponse(res.data);
  } catch {
    return EMPTY;
  }
}
