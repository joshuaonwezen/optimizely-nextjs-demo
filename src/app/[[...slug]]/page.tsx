import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { GET_ALL_PAGE_PATHS_QUERY } from "@/lib/graphql/queries/GetAllPagePaths";
import { graphqlFetch } from "@/lib/optimizely/client";
import { getAllDecisions, bucketVisitor } from "@/lib/optimizely/experimentation";

// Registers all content types, display templates, and React components.
// Also calls config() so getClient() works throughout the app.
initComponentRegistry();

interface PageParams {
  slug?: string[];
}

function buildUrlCandidates(slug?: string[]): string[] {
  if (!slug || slug.length === 0) {
    return ["/", "/en/", "/en/homepage/"];
  }
  const path = slug.join("/");
  return [`/en/${path}/`, `/${path}/`];
}

async function CmsPage({
  params,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const urls = buildUrlCandidates(slug);

  // Resolve FX variation keys for this user so CMS serves the matching
  // content variation when one exists.
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";
  const attributes = { device, logged_in: false };

  let fxDecisions: Awaited<ReturnType<typeof getAllDecisions>> = {};
  try {
    fxDecisions = await getAllDecisions(userId, attributes);
  } catch {
    // FX SDK unavailable; fall through with no variation filter
  }

  const activeVariations = Object.values(fxDecisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);
  const variationOption =
    activeVariations.length > 0
      ? { variation: { include: "SOME" as const, value: activeVariations, includeOriginal: true } }
      : undefined;

  const client = getClient();

  let page: any = null;
  for (const url of urls) {
    const items = await client.getContentByPath(url, variationOption);
    if (items.length > 0) {
      page = items[0];
      break;
    }
  }

  if (!page) {
    return notFound();
  }

  // Fire the real FX impression when Graph served a variation.
  const servedVariation: string | null = page._metadata?.variation ?? null;
  if (servedVariation) {
    const exposedFlag = Object.values(fxDecisions).find(
      (d) => d.variationKey === servedVariation
    );
    if (exposedFlag) {
      void bucketVisitor(exposedFlag.flagKey, userId, attributes);
    }
  }

  return <OptimizelyComponent content={page} />;
}

export default withAppContext(CmsPage);

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
