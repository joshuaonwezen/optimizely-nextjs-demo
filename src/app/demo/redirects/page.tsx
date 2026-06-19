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
// A data-only content type - no visual rendering.
// Editors create one item per redirect rule in the CMS.

import { contentType } from "@optimizely/cms-sdk";

export const RedirectRuleType = contentType({
  key: "RedirectRule",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  displayName: "Redirect Rule",
  description: "Maps an old URL path to a new destination. Consumed by Next.js middleware.",
  properties: {
    fromPath:   { type: "string",  displayName: "From path",   indexingType: "queryable" },
    toPath:     { type: "string",  displayName: "To path",     indexingType: "queryable" },
    statusCode: {
      type: "string",
      displayName: "Status code",
      description: "301/308 = permanent. 302/307 = temporary. 307/308 preserve the HTTP method.",
      format: "select",
      enumValues: ["301", "302", "307", "308"],
      indexingType: "queryable",
    },
    isActive: { type: "boolean", displayName: "Active" },
  },
});

export default function RedirectRule() {
  return null;
}`;

const GRAPH_QUERY_SNIPPET = `// src/lib/graphql/queries/GetRedirectRules.ts

export const GET_REDIRECT_RULES_QUERY = /* GraphQL */ \`
  query GetRedirectRules {
    RedirectRule(
      where: { isActive: { eq: true } }
      limit: 500
    ) {
      items {
        fromPath
        toPath
        statusCode
      }
    }
  }
\`;`;

const MIDDLEWARE_SNIPPET = `// src/middleware.ts (additions)
// Check redirect rules before the Feature Experimentation rewrite so the
// plain path is always what gets matched (no variation segment appended yet).

import { GET_REDIRECT_RULES_QUERY } from "@/lib/graphql/queries/GetRedirectRules";
import { graphqlFetch } from "@/lib/optimizely/client";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  // ... existing userId cookie logic ...

  if (request.nextUrl.pathname.startsWith("/api/")) return response;
  if (request.nextUrl.pathname.startsWith("/preview")) return response;
  if (/^\\/demo(\\/|$)/.test(request.nextUrl.pathname)) return response;

  try {
    const rulesRes = await graphqlFetch(
      GET_REDIRECT_RULES_QUERY,
      {},
      { next: { revalidate: 3600, tags: ["redirects"] } }
    );
    const rules    = rulesRes.data?.RedirectRule?.items ?? [];
    const match    = rules.find((r) => r.fromPath === request.nextUrl.pathname);

    if (match?.toPath) {
      const destination = new URL(match.toPath, request.nextUrl.origin);
      const status      = parseInt(match.statusCode ?? "301", 10);
      return NextResponse.redirect(destination, { status });
    }
  } catch {
    // Never fail a request due to redirect lookup errors.
  }

  // ... existing Feature Experimentation variation rewrite logic ...
}

// Cache strategy: 3600s revalidate keeps the lookup in Next.js's fetch cache.
// Add "redirects" to the publish webhook handler so new rules go live instantly:
//   revalidateTag("redirects");  // alongside "page" and "navigation"`;

const STATIC_SNIPPET = `// next.config.mjs
// Resolved before middleware - zero latency. Supports wildcards and regex.
// Trade-off: every new redirect requires a code change and a deployment.

export default {
  async redirects() {
    return [
      { source: "/savings-accounts", destination: "/savings",      permanent: true  },  // 301
      { source: "/promo-summer",      destination: "/offers",       permanent: false },  // 302
      { source: "/personal/:path*",   destination: "/retail/:path*", permanent: true  },  // wildcard
    ];
  },
};

// next.config only supports 301/302 (permanent: true/false).
// For 307/308 (method-preserving), use the CMS-managed approach via middleware.`;

const SITEMAP_SNIPPET = `// No changes needed to src/app/sitemap.ts.
//
// GET_ALL_PAGE_PATHS_QUERY only returns currently published pages.
// When an editor unpublishes or renames the old page, Graph stops
// returning its URL - it disappears from the sitemap automatically.
//
// redirect rule  →  handles the HTTP 301 for browsers and crawlers
// sitemap        →  only lists the new canonical URL
//
// If the old page stays published (intentionally), add a canonical tag
// in generateMetadata pointing to the new URL:
alternates: { canonical: \`\${siteUrl}/savings\` }`;

export default function RedirectsDemoPage() {
  return (
    <>
      <DemoHero
        title="URL Redirects"
        description="In a traditional CMS, the platform creates 301 redirects automatically when a page moves. In a headless setup that responsibility shifts to the app layer - here are two ways to handle it."
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
            and the old URL silently 404s - breaking bookmarks, backlinks, and SEO equity.
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
                    <span className="mt-0.5 text-green-500 font-bold shrink-0">+</span>
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
                    <span className="mt-0.5 text-amber-500 font-bold shrink-0">!</span>
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
            Store redirect rules as content in the CMS. A{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectRule</code>{" "}
            content type gives editors a form-based UI to add rules directly - no developer
            involvement, no deployments. Next.js middleware queries the rules from Graph
            (cached at 3600s) and issues the redirect before the request reaches the page router.
          </p>

          <div className="space-y-6">
            <CodeBlock code={CONTENT_TYPE_SNIPPET} label="RedirectRule content type" />
            <CodeBlock code={GRAPH_QUERY_SNIPPET} label="Graph query - fetch active rules" />
            <CodeBlock code={MIDDLEWARE_SNIPPET} label="src/middleware.ts - redirect check + cache strategy" />
          </div>

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
            For content pages 301 and 302 cover almost every case. Use 307/308 only when redirecting
            API endpoints or form actions where the HTTP method must not change to a GET.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { code: "301", label: "Permanent", method: "May change to GET", seo: "Transfers equity", use: "Page renames, URL restructuring" },
              { code: "302", label: "Temporary", method: "May change to GET", seo: "Does not transfer", use: "Promos, maintenance pages" },
              { code: "307", label: "Temporary", method: "Preserved", seo: "Does not transfer", use: "Temporary API or form endpoint moves" },
              { code: "308", label: "Permanent", method: "Preserved", seo: "Transfers equity", use: "Permanent API endpoint migrations" },
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
            Option B: static redirects in <code className="font-mono text-xl">next.config.mjs</code>
            <SectionAnchor id="static" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Next.js resolves these before middleware runs - zero latency, wildcard and regex support.
            The trade-off: every change requires a code deployment. Good for one-time migrations
            (a rebrand, a URL cleanup pass). Use both together: static for known legacy redirects,
            CMS-managed for anything editors need to control going forward.
          </p>
          <CodeBlock code={STATIC_SNIPPET} label="next.config.mjs - zero-latency, deployment required" />
        </section>

        <section id="sitemap">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Sitemap consistency
            <SectionAnchor id="sitemap" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Redirects and the sitemap are complementary - not redundant. The redirect handles
            the HTTP 301; the sitemap handles canonicality. When the old page is unpublished,
            Graph stops returning its URL and it drops out of the sitemap automatically.
            No changes to <code className="bg-surface-low px-1 rounded font-mono text-xs">sitemap.ts</code> needed.
          </p>
          <CodeBlock code={SITEMAP_SNIPPET} label="Sitemap and redirects - how they complement each other" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Headless CMSes don&apos;t create redirects automatically.</strong> The CMS provides content data only - the app layer must manage redirects explicitly.</>,
          <><strong className="text-on-surface">CMS-managed rules give editors self-service control.</strong> A <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectRule</code> content type means no deployments needed for new redirects.</>,
          <><strong className="text-on-surface">Run the redirect check before the FX rewrite in middleware.</strong> Otherwise variation segments in the URL break the path match.</>,
          <><strong className="text-on-surface">Cache at 3600s, flush with a webhook tag.</strong> Redirect rules are stable - long TTL keeps middleware fast, the <code className="bg-surface-low px-1 rounded font-mono text-xs">&quot;redirects&quot;</code> tag activates new rules in seconds without busting page cache.</>,
          <><strong className="text-on-surface">Use 301/302 for content pages, 307/308 for API endpoints.</strong> Method-preserving codes only matter when clients must retry a POST against the new URL.</>,
        ]} />

      </div>
    </>
  );
}
