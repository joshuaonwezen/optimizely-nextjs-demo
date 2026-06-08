import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import SourcePanel from "@/components/demo/SourcePanel";
import { Callout } from "@/components/blocks/CalloutBlock";

export const metadata: Metadata = { title: "ISR Caching & Webhooks Demo" };

const clientTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/client.ts"),
  "utf8"
);

// This page regenerates every 30s so the "last rendered" timestamp visibly
// updates - proof that ISR is working without a full redeploy.
export const revalidate = 30;


const GRAPHQL_FETCH_SNIPPET = `// src/lib/optimizely/client.ts

export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: GraphQLRequestOptions = {}
): Promise<GraphQLResponse<T>> {
  const { previewToken, next, cache } = options;

  const fetchOptions: RequestInit = { method: "POST", headers, body };

  if (cache) {
    fetchOptions.cache = cache;               // explicit override (e.g. "no-store")
  } else if (next) {
    fetchOptions.next = next;                 // caller-specified TTL + tags
  } else if (!previewToken) {
    fetchOptions.next = { revalidate: 60 };   // published default: 60s ISR
  } else {
    fetchOptions.cache = "no-store";          // draft/preview: always fresh
  }
  // ...
}`;

const CALLER_SNIPPET = `// Callers override the default per their staleness tolerance:

// Navigation - 5 min TTL + "navigation" tag so webhooks can bust it instantly
graphqlFetch(GET_NAV_QUERY, {}, { next: { revalidate: 300, tags: ["navigation"] } });

// Banner - 60s TTL + "banner" tag
graphqlFetch(GET_BANNER_QUERY, {}, { next: { revalidate: 60, tags: ["banner"] } });

// Search - always fresh (user-typed queries must never be stale)
graphqlFetch(SEARCH_QUERY, { query: q }, { cache: "no-store" });

// Preview - always fresh (draft content must bypass ISR entirely)
graphqlFetch(QUERY, vars, { previewToken: token }); // → cache: "no-store"`;

const REVALIDATE_SNIPPET = `// POST /api/revalidate
// Header: x-revalidate-secret: <OPTIMIZELY_REVALIDATE_SECRET>
// Body:   { "path": "/about/" }   - or omit path for full-site bust

import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== process.env.OPTIMIZELY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { path } = await request.json();
  path ? revalidatePath(path) : revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, timestamp: Date.now() });
}`;

const WEBHOOKS_SNIPPET = `// POST /api/webhooks  (registered via: npm run webhook:register)
// Triggered by Optimizely Graph on every content change - no secret required
// (Graph signs requests with HMAC; validate in production)

// Payload shapes:
// { "type": "bulk.completed",  ... }  - Graph finished a content sync
// { "type": "doc.updated",     ... }  - a single item was updated
// { "type": "doc.expired",     ... }  - item reached its StopPublish date

export async function POST(request: NextRequest) {
  const body = await request.json();
  revalidatePath("/", "layout");
  revalidateTag("navigation");          // navigation is the most time-sensitive
  return NextResponse.json({ received: true });
}`;

const PUBLISH_SNIPPET = `// POST /api/publish
// Header: x-revalidate-secret: <OPTIMIZELY_REVALIDATE_SECRET>
// Triggered by CMS Settings > Events > "Content Published"

export async function POST(request: NextRequest) {
  // auth check …
  revalidatePath("/", "layout");        // bust every ISR page
  return NextResponse.json({ received: true, timestamp: Date.now() });
}`;

const GRAPH_CACHE_SNIPPET = `// Layer 2: Graph's own CDN cache at cg.optimizely.com
// Bypassed by appending ?cache=false to the endpoint URL.
// Setting cache: "no-store" in Next.js only skips Layer 1 - Graph can still
// return a cached response unless you also pass ?cache=false.

const GATEWAY = process.env.OPTIMIZELY_GRAPH_GATEWAY;
// "https://cg.optimizely.com/content/v2"

// Standard - Graph may return a CDN-cached response:
fetch(\`\${GATEWAY}\`, { method: "POST", ... });

// Bypass Graph cache - always fresh from Graph's data store:
fetch(\`\${GATEWAY}?cache=false\`, { method: "POST", ... });

// SDK methods (getContentByPath, getContent) support { cache: false }
// which adds ?cache=false to the URL automatically:
const client = getClient();
await client.getContentByPath(url, { cache: false });
await client.getContent({ key, version }, { cache: false });

// The catch-all CMS page route (src/app/[[...slug]]/page.tsx) uses ISR:
export const revalidate = 60;  // Layer 1: ISR - cache page output for 60s
// Middleware rewrites each visitor's URL with their FX variation:
//   /savings           → base users (no active variation)
//   /savings/__v_variation_1 → users in "variation_1"
// Each rewritten path is a separate ISR cache entry at the CDN.
// Graph data fetches use next: { revalidate: 60, tags: ["page"] }.`;


const NO_STORE_PATTERN = `// BAD - server component reads cookies → forces no-store on every page globally
export default async function GlobalBanner() {
  const user = await getOptimizelyUser(); // calls cookies() internally
  const decision = user.decide("banner");
  // ...
}

// GOOD - server component fetches only static data, passes it to a client component
export default async function GlobalBanner() {
  const banner = await getSiteBanner(); // plain graphqlFetch, no cookies
  return <GlobalBannerClient cmsBanner={banner} />;
}

// GlobalBannerClient.tsx
"use client";
export function GlobalBannerClient({ cmsBanner }) {
  const [banner, setBanner] = useState(() => cmsBannerToState(cmsBanner)); // initialise from props

  useEffect(() => {
    // FX decision runs client-side - no cookies() in the server render tree
    const client = await getOptimizelyBrowserClient();
    const decision = ctx.decide("banner", []); // fires bucketing event too
    if (decision.enabled) setBanner(fxBannerState(decision));
  }, []);

  return banner ? <div>{banner.message}</div> : null;
}`;

const PREFETCH_SNIPPET = `// Next.js <Link> prefetch behaviour in App Router (production only):
//
// 1. When a <Link> enters the viewport, Next.js fetches the RSC payload
//    for that route and caches it in the browser's router cache.
// 2. Clicking the link navigates instantly - no round-trip needed.
//
// Implication: always-rendered links prefetch eagerly, even if the user
// never clicks them. 20 footer links = 20 prefetch requests on every page load.

// FIX for bulk always-visible links - disable prefetch
<Link href="/demo/caching" prefetch={false}>Caching</Link>

// Hover-triggered dropdowns are fine WITHOUT prefetch={false}:
// Child <Link> elements only enter the DOM when the dropdown opens (hover).
// At that moment Next.js prefetches them - which is exactly when the user
// is most likely to click. Intentional and beneficial.
{isDropdownOpen && (
  <Link href="/en/investments">Investments</Link>  // prefetch fires on hover
)}`;

const CACHE_TABLE = [
  { data: "CMS page content",  location: "getClient().getContentByPath()", ttl: "60s",        tag: "-",            revalidatedBy: "/api/revalidate or /api/webhooks" },
  { data: "Navigation tree",   location: "getNavigation()",                ttl: "300s (5 min)", tag: "navigation",  revalidatedBy: "revalidateTag('navigation') in /api/webhooks" },
  { data: "Site banner",       location: "getSiteBanner()",                ttl: "60s",          tag: "banner",      revalidatedBy: "revalidateTag('banner') - manual" },
  { data: "External quotes",    location: "getQuotes()",                    ttl: "60s",          tag: "quotes",      revalidatedBy: "revalidateTag('quotes') - manual" },
  { data: "Page metadata",     location: "generateMetadata()",             ttl: "300s (5 min)", tag: "-",           revalidatedBy: "/api/revalidate" },
  { data: "Static page paths", location: "generateStaticParams()",         ttl: "3600s (1 hr)", tag: "-",           revalidatedBy: "Next.js build / deploy" },
  { data: "FX datafile",       location: "buildClient() in experimentation.ts", ttl: "60s",   tag: "-",            revalidatedBy: "Automatic (fetch cache)" },
  { data: "Search results",    location: "GET /api/search",                ttl: "no-store",     tag: "-",           revalidatedBy: "Always fresh - bypasses ISR" },
  { data: "Draft/preview",     location: "client.getPreviewContent()",     ttl: "no-store",  tag: "-",            revalidatedBy: "Always fresh - bypasses ISR" },
  { data: "Graph CDN cache",  location: "cg.optimizely.com/content/v2",   ttl: "Graph-managed", tag: "-",        revalidatedBy: "?cache=false on the request URL - see section below" },
  { data: "Link prefetch (RSC payload)", location: "browser router cache", ttl: "30s (default)", tag: "-",       revalidatedBy: "Page navigation or 30s expiry" },
];

export default function CachingDemoPage() {
  const renderedAt = new Date().toISOString();

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            ISR Caching &amp; Webhooks
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Optimizely Graph + Next.js ISR gives you static-site performance with
            CMS-speed updates. Pages are pre-rendered at build time and regenerated
            in the background whenever content changes - no redeploy required.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              This page revalidates every 30s
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Next.js ISR
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              revalidatePath · revalidateTag
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              3 webhook endpoints
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Live proof */}
        <section id="live-proof">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Proof of ISR <a href="#live-proof" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            This page is server-rendered with{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">export const revalidate = 30</code>.
            The timestamp below is stamped by the server at render time - it only
            changes when Next.js regenerates the page in the background (after 30 seconds
            of staleness). Hard-refreshing serves the cached version; the timestamp stays
            the same until the background regeneration completes.
          </p>
          <div className="inline-flex items-center gap-4 bg-surface-lowest border border-ghost-border rounded-2xl px-6 py-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <div>
              <div className="text-xs text-on-surface-variant font-mono uppercase tracking-wider mb-0.5">Last rendered by server</div>
              <div className="font-mono text-sm text-on-surface font-semibold">{renderedAt}</div>
            </div>
          </div>
        </section>

        {/* Cache strategy table */}
        <section id="caching-strategy">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Caching Strategy <a href="#caching-strategy" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Every data source in the project has an explicit caching policy.
            TTLs are tuned to the update frequency of each piece of data - navigation
            changes rarely so it caches for 5 minutes; banners and content change more
            often so they cache for 60 seconds. Search is always fresh.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">TTL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Cache tag</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Revalidated by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ghost-border">
                {CACHE_TABLE.map((row) => (
                  <tr key={row.data} className="bg-surface-lowest hover:bg-surface-low transition-colors">
                    <td className="px-4 py-3 font-medium text-on-surface">{row.data}</td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{row.location}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                        row.ttl === "no-store"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {row.ttl}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{row.tag}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.revalidatedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* graphqlFetch pattern */}
        <section id="graphql-fetch" className="space-y-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              The graphqlFetch Pattern <a href="#graphql-fetch" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl">
              All GraphQL requests go through a single{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">graphqlFetch()</code> helper
              in <code className="bg-surface-low px-1 rounded text-xs font-mono">src/lib/optimizely/client.ts</code>.
              It applies caching automatically based on context - published ISR by default,
              no-store for draft/preview, and caller-overridable for fine-grained control.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Core helper (caching logic)</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{GRAPHQL_FETCH_SNIPPET}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Callers override per data type</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{CALLER_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Graph CDN cache */}
        <section id="graph-cache" className="space-y-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              Graph&apos;s Response Cache - A Second Layer{" "}
              <a href="#graph-cache" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Two independent cache layers sit between an editor publishing content and a user seeing
              it. They are bypassed with different mechanisms - and{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">cache: &quot;no-store&quot;</code>{" "}
              in Next.js only skips Layer 1. Graph can still return a stale response from its own
              CDN cache unless you also add{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">?cache=false</code> to
              the endpoint URL.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">1</span>
                <h3 className="font-display font-semibold text-on-surface">Next.js Fetch Cache</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                Lives in the Node.js / Vercel infrastructure layer. Controlled entirely by the fetch
                options you pass in{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch()</code>.
              </p>
              <div className="space-y-1.5 text-xs">
                {[
                  ["Cache with TTL", "next: { revalidate: 60 }"],
                  ["Cache with tag", "next: { tags: ['navigation'] }"],
                  ["Bypass", "cache: \"no-store\""],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-on-surface-variant w-24 shrink-0">{label}</span>
                    <code className="bg-surface-low rounded px-2 py-0.5 font-mono text-on-surface">{value}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">2</span>
                <h3 className="font-display font-semibold text-on-surface">Graph CDN Cache</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                Lives at <code className="bg-surface-low px-1 rounded font-mono text-xs">cg.optimizely.com</code> on
                Optimizely&apos;s infrastructure. Applies to every request that doesn&apos;t opt out,
                regardless of what Next.js does with the response.
              </p>
              <div className="space-y-1.5 text-xs">
                {[
                  ["Cache", "(default - no action needed)"],
                  ["Bypass (raw)", "append ?cache=false to the URL"],
                  ["Bypass (SDK)", "{ cache: false } in getContentByPath"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-on-surface-variant w-24 shrink-0">{label}</span>
                    <code className="bg-surface-low rounded px-2 py-0.5 font-mono text-on-surface">{value}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
              Bypassing Graph&apos;s cache - raw URL vs SDK
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{GRAPH_CACHE_SNIPPET}</code>
            </pre>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <h3 className="font-display font-semibold text-on-surface mb-3 text-sm">
                When you need <code className="font-mono text-brand">?cache=false</code>
              </h3>
              <ul className="space-y-2.5 text-sm text-on-surface-variant">
                <li className="flex gap-2">
                  <span className="text-brand shrink-0">→</span>
                  <span>
                    <strong className="text-on-surface">Force-dynamic pages</strong> -{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">force-dynamic</code>{" "}
                    ensures Next.js re-renders the page on every request, but the fetch to Graph still
                    executes on each render. Graph has its own query result cache and may return stale
                    data if it hasn&apos;t been invalidated yet. Without{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">?cache=false</code>,
                    a user visiting right after a publish could see pre-publish content even though
                    the page itself is freshly rendered.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand shrink-0">→</span>
                  <span>
                    <strong className="text-on-surface">Seed scripts and cache-warming</strong> - after
                    indexing new content, subsequent queries need to verify the fresh data, not a
                    Graph-cached version of the old data.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand shrink-0">→</span>
                  <span>
                    <strong className="text-on-surface">Preview / draft content</strong> - ensures the
                    very latest draft is returned from Graph&apos;s data store rather than a cached
                    published version.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <h3 className="font-display font-semibold text-on-surface mb-3 text-sm">
                When you <em>don&apos;t</em> need it
              </h3>
              <ul className="space-y-2.5 text-sm text-on-surface-variant">
                <li className="flex gap-2">
                  <span className="text-brand shrink-0">→</span>
                  <span>
                    <strong className="text-on-surface">ISR pages with a revalidation window</strong> - if
                    a page revalidates every 60s, Next.js ISR is already the controlling cache.
                    Graph&apos;s short-lived CDN cache on top doesn&apos;t add meaningful staleness
                    beyond what ISR already accepts.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand shrink-0">→</span>
                  <span>
                    <strong className="text-on-surface">Navigation, banners, and other tagged caches</strong> - these
                    use 60–300s TTLs in Next.js ISR. Graph&apos;s cache sits inside that window and
                    is evicted when the tag is revalidated.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* What kills ISR */}
        <section id="no-store-killers" className="space-y-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              What kills ISR (and how to fix it){" "}
              <a href="#no-store-killers" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Next.js detects any call to{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cookies()</code> or{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">headers()</code> from{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">next/headers</code>{" "}
              during a render and forces{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cache-control: no-store</code>{" "}
              on the entire response - even if{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">export const revalidate = 60</code>{" "}
              is set on the page. The call does not have to be in the page component itself; it kills ISR
              if it is anywhere in the server render tree - including shared layout components.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                label: "Root layout components",
                detail: "GlobalBanner and ProductHeroBlock originally called getOptimizelyUser(), which reads cookies() internally. Because both are in the root layout, every CMS page in the app was forced to no-store.",
              },
              {
                label: "The call can be indirect",
                detail: "getOptimizelyUser() calls getVisitorContext() which calls cookies(). You don't need to call cookies() directly - any function in the call chain that does it will trigger the same penalty.",
              },
              {
                label: "The fix: push cookies to the client",
                detail: "Server components fetch only static, cacheable data (CMS content, Graph queries). Pass that data as props to a \"use client\" component that reads cookies and makes personalisation decisions in useEffect.",
              },
            ].map(({ label, detail }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <h3 className="font-display font-semibold text-on-surface mb-2 text-sm">{label}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
              Pattern - server fetches static data, client handles cookies
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{NO_STORE_PATTERN}</code>
            </pre>
          </div>

          <Callout label="FX banner and CTA button - how it works in this project">
            GlobalBanner: the server component fetches the CMS banner from Graph (cacheable) and passes it
            as props to <code className="bg-surface-low px-1 rounded font-mono text-xs">GlobalBannerClient</code>.
            The client component initialises its state from those props so the CMS banner renders on first
            paint with no layout shift. Then <code className="bg-surface-low px-1 rounded font-mono text-xs">useEffect</code> runs
            the FX {'"banner"'} flag decision via the browser SDK and replaces the banner if the flag is enabled.
            ProductHeroBlock uses the same pattern for its CTA button colour - the server renders the default
            colour, the client component swaps to the FX colour after hydration.
          </Callout>
        </section>

        {/* Link prefetching */}
        <section id="link-prefetch" className="space-y-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              Client-side Prefetching{" "}
              <a href="#link-prefetch" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              In production, Next.js{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;Link&gt;</code>{" "}
              automatically prefetches the RSC payload for every link that enters the viewport. The
              prefetch is cached in the browser&apos;s router cache for ~30 seconds, making
              subsequent navigation to that page instant. This is a browser-side cache - independent
              of Vercel CDN or Next.js ISR.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 space-y-3">
              <h3 className="font-display font-semibold text-on-surface text-sm">Hover-triggered dropdowns - prefetch is intentional</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                The nav dropdown children are conditionally rendered - they only enter the DOM when
                the user hovers the parent. Next.js sees them enter the viewport at hover time and
                immediately fires prefetch requests. This is the ideal moment: the user is about to
                click, so having the RSC payload ready makes navigation feel instant.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Because the pages are ISR-cached at Vercel&apos;s CDN, these prefetch requests are
                cheap CDN hits - not origin calls. Leaving default prefetch behaviour on nav dropdown
                links is correct.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 space-y-3">
              <h3 className="font-display font-semibold text-on-surface text-sm">Always-visible bulk links - use prefetch=false</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                The footer in this project renders 20 demo links on every page, always in the DOM.
                With default prefetch behaviour, every page load fires 20 RSC prefetch requests
                immediately - even if the user never scrolls to the footer.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Adding{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">prefetch={"{false}"}</code>{" "}
                to those links eliminates the unnecessary requests. Navigation to footer links is
                still fast because the ISR CDN cache is warm - the first click just fetches the RSC
                payload at that moment rather than eagerly.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
              When to use prefetch={"{false}"}
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{PREFETCH_SNIPPET}</code>
            </pre>
          </div>
        </section>

        {/* Flow diagram */}
        <section id="revalidate-flow">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How Publish → Cache Invalidation Works <a href="#revalidate-flow" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            When an editor publishes, the ISR cache is invalidated automatically - no redeploy, no manual flush.
            Here&apos;s what actually happens, step by step.
          </p>

          <div className="space-y-2 mb-8">
            {[
              {
                n: "1", color: "bg-red-500", label: "Editor hits Publish in the CMS",
                detail: "Content is saved and the CMS begins syncing it to Optimizely Graph.",
              },
              {
                n: "2", color: "bg-orange-500", label: "Graph indexes the updated content",
                detail: "Optimizely Graph processes the change and makes the new content queryable via its GraphQL API.",
              },
              {
                n: "3", color: "bg-orange-500", label: "Graph sends a POST webhook to /api/webhooks",
                detail: "Just a signal - a small JSON payload saying \"content changed\" (type: bulk.completed or doc.updated). No content is sent in the webhook itself.",
              },
              {
                n: "4", color: "bg-green-600", label: "Next.js marks cached items as stale",
                detail: "The webhook handler calls revalidateTag(\"navigation\"), revalidateTag(\"banner\"), and revalidatePath(\"/\", \"layout\"). Nothing is deleted or re-rendered yet - just flagged.",
              },
              {
                n: "5", color: "bg-purple-600", label: "Next visitor arrives - gets the old cached version instantly",
                detail: "ISR always serves the existing cached version first, no matter what. The visitor doesn't wait for a re-render. This is what makes ISR fast.",
              },
              {
                n: "6", color: "bg-purple-600", label: "Next.js re-renders in the background",
                detail: "After serving the stale version, Next.js fetches fresh data from Graph and rebuilds the affected pages and layout components behind the scenes.",
              },
              {
                n: "7", color: "bg-blue-600", label: "Every request after that gets the updated version",
                detail: "The freshly rendered output is cached. Done - no redeploy needed.",
              },
            ].map(({ n, color, label, detail }) => (
              <div key={n} className="flex gap-4 p-4 rounded-xl bg-surface-lowest border border-ghost-border">
                <div className={`shrink-0 w-7 h-7 rounded-full ${color} flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">{n}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface mb-0.5">{label}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Callout label="CMS page content is ISR-cached per variation">
              Edge middleware rewrites each visitor&apos;s URL with their active FX variation key
              (e.g. <code className="bg-surface-low px-1 rounded font-mono text-xs">/savings/__v_variation_1</code>).
              Each rewritten URL is its own 60-second ISR cache entry - base users and every variation
              are cached independently. The publish webhook marks all of them stale at once.
            </Callout>
            <Callout label="Stale-while-revalidate in plain English">
              ISR never makes a visitor wait. When a cache is stale, the <em>first</em> person
              after a publish sees the old nav/banner for one request. Everyone after sees the
              updated version. For most content this is imperceptible - nav changes are low frequency.
            </Callout>
          </div>
        </section>

        {/* Webhook endpoints */}
        <section id="webhook-endpoints" className="space-y-12">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              Webhook Endpoints <a href="#webhook-endpoints" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl">
              Three webhook routes handle different event sources. All return immediately -
              cache invalidation is synchronous but page regeneration is lazy (happens on
              the next request, not inline with the webhook).
            </p>
          </div>

          {/* /api/revalidate */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="font-display text-lg font-bold text-on-surface">POST /api/revalidate</h3>
              <span className="text-xs font-mono text-on-surface-variant">path-specific or full-site bust</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
              The most flexible endpoint. Send a specific{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">path</code> to regenerate
              one page, or omit it to bust the entire layout cache. Register this in{" "}
              <strong>CMS Settings → Events → Content Published</strong>.
              Requires the <code className="bg-surface-low px-1 rounded text-xs font-mono">x-revalidate-secret</code> header.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{REVALIDATE_SNIPPET}</code>
            </pre>
          </div>

          {/* /api/webhooks */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="font-display text-lg font-bold text-on-surface">POST /api/webhooks</h3>
              <span className="text-xs font-mono text-on-surface-variant">Optimizely Graph events</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
              Registered directly with Optimizely Graph (via{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">npm run webhook:register</code>).
              Graph calls this endpoint for three event types:{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">bulk.completed</code> (sync finished),{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">doc.updated</code> (single item changed),{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">doc.expired</code> (item hit its StopPublish date).
              No secret required - Graph authenticates with HMAC in production.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{WEBHOOKS_SNIPPET}</code>
            </pre>
          </div>

          {/* /api/publish */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="font-display text-lg font-bold text-on-surface">POST /api/publish</h3>
              <span className="text-xs font-mono text-on-surface-variant">CMS publish events - full-site bust</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
              A simpler variant of <code className="bg-surface-low px-1 rounded text-xs font-mono">/api/revalidate</code> that
              always busts the entire layout cache. Use this when you want a single
              "fire and forget" publish hook with no payload parsing. Register in{" "}
              <strong>CMS Settings → Events</strong> alongside <code className="bg-surface-low px-1 rounded text-xs font-mono">/api/revalidate</code>.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{PUBLISH_SNIPPET}</code>
            </pre>
          </div>
        </section>

        {/* Setup guide */}
        <section id="setup-guide">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-4">
            Setup Guide <a href="#setup-guide" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <ol className="space-y-4 max-w-2xl">
            {[
              { n: 1, text: "Set OPTIMIZELY_REVALIDATE_SECRET in your environment - a random string shared between the CMS and your app." },
              { n: 2, text: "In CMS admin: Settings → Events → Add event. Point to /api/revalidate (or /api/publish). Add x-revalidate-secret header with your secret." },
              { n: 3, text: "Register the Graph webhook: npm run webhook:register. This calls the Graph API to register /api/webhooks for bulk.completed, doc.updated, and doc.expired events." },
              { n: 4, text: "Publish any content in the CMS. Within seconds, the relevant ISR pages are marked stale and will regenerate on the next request." },
              { n: 5, text: "To verify: note the 'Last rendered' timestamp on this page, trigger a revalidation from the CMS, then reload - the timestamp should update on the next request." },
            ].map(({ n, text }) => (
              <li key={n} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand text-on-brand text-xs font-bold flex items-center justify-center">{n}</span>
                <p className="text-sm text-on-surface-variant leading-relaxed pt-0.5">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <SourcePanel
          heading="Source files"
          files={[
            {
              label: "client.ts",
              path: "src/lib/optimizely/client.ts",
              content: clientTs,
            },
          ]}
        />

      </div>
    </div>
  );
}
