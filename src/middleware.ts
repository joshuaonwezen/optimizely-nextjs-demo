import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createInstance,
  createStaticProjectConfigManager,
  OptimizelyDecideOption,
} from "@optimizely/optimizely-sdk/universal";
import { fetchDatafile } from "@/lib/optimizely/datafile";
import { appendVisitorCookie } from "@/lib/optimizely/visitorCookie";
import { buildFxAttributes, requestHost, VISITOR_ID_COOKIE } from "@/lib/optimizely/fxAttributes";
import { loadRedirectRules, matchRedirect } from "@/lib/redirects";
import {
  formatVariationSegment,
  isKnownVariation,
  isVariationSegment,
  parseVariationSegment,
  VARIATION_MARKER,
  type FlagVariation,
} from "@/lib/optimizely/variationPath";

// Safety backstop against a pathological config that scopes many CMS experiments
// to the same route. Route-scoping (cms_route) is the primary control; this only
// caps the worst case so a single path can never fragment into unbounded cache
// entries.
const MAX_CMS_VARIATIONS = 3;

// A CMS experiment declares which route(s) its variation targets via the
// `cms_route` variation variable in FX. `pathname` here is the clean request path
// (the middleware runs before any __v_ rewrite). Matching rules per comma-entry:
//   - "/*"            → matches every route
//   - "/products/*"   → prefix match (also matches "/products" exactly)
//   - "/product-x"    → exact match
//   - "/"             → root only
// An absent/empty cms_route matches all routes (backward-compatible: flags that
// predate cms_route keep working until the variable is added).
export function routeMatches(pathname: string, cmsRoute?: string): boolean {
  if (!cmsRoute || !cmsRoute.trim()) return true;
  const path = pathname.replace(/\/$/, "") || "/";
  return cmsRoute.split(",").some((raw) => {
    const entry = raw.trim();
    if (!entry) return false;
    if (entry === "/*") return true;
    if (entry.endsWith("/*")) {
      const prefix = entry.slice(0, -2).replace(/\/$/, "") || "/";
      return path === prefix || path.startsWith(prefix + "/");
    }
    return path === (entry.replace(/\/$/, "") || "/");
  });
}

const noOpRequestHandler = {
  makeRequest: () => ({
    abort: () => {},
    responsePromise: Promise.resolve({ statusCode: 200, body: "", headers: {} }),
  }),
};

// A datafile-known variation for a `flagKey--variationKey` string, else null.
function knownVariation(datafile: string, value: string): FlagVariation | null {
  const variation = parseVariationSegment(`${VARIATION_MARKER}${value}`);
  return variation && isKnownVariation(datafile, variation) ? variation : null;
}

export async function middleware(request: NextRequest) {
  const host = requestHost(request.headers);
  const existingId = request.cookies.get(VISITOR_ID_COOKIE)?.value;
  const userId = existingId ?? crypto.randomUUID();
  // A first-time visitor has no cookie on THIS request, so forward the new id to the
  // render too - otherwise server components fall back to "anonymous" for FX and ODP
  // until the second page view.
  if (!existingId) request.cookies.set(VISITOR_ID_COOKIE, userId);
  const forwardRequest = { headers: request.headers };

  const response = NextResponse.next({ request: forwardRequest });
  const { pathname } = request.nextUrl;

  // API routes get the forwarded id but no Set-Cookie: /api/demo/reset-visitor-id
  // writes a NEW id, and a second Set-Cookie carrying the old one could undo it.
  if (pathname.startsWith("/api/")) return response;

  // Always (re)write the visitor id domain-wide and purge any legacy host-only
  // duplicate, so it stays a single cookie shared with the Optimizely Web snippet and
  // the client re-buckets correctly after a reset. See visitorCookie.ts.
  appendVisitorCookie(response.headers, userId, host);

  // Skip preview, demo pages and Next.js 16 .segments/ prefetch URLs (rewriting them produces a cached 404).
  if (pathname.startsWith("/preview")) return response;
  if (/^\/demo(\/|$)/.test(pathname)) return response;
  if (pathname.includes(".segments/")) return response;

  // Middleware never sees its own rewrites, so a __v_ path here was requested
  // directly. Keep segments the datafile knows (variation URLs stay shareable for
  // demos) and redirect away the rest, so made-up segments can't mint ISR entries.
  if (pathname.includes(VARIATION_MARKER)) {
    const datafile = await fetchDatafile(3000);
    if (!datafile) return response;
    const segments = pathname.split("/");
    const kept = segments.filter((segment) => {
      if (!isVariationSegment(segment)) return true;
      const variation = parseVariationSegment(segment);
      return variation !== null && isKnownVariation(datafile, variation);
    });
    if (kept.length === segments.length) return response;
    const url = request.nextUrl.clone();
    url.pathname = kept.join("/") || "/";
    const redirect = NextResponse.redirect(url, 307);
    appendVisitorCookie(redirect.headers, userId, host);
    return redirect;
  }

  // CMS-driven redirects. Runs on the clean path, BEFORE the FX rewrite appends
  // any /__v_ segment (which would break plain-path matching). The /api/ guard
  // above returns first, so the /api/redirects lookup can't recurse.
  try {
    const rules = await loadRedirectRules(request.nextUrl.origin);
    const hit = rules.length ? matchRedirect(pathname, rules) : null;
    if (hit) {
      const dest = /^https?:\/\//i.test(hit.toPath)
        ? new URL(hit.toPath)
        : new URL(hit.toPath, request.nextUrl.origin);
      if (!dest.search && request.nextUrl.search) dest.search = request.nextUrl.search;
      const redirect = NextResponse.redirect(dest, hit.status);
      appendVisitorCookie(redirect.headers, userId, host);
      return redirect;
    }
  } catch {
    // Never fail a request because of the redirect lookup.
  }

  try {
    const datafile = await fetchDatafile(3000);
    if (!datafile) return response;

    const client = createInstance({
      projectConfigManager: createStaticProjectConfigManager({ datafile }),
      requestHandler: noOpRequestHandler,
    });

    const ctx = client.createUserContext(
      userId,
      buildFxAttributes({
        userAgent: request.headers.get("user-agent") ?? "",
        host,
        cookie: (name) => request.cookies.get(name)?.value,
      })
    );
    if (!ctx) return response;

    const decisions = ctx.decideAll([OptimizelyDecideOption.DISABLE_DECISION_EVENT]);
    // Only flags that drive CMS content (variation variable cms_flag === true) create
    // cache routes. Component-level experiments resolve client-side and are excluded
    // here so they don't fragment the ISR cache key. Then keep only experiments whose
    // cms_route targets THIS path - a visitor may match many CMS experiments across the
    // site, but only the one authored on the current page should be applied here.
    // Sorted by variationKey for a stable cache key, then capped as a safety backstop.
    const activeDecisions = Object.values(decisions)
      .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
      .filter((d) => d.variables?.cms_flag === true)
      .filter((d) => routeMatches(pathname, d.variables?.cms_route as string | undefined))
      .sort((a, b) => (a.variationKey as string).localeCompare(b.variationKey as string))
      .slice(0, MAX_CMS_VARIATIONS);

    // Build variation segments from FX decisions.
    // Append one __v_ segment per active decision encoding flagKey--variationKey.
    // e.g. /savings → /savings/__v_homepage--business
    // The page reads flagKey from the segment — no extra SDK call needed client-side.
    const cmsVariationSegments = activeDecisions.map((d) =>
      formatVariationSegment({ flagKey: d.flagKey, variationKey: d.variationKey as string })
    );

    // Web Experimentation cookie-bridge: if a WX custom JS action wrote
    // opti_wx_variation=<flagKey>--<variationKey>, inject it as a __v_ segment on the
    // next request (the cookie is written client-side so the first page load always
    // serves base content). FX takes precedence — WX only applies when FX has no
    // active decision for the same flagKey. The cookie is visitor-writable, so it only
    // applies when the datafile defines that flag and variation.
    const wxCookie = request.cookies.get("opti_wx_variation")?.value;
    const wxVariation = wxCookie ? knownVariation(datafile, wxCookie) : null;
    if (wxVariation && !activeDecisions.some((d) => d.flagKey === wxVariation.flagKey)) {
      cmsVariationSegments.push(formatVariationSegment(wxVariation));
    }

    if (cmsVariationSegments.length === 0) return response;

    const url = request.nextUrl.clone();
    url.pathname = url.pathname.replace(/\/$/, "") + `/${cmsVariationSegments.join("/")}`;
    return NextResponse.rewrite(url, { request: forwardRequest, headers: response.headers });
  } catch {
    // Never fail a request due to FX errors.
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|sitemap.xml|robots.txt).*)"],
};
