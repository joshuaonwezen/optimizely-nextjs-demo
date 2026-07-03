// Demo reference implementation for /demo/navigation - production nav uses GetNavigation.ts
import { graphqlFetch } from "@/lib/optimizely/client";

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

export async function getNavigationFromContentType(): Promise<ContentTypeNavResult> {
  try {
    const result = await graphqlFetch<{
      ArticlePage?: {
        items?: Array<{
          _metadata?: { url?: { default?: string } };
          title?: string;
          category?: string;
        }>;
      };
    }>(GET_NAVIGATION_FROM_CONTENT_TYPE_QUERY, {}, { next: { revalidate: 60, tags: ["page"] } });

    const raw = result.data?.ArticlePage?.items ?? [];
    const items: ContentTypeNavItem[] = raw
      .filter((i) => i.title && i._metadata?.url?.default)
      .map((i) => ({
        label: i.title!,
        href: i._metadata!.url!.default!,
        meta: CATEGORY_LABELS[i.category ?? ""] ?? i.category ?? "",
      }));

    if (items.length === 0) return { items: FALLBACK_ITEMS, fromCms: false };
    return { items, fromCms: true };
  } catch {
    return { items: FALLBACK_ITEMS, fromCms: false };
  }
}
