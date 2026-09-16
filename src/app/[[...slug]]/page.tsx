import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { supportsProductLanding } from "@/lib/optimizely/productLandingInstances";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { getAllPageRoutes } from "@/lib/graphql/queries/GetAllPagePaths";
import { cacheTag } from "next/cache";
import { cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import { isVariationSegment, parseVariationSegment, type FlagVariation } from "@/lib/optimizely/variationPath";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { getVisitorContext } from "@/lib/optimizely/visitor";
import { queryOdpSegments, resolveVariationKey } from "@/lib/optimizely/odp";

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

type KeyResult = {
  // Optional because the cached fetcher returns {} when the Graph query fails -
  // see fetchPageKeys. Every read below is already optional-chained.
  _Page?: { items?: Array<{ _metadata: { key: string; version: string | number; variation: string | null } }> };
};

// These Graph calls sit in module-level "use cache" functions rather than
// inline, for two separate reasons. First, the SDK client does not forward
// next: { revalidate, tags } to its fetch, so the cache boundary has to be the
// function. Second, CmsPage itself calls noStore() and getVisitorContext()
// (which reads cookies and headers) on the homepage path - dynamic reads cannot
// happen inside a cache scope, so the query has to live outside CmsPage
// entirely, taking only the serializable `urls` array as its cache key.
async function fetchPageKeys(urls: string[]): Promise<KeyResult> {
  "use cache";
  cacheTag("page");
  cachePublishedContent();

  try {
    return await graphClient().request(KEY_QUERY, { urls });
  } catch (error) {
    return cachedQueryFailed("fetchPageKeys", error);
  }
}

// Takes a discriminator, not the query text: arguments form the cache key, and
// passing the whole GraphQL document would put ~1KB of string in the key to
// express a two-way choice.
async function fetchPageMeta(
  variant: "primary" | "fallback",
  urls: string[]
): Promise<PageMetaResult> {
  "use cache";
  cacheTag("page");
  cachePublishedContent();

  try {
    return await graphClient().request(
      variant === "primary" ? GET_PAGE_META_QUERY : GET_PAGE_META_FALLBACK_QUERY,
      { urls }
    );
  } catch (error) {
    return cachedQueryFailed("fetchPageMeta", error);
  }
}

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

function extractVariations(slug?: string[]): {
  cleanSlug?: string[];
  activeVariations: string[];
  flagVariations: FlagVariation[];
} {
  if (!slug) return { cleanSlug: undefined, activeVariations: [], flagVariations: [] };
  const cleanSlug = slug.filter((s) => !isVariationSegment(s));
  const flagVariations = slug
    .map(parseVariationSegment)
    .filter((fv): fv is FlagVariation => fv !== null);
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

  // Two personalization signals feed the same Graph variation filter:
  //   1. FX path - middleware decides an experiment and encodes the variation in the URL
  //      (`__v_flag--variation`). ISR-cached per variation segment; no cookies read here.
  //   2. ODP-direct fallback - only for the homepage, and only when FX set no variation
  //      (no experiment on this route). Fetches the visitor's ODP audiences server-side and
  //      maps one to a variation key. Reading the visitor id calls cookies(), so this makes
  //      the homepage render dynamic - which is why it's scoped to `!cleanSlug` so every
  //      other route stays static/ISR and never calls ODP.
  let variationValues = activeVariations;
  if (variationValues.length === 0 && !cleanSlug) {
    // Reading cookies makes this render dynamic. noStore() tells Next.js not to
    // cache the route output, resolving the conflict with export const revalidate.
    noStore();
    const { userId } = await getVisitorContext();
    if (userId !== "anonymous") {
      const key = resolveVariationKey(await queryOdpSegments(userId));
      if (key) variationValues = [key];
    }
  }

  // When a variation is active (from FX or ODP), pass it as a Graph filter so Graph returns
  // the matching variation or base content (includeOriginal keeps unmatched visitors served).
  const variationFilter =
    variationValues.length > 0
      ? { variation: { include: "SOME" as const, value: variationValues, includeOriginal: true } }
      : undefined;

  let page: any = null;

  // Step 1: URL-based lookup. Graph returns one item for pages with a single
  // published version; for multi-version pages (e.g. homepage) it returns all
  // matching versions so we pick the variation match.
  for (const url of urls) {
    try {
      // No next: { revalidate, tags } - getContentByPath() routes through
      // request(), which forwards no Next.js fetch options, so the option was
      // only ever discarded. Page content rides page-output ISR instead
      // (export const revalidate above, busted by revalidatePath in the webhook).
      const items = await client.getContentByPath(url, variationFilter);
      if (items.length > 0) {
        const variationMatch = variationFilter
          ? items.find((item: any) => variationValues.includes(item._metadata?.variation))
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
    let keyItems: NonNullable<NonNullable<KeyResult["_Page"]>["items"]> = [];
    try {
      const keyResult = await fetchPageKeys(urls);
      keyItems = keyResult?._Page?.items ?? [];
    } catch (error) {
      // Graph unavailable — fall through to notFound()
      console.error("[CmsPage] Key lookup failed:", error);
    }

    const candidates = keyItems
      .map((i) => i._metadata)
      .filter((m): m is { key: string; version: string | number; variation: string | null } => !!(m?.key && m?.version));

    // Prefer a version whose variation name matches the active persona,
    // fall back to the highest base version (no variation name).
    const variationMatch = candidates.find(
      (m) => m.variation != null && variationValues.includes(m.variation)
    );
    const baseFallback = candidates
      .filter((m) => !m.variation)
      .sort((a, b) => Number(b.version) - Number(a.version))[0];

    const meta = variationMatch ?? baseFallback;
    if (meta) {
      try {
        page = await client.getContent(
          { key: meta.key, version: String(meta.version) }
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
  // Always pre-render the homepage. Its no-slug branch calls cookies() (via the
  // ODP path), which only resolves to a dynamic route cleanly when Next observes
  // that dynamic usage during a build-time prerender. On a freshly created
  // instance Graph has no pages, so the query below returns nothing and "/" would
  // otherwise be omitted - Next then tries to statically render it on demand and
  // cookies() throws DYNAMIC_SERVER_USAGE (500). Pinning it makes every instance
  // behave like a seeded one; the render still notFound()s until content exists.
  const HOMEPAGE: PageParams = { slug: undefined };

  let routes: string[][];
  try {
    routes = await getAllPageRoutes();
  } catch (error) {
    console.error("[generateStaticParams] Falling back to homepage only:", error);
    return [HOMEPAGE];
  }

  // Routes are already de-duplicated; skip the homepage entry since it is pinned above.
  return [
    HOMEPAGE,
    ...routes.filter((slug) => slug.length > 0).map((slug) => ({ slug })),
  ];
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
        ... on BlogExperience { ${SEO_FIELDS} }
        ... on TraditionalPage { ${SEO_FIELDS} }
        ... on ArticlePage { ${SEO_FIELDS} summary }
        ... on CaseStudyPage { ${SEO_FIELDS} summary }
        ${supportsProductLanding() ? `... on ProductLandingExperience { ${SEO_FIELDS} }` : ""}
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

  // The fallback query must be driven by an EMPTY RESULT, not only by a throw.
  // The SDK client throws on a non-2xx response but returns json.data for a 200
  // that carries errors[] - which is exactly what a type the instance's Graph
  // schema does not know (see the ProductLandingExperience note above) produces.
  // A purely throw-driven fallback would silently stop firing in that case.
  let item: PageMetaItem | null = null;
  try {
    const result = await fetchPageMeta("primary", urls);
    item = result?._Page?.items?.[0] ?? null;
  } catch (error) {
    console.error("[generateMetadata] Primary meta query failed:", error);
  }

  if (!item) {
    try {
      const result = await fetchPageMeta("fallback", urls);
      item = result?._Page?.items?.[0] ?? null;
    } catch (error) {
      // Graph unavailable — return fallback title
      console.error("[generateMetadata] Fallback meta query failed:", error);
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
