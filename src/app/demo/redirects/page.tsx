import type { Metadata } from "next";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";

export const metadata: Metadata = {
  title: "URL Redirects",
};

const PROBLEM_SNIPPET = `// Traditional CMS (Optimizely CMS 12/13, WordPress, Sitecore, Drupal):
// The platform owns HTTP routing. When an editor renames a page,
// the CMS can automatically create a 301 redirect.
//
// Headless CMS (Optimizely SaaS):
// The CMS only provides content data. Next.js owns routing.
// When an editor changes a page's routeSegment from
//   /savings-accounts  →  /savings
// ...the old URL silently 404s. No redirect is created automatically.
//
// Result: broken bookmarks, lost SEO link equity, and confused users
// who bookmarked the old URL.
//
// The fix: redirect management must live in the app layer.
// There are two approaches - static (next.config) or CMS-managed.`;

const STATIC_SNIPPET = `// next.config.mjs
// Redirects defined here are resolved before middleware runs - zero latency.
// They never reach the Next.js server if matched at the edge.

export default {
  async redirects() {
    return [
      // Permanent redirect - passes SEO equity to the new URL
      {
        source:      "/savings-accounts",
        destination: "/savings",
        permanent:   true,   // HTTP 301
      },
      // Temporary redirect - does not transfer SEO equity
      {
        source:      "/promo-summer",
        destination: "/offers",
        permanent:   false,  // HTTP 302
      },
      // Wildcard - redirect an entire renamed section
      {
        source:      "/personal/:path*",
        destination: "/retail/:path*",
        permanent:   true,
      },
    ];
  },
};

// Limitations:
// - Every new redirect requires a code change and a deployment
// - Good for one-time URL migrations (rebrands, URL cleanup)
// - Not practical for ongoing editorial URL changes`;

const STATUS_CODES_SNIPPET = `// The four redirect status codes - choose based on permanence and HTTP method behaviour.
//
// 301 - Permanent, method may change
//   The resource has moved permanently. Browsers cache this aggressively.
//   Search engines transfer link equity (PageRank) to the new URL.
//   The HTTP method CAN change on redirect - a POST may become a GET.
//   Use for: page renames, URL restructuring, anything SEO-critical.
//
// 302 - Temporary, method may change
//   The resource is temporarily at a different location. Not cached by browsers.
//   Search engines do NOT transfer link equity - the original URL stays indexed.
//   The HTTP method CAN change on redirect.
//   Use for: maintenance pages, seasonal promotions, A/B test traffic splitting.
//
// 307 - Temporary, method preserved
//   Identical to 302 in terms of caching and SEO behaviour.
//   The HTTP method is GUARANTEED to be preserved - a POST stays a POST.
//   Use for: form submissions, API endpoints, anything where method matters.
//
// 308 - Permanent, method preserved
//   Identical to 301 in terms of caching and SEO behaviour.
//   The HTTP method is GUARANTEED to be preserved - a POST stays a POST.
//   Use for: permanent API endpoint migrations where clients POST to the old path.
//
// For content pages (HTML responses):
//   301 and 302 are almost always the right choice. Browsers follow them
//   with a GET regardless, which is what you want for page navigation.
//
// For API endpoints or form actions:
//   Use 307 (temporary) or 308 (permanent) to ensure the client retries
//   the original request method against the new URL.`;

const CONTENT_TYPE_SNIPPET = `// src/components/blocks/RedirectRule/index.tsx
// A standalone _component content type - not a visual block, just a data record.
// Editors create one item per redirect rule in the CMS.

import { contentType } from "@optimizely/cms-sdk";

export const RedirectRuleType = contentType({
  key: "RedirectRule",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  displayName: "Redirect Rule",
  description: "Maps an old URL path to a new destination. Consumed by Next.js middleware.",
  properties: {
    fromPath: {
      type: "string",
      displayName: "From path",
      description: "The old URL path, starting with /. Example: /savings-accounts",
      indexingType: "queryable",
    },
    toPath: {
      type: "string",
      displayName: "To path",
      description: "The destination URL path or absolute URL.",
      indexingType: "queryable",
    },
    statusCode: {
      type: "string",
      displayName: "Status code",
      description: "301/308 = permanent. 302/307 = temporary. 307/308 preserve the HTTP method.",
      format: "select",
      enumValues: ["301", "302", "307", "308"],
      indexingType: "queryable",
    },
    isActive: {
      type: "boolean",
      displayName: "Active",
      description: "Inactive rules are ignored by middleware.",
    },
  },
});

export default function RedirectRule() {
  return null; // no visual rendering - data-only content type
}`;

const GRAPH_QUERY_SNIPPET = `// src/lib/graphql/queries/GetRedirectRules.ts
// Fetches all active redirect rules. Only three fields needed - keep the query small.

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
\`;

// The query filters to isActive: true in Graph so the middleware never
// has to evaluate inactive rules. Limit 500 is generous - most sites
// have fewer than 100 active redirects at any time.`;

const MIDDLEWARE_SNIPPET = `// src/middleware.ts (additions)
// Add redirect checking before the Feature Experimentation logic.
// Redirects are higher priority than FX variation rewrites.

import { GET_REDIRECT_RULES_QUERY } from "@/lib/graphql/queries/GetRedirectRules";
import { graphqlFetch } from "@/lib/optimizely/client";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  // ... existing userId cookie logic ...

  // Skip API, preview, and demo routes
  if (request.nextUrl.pathname.startsWith("/api/")) return response;
  if (request.nextUrl.pathname.startsWith("/preview")) return response;
  if (/^\\/demo(\\/|$)/.test(request.nextUrl.pathname)) return response;

  // Check CMS-managed redirect rules first.
  // graphqlFetch caches at the Next.js fetch layer - 3600s revalidate.
  try {
    const rulesRes = await graphqlFetch(
      GET_REDIRECT_RULES_QUERY,
      {},
      { next: { revalidate: 3600, tags: ["redirects"] } }
    );
    const rules = rulesRes.data?.RedirectRule?.items ?? [];
    const pathname = request.nextUrl.pathname;

    const match = rules.find((r) => r.fromPath === pathname);
    if (match?.toPath) {
      const destination = new URL(match.toPath, request.nextUrl.origin);
      const status = parseInt(match.statusCode ?? "301", 10);
      return NextResponse.redirect(destination, { status });
    }
  } catch {
    // Never fail a request due to redirect lookup errors.
  }

  // ... existing Feature Experimentation variation rewrite logic ...
}`;

const CACHE_SNIPPET = `// Redirect rules are stable - they change only when an editor adds or removes one.
// Use a long revalidate so the lookup is almost always served from Next.js's
// fetch cache, not from a live Graph request.

await graphqlFetch(
  GET_REDIRECT_RULES_QUERY,
  {},
  { next: { revalidate: 3600, tags: ["redirects"] } }  // 1 hour, tagged for instant flush
);

// The "redirects" tag allows the publish webhook to flush only the redirect
// cache when an editor publishes a new RedirectRule - without busting the
// page or navigation cache.

// In src/app/api/revalidate/route.ts (existing webhook handler):
revalidateTag("redirects");   // add alongside "page" and "navigation"

// Timeline:
// - Editor adds a new rule in the CMS and publishes
// - CMS fires the publish webhook
// - Webhook handler calls revalidateTag("redirects")
// - Next request fetches fresh rules from Graph
// - New redirect is live within seconds, no deployment needed`;

const SITEMAP_SNIPPET = `// src/app/sitemap.ts
// No changes needed for redirect support.
//
// The GET_ALL_PAGE_PATHS_QUERY already only returns currently published,
// Graph-indexed pages. When an editor:
//
//   1. Creates a RedirectRule: /savings-accounts → /savings
//   2. Unpublishes (or changes the routeSegment of) the /savings-accounts page
//
// Graph stops returning the old URL automatically - it is absent from the
// sitemap. The new /savings URL is the only entry.
//
// The redirect rule handles the HTTP layer (301 for crawlers and browsers).
// The sitemap handles canonicality (only the new URL is listed).
// Together they give search engines a consistent, unambiguous signal.
//
// One edge case: if the old page is not unpublished (it still exists but
// you also want to redirect), add a canonical tag pointing to the new URL
// from the old page so crawlers treat the new URL as authoritative.
//
// generateMetadata in src/app/[[...slug]]/page.tsx:
alternates: {
  canonical: \`\${siteUrl}/savings\`,  // new URL, not the current page URL
},`;

export default function RedirectsDemoPage() {
  return (
    <>
      <DemoHero
        title="URL Redirects"
        description="Why URL changes silently break things in a headless CMS - and two approaches to fix it: static redirects baked into the build, or CMS-managed rules that editors control without deployments."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="problem">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The problem: URL changes in a headless CMS
            <SectionAnchor id="problem" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            In a traditional CMS (Optimizely CMS 12/13, WordPress, Sitecore) the platform
            owns HTTP routing - it can automatically create a 301 redirect when an editor
            renames or moves a page. In a headless setup the CMS only provides content data
            via API; Next.js owns routing. When
            an editor changes a page&apos;s route segment, the old URL silently returns a
            404. No redirect is created automatically, and the sitemap is immediately
            inconsistent with any existing links pointing to the old URL.
          </p>

          <CodeBlock code={PROBLEM_SNIPPET} label="Why headless CMSes don't handle redirects automatically" />

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-3">Traditional CMS</p>
              <ul className="space-y-2">
                {[
                  "Platform owns URL routing",
                  "Page rename triggers automatic 301",
                  "Redirect stored in CMS database",
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
                  "URL changes cause silent 404s",
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

        <section id="static">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Option A: static redirects in <code className="font-mono text-xl">next.config.mjs</code>
            <SectionAnchor id="static" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Next.js supports a <code className="bg-surface-low px-1 rounded font-mono text-xs">redirects()</code>{" "}
            async function in <code className="bg-surface-low px-1 rounded font-mono text-xs">next.config.mjs</code>.
            These are resolved before middleware runs - at the edge, with zero latency. They support
            wildcards, regex, and query-string matching. The trade-off: every new redirect requires
            a code change and a deployment. This makes them ideal for one-time URL migrations (a rebrand,
            a URL cleanup pass) but impractical for ongoing editorial URL changes.
          </p>
          <CodeBlock code={STATIC_SNIPPET} label="next.config.mjs - built-in redirects (zero latency, requires deployment)" />
        </section>

        <section id="status-codes">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The four redirect status codes
            <SectionAnchor id="status-codes" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            301 and 302 are the most common but there are four codes in total. The distinction
            between them comes down to two axes: permanent vs. temporary, and whether the
            HTTP method is preserved on redirect. For standard content pages 301 and 302 cover
            everything - browsers follow both with a GET regardless. The method-preserving codes
            (307 and 308) matter when redirecting API endpoints or form actions where the
            client must retry the original POST against the new URL.
          </p>

          <CodeBlock code={STATUS_CODES_SNIPPET} label="301, 302, 307, 308 - permanence and method preservation" />

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {[
              { code: "301", label: "Permanent", method: "May change", seo: "Transfers equity", use: "Page renames, URL restructuring, SEO migrations" },
              { code: "302", label: "Temporary", method: "May change", seo: "Does not transfer", use: "Maintenance pages, seasonal promos, A/B splits" },
              { code: "307", label: "Temporary", method: "Preserved", seo: "Does not transfer", use: "Temporary API endpoint moves, form action changes" },
              { code: "308", label: "Permanent", method: "Preserved", seo: "Transfers equity", use: "Permanent API endpoint migrations" },
            ].map(({ code, label, method, seo, use }) => (
              <div key={code} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono font-bold text-on-surface text-sm">{code}</span>
                  <span className="text-xs text-on-surface-variant">{label}</span>
                </div>
                <dl className="space-y-1.5">
                  {[
                    ["HTTP method", method],
                    ["SEO equity", seo],
                    ["Use for", use],
                  ].map(([key, val]) => (
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

        <section id="cms-managed">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Option B: CMS-managed redirect rules
            <SectionAnchor id="cms-managed" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The more powerful approach for an editorial team: store redirect rules as content in the CMS.
            Create a <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectRule</code>{" "}
            content type with <code className="bg-surface-low px-1 rounded font-mono text-xs">fromPath</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">toPath</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">statusCode</code>, and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">isActive</code> fields.
            Editors add rules directly in the CMS - no developer involvement, no deployments. The
            Next.js middleware queries these rules from Graph (cached) and issues the redirect before
            the request reaches the page router.
          </p>

          <div className="space-y-6">
            <CodeBlock code={CONTENT_TYPE_SNIPPET} label="RedirectRule content type definition" />
            <CodeBlock code={GRAPH_QUERY_SNIPPET} label="Graph query - fetch active redirect rules" />
            <CodeBlock code={MIDDLEWARE_SNIPPET} label="src/middleware.ts - redirect check before FX variation rewrite" />
          </div>

          <Callout variant="note">
            <strong>Middleware ordering matters.</strong>{" "}
            The redirect check must come before the Feature Experimentation variation rewrite. If an
            old URL like <code className="bg-surface-low px-1 rounded font-mono text-xs">/savings-accounts</code>{" "}
            was rewritten with a variation segment (e.g.{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/savings-accounts/__v_homepage_audience--variation_1</code>),
            the redirect check would miss it. By running first, before the FX rewrite, the plain path
            is always what gets matched against redirect rules.
          </Callout>
        </section>

        <section id="cache">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Cache strategy for redirect rules
            <SectionAnchor id="cache" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Redirect rules run on every request via middleware - they must be fast. Use a long
            revalidate so the lookup is almost always served from Next.js&apos;s fetch cache, not
            from a live Graph call. Tag the cache entry with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&quot;redirects&quot;</code>{" "}
            so the publish webhook can flush it instantly when an editor adds a new rule - without
            busting the page or navigation cache.
          </p>
          <CodeBlock code={CACHE_SNIPPET} label="Cache and webhook-driven revalidation for redirect rules" />
        </section>

        <section id="comparison">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            When to use each approach
            <SectionAnchor id="comparison" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Both approaches can coexist. A common pattern is to use static redirects for a known set
            of historical redirects (baked in at build time) and CMS-managed rules for any future URL
            changes - giving editors full control going forward without touching the codebase.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                label: "Static (next.config)",
                when: "One-time migrations",
                pros: ["Zero latency - resolved at the edge", "No Graph request on each hit", "Wildcard and regex support"],
                cons: ["Requires code change + deployment", "Not editor-controlled"],
              },
              {
                label: "CMS-managed rules",
                when: "Ongoing editorial changes",
                pros: ["Editors control it directly", "No deployments needed", "Instant activation via webhook"],
                cons: ["Adds a Graph fetch in middleware", "Mitigated by a long-TTL cache"],
              },
              {
                label: "Both together",
                when: "Recommended for most sites",
                pros: ["Static for known legacy redirects", "CMS for future changes", "Editorial self-service from day one"],
                cons: ["Two places to check when debugging", "Keep static list in sync with docs"],
              },
            ].map(({ label, when, pros, cons }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-mono font-semibold text-on-surface mb-1">{label}</p>
                  <p className="text-xs text-on-surface-variant mb-3">Best for: {when}</p>
                </div>
                <ul className="space-y-1.5">
                  {pros.map((p) => (
                    <li key={p} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                      <span className="mt-0.5 text-green-500 font-bold shrink-0">+</span>
                      {p}
                    </li>
                  ))}
                  {cons.map((c) => (
                    <li key={c} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                      <span className="mt-0.5 text-amber-500 font-bold shrink-0">-</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="sitemap">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Keeping the sitemap consistent
            <SectionAnchor id="sitemap" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Redirects and sitemaps are complementary. The redirect handles the HTTP layer - users
            and crawlers following the old URL get sent to the new one. The sitemap handles
            canonicality - it should only list the new URL so crawlers know which version to index.
            In this setup both happen naturally: the redirect rule fires in middleware, and
            the sitemap query already only returns currently published Graph-indexed pages.
          </p>
          <CodeBlock code={SITEMAP_SNIPPET} label="How redirects and sitemap work together (no code changes to sitemap.ts)" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Headless CMSes don&apos;t create redirects automatically.</strong> The CMS provides content data only. When an editor changes a URL, the old path becomes a 404 unless the app layer handles it explicitly.</>,
          <><strong className="text-on-surface">Static redirects in next.config are zero-latency but require a deployment.</strong> Use them for one-time URL migrations. They run before middleware and before any Next.js routing logic.</>,
          <><strong className="text-on-surface">CMS-managed redirect rules give editors full control.</strong> A <code className="bg-surface-low px-1 rounded font-mono text-xs">RedirectRule</code> content type lets editors add and activate redirects without any developer involvement or code deployments.</>,
          <><strong className="text-on-surface">Put the redirect check before the FX variation rewrite in middleware.</strong> Running first ensures the plain path is always matched against redirect rules, before the variation segment is appended to the URL.</>,
          <><strong className="text-on-surface">Cache redirect rules aggressively, flush with a webhook.</strong> A 3600s revalidate means the lookup is almost always served from cache. The <code className="bg-surface-low px-1 rounded font-mono text-xs">&quot;redirects&quot;</code> ISR tag lets a publish webhook activate new rules in seconds.</>,
          <><strong className="text-on-surface">Redirects and sitemaps are complementary, not redundant.</strong> The redirect handles the HTTP 301; the sitemap handles canonicality. Unpublishing the old page removes it from the sitemap automatically - no additional code needed.</>,
        ]} />

      </div>
    </>
  );
}
