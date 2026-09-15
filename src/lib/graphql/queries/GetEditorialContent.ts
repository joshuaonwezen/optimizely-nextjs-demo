import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TTL } from "@/lib/optimizely/client";
import { graphClient } from "@/lib/optimizely/graphClient";

export interface EditorialItem {
  title?: string | null;
  summary?: string | null;
  tags?: (string | null)[] | null;
  _metadata?: {
    published?: string | null;
    url?: { default?: string | null } | null;
    __typename?: string | null;
  } | null;
}

interface GraphResponse {
  ArticlePage?: { items?: Array<EditorialItem | null> | null } | null;
  CaseStudyPage?: { items?: Array<EditorialItem | null> | null } | null;
}

// Two root fields in one request — the manual equivalent of querying
// IEditorialContent once the contract exists in the CMS.
const GET_EDITORIAL_CONTENT_QUERY = /* GraphQL */ `
  query GetEditorialContent($limit: Int) {
    ArticlePage(
      limit: $limit
      orderBy: { _metadata: { published: DESC } }
      where: { _metadata: { url: { default: { exist: true } } } }
    ) {
      items {
        title
        summary
        tags
        _metadata { published url { default } __typename }
      }
    }
    CaseStudyPage(
      limit: $limit
      orderBy: { _metadata: { published: DESC } }
      where: { _metadata: { url: { default: { exist: true } } } }
    ) {
      items {
        title
        summary
        tags
        _metadata { published url { default } __typename }
      }
    }
  }
`;

const EMPTY = { items: [] as EditorialItem[], fromCms: false };

// Cached at the function, not the fetch: the SDK's request() does not forward
// next: { revalidate, tags }. `limit` is the cache key, so each distinct limit
// gets its own entry.
async function fetchEditorialContent(limit: number): Promise<GraphResponse> {
  "use cache";
  cacheTag("page");
  cacheLife({ stale: 300, revalidate: CACHE_TTL, expire: CACHE_TTL * 24 });

  try {
    return await graphClient().request(GET_EDITORIAL_CONTENT_QUERY, { limit });
  } catch (error) {
    // Caught HERE, inside the cache scope, not at the call site: a rejected
    // promise inside "use cache" fails static generation outright ("Error
    // occurred prerendering page") and no downstream try/catch can rescue it.
    // Returning an empty result lets the caller's existing fallback path run.
    console.error("[fetchEditorialContent] Graph query failed:", error);
    return {};
  }
}

export async function getEditorialContent(limit = 6): Promise<{
  items: EditorialItem[];
  fromCms: boolean;
}> {
  try {
    const res = await fetchEditorialContent(limit);

    const articles = (res?.ArticlePage?.items ?? []).filter(Boolean) as EditorialItem[];
    const caseStudies = (res?.CaseStudyPage?.items ?? []).filter(Boolean) as EditorialItem[];
    const merged = [...articles, ...caseStudies].sort((a, b) => {
      const aDate = a._metadata?.published ?? "";
      const bDate = b._metadata?.published ?? "";
      return bDate.localeCompare(aDate);
    });

    return { items: merged.slice(0, limit), fromCms: merged.length > 0 };
  } catch (error) {
    console.error("[getEditorialContent] Returning empty result:", error);
    return EMPTY;
  }
}
