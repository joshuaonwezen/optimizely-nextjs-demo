import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import SourcePanel from "@/components/demo/SourcePanel";

export const metadata: Metadata = { title: "ISR Caching & Webhooks Demo" };

const clientTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/client.ts"),
  "utf8"
);

// This page regenerates every 30s so the "last rendered" timestamp visibly
// updates — proof that ISR is working without a full redeploy.
export const revalidate = 30;

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

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

// Navigation — 5 min TTL + "navigation" tag so webhooks can bust it instantly
graphqlFetch(GET_NAV_QUERY, {}, { next: { revalidate: 300, tags: ["navigation"] } });

// Banner — 60s TTL + "banner" tag
graphqlFetch(GET_BANNER_QUERY, {}, { next: { revalidate: 60, tags: ["banner"] } });

// Search — always fresh (user-typed queries must never be stale)
graphqlFetch(SEARCH_QUERY, { query: q }, { cache: "no-store" });

// Preview — always fresh (draft content must bypass ISR entirely)
graphqlFetch(QUERY, vars, { previewToken: token }); // → cache: "no-store"`;

const REVALIDATE_SNIPPET = `// POST /api/revalidate
// Header: x-revalidate-secret: <OPTIMIZELY_REVALIDATE_SECRET>
// Body:   { "path": "/about/" }   — or omit path for full-site bust

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
// Triggered by Optimizely Graph on every content change — no secret required
// (Graph signs requests with HMAC; validate in production)

// Payload shapes:
// { "type": "bulk.completed",  ... }  — Graph finished a content sync
// { "type": "doc.updated",     ... }  — a single item was updated
// { "type": "doc.expired",     ... }  — item reached its StopPublish date

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
// Setting cache: "no-store" in Next.js only skips Layer 1 — Graph can still
// return a cached response unless you also pass ?cache=false.

const GATEWAY = process.env.OPTIMIZELY_GRAPH_GATEWAY;
// "https://cg.optimizely.com/content/v2"

// Standard — Graph may return a CDN-cached response:
fetch(\`\${GATEWAY}\`, { method: "POST", ... });

// Bypass Graph cache — always fresh from Graph's data store:
fetch(\`\${GATEWAY}?cache=false\`, { method: "POST", ... });

// SDK methods (getContentByPath, getContent) support { cache: false }
// which adds ?cache=false to the URL automatically:
const client = getClient();
await client.getContentByPath(url, { cache: false });
await client.getContent({ key, version }, { cache: false });

// The catch-all CMS page route (src/app/[[...slug]]/page.tsx) uses both:
export const dynamic = "force-dynamic";  // Layer 1: skip Next.js output cache
// ...
await client.getContentByPath(url, { cache: false });  // Layer 2: skip Graph CDN cache
// Result: every request gets the absolute latest content from Graph's data store.`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CACHE_TABLE = [
  { data: "CMS page content",  location: "getClient().getContentByPath()", ttl: "60s",        tag: "—",            revalidatedBy: "/api/revalidate or /api/webhooks" },
  { data: "Navigation tree",   location: "getNavigation()",                ttl: "300s (5 min)", tag: "navigation",  revalidatedBy: "revalidateTag('navigation') in /api/webhooks" },
  { data: "Site banner",       location: "getSiteBanner()",                ttl: "60s",          tag: "banner",      revalidatedBy: "revalidateTag('banner') — manual" },
  { data: "External referrals",location: "getReferrals()",                 ttl: "60s",          tag: "referrals",   revalidatedBy: "revalidateTag('referrals') — manual" },
  { data: "Page metadata",     location: "generateMetadata()",             ttl: "300s (5 min)", tag: "—",           revalidatedBy: "/api/revalidate" },
  { data: "Static page paths", location: "generateStaticParams()",         ttl: "3600s (1 hr)", tag: "—",           revalidatedBy: "Next.js build / deploy" },
  { data: "FX datafile",       location: "buildClient() in experimentation.ts", ttl: "60s",   tag: "—",            revalidatedBy: "Automatic (fetch cache)" },
  { data: "Search results",    location: "GET /api/search",                ttl: "no-store",     tag: "—",           revalidatedBy: "Always fresh — bypasses ISR" },
  { data: "Draft/preview",     location: "client.getPreviewContent()",     ttl: "no-store",  tag: "—",            revalidatedBy: "Always fresh — bypasses ISR" },
  { data: "Graph CDN cache",  location: "cg.optimizely.com/content/v2",   ttl: "Graph-managed", tag: "—",        revalidatedBy: "?cache=false on the request URL — see section below" },
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
            in the background whenever content changes — no redeploy required.
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
            The timestamp below is stamped by the server at render time — it only
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
            TTLs are tuned to the update frequency of each piece of data — navigation
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
              It applies caching automatically based on context — published ISR by default,
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
              Graph&apos;s Response Cache — A Second Layer{" "}
              <a href="#graph-cache" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Two independent cache layers sit between an editor publishing content and a user seeing
              it. They are bypassed with different mechanisms — and{" "}
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
                  ["Cache", "(default — no action needed)"],
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
              Bypassing Graph&apos;s cache — raw URL vs SDK
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
                    <strong className="text-on-surface">Force-dynamic pages</strong> —{" "}
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
                    <strong className="text-on-surface">Seed scripts and cache-warming</strong> — after
                    indexing new content, subsequent queries need to verify the fresh data, not a
                    Graph-cached version of the old data.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand shrink-0">→</span>
                  <span>
                    <strong className="text-on-surface">Preview / draft content</strong> — ensures the
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
                    <strong className="text-on-surface">ISR pages with a revalidation window</strong> — if
                    a page revalidates every 60s, Next.js ISR is already the controlling cache.
                    Graph&apos;s short-lived CDN cache on top doesn&apos;t add meaningful staleness
                    beyond what ISR already accepts.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand shrink-0">→</span>
                  <span>
                    <strong className="text-on-surface">Navigation, banners, and other tagged caches</strong> — these
                    use 60–300s TTLs in Next.js ISR. Graph&apos;s cache sits inside that window and
                    is evicted when the tag is revalidated.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Flow diagram */}
        <section id="revalidate-flow">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Publish → Revalidate Flow <a href="#revalidate-flow" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            When an editor publishes content, Next.js ISR caches are invalidated
            automatically via webhooks — no redeploy, no manual cache flush.
          </p>
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 overflow-x-auto">
            <pre className="text-xs font-mono text-on-surface-variant leading-relaxed">{`Editor publishes in CMS
        │
        ├─→ CMS fires POST /api/publish  (x-revalidate-secret header)
        │       └─→ revalidatePath("/", "layout")  — all pages marked stale
        │
        └─→ Optimizely Graph syncs content
                └─→ Graph fires POST /api/webhooks  (bulk.completed / doc.updated)
                        ├─→ revalidatePath("/", "layout")
                        └─→ revalidateTag("navigation")

Next visitor request
        └─→ Stale page detected → Next.js serves cached version immediately
                └─→ Background: server re-renders page with fresh Graph data
                        └─→ Subsequent requests get the freshly generated version`}</pre>
          </div>
        </section>

        {/* Webhook endpoints */}
        <section id="webhook-endpoints" className="space-y-12">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              Webhook Endpoints <a href="#webhook-endpoints" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl">
              Three webhook routes handle different event sources. All return immediately —
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
              No secret required — Graph authenticates with HMAC in production.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{WEBHOOKS_SNIPPET}</code>
            </pre>
          </div>

          {/* /api/publish */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="font-display text-lg font-bold text-on-surface">POST /api/publish</h3>
              <span className="text-xs font-mono text-on-surface-variant">CMS publish events — full-site bust</span>
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
              { n: 1, text: "Set OPTIMIZELY_REVALIDATE_SECRET in your environment — a random string shared between the CMS and your app." },
              { n: 2, text: "In CMS admin: Settings → Events → Add event. Point to /api/revalidate (or /api/publish). Add x-revalidate-secret header with your secret." },
              { n: 3, text: "Register the Graph webhook: npm run webhook:register. This calls the Graph API to register /api/webhooks for bulk.completed, doc.updated, and doc.expired events." },
              { n: 4, text: "Publish any content in the CMS. Within seconds, the relevant ISR pages are marked stale and will regenerate on the next request." },
              { n: 5, text: "To verify: note the 'Last rendered' timestamp on this page, trigger a revalidation from the CMS, then reload — the timestamp should update on the next request." },
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
