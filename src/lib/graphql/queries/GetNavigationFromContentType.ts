// Demo reference implementation for /demo/navigation - production nav uses GetNavigation.ts
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TTL } from "@/lib/optimizely/client";
import { graphClient } from "@/lib/optimizely/graphClient";

export interface ContentTypeNavItem {
  label: string;
  href: string;
  meta: string;
}

export interface ContentTypeNavResult {
  items: ContentTypeNavItem[];
  fromCms: boolean;
}

export const GET_NAVIGATION_FROM_CONTENT_TYPE_QUERY = /* GraphQL */ `
  query GetArticleNavigation {
    ArticlePage(
      orderBy: { publishDate: DESC }
      limit: 6
    ) {
      items {
        _metadata { url { default } }
        title
        category
      }
    }
  }
`;

const CATEGORY_LABELS: Record<string, string> = {
  "personal-finance": "Personal Finance",
  "business-banking": "Business Banking",
  "investments":      "Investments",
  "market-insights":  "Market Insights",
};

const FALLBACK_ITEMS: ContentTypeNavItem[] = [
  { label: "Guide to ISAs",             href: "/en/insights/guide-to-isas/",          meta: "Personal Finance" },
  { label: "Business Banking Basics",   href: "/en/insights/business-banking-basics/", meta: "Business Banking" },
  { label: "5 Savings Tips for 2025",   href: "/en/insights/savings-tips/",           meta: "Personal Finance" },
];

interface ContentTypeNavGraphResult {
  ArticlePage?: {
    items?: Array<{
      _metadata?: { url?: { default?: string } };
      title?: string;
      category?: string;
    }>;
  };
}

// The Graph call lives in its own "use cache" function because the SDK client
// does not forward next: { revalidate, tags } to its fetch. "use cache" caches
// what the function RETURNS instead, so cacheTag/cacheLife work over any client.
async function fetchArticleNav(): Promise<ContentTypeNavGraphResult> {
  "use cache";
  cacheTag("page");
  cacheLife({ stale: 300, revalidate: CACHE_TTL, expire: CACHE_TTL * 24 });

  try {
    return await graphClient().request(GET_NAVIGATION_FROM_CONTENT_TYPE_QUERY, {});
  } catch (error) {
    // Caught HERE, inside the cache scope, not at the call site: a rejected
    // promise inside "use cache" fails static generation outright ("Error
    // occurred prerendering page") and no downstream try/catch can rescue it.
    // Returning an empty result lets the caller's existing fallback path run.
    console.error("[fetchArticleNav] Graph query failed:", error);
    return {};
  }
}

export async function getNavigationFromContentType(): Promise<ContentTypeNavResult> {
  try {
    const result = await fetchArticleNav();

    const raw = result?.ArticlePage?.items ?? [];
    const items: ContentTypeNavItem[] = raw
      .filter((i) => i.title && i._metadata?.url?.default)
      .map((i) => ({
        label: i.title!,
        href: i._metadata!.url!.default!,
        meta: CATEGORY_LABELS[i.category ?? ""] ?? i.category ?? "",
      }));

    if (items.length === 0) return { items: FALLBACK_ITEMS, fromCms: false };
    return { items, fromCms: true };
  } catch (error) {
    // Only reachable for mapping errors: fetchArticleNav already swallows Graph
    // failures inside the cache scope, because it has to (see its comment).
    console.error("[getNavigationFromContentType] Using fallback items:", error);
    return { items: FALLBACK_ITEMS, fromCms: false };
  }
}
