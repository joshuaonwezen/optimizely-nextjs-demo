import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

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

export async function getEditorialContent(limit = 6): Promise<{
  items: EditorialItem[];
  fromCms: boolean;
}> {
  try {
    const res = await graphqlFetch<GraphResponse>(
      GET_EDITORIAL_CONTENT_QUERY,
      { limit },
      { next: { revalidate: CACHE_TTL, tags: ["page"] } }
    );

    const articles = (res.data?.ArticlePage?.items ?? []).filter(Boolean) as EditorialItem[];
    const caseStudies = (res.data?.CaseStudyPage?.items ?? []).filter(Boolean) as EditorialItem[];
    const merged = [...articles, ...caseStudies].sort((a, b) => {
      const aDate = a._metadata?.published ?? "";
      const bDate = b._metadata?.published ?? "";
      return bDate.localeCompare(aDate);
    });

    return { items: merged.slice(0, limit), fromCms: merged.length > 0 };
  } catch {
    return EMPTY;
  }
}
