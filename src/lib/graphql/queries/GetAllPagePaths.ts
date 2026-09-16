import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

// Every published page URL. Feeds generateStaticParams() in the catch-all route
// and app/sitemap.ts.
export const GET_ALL_PAGE_PATHS_QUERY = /* GraphQL */ `
  query GetAllPagePaths {
    _Page(
      limit: 100
      where: { _metadata: { url: { default: { exist: true } } } }
    ) {
      items {
        _metadata {
          url {
            default
          }
          locale
        }
      }
    }
  }
`;

type AllPagePathsResult = {
  _Page?: { items?: Array<{ _metadata?: { url?: { default?: string | null } | null } | null } | null> };
};

async function fetchAllPagePaths(): Promise<AllPagePathsResult> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  // request() takes variables as a required positional - pass {}, not undefined.
  try {
    return await graphClient().request(GET_ALL_PAGE_PATHS_QUERY, {});
  } catch (error) {
    return cachedQueryFailed("fetchAllPagePaths", error);
  }
}

// A Graph page URL as the route segments this app serves it under. English pages
// drop their /en/ prefix (/savings, not /en/savings); other locales keep theirs.
// "/", "/en/" and "/en/homepage/" are all the homepage: [].
function toRouteSegments(url: string): string[] {
  if (url === "/en/homepage/") return [];
  const effective = url.startsWith("/en/") ? url.slice(3) : url;
  return effective.split("/").filter(Boolean);
}

/** Route segments of every published page, de-duplicated; the homepage is []. */
export async function getAllPageRoutes(): Promise<string[][]> {
  const result = await fetchAllPagePaths();
  const seen = new Set<string>();
  const routes: string[][] = [];
  for (const item of result._Page?.items ?? []) {
    const url = item?._metadata?.url?.default;
    if (!url) continue;
    const segments = toRouteSegments(url);
    const key = segments.join("/");
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push(segments);
  }
  return routes;
}
