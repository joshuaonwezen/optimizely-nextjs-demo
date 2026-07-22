import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { GET_ALL_PAGE_PATHS_QUERY } from "@/lib/graphql/queries/GetAllPagePaths";
import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";
import { VARIATION_MARKER, FLAG_VAR_SEP } from "@/middleware";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";

// Registers all content types, display templates, and React components.
// Also calls config() so getClient() works throughout the app.
initComponentRegistry();

// 1-hour ISR window. Must stay in sync with CACHE_TTL in lib/optimizely/client.ts.
// Next.js statically analyzes this export, so it must be a literal, not the import.
export const revalidate = 3600;

interface PageParams {
  slug?: string[];
}

const LOCALE_PREFIX_RE = /^[a-z]{2}(-[a-z]{2})?$/;

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

interface FlagVariation { flagKey: string; variationKey: string }

function extractVariations(slug?: string[]): {
  cleanSlug?: string[];
  activeVariations: string[];
  flagVariations: FlagVariation[];
} {
  if (!slug) return { cleanSlug: undefined, activeVariations: [], flagVariations: [] };
  const cleanSlug = slug.filter((s) => !s.startsWith(VARIATION_MARKER));
  const flagVariations = slug
    .filter((s) => s.startsWith(VARIATION_MARKER))
    .map((s) => {
      const [flagKey, variationKey] = s.slice(VARIATION_MARKER.length).split(FLAG_VAR_SEP);
      return { flagKey, variationKey };
    });
  return {
    cleanSlug: cleanSlug.length > 0 ? cleanSlug : undefined,
    activeVariations: flagVariations.map((fv) => fv.variationKey),
    flagVariations,
  };
}

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
      // Non-English locale homepage: try locale-specific first, fall back to English start page.
      return [`/${path}/`, `/${path}/homepage/`, "/en/", "/en/homepage/", "/"];
    }
    // For locale + path (e.g. ["en", "savings"]), try the locale-prefixed URL first.
    // Also try the bare path because the CMS sometimes omits the locale prefix for English pages.
    const rest = slug.slice(1).join("/");
    if (locale === "en") {
      return [`/${path}/`, `/${rest}/`];
    }
    // Non-English: try locale URL first, then fall back to English equivalents.
    return [`/${path}/`, `/en/${rest}/`, `/${rest}/`];
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
  const { cleanSlug, activeVariations, flagVariations } = extractVariations(slug);
  const urls = buildUrlCandidates(cleanSlug);

  const client = getClient();

  // When variations are active (encoded in the URL path by middleware), pass them
  // as a Graph filter so Graph returns the matching variation or base content.
  const variationFilter =
    activeVariations.length > 0
      ? { variation: { include: "SOME" as const, value: activeVariations, includeOriginal: true } }
      : undefined;

  let page: any = null;

  // Step 1: URL-based lookup. Graph returns one item for pages with a single
  // published version; for multi-version pages (e.g. homepage) it returns all
  // matching versions so we pick the variation match.
  for (const url of urls) {
    try {
      const items = await client.getContentByPath(url, {
        ...variationFilter,
        next: { revalidate: CACHE_TTL, tags: ["page"] },
      } as any);
      if (items.length > 0) {
        const variationMatch = variationFilter
          ? items.find((item: any) => activeVariations.includes(item._metadata?.variation))
          : null;
        page = variationMatch ?? items[0];
        break;
      }
    } catch {
      // Graph unavailable for this URL — try next candidate
    }
  }

  // Step 2: Fallback for pages where getContentByPath returns nothing because
  // _Content.item resolves to null when multiple items share the same URL.
  // _Page.items has no such restriction — use it to find key+variation by name,
  // then fall back to the highest base version.
  if (!page) {
    type KeyResult = { _Page: { items: Array<{ _metadata: { key: string; version: string | number; variation: string | null } }> } };
    let keyItems: KeyResult["_Page"]["items"] = [];
    try {
      const keyResult = await graphqlFetch<KeyResult>(KEY_QUERY, { urls }, { next: { revalidate: CACHE_TTL, tags: ["page"] } });
      keyItems = keyResult.data?._Page?.items ?? [];
    } catch {
      // Graph unavailable — fall through to notFound()
    }

    const candidates = keyItems
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
      try {
        page = await client.getContent(
          { key: meta.key, version: String(meta.version) },
          { next: { revalidate: CACHE_TTL, tags: ["page"] } } as any
        );
      } catch {
        // Graph unavailable — fall through to notFound()
      }
    }
  }

  if (!page) {
    return notFound();
  }

  const servedVariation: string | null = page._metadata?.variation ?? null;
  const servedFlagKey = servedVariation
    ? (flagVariations.find((fv) => fv.variationKey === servedVariation)?.flagKey ?? null)
    : null;

  return (
    <>
      <OptimizelyComponent content={page} />
      {servedFlagKey && <FxBucketingEvent flagKey={servedFlagKey} />}
    </>
  );
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

// SEO fields come from the SEO contract spread into every page type in
// optimizely.config.mjs (metaTitle, metaDescription, ogImage).
const SEO_FIELDS = /* GraphQL */ `
  metaTitle
  metaDescription
  ogImage { url { default } }
`;

const GET_PAGE_META_QUERY = /* GraphQL */ `
  query GetPageMeta($urls: [String]) {
    _Page(
      where: { _metadata: { url: { default: { in: $urls } } } }
      limit: 1
    ) {
      items {
        _metadata {
          displayName
          url { default }
        }
        ... on DynamicExperience { ${SEO_FIELDS} }
        ... on TraditionalPage { ${SEO_FIELDS} }
        ... on ArticlePage { ${SEO_FIELDS} summary }
        ... on CaseStudyPage { ${SEO_FIELDS} summary }
      }
    }
  }
`;

// Fallback for instances where the SEO contract fields haven't been pushed to
// the CMS yet — the extended query fails Graph validation there.
const GET_PAGE_META_FALLBACK_QUERY = /* GraphQL */ `
  query GetPageMetaFallback($urls: [String]) {
    _Page(
      where: { _metadata: { url: { default: { in: $urls } } } }
      limit: 1
    ) {
      items {
        _metadata {
          displayName
          url { default }
        }
      }
    }
  }
`;

interface PageMetaItem {
  _metadata?: { displayName?: string | null; url?: { default?: string | null } | null } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: { url?: { default?: string | null } | null } | null;
  summary?: string | null;
}

type PageMetaResult = { _Page?: { items?: Array<PageMetaItem | null> | null } | null };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Strip variation segments before looking up page metadata.
  const { cleanSlug } = extractVariations(slug);
  const urls = buildUrlCandidates(cleanSlug);

  let item: PageMetaItem | null = null;
  try {
    const result = await graphqlFetch<PageMetaResult>(GET_PAGE_META_QUERY, { urls }, { next: { revalidate: CACHE_TTL } });
    item = result.data?._Page?.items?.[0] ?? null;
  } catch {
    try {
      const result = await graphqlFetch<PageMetaResult>(GET_PAGE_META_FALLBACK_QUERY, { urls }, { next: { revalidate: CACHE_TTL } });
      item = result.data?._Page?.items?.[0] ?? null;
    } catch {
      // Graph unavailable — return fallback title
    }
  }

  const title: string = item?.metaTitle ?? item?._metadata?.displayName ?? "Page";
  const description: string | undefined = item?.metaDescription ?? item?.summary ?? undefined;
  const ogImageUrl: string | undefined = item?.ogImage?.url?.default ?? undefined;

  // Canonical: the Graph URL with the /en/ prefix stripped, matching how
  // generateStaticParams exposes English pages at clean paths.
  const graphUrl: string | undefined = item?._metadata?.url?.default ?? undefined;
  const canonical = graphUrl
    ? (graphUrl.split("/").filter(Boolean)[0] === "en" ? graphUrl.replace(/^\/en\//, "/") : graphUrl)
    : undefined;

  return {
    title,
    ...(description ? { description } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title,
      ...(description ? { description } : {}),
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
      type: "website",
    },
  };
}
