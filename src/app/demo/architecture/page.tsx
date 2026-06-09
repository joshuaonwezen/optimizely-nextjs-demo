import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";

export const metadata: Metadata = {
  title: "System Architecture",
};

const MARKERS = [
  { id: "arr-blue",   color: "#3b82f6" },
  { id: "arr-purple", color: "#9333ea" },
  { id: "arr-orange", color: "#f97316" },
  { id: "arr-teal",   color: "#0d9488" },
  { id: "arr-red",    color: "#ef4444" },
  { id: "arr-green",  color: "#16a34a" },
  { id: "arr-lblue",  color: "#60a5fa" },
];

function Box({
  x, y, w = 152, h = 74,
  hc, bc, stroke,
  title, sub = [],
}: {
  x: number; y: number; w?: number; h?: number;
  hc: string; bc: string; stroke: string;
  title: string; sub?: string[];
}) {
  const hh = 24;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={bc} stroke={stroke} strokeWidth={1} />
      <rect x={x} y={y} width={w} height={hh} rx={8} fill={hc} />
      <rect x={x} y={y + hh - 8} width={w} height={8} fill={hc} />
      <text
        x={x + w / 2} y={y + hh / 2 + 5}
        textAnchor="middle" fill="white"
        fontSize={11} fontWeight="bold" fontFamily="system-ui,sans-serif"
      >
        {title}
      </text>
      {sub.map((line, i) => (
        <text
          key={i}
          x={x + w / 2} y={y + hh + 14 + i * 13}
          textAnchor="middle" fill="#5f6368"
          fontSize={9.5} fontFamily="system-ui,sans-serif"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// Box positions (x, y, w, h):
//   Browser:          x=14,  y=185, w=130 → cx=79,  cy=222, right=144, bottom=259
//   Edge Middleware:  x=176, y=185, w=162 → cx=257, cy=222, right=338, bottom=259
//   Edge CDN:         x=370, y=185, w=148 → cx=444, cy=222, right=518, bottom=259
//   Next.js:          x=550, y=185, w=152 → cx=626, cy=222, right=702, bottom=259
//   Graph:            x=740, y=92,  w=158 → cx=819, cy=129, right=898, bottom=166
//   CMS:              x=740, y=296, w=158 → cx=819, cy=333, right=898, top=296
//   cdn.optimizely:   x=176, y=330, w=162 → cx=257, cy=367, right=338, top=330

export default function ArchitecturePage() {
  return (
    <>

      <DemoHero
        title="System Architecture"
        description="How Optimizely SaaS CMS, Graph, and Feature Experimentation connect to this Next.js app - request flow, flag evaluation at the edge, per-variation ISR caching, and cache invalidation on publish."
      />

      <div className="max-w-6xl mx-auto px-8 py-16 space-y-20">

        <section id="diagram">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Architecture Diagram{" "}
            <a href="#diagram" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Request flow left to right. Edge Middleware evaluates FX flags and rewrites the URL before
            the CDN cache is checked - each variation gets its own ISR cache entry. CMS publishes sync
            into Graph, which fires a webhook to invalidate the ISR cache.
          </p>

          <div className="rounded-2xl border border-ghost-border bg-white p-4 overflow-x-auto">
            <svg
              viewBox="0 0 1060 450"
              width="100%"
              style={{ minWidth: 720 }}
              aria-label="System architecture diagram"
            >
              <defs>
                {MARKERS.map(({ id, color }) => (
                  <marker
                    key={id} id={id}
                    viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth={6} markerHeight={6} orient="auto"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                  </marker>
                ))}
              </defs>

              {/* ── Arrows (drawn first, behind boxes) ── */}

              {/* HTML response - light blue dashed, above main flow, going left.
                  Starts from Edge CDN center (444) not Next.js: the CDN is the
                  actual responder in both cases (cache hit served directly;
                  cache miss forwarded from Next.js and then cached + served). */}
              <line x1={444} y1={170} x2={144} y2={170}
                stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-lblue)" />

              {/* Browser → Edge Middleware - HTTPS */}
              <line x1={144} y1={222} x2={176} y2={222}
                stroke="#3b82f6" strokeWidth={2} markerEnd="url(#arr-blue)" />

              {/* Edge Middleware → cdn.optimizely.com - datafile fetch (down) */}
              <line x1={245} y1={259} x2={245} y2={330}
                stroke="#0d9488" strokeWidth={2} markerEnd="url(#arr-teal)" />

              {/* cdn.optimizely.com → Edge Middleware - cached datafile (up, dashed) */}
              <line x1={269} y1={330} x2={269} y2={259}
                stroke="#0d9488" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-teal)" />

              {/* Edge Middleware → Edge CDN - rewritten __v_ URL */}
              <line x1={338} y1={222} x2={370} y2={222}
                stroke="#9333ea" strokeWidth={2} markerEnd="url(#arr-purple)" />

              {/* Edge CDN → Next.js - ISR miss */}
              <line x1={518} y1={222} x2={550} y2={222}
                stroke="#9333ea" strokeWidth={2} markerEnd="url(#arr-purple)" />

              {/* Next.js → Graph - GraphQL query */}
              <path d="M 702,210 C 726,210 740,155 740,129"
                fill="none" stroke="#f97316" strokeWidth={2} markerEnd="url(#arr-orange)" />

              {/* Graph → Next.js - content response (dashed) */}
              <path d="M 740,148 C 730,180 718,232 702,232"
                fill="none" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-orange)" />

              {/* CMS → Graph - content sync on publish */}
              <line x1={819} y1={296} x2={819} y2={166}
                stroke="#16a34a" strokeWidth={2} markerEnd="url(#arr-green)" />

              {/* Graph → Next.js - webhook for ISR invalidation (red dashed, routes below) */}
              <path d="M 898,132 L 926,132 L 926,412 L 626,412 L 626,259"
                fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-red)" />

              {/* Browser → cdn.optimizely.com - client-side bucketing event (teal dashed) */}
              <path d="M 79,259 L 79,367 L 176,367"
                fill="none" stroke="#0d9488" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-teal)" />

              {/* ── Boxes (drawn on top of arrows) ── */}

              <Box x={14}  y={185} w={130} hc="#2563eb" bc="#eff6ff" stroke="#bfdbfe"
                title="Browser" sub={["visitor · editor"]} />

              <Box x={176} y={185} w={162} hc="#4f46e5" bc="#eef2ff" stroke="#c7d2fe"
                title="Edge Middleware" sub={["FX flag eval · decideAll()", "__v_ URL rewrite"]} />

              <Box x={370} y={185} w={148} hc="#7c3aed" bc="#f5f3ff" stroke="#ddd6fe"
                title="Edge CDN" sub={["ISR cache", "per-variation entry"]} />

              <Box x={550} y={185} w={152} hc="#15803d" bc="#f0fdf4" stroke="#bbf7d0"
                title="Next.js Server" sub={["App Router · RSC", "ISR · revalidate: 60"]} />

              <Box x={740} y={92}  w={158} hc="#ea580c" bc="#fff7ed" stroke="#fed7aa"
                title="Optimizely Graph" sub={["cg.optimizely.com", "GraphQL delivery API"]} />

              <Box x={740} y={296} w={158} hc="#dc2626" bc="#fef2f2" stroke="#fecaca"
                title="Optimizely CMS" sub={["authoring UI", "Visual Builder"]} />

              <Box x={176} y={330} w={162} hc="#0d9488" bc="#f0fdfa" stroke="#99f6e4"
                title="cdn.optimizely.com" sub={["FX datafile · 60s cache", "bucketing events API"]} />

              {/* ── Arrow labels (drawn last, on top) ── */}
              <text x={294} y={163} textAnchor="middle" fill="#60a5fa" fontSize={9} fontFamily="system-ui,sans-serif" fontStyle="italic">HTML response</text>
              <text x={160} y={215} textAnchor="middle" fill="#3b82f6" fontSize={9} fontFamily="system-ui,sans-serif">HTTPS</text>
              <text x={210} y={297} textAnchor="end" fill="#0d9488" fontSize={9} fontFamily="system-ui,sans-serif">datafile</text>
              <text x={354} y={215} textAnchor="middle" fill="#9333ea" fontSize={9} fontFamily="system-ui,sans-serif">__v_ URL</text>
              <text x={534} y={215} textAnchor="middle" fill="#9333ea" fontSize={9} fontFamily="system-ui,sans-serif">ISR miss</text>
              <text x={726} y={175} textAnchor="end" fill="#f97316" fontSize={9} fontFamily="system-ui,sans-serif">GraphQL</text>
              <text x={714} y={220} textAnchor="middle" fill="#f97316" fontSize={9} fontFamily="system-ui,sans-serif" fontStyle="italic">content</text>
              <text x={858} y={232} textAnchor="start" fill="#16a34a" fontSize={9} fontFamily="system-ui,sans-serif">content sync</text>
              <text x={780} y={425} textAnchor="middle" fill="#ef4444" fontSize={9} fontFamily="system-ui,sans-serif">Graph webhook</text>
              <text x={112} y={392} textAnchor="middle" fill="#0d9488" fontSize={9} fontFamily="system-ui,sans-serif" fontStyle="italic">bucketing event</text>

            </svg>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-xs text-on-surface-variant">
            {[
              { color: "#3b82f6", label: "HTTPS request",                              dashed: false },
              { color: "#60a5fa", label: "HTML response",                               dashed: true  },
              { color: "#9333ea", label: "Rewritten __v_ URL · CDN miss forward to Next.js", dashed: false },
              { color: "#f97316", label: "GraphQL query · content response",            dashed: true  },
              { color: "#0d9488", label: "FX datafile · bucketing event",               dashed: true  },
              { color: "#16a34a", label: "CMS content sync on publish",                 dashed: false },
              { color: "#ef4444", label: "Graph webhook - ISR cache invalidation",      dashed: true  },
            ].map(({ color, label, dashed }) => (
              <div key={label} className="flex items-center gap-2">
                <svg width={30} height={10} aria-hidden="true">
                  <line x1={0} y1={5} x2={22} y2={5}
                    stroke={color} strokeWidth={2}
                    strokeDasharray={dashed ? "4,2" : undefined} />
                  <path d="M 20 2 L 28 5 L 20 8 z" fill={color} />
                </svg>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section id="roles">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Who Interacts and How{" "}
            <a href="#roles" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Two distinct actors drive the system - content editors on the authoring side, and visitors on the delivery side. They never share a runtime.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <h3 className="font-display font-bold text-sm text-red-700 mb-1">Content Editor</h3>
              <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                Works entirely inside Optimizely CMS. Never interacts with the Next.js app directly.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Opens Visual Builder - edits page composition, block content, and navigation.",
                  "Creates CMS Variations to match FX flag variation keys. The variation name must match exactly (case-sensitive).",
                  "Clicks Publish. The CMS syncs the change to Optimizely Graph, which fires a POST webhook to /api/webhooks.",
                  "The webhook marks the ISR cache as stale. The next visitor request triggers a background re-render. The editor does not wait for the CDN to clear.",
                  "Preview mode bypasses the ISR cache entirely - the editor sees draft content via a previewToken that the app reads from the URL.",
                ].map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="shrink-0 font-bold text-red-600">-</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-display font-bold text-sm text-blue-700 mb-1">Visitor</h3>
              <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                Makes an HTTPS request. Three execution environments run on their behalf in sequence.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Request hits Edge Middleware first. A UUID cookie (optimizelyEndUserId) is set on first visit and persists for one year - this is the stable bucketing ID.",
                  "Middleware rewrites the URL with variation segments and the CDN is checked. A warm cache hit returns the page in ~10-50ms with no server involvement.",
                  "On a cache miss, the Next.js server renders the page from Graph data and caches the result. The visitor receives the same HTML either way.",
                  "After the HTML arrives, React hydrates in the browser. Client components (banner, CTA button) read cookies and apply personalisation - no server round-trip.",
                  "The browser SDK fires a bucketing event to cdn.optimizely.com for the active flag. This is the impression that appears in the FX Results tab.",
                ].map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="shrink-0 font-bold text-blue-600">-</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Request flow */}
        <section id="request-flow">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Request Flow{" "}
            <a href="#request-flow" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            What happens between a browser request and the page appearing, step by step.
          </p>
          <div className="space-y-2">
            {[
              {
                n: "1", color: "bg-blue-500",
                label: "Browser sends HTTPS request",
                detail: "e.g. GET /en/investments/stocks-isa - arrives at Vercel's edge network.",
              },
              {
                n: "2", color: "bg-indigo-500",
                label: "Edge Middleware evaluates FX flags",
                detail: "Fetches the FX datafile from cdn.optimizely.com (edge-cached for 60s). Reads user context from cookies (optimizelyEndUserId, demo_persona, demo_bucketing_id). Calls decideAll([DISABLE_DECISION_EVENT]) - no bucketing events yet. Rewrites the URL with active variation segments sorted for a stable cache key, e.g. /en/investments/stocks-isa/__v_homepage--variation_1/__v_cta--on.",
              },
              {
                n: "3", color: "bg-purple-600",
                label: "Edge CDN checks the ISR cache",
                detail: "The rewritten URL is looked up. Cache HIT: the ISR-cached page is returned to the browser in ~10-50ms. Cache MISS: the request is forwarded to the Next.js server.",
              },
              {
                n: "4", color: "bg-green-700",
                label: "Next.js renders the page (ISR miss only)",
                detail: "The catch-all route extracts variation info from the URL slug - no cookies() or headers() calls. Queries Optimizely Graph with a variation filter to fetch the matching CMS content variation. Renders the page with export const revalidate = 60. The rendered output is stored in the CDN cache.",
              },
              {
                n: "5", color: "bg-blue-500",
                label: "HTML returned to browser",
                detail: "The response is served - from CDN on a hit, from Next.js on a miss. The browser receives identical HTML either way.",
              },
              {
                n: "6", color: "bg-teal-600",
                label: "Browser fires FX bucketing event",
                detail: "After hydration, the FxBucketingEvent component runs decide(flagKey, []) via the browser SDK. The empty options array means the bucketing event is NOT suppressed - it is recorded in Optimizely's results. This is the one event per flag per page load that attributes the impression.",
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
        </section>

        {/* Publish flow */}
        <section id="publish-flow">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Publish Flow{" "}
            <a href="#publish-flow" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            What happens when an editor publishes content in the CMS.
          </p>
          <div className="space-y-2">
            {[
              {
                n: "1", color: "bg-red-600",
                label: "Editor publishes in Optimizely CMS",
                detail: "Content is saved. The CMS begins syncing the change to Optimizely Graph.",
              },
              {
                n: "2", color: "bg-orange-500",
                label: "Graph indexes the content",
                detail: "Optimizely Graph processes the change and makes the new content queryable via its GraphQL API.",
              },
              {
                n: "3", color: "bg-red-500",
                label: "Graph fires a POST webhook to /api/webhooks",
                detail: "A small JSON payload signals that content changed. The webhook handler calls revalidatePath(\"/\", \"layout\") and revalidateTag() for page, navigation, banner, and quotes. Nothing is re-rendered yet - entries are just marked stale.",
              },
              {
                n: "4", color: "bg-purple-600",
                label: "Next visitor gets the stale version instantly",
                detail: "ISR always serves the existing cached page first. The visitor does not wait. In the background Next.js re-renders the page with fresh data from Graph.",
              },
              {
                n: "5", color: "bg-green-700",
                label: "All subsequent requests get the updated page",
                detail: "The newly rendered output is stored in the CDN. No redeploy needed.",
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
        </section>

        {/* Execution environments */}
        <section id="execution-environments">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Execution Environments{" "}
            <a href="#execution-environments" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Three separate runtimes execute code on behalf of a visitor request. Each has a different set of APIs, a different view of the request, and a different relationship to the cache.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                label: "Middleware",
                subtitle: "Edge Runtime - every request",
                color: "border-indigo-300 bg-indigo-50",
                hcolor: "text-indigo-700",
                rows: [
                  { k: "When", v: "Every request, before the CDN cache is checked. Runs even on cache hits." },
                  { k: "Where", v: "V8 isolate on CDN edge nodes. No Node.js APIs (no fs, no process.env at runtime). Cold starts in under 1ms." },
                  { k: "Can read", v: "Cookies, User-Agent, full request URL. Cannot call cookies() or headers() from next/headers." },
                  { k: "What it does", v: "Fetches the FX datafile, runs decideAll(), rewrites the URL with __v_ variation segments." },
                  { k: "Optimizely SDK", v: "@optimizely/optimizely-sdk/universal - the Edge-compatible build with no Node.js dependencies." },
                  { k: "Cache impact", v: "None. Middleware runs before the CDN cache lookup and does not write to it." },
                ],
              },
              {
                label: "Next.js Server",
                subtitle: "Node.js - ISR miss only",
                color: "border-green-300 bg-green-50",
                hcolor: "text-green-700",
                rows: [
                  { k: "When", v: "Only on an ISR cache miss: the first request to a URL, or after a webhook marks it stale." },
                  { k: "Where", v: "Node.js process (serverless function or long-running server). Full Node.js APIs available." },
                  { k: "Can read", v: "URL params (the slug including __v_ segments). Must NOT call cookies() or headers() - any use in the render tree forces cache-control: no-store on the whole response." },
                  { k: "What it does", v: "Calls extractVariations(slug) to recover the variation keys. Queries Optimizely Graph with a variation filter. Renders React Server Components to HTML." },
                  { k: "Optimizely SDK", v: "None. The variation is already encoded in the URL from middleware - no SDK call needed server-side." },
                  { k: "Cache impact", v: "Writes the rendered HTML to the CDN cache with a 60s TTL. All subsequent requests for that URL are served from the CDN." },
                ],
              },
              {
                label: "Browser",
                subtitle: "Client-Side - after hydration",
                color: "border-blue-300 bg-blue-50",
                hcolor: "text-blue-700",
                rows: [
                  { k: "When", v: "After the browser receives HTML and React hydrates. Runs on every page load, including cache hits." },
                  { k: "Where", v: "Visitor's browser. Full Web APIs available (fetch, document.cookie, localStorage)." },
                  { k: "Can read", v: "document.cookie (optimizelyEndUserId, demo_persona). The cookie is intentionally NOT httpOnly so the browser SDK can read it for stable bucketing." },
                  { k: "What it does", v: "UI personalisation (banner copy, CTA button color) via client components that read cookies in useEffect. Fires the FX bucketing event via decide(flagKey, [])." },
                  { k: "Optimizely SDK", v: "@optimizely/optimizely-sdk (browser build, resolved automatically by the bundler). A module-level singleton so the datafile is fetched once per page load." },
                  { k: "Cache impact", v: "None. CSR runs in the browser and does not affect the CDN cache or ISR state." },
                ],
              },
            ].map(({ label, subtitle, color, hcolor, rows }) => (
              <div key={label} className={`rounded-2xl border p-5 ${color}`}>
                <h3 className={`font-display font-bold text-sm ${hcolor}`}>{label}</h3>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${hcolor} opacity-60 mb-3`}>{subtitle}</p>
                <dl className="space-y-2">
                  {rows.map(({ k, v }) => (
                    <div key={k}>
                      <dt className={`text-[10px] font-bold uppercase tracking-wider ${hcolor} mb-0.5`}>{k}</dt>
                      <dd className="text-xs text-on-surface-variant leading-relaxed">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-ghost-border bg-surface-lowest p-5">
            <h3 className="font-display font-semibold text-sm text-on-surface mb-2">CDN compatibility</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-3xl">
              This demo deploys to Vercel, but the ISR-via-URL-rewrite pattern works with any CDN that supports path-based cache keys.
              The constraint is simple: the CDN must treat{" "}
              <span className="font-mono text-[10px]">/savings/__v_homepage--variation_1</span>{" "}
              and{" "}
              <span className="font-mono text-[10px]">/savings/</span>{" "}
              as separate cache entries. That is standard behaviour - Netlify, AWS CloudFront, Cloudflare, Akamai, and Fastly all do this out of the box.
              The reason the variation is encoded in the URL (not a cookie or a custom request header) is that most CDNs do not vary their cache by cookie or arbitrary header by default,
              and configuring them to do so requires CDN-specific rules (e.g. Akamai vary-by-header, CloudFront cache policies). A URL-based key needs no CDN configuration at all.
            </p>
          </div>
        </section>

        {/* Component reference */}
        <section id="components">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            System Components{" "}
            <a href="#components" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            What each box in the diagram is responsible for.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                label: "Edge Middleware",
                color: "border-indigo-300 bg-indigo-50",
                hcolor: "text-indigo-700",
                points: [
                  "Runs at the CDN edge before the cache is checked - on Vercel this is the Edge Runtime (V8 isolate), on Cloudflare it would be a Worker, on Akamai an EdgeWorker.",
                  "Fetches the Optimizely FX datafile (JSON) from cdn.optimizely.com. The fetch is edge-cached for 60s so each edge node only re-fetches the datafile once per minute.",
                  "Creates a user context from cookies (optimizelyEndUserId, demo_persona, demo_bucketing_id) and runs decideAll() with DISABLE_DECISION_EVENT - flag decisions only, no impression tracking yet.",
                  "Rewrites the URL with one path segment per active flag: /path/__v_flagKey--variationKey. Segments are sorted so the same set of active flags always maps to the same URL and the same CDN cache entry.",
                ],
              },
              {
                label: "Edge CDN / ISR Cache",
                color: "border-purple-300 bg-purple-50",
                hcolor: "text-purple-700",
                points: [
                  "Each __v_-rewritten URL is a separate CDN cache entry. Base users and each variation are cached independently at the same path hierarchy.",
                  "TTL: 60 seconds (set by export const revalidate = 60 in the catch-all route). Any CDN that supports path-based caching can serve this - no custom cache configuration needed.",
                  "Busted on publish: the Graph webhook calls revalidatePath(\"/\", \"layout\") + revalidateTag(\"page\") which marks all entries as stale.",
                  "Warm cache hits are served in ~10-50ms from the edge - the Next.js server is not involved.",
                ],
              },
              {
                label: "Next.js Server",
                color: "border-green-300 bg-green-50",
                hcolor: "text-green-700",
                points: [
                  "Renders CMS pages with ISR. No cookies() or headers() calls anywhere in the server render tree - these would force cache-control: no-store globally.",
                  "Extracts variation keys from the URL slug via extractVariations(slug) - reads __v_ segments, no SDK call needed.",
                  "Queries Optimizely Graph with a variation filter to get the correct CMS content variation.",
                  "FX-driven UI (banner, CTA button colour) is handled by client components that read cookies after hydration.",
                ],
              },
              {
                label: "Optimizely Graph",
                color: "border-orange-300 bg-orange-50",
                hcolor: "text-orange-700",
                points: [
                  "GraphQL delivery API at cg.optimizely.com. Serves CMS content, navigation, and banners.",
                  "Accepts a variation filter so a single query can return either the base content or a specific named variation.",
                  "Has its own CDN cache layer independent of Next.js. Bypass with ?cache=false for preview/seed scripts.",
                  "Fires a webhook to /api/webhooks on every content change: bulk.completed, doc.updated, doc.expired.",
                ],
              },
              {
                label: "Optimizely CMS",
                color: "border-red-300 bg-red-50",
                hcolor: "text-red-700",
                points: [
                  "Authors create and manage pages, blocks, and navigation in Visual Builder.",
                  "CMS Variation names must exactly match FX variation key strings (case-sensitive). A mismatch means the variation content is never served.",
                  "On publish: content syncs to Optimizely Graph. Graph fires a webhook to trigger ISR invalidation.",
                ],
              },
              {
                label: "cdn.optimizely.com",
                color: "border-teal-300 bg-teal-50",
                hcolor: "text-teal-700",
                points: [
                  "Serves the FX SDK datafile (JSON) - fetched by Edge Middleware on every request that doesn't hit the 60s edge cache.",
                  "Receives bucketing events from the browser SDK (FxBucketingEvent component). These events are what appear in Optimizely's Results tab.",
                  "The split: middleware fetches the datafile and evaluates flags (no events), the browser fires the event for the specific flag that was active on the page.",
                ],
              },
            ].map(({ label, color, hcolor, points }) => (
              <div key={label} className={`rounded-2xl border p-5 ${color}`}>
                <h3 className={`font-display font-bold text-sm mb-3 ${hcolor}`}>{label}</h3>
                <ul className="space-y-1.5">
                  {points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                      <span className={`shrink-0 font-bold ${hcolor}`}>-</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Related demos */}
        <section id="related">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-6">
            Related Demos{" "}
            <a href="#related" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { href: "/demo/caching",                label: "ISR Caching",                description: "Cache layers, revalidation tags, webhooks, and what kills ISR." },
              { href: "/demo/feature-experimentation", label: "Feature Experimentation",    description: "Middleware FX evaluation, URL rewriting, and client-side bucketing events." },
              { href: "/demo/personalization",         label: "Personalization",            description: "Audience targeting via CMS variation filter and the demo_persona cookie." },
            ].map(({ href, label, description }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="block rounded-2xl border border-ghost-border bg-surface-lowest p-5 hover:border-brand/30 hover:bg-surface-low transition-colors"
              >
                <p className="font-display font-semibold text-on-surface text-sm mb-1">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
