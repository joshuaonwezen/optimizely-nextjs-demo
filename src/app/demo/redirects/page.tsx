import type { Metadata } from "next";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";

export const metadata: Metadata = {
  title: "URL Redirects",
};

const CONTENT_TYPE_SNIPPET = `// src/components/blocks/RedirectRule/index.tsx
// One row per redirect. Data-only - renders nothing.

import { contentType } from "@optimizely/cms-sdk";

export const RedirectRuleType = contentType({
  key: "RedirectRule",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  displayName: "Redirect Rule",
  properties: {
    fromPath:      { type: "string",  displayName: "From path (old URL)",  indexingType: "queryable" },
    toPath:        { type: "string",  displayName: "To path (new URL)",    indexingType: "queryable" },
    permanent:     { type: "boolean", displayName: "Permanent (308). Off = temporary (307).", indexingType: "queryable" },
    matchSubpaths: { type: "boolean", displayName: "Also redirect everything under this path" },
    enabled:       { type: "boolean", displayName: "Enabled", indexingType: "queryable" },
    note:          { type: "string",  displayName: "Internal note" },
  },
});

export default function RedirectRule() { return null; }


// src/components/blocks/RedirectConfig/index.tsx
// The singleton every editor opens - a content area of RedirectRule rows.
// sectionEnabled (not elementEnabled) because it owns a content area.

export const RedirectConfigType = contentType({
  key: "RedirectConfig",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  displayName: "Redirect Config",
  properties: {
    rules: { type: "array", displayName: "Redirect rules",
             items: { type: "content", allowedTypes: [RedirectRuleType] } },
    notes: { type: "string", displayName: "Notes for editors" },
  },
});

export default function RedirectConfig() { return null; }`;

const GRAPH_QUERY_SNIPPET = `// src/lib/graphql/queries/GetRedirectRules.ts

// Fetch the singleton by type, newest first. No where-clause on 'enabled' -
// filtering a field the Graph schema has not synced as queryable errors the
// whole query, so the enabled check happens in JS (same as GetSiteBanner).
const GET_REDIRECT_RULES_QUERY = /* GraphQL */ \`
  query GetRedirectRules {
    RedirectConfig(orderBy: { _metadata: { lastModified: DESC } }, limit: 10) {
      items {
        rules {
          ... on RedirectRule { fromPath toPath permanent matchSubpaths enabled }
        }
      }
    }
  }
\`;

export async function getRedirectRules() {
  const result = await graphqlFetch(GET_REDIRECT_RULES_QUERY, {},
    { next: { revalidate: 3600, tags: ["redirects"] } });
  return (result.data?.RedirectConfig?.items?.[0]?.rules ?? [])
    .filter((r) => r && r.enabled !== false && r.fromPath && r.toPath)
    .sort((a, b) => b.fromPath.length - a.fromPath.length); // exact beats prefix
}`;

const ROUTE_HANDLER_SNIPPET = `// src/app/api/redirects/route.ts
// Middleware has no Data Cache. This route does: the Graph call is cached with
// tags: ["redirects"], and the publish webhook busts it with
// revalidateTag("redirects"). Middleware reads this small JSON instead of Graph.

import { NextResponse } from "next/server";
import { getRedirectRules } from "@/lib/graphql/queries/GetRedirectRules";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json({ rules: await getRedirectRules() });
}`;

const MIDDLEWARE_SNIPPET = `// src/lib/redirects.ts - edge-safe, mirrors datafile.ts

const TTL_MS = 30_000;
let cache = null; // best-effort: a cold worker just does the subrequest

export async function loadRedirectRules(origin) {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  try {
    const res = await fetch(\`\${origin}/api/redirects\`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return cache?.rules ?? [];
    cache = { at: Date.now(), rules: (await res.json()).rules ?? [] };
    return cache.rules;
  } catch { return cache?.rules ?? []; }
}


// src/middleware.ts - after the /api, /preview, /demo, __v_ and .segments/
// guards, BEFORE the Feature Experimentation rewrite (which would append a
// /__v_ segment and break the plain-path match).

import { loadRedirectRules, matchRedirect } from "@/lib/redirects";

export async function middleware(request) {
  const response = NextResponse.next();
  // ... existing userId cookie logic ...

  if (request.nextUrl.pathname.startsWith("/api/")) return response;
  if (request.nextUrl.pathname.startsWith("/preview")) return response;
  if (/^\\/demo(\\/|$)/.test(request.nextUrl.pathname)) return response;
  if (request.nextUrl.pathname.includes("__v_")) return response;
  if (request.nextUrl.pathname.includes(".segments/")) return response;

  try {
    const rules = await loadRedirectRules(request.nextUrl.origin);
    const hit = rules.length ? matchRedirect(request.nextUrl.pathname, rules) : null;
    if (hit) {
      const dest = /^https?:\\/\\//i.test(hit.toPath)
        ? new URL(hit.toPath)
        : new URL(hit.toPath, request.nextUrl.origin);
      if (!dest.search && request.nextUrl.search) dest.search = request.nextUrl.search;
      return NextResponse.redirect(dest, hit.status); // 308 permanent, 307 temporary
    }
  } catch {
    // Never fail a request due to redirect lookup errors.
  }

  // ... existing Feature Experimentation variation rewrite logic ...
}

// Add "redirects" to the publish webhook handler (src/app/api/webhooks/route.ts):
//   revalidateTag("redirects");  // alongside "page" and "navigation"`;

const STATIC_SNIPPET = `// next.config.ts
// Resolved before middleware - zero latency. Supports wildcards and regex.
// Trade-off: every new redirect requires a code change and a deployment.

const nextConfig = {
  async redirects() {
    return [
      { source: "/savings-accounts", destination: "/savings",      permanent: true  },  // 301
      { source: "/promo-summer",      destination: "/offers",       permanent: false },  // 302
      { source: "/personal/:path*",   destination: "/retail/:path*", permanent: true  },  // wildcard
    ];
  },
};

// next.config only emits 301/302 (permanent: true/false). The CMS-managed
// middleware path emits 308/307, which Google treats as the SEO equivalents.`;

const SITEMAP_SNIPPET = `// No changes needed to src/app/sitemap.ts.
//
// GET_ALL_PAGE_PATHS_QUERY only returns currently published pages.
// When an editor unpublishes or renames the old page, Graph stops
// returning its URL - it disappears from the sitemap automatically.
//
// redirect rule  ->  handles the HTTP 308 for browsers and crawlers
// sitemap        ->  only lists the new canonical URL
//
// If the old page stays published (a vanity URL pointing at a live page),
// add a canonical tag in generateMetadata pointing at the real URL:
alternates: { canonical: \`\${siteUrl}/savings\` }`;

export default function RedirectsDemoPage() {
  return (
    <>
      <DemoHero
        title="URL Redirects"
        description="In a traditional CMS, the platform creates 301 redirects automatically when a page moves. In a headless setup that responsibility shifts to the app layer - here is how this project handles it."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="problem">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The problem: URL changes in a headless CMS
            <SectionAnchor id="problem" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            In Optimizely CMS 12/13, WordPress, and Sitecore the platform owns HTTP routing - rename
            a page and the CMS creates a redirect automatically. In a headless setup the CMS only
            provides content data via API; Next.js owns routing. Change a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">routeSegment</code>{" "}
            and the old URL silently 404s - breaking bookmarks, backlinks, and SEO equity. There is
            also no built-in way to point a short marketing URL at an existing page.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-3">Traditional CMS</p>
              <ul className="space-y-2">
                {[
                  "Platform owns URL routing",
                  "Page rename triggers automatic 301",
                  "No developer involvement needed",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="mt-0.5 text-brand font-bold shrink-0">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-3">Headless CMS</p>
              <ul className="space-y-2">
                {[
                  "CMS provides content data only",
                  "Next.js owns routing - no auto-redirect",
                  "App layer must manage redirects explicitly",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="mt-0.5 text-error font-bold shrink-0">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="cms-managed">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Option A: CMS-managed redirect rules
            <SectionAnchor id="cms-managed" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Store redirect rules as content. A single{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectConfig</code>{" "}
            shared block holds a list of{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectRule</code>{" "}
            rows - editors see and edit every redirect on one screen, no developer involvement, no
            deployments. Middleware issues the redirect before the request reaches the page router,
            so it works for still-published pages (vanity URLs) as well as 404 recovery.
          </p>

          <div className="space-y-6">
            <CodeBlock code={CONTENT_TYPE_SNIPPET} label="RedirectRule + RedirectConfig content types" />
            <CodeBlock code={GRAPH_QUERY_SNIPPET} label="Graph query - fetch the singleton, inline-expand the rows" />
            <CodeBlock code={ROUTE_HANDLER_SNIPPET} label="src/app/api/redirects/route.ts - the cached source of truth" />
            <CodeBlock code={MIDDLEWARE_SNIPPET} label="src/lib/redirects.ts + src/middleware.ts - the redirect check" />
          </div>

          <Callout variant="note">
            <strong>Why the route handler.</strong>{" "}
            Middleware has no Data Cache and the proxy docs warn against relying on globals, so a
            direct Graph call there would run on every request and the publish webhook could never
            bust it. The{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/api/redirects</code>{" "}
            route handler caches the Graph call and is busted instantly by{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">revalidateTag(&quot;redirects&quot;)</code>;
            middleware reads that small JSON through a ~30s in-memory guard, so the hot path does
            zero I/O.
          </Callout>

          <Callout variant="note">
            <strong>Run the redirect check before the FX variation rewrite.</strong>{" "}
            If it runs after, the URL already has a variation segment appended (e.g.{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/savings-accounts/__v_homepage--business</code>)
            and the plain-path match fails.
          </Callout>
        </section>

        <section id="status-codes">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Choosing a status code
            <SectionAnchor id="status-codes" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            The CMS-managed path exposes one checkbox - <em>Permanent</em> - and emits{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">308</code> when it is on,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">307</code> when it is off.
            Google treats 308 as 301 and 307 as 302 for SEO, and both preserve the HTTP method.
            Emitting a literal 301/302 would need a route-level{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">Response</code>{" "}
            rather than{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">NextResponse.redirect</code>;
            for content pages it is not worth the extra surface.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { code: "308", label: "Permanent - checkbox on", method: "Preserved", seo: "Transfers equity (like 301)", use: "Page renames, URL restructuring, vanity URLs" },
              { code: "307", label: "Temporary - checkbox off", method: "Preserved", seo: "Does not transfer (like 302)", use: "Promos, campaigns, maintenance pages" },
            ].map(({ code, label, method, seo, use }) => (
              <div key={code} className="bg-surface-lowest border border-ghost-border rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono font-bold text-on-surface text-sm">{code}</span>
                  <span className="text-xs text-on-surface-variant">{label}</span>
                </div>
                <dl className="space-y-1">
                  {([["HTTP method", method], ["SEO equity", seo], ["Use for", use]] as const).map(([key, val]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <dt className="text-on-surface-variant w-24 shrink-0">{key}</dt>
                      <dd className="text-on-surface">{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section id="static">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Option B: static redirects in <code className="font-mono text-xl">next.config.ts</code>
            <SectionAnchor id="static" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Next.js resolves these before middleware runs - zero latency, wildcard and regex support.
            The trade-off: every change requires a code deployment. Good for one-time migrations
            (a rebrand, a URL cleanup pass). Use both together: static for known legacy redirects,
            CMS-managed for anything editors need to control going forward.
          </p>
          <CodeBlock code={STATIC_SNIPPET} label="next.config.ts - zero-latency, deployment required" />
        </section>

        <section id="sitemap">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Sitemap consistency
            <SectionAnchor id="sitemap" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Redirects and the sitemap are complementary - not redundant. The redirect handles
            the HTTP 308; the sitemap handles canonicality. When the old page is unpublished,
            Graph stops returning its URL and it drops out of the sitemap automatically.
            No changes to <code className="bg-surface-low px-1 rounded font-mono text-xs">sitemap.ts</code> needed.
          </p>
          <CodeBlock code={SITEMAP_SNIPPET} label="Sitemap and redirects - how they complement each other" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Headless CMSes don&apos;t create redirects automatically.</strong> The CMS provides content data only - the app layer must manage redirects explicitly.</>,
          <><strong className="text-on-surface">One <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectConfig</code> block, edited on one screen.</strong> A content area of <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectRule</code> rows means no deployments for new redirects, and it covers live URLs, not just 404s.</>,
          <><strong className="text-on-surface">Middleware reads a cached route handler, not Graph.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">/api/redirects</code> caches the query and the <code className="bg-surface-low px-1 rounded font-mono text-xs">&quot;redirects&quot;</code> webhook tag activates new rules in seconds; a ~30s in-memory guard keeps the hot path I/O-free.</>,
          <><strong className="text-on-surface">Run the redirect check before the FX rewrite in middleware.</strong> Otherwise variation segments in the URL break the path match.</>,
          <><strong className="text-on-surface">The checkbox picks 308 or 307.</strong> Google treats them as 301/302 for SEO; both preserve the HTTP method.</>,
        ]} />

      </div>
    </>
  );
}
