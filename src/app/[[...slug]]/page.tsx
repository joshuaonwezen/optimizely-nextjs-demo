import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { GET_ALL_PAGE_PATHS_QUERY } from "@/lib/graphql/queries/GetAllPagePaths";
import { graphqlFetch } from "@/lib/optimizely/client";
import { getOptimizelyUser } from "@/lib/optimizely/user";

// Registers all content types, display templates, and React components.
// Also calls config() so getClient() works throughout the app.
initComponentRegistry();

// Force SSR so Graph queries are always fresh and never served from a stale
// build-time data cache. Without this, Next.js caches the first (possibly empty)
// Graph response at build time and serves it on Vercel until a redeploy.
export const dynamic = "force-dynamic";

interface PageParams {
  slug?: string[];
}

const LOCALE_PREFIX_RE = /^[a-z]{2}(-[a-z]{2})?$/;

function buildUrlCandidates(slug?: string[]): string[] {
  // Root "/" — no slug — defaults to the English homepage
  if (!slug || slug.length === 0) {
    return ["/", "/en/", "/en/homepage/"];
  }
  const path = slug.join("/");
  // If the first segment is a locale code the URL is already fully qualified
  if (LOCALE_PREFIX_RE.test(slug[0])) {
    const locale = slug[0];
    // A bare locale slug (e.g. ["en"]) is the locale homepage.
    if (slug.length === 1) {
      // The English start page is stored at "/" in Graph (the CMS start page has no locale prefix).
      if (locale === "en") return [`/${path}/`, `/${path}/homepage/`, "/"];
      return [`/${path}/`, `/${path}/homepage/`];
    }
    // For locale + path (e.g. ["en", "savings"]), try the locale-prefixed URL first.
    // Also try the bare path because the CMS sometimes omits the locale prefix for English pages.
    const rest = slug.slice(1).join("/");
    if (locale === "en") {
      return [`/${path}/`, `/${rest}/`];
    }
    return [`/${path}/`];
  }
  // Legacy English paths without locale prefix (e.g. /savings from generateStaticParams
  // stripping /en/ in earlier builds) — try both prefixed and bare.
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

  const user = await getOptimizelyUser();
  const fxDecisions = user.decideAll();

  const activeVariations = Object.values(fxDecisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);

  const client = getClient();

  // When a persona is active, pass the variation names as a filter so Graph
  // returns both the matching variation and the base (includeOriginal: true).
  // We then prefer the variation item from the returned array.
  const variationFilter =
    activeVariations.length > 0
      ? { variation: { include: "SOME" as const, value: activeVariations, includeOriginal: true } }
      : undefined;

  let page: any = null;

  // Step 1: URL-based lookup. Graph returns one item for pages with a single
  // published version; for multi-version pages (e.g. homepage) it returns all
  // matching versions so we pick the variation match.
  // cache: false bypasses Graph's own server-side CDN cache (?cache=false).
  for (const url of urls) {
    const items = await client.getContentByPath(url, { ...variationFilter, cache: false });
    if (items.length > 0) {
      const variationMatch = variationFilter
        ? items.find((item: any) => activeVariations.includes(item._metadata?.variation))
        : null;
      page = variationMatch ?? items[0];
      break;
    }
  }

  // Step 2: Fallback for pages where getContentByPath returns nothing because
  // _Content.item resolves to null when multiple items share the same URL.
  // _Page.items has no such restriction — use it to find key+variation by name,
  // then fall back to the highest base version.
  if (!page) {
    const KEY_QUERY = /* GraphQL */ `
      query FindPageKey($urls: [String]) {
        _Page(
          where: { _metadata: { url: { default: { in: $urls } } } }
          limit: 10
        ) {
          items { _metadata { key version variation } }
        }
      }
    `;
    const keyResult = await graphqlFetch<{
      _Page: { items: Array<{ _metadata: { key: string; version: string | number; variation: string | null } }> };
    }>(KEY_QUERY, { urls }, { cache: "no-store" });

    const candidates = (keyResult.data?._Page?.items ?? [])
      .map((i) => i._metadata)
      .filter((m): m is { key: string; version: string | number; variation: string | null } => !!(m?.key && m?.version));

    // Prefer a version whose variation name matches the active persona,
    // fall back to the highest base version (no variation name).
    const variationMatch = candidates.find(
      (m) => m.variation != null && activeVariations.includes(m.variation)
    );
    const baseFallback = candidates
      .filter((m) => !m.variation)
      .sort((a, b) => Number(b.version) - Number(a.version))[0];

    const meta = variationMatch ?? baseFallback;
    if (meta) {
      page = await client.getContent(
        { key: meta.key, version: String(meta.version) },
        { cache: false }
      );
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
      void user.decide(exposedFlag.flagKey, []);
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

      // English homepage variants → root route (no slug)
      if (url === "/en/" || url === "/en/homepage/") return { slug: undefined };

      // For English pages, strip the /en/ prefix so URLs stay clean (/savings not /en/savings).
      // For all other locales, keep the full path (/nl/savings stays /nl/savings).
      const locale = url.split("/").filter(Boolean)[0] ?? "";
      const effective =
        locale === "en" ? url.replace(/^\/en\//, "/") : url;

      const segments = effective.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
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
