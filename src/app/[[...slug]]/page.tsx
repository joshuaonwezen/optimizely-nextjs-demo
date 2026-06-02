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
    // A bare locale slug (e.g. ["nl"]) is the locale homepage — also try
    // /<locale>/homepage/ since that's how the CMS stores it.
    if (slug.length === 1) {
      return [`/${path}/`, `/${path}/homepage/`];
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

  // Demo presenter override: inject a specific variation without FX bucketing.
  // Only applied when the demo_persona cookie is explicitly set via the AudienceSwitcher.
  const demoPersona = cookieStore.get("demo_persona")?.value;
  if (demoPersona) activeVariations.unshift(demoPersona);

  // Only attach a variation filter when there are active variation keys.
  // An empty value array causes ambiguous results for pages with multiple
  // published versions — Graph cannot determine the canonical base content.
  const variationOption =
    activeVariations.length > 0
      ? { variation: { include: "SOME" as const, value: activeVariations, includeOriginal: true } }
      : undefined;

  const client = getClient();

  // cache: false bypasses Graph's own server-side CDN cache (?cache=false).
  // Without this, a stale empty response cached on Graph's side is served even
  // after the content or query logic is fixed.
  const fetchOptions = variationOption
    ? { ...variationOption, cache: false as const }
    : { cache: false as const };

  let page: any = null;
  for (const url of urls) {
    const items = await client.getContentByPath(url, fetchOptions);
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
