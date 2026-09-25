import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { supportsProductLanding } from "@/lib/optimizely/productLandingInstances";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { getAllPageRoutes } from "@/lib/graphql/queries/GetAllPagePaths";
import type { SdkContent } from "@/components/cms/sdkTypes";
import { LOCALE_RE } from "@/lib/localeUrl";
import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import { isVariationSegment, parseVariationSegment, type FlagVariation } from "@/lib/optimizely/variationPath";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import WxVariationSwap from "@/components/personalization/WxVariationSwap";
import {
  selectWxVariations,
  wxPrepaintScript,
  WX_BASE_VARIANT,
  WX_FLAG_KEY,
  WX_REGION_ATTR,
  WX_VARIANT_ATTR,
  WX_VARIANT_NAME_ATTR,
  WX_VARIANT_TOKEN,
} from "@/lib/optimizely/wxVariation";
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
  cacheTag(CACHE_TAGS.page);
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
  cacheTag(CACHE_TAGS.page);
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

// variation: { include: ALL } is REQUIRED, not defensive. Verified against Graph:
// without it, _Page returns base items only - 0 of 50 items on this instance came
// back with a non-null variation - so `variation` in the selection set was always
// null. Two consequences, one of them pre-existing: the WX allowlist below would
// always be empty, and the variation branch of the step-2 fallback (which selects on
// exactly this field) could never match and always fell through to baseFallback.
// Step 1 normally resolves the variation, so that branch is a latent bug rather than
// a live one, but it is only latent by luck.
//
// limit raised to 50 with it: on a page carrying several variations the base versions
// and the variations share this budget, and at 10 a variation could be crowded out.
const KEY_QUERY = /* GraphQL */ `
  query FindPageKey($urls: [String]) {
    _Page(
      variation: { include: ALL }
      where: { _metadata: { url: { default: { in: $urls } } } }
      limit: 50
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
  if (LOCALE_RE.test(slug[0])) {
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

  // The page's own variation names. Needed before the content fetch, not only in the
  // step-2 fallback below, because both WX modes depend on it: it is the allowlist (a
  // variation name is accepted only if this page actually has it) and, for pre-paint mode,
  // it is what the content query has to ask Graph for. fetchPageKeys is "use cache" +
  // cacheTag(CACHE_TAGS.page) and keyed on `urls`, so it costs one cold Graph request per
  // URL set per hour, shared by every visitor and by the variation route.
  let keyItems: NonNullable<NonNullable<KeyResult["_Page"]>["items"]> = [];
  try {
    const keyResult = await fetchPageKeys(urls);
    keyItems = keyResult?._Page?.items ?? [];
  } catch (error) {
    // Graph unavailable - the fallback below degrades to notFound(), and the WX
    // allowlist degrades to empty, which means base content. Never an error page.
    console.error("[CmsPage] Key lookup failed:", error);
  }

  // Web Experimentation bridge. Only wx_*-prefixed CMS variations take part, which is what
  // makes this per-page opt-in: a page with none renders exactly what it did before, with
  // no script and no extra markup.
  const wxVariations = selectWxVariations(keyItems.map((i) => i._metadata?.variation));

  // FX and ODP take precedence over WX - but only when their decision actually applies to
  // THIS page, which means this page has a variation with that name. The presence of a
  // variation segment is not enough on its own: the `homepage` flag ships its persona
  // variations through a rollout with NO cms_route, and routeMatches() treats an absent
  // cms_route as "every route", so middleware appends `__v_homepage--investments` on pages
  // that have no `investments` variation at all. Graph then falls back to base via
  // includeOriginal, so FX changes nothing there - and gating on the segment alone let it
  // silently disable the WX bridge on every page a visitor had browsed (AutoTracker writes
  // demo_persona from the path, so visiting /investments was enough to kill it).
  const pageVariations = new Set(
    keyItems.map((i) => i._metadata?.variation).filter((v): v is string => !!v)
  );
  const decidedVariationApplies = variationValues.some((v) => pageVariations.has(v));
  const wxDecidable = wxVariations.length > 0 && !decidedVariationApplies;

  // Pre-paint mode needs base AND the variant in one response. Capped at a single variant:
  // the SDK's metadata hop selects `_Content.item`, which is singular and (see step 2
  // below) resolves to null when several items share a URL, so asking for more risks
  // silently dropping the whole fetch to the step-2 path. One variant is also all a WX
  // experiment needs, since the visitor is in exactly one bucket.
  const wxDual = wxDecidable && wxVariations.length === 1;

  // When a variation is active (from FX or ODP), pass it as a Graph filter so Graph returns
  // the matching variation or base content (includeOriginal keeps unmatched visitors
  // served). With no FX/ODP decision but a wx_ variation on the page, ask for that instead
  // so both trees arrive together - one pair of Graph round trips for both.
  const filterValues = decidedVariationApplies
    ? variationValues
    : wxDual
      ? wxVariations
      : variationValues;
  const variationFilter =
    filterValues.length > 0
      ? { variation: { include: "SOME" as const, value: filterValues, includeOriginal: true } }
      : undefined;

  // getContentByPath/getContent are untyped (any); pin down the fields read here.
  let page: (SdkContent & { _metadata?: { variation?: string | null } | null }) | null = null;

  // Step 1: URL-based lookup. Graph returns one item for pages with a single
  // published version; for multi-version pages (e.g. homepage) it returns all
  // matching versions so we pick the variation match.
  // No next: { revalidate, tags } - getContentByPath() routes through
  // request(), which forwards no Next.js fetch options, so the option was
  // only ever discarded. Page content rides page-output ISR instead
  // (export const revalidate above, busted by revalidatePath in the webhook).
  const tryUrl = async (url: string) => {
    try {
      return await client.getContentByPath(url, variationFilter);
    } catch {
      // Graph unavailable for this URL - treat as a miss and try the others.
      return [];
    }
  };

  const variationOf = (item: unknown) =>
    (item as { _metadata?: { variation?: string | null } })._metadata?.variation ?? null;

  // The FX/ODP match, else the explicit base item. Preferring the item whose variation is
  // null over items[0] matters now that a filter can return two items: Graph does not
  // guarantee which comes first, so items[0] could be the variant.
  const pickMatch = (items: Awaited<ReturnType<typeof tryUrl>>) => {
    const variationMatch =
      variationValues.length > 0
        ? items.find((item) => variationValues.includes(variationOf(item) ?? ""))
        : null;
    return variationMatch ?? items.find((item) => !variationOf(item)) ?? items[0];
  };

  // The first candidate is the overwhelmingly common hit, so try it alone and
  // keep the single-round-trip fast path. Only on a miss do the remaining
  // candidates go out together - a non-English locale homepage generates five,
  // which previously meant five sequential Graph round-trips before first byte.
  // Candidate order still decides the winner, so resolution is unchanged.
  let matchedItems: Awaited<ReturnType<typeof tryUrl>> = [];
  const firstItems = await tryUrl(urls[0]);
  if (firstItems.length > 0) {
    matchedItems = firstItems;
  } else if (urls.length > 1) {
    const rest = await Promise.all(urls.slice(1).map(tryUrl));
    matchedItems = rest.find((items) => items.length > 0) ?? [];
  }
  if (matchedItems.length > 0) page = pickMatch(matchedItems);

  // Step 2: Fallback for pages where getContentByPath returns nothing because
  // _Content.item resolves to null when multiple items share the same URL.
  // _Page.items has no such restriction — use it to find key+variation by name,
  // then fall back to the highest base version.
  if (!page) {
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

  // The variant tree for pre-paint mode, from the same items the base came out of - no
  // extra Graph work. Null when Graph did not return it (a name in keyItems that the
  // content query did not produce), in which case only the soft-nav path is available and
  // the reveal simply never has anything to show.
  const wxVariantPage = wxDual
    ? (matchedItems.find((item) => variationOf(item) === wxVariations[0]) ?? null)
    : null;
  const wxDualRender = wxVariantPage !== null;

  const content = <OptimizelyComponent content={page} />;

  return (
    <>
      {/* The reader runs ABOVE both subtrees so neither is ever painted wrong. The reveal
          CSS is static in the layout head, NOT here: a per-page <style> is an extra
          sibling the client tree does not have in the same place, which shifted alignment
          and produced a hydration mismatch. Inert for a visitor in no matching experiment. */}
      {wxDecidable && (
        <script
          dangerouslySetInnerHTML={{ __html: wxPrepaintScript(wxVariations, wxDualRender) }}
        />
      )}
      {wxDualRender ? (
        // Both trees, base visible by default. Pre-paint mode names the active one on
        // <html> before first paint; soft-nav mode leaves the variant hidden and swaps by
        // navigating, so data-wx-region still wraps what it holds.
        <>
          <div {...{ [WX_VARIANT_ATTR]: WX_BASE_VARIANT, [WX_REGION_ATTR]: "" }}>{content}</div>
          <div
            {...{ [WX_VARIANT_ATTR]: WX_VARIANT_TOKEN, [WX_VARIANT_NAME_ATTR]: wxVariations[0] }}
          >
            <OptimizelyComponent content={wxVariantPage} />
          </div>
        </>
      ) : wxDecidable ? (
        <div {...{ [WX_REGION_ATTR]: "" }}>{content}</div>
      ) : (
        content
      )}
      {/* A WX decision has no FX flag behind it, so it must not fire an FX impression. */}
      {servedFlagKey && servedFlagKey !== WX_FLAG_KEY && (
        <FxBucketingEvent flagKey={servedFlagKey} />
      )}
      {wxVariations.length > 0 && <WxVariationSwap variations={wxVariations} />}
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
