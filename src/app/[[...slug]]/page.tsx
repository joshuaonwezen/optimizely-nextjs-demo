import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GraphClient } from "@optimizely/cms-sdk";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { ComponentSelector } from "@/components/cms/ComponentSelector";
import { GET_ALL_PAGE_PATHS_QUERY } from "@/lib/graphql/queries/GetAllPagePaths";
import { extractRowsFromComposition } from "@/lib/optimizely/extractRows";
import { graphqlFetch } from "@/lib/optimizely/client";
import TraditionalPage from "@/components/pages/TraditionalPage";

// The SDK auto-generates queries from the registered content type registry.
// initComponentRegistry must run before any GraphClient.getContentByPath call.
initComponentRegistry();

const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});

interface PageParams {
  slug?: string[];
}

/**
 * Build candidate Optimizely Graph URLs for a given slug.
 * Graph URLs may include a locale prefix (e.g. `/en/cms/`) depending on
 * the CMS site configuration, so we try multiple patterns.
 */
function buildUrlCandidates(slug?: string[]): string[] {
  if (!slug || slug.length === 0) {
    return ["/", "/en/", "/en/homepage/"];
  }
  const path = slug.join("/");
  return [`/en/${path}/`, `/${path}/`];
}

export default async function CmsPage({
  params,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const urls = buildUrlCandidates(slug);

  // The SDK auto-generates the full query from registered content types —
  // no hand-written GraphQL needed. Try each URL candidate until content is found.
  let page: any = null;
  for (const url of urls) {
    const items = await client.getContentByPath(url);
    if (items.length > 0) {
      page = items[0];
      break;
    }
  }

  if (!page) {
    return notFound();
  }

  if (page.__typename === "TraditionalPage") {
    return <TraditionalPage page={page} />;
  }

  const rows = extractRowsFromComposition(page);

  return <ComponentSelector rows={rows} />;
}

/** Pre-render all known CMS page paths at build time */
export async function generateStaticParams(): Promise<PageParams[]> {
  let result;
  try {
    result = await graphqlFetch<any>(
      GET_ALL_PAGE_PATHS_QUERY,
      undefined,
      { next: { revalidate: 3600 } }
    );
  } catch {
    return [];
  }

  const pages = result.data?._Page?.items ?? [];

  return pages
    .map((page: any) => {
      const url: string = page?._metadata?.url?.default ?? "";
      if (!url || url === "/") return { slug: undefined };
      const stripped = url.replace(/^\/en\//, "/");
      if (stripped === "/" || stripped === "/homepage/") return { slug: undefined };
      const segments = stripped
        .replace(/^\/|\/$/g, "")
        .split("/")
        .filter(Boolean);
      if (segments.length === 0) return { slug: undefined };
      return { slug: segments };
    })
    .filter(Boolean);
}

const GET_PAGE_META_QUERY = /* GraphQL */ `
  query GetPageMeta($urls: [String]) {
    _Page(
      where: { _metadata: { url: { default: { in: $urls } } } }
      limit: 1
    ) {
      items {
        _metadata {
          displayName
        }
      }
    }
  }
`;

/** Pull page title from CMS for Next.js <head> */
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const urls = buildUrlCandidates(slug);

  const result = await graphqlFetch<any>(GET_PAGE_META_QUERY, { urls }, { next: { revalidate: 300 } });
  const page = result.data?._Page?.items?.[0];

  return {
    title: page?._metadata?.displayName ?? "Page",
  };
}
