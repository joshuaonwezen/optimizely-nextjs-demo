import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";
import KeyPoints from "@/components/demo/KeyPoints";
import InlineCode from "@/components/demo/InlineCode";
import { Pipeline } from "@/components/demo/Pipeline";
import { StepBadge } from "@/components/ui/StepBadge";

export const metadata: Metadata = {
  title: "Optimizely One Platform",
};

// One marker per semantic edge colour. Arrowheads cannot inherit a stroke,
// so each colour needs its own <marker> in <defs>.
const MARKERS = [
  { id: "m-supply", color: "var(--primary-fill-dim)" },
  { id: "m-graph", color: "var(--error)" },
  { id: "m-app", color: "var(--primary)" },
  { id: "m-hook", color: "var(--primary-fill)" },
  { id: "m-decide", color: "var(--tertiary)" },
  { id: "m-data", color: "var(--secondary-container)" },
  { id: "m-ai", color: "var(--primary-dim)" },
  { id: "m-ref", color: "var(--on-surface-variant)" },
];

const LEGEND: { color: string; label: string; dashed: boolean }[] = [
  { color: "var(--primary-fill-dim)", label: "CMS, DAM and external sources index into Graph", dashed: false },
  { color: "var(--primary)", label: "Next.js queries Graph (GraphQL)", dashed: false },
  { color: "var(--error)", label: "Graph returns content", dashed: true },
  { color: "var(--primary-fill)", label: "Publish webhook - revalidateTag drops the ISR entry", dashed: true },
  { color: "var(--tertiary)", label: "FX and WX decisions reach the app", dashed: false },
  { color: "var(--tertiary)", label: "WX variation cookie, read by middleware next request", dashed: true },
  { color: "var(--secondary-container)", label: "Behavioural events to ODP", dashed: false },
  { color: "var(--secondary-container)", label: "ODP audiences back to the server as a variation key", dashed: true },
  { color: "var(--primary-dim)", label: "Mark AI agents assist authoring (dev-time, via MCP)", dashed: true },
  { color: "var(--on-surface-variant)", label: "Reference only - not integrated in this repo", dashed: true },
];

type Status = "live" | "partial" | "reference";

const STATUS_CHIP: Record<Status, { label: string; className: string }> = {
  live: { label: "Wired up", className: "bg-brand/10 text-brand border-brand/30" },
  partial: { label: "Partial", className: "bg-tertiary/10 text-tertiary border-tertiary/30" },
  reference: { label: "Reference", className: "bg-surface-low text-on-surface-variant border-ghost-border" },
};

const PRODUCTS: {
  name: string;
  status: Status;
  role: string;
  mechanism: string;
  files: string[];
}[] = [
  {
    name: "Optimizely Graph",
    status: "live",
    role: "The single read API. Every content-shaped thing in the stack converges here: CMS pages, DAM asset metadata, and external systems registered through the Content Source API.",
    mechanism: "Server-side GraphQL over the cms-sdk GraphClient against cg.optimizely.com, single-key auth. Cached queries are \"use cache\" functions wrapping request() with a cacheTag; unbounded-input queries (search, autocomplete, geo) call request() directly and stay uncached.",
    files: ["src/lib/optimizely/graphClient.ts", "src/lib/graphql/queries/"],
  },
  {
    name: "SaaS CMS",
    status: "live",
    role: "Authoring, Visual Builder compositions, display templates, preview and the editorial workflow. Publishes sync into Graph rather than being read directly by the app.",
    mechanism: "Content types pushed from code via opti:push. Reads go through Graph; writes (seeding, migrations) go through the Management API with an OAuth client-credentials token. Preview uses a short-lived token, or App Key Basic auth for shareable external links.",
    files: ["optimizely.config.mjs", "src/lib/optimizely/componentRegistry.ts", "scripts/_shared.ts"],
  },
  {
    name: "Feature Experimentation",
    status: "live",
    role: "Flags, A/B tests and server-side bucketing. The decision that matters most is made before rendering, in middleware, so each variation can be cached independently.",
    mechanism: "Datafile-only SDK (60s TTL) running in three places: edge middleware (decideAll, encoded into the URL), server components via getOptimizelyUser(), and the browser for impressions. Impressions are suppressed by default and fired once by the component that actually renders the variant.",
    files: ["src/middleware.ts", "src/lib/optimizely/user.ts", "src/lib/optimizely/variationPath.ts"],
  },
  {
    name: "Data Platform (ODP)",
    status: "live",
    role: "The behavioural profile store. Events flow out of the app, come back as audience membership, and are mapped to a Graph variation key so the next render is personalised.",
    mechanism: "Three channels: the client zaius tag for pageviews and mb_* events, a server POST to /v3/events for form submissions, and a server /v3/graphql query for audience membership (5 min cache). Segments map to variation keys through ODP_SEGMENT_TO_VARIATION.",
    files: ["src/lib/optimizely/odp.ts", "src/components/OdpSetup.tsx", "src/components/AutoTracker.tsx"],
  },
  {
    name: "Web Experimentation",
    status: "live",
    role: "Visual, marketer-owned client-side testing on top of the same visitor identity as FX. Useful for changes that do not need a code deploy.",
    mechanism: "A blocking snippet in <head> (sync on purpose, to avoid a flash of the original). A WX custom-JS action writes an opti_wx_variation cookie, which middleware validates against the FX datafile and folds into the URL segment, so the next request is server-rendered. FX decisions take precedence.",
    files: ["src/app/layout.tsx", "src/middleware.ts"],
  },
  {
    name: "DAM / CMP Assets",
    status: "live",
    role: "Asset library and delivery. Images arrive as references on content and are rendered with responsive srcsets and on-the-fly CDN resizing.",
    mechanism: "Delivery-side only: asset metadata comes through Graph on the content reference, binaries come from the CMP CDN with resize params, and an allow-listed proxy route adds long-lived caching. There are no direct DAM REST calls.",
    files: ["src/lib/optimizely/damImage.ts", "src/app/api/image-proxy/route.ts"],
  },
  {
    name: "Content Source API",
    status: "live",
    role: "Brings systems that are not the CMS into Graph, so a PIM, a branch database or a quote feed can be queried with the same GraphQL and the same facets as CMS content.",
    mechanism: "Build and seed time: a schema is PUT to the content source endpoint, then rows are pushed as NdJSON under App Key Basic auth. Once indexed, the items read back exactly like CMS content, including GeoPoint geo search.",
    files: ["scripts/_contentSource.ts", "src/lib/graphql/queries/GetLocations.ts"],
  },
  {
    name: "Mark AI",
    status: "partial",
    role: "AI agents over the stack: content generation and review, SEO and GEO analysis, and natural-language authoring against the CMS.",
    mechanism: "Present as documentation plus a dev-time MCP connection (the CMS MCP server, and an experimentation MCP server in .mcp.json) that a developer or editor drives from their tooling. There is no runtime call from the app itself, so this is an authoring-side accelerator rather than a request-path dependency.",
    files: ["src/app/demo/mark-ai/page.tsx", "src/app/demo/mcp-server/page.tsx", ".mcp.json"],
  },
  {
    name: "Content Recommendations",
    status: "reference",
    role: "Picks the next best article or page per visitor from their behavioural profile, typically for a \"recommended for you\" rail.",
    mechanism: "Not integrated here. Wiring it up means adding the recs script or API, letting it read the ODP profile keyed on the same optimizelyEndUserId cookie, and resolving the returned content keys through Graph so the rail renders with the existing block components.",
    files: [],
  },
  {
    name: "Product Recommendations",
    status: "reference",
    role: "Catalog-driven merchandising: also-bought, trending and personalised product rails.",
    mechanism: "Not integrated here, and it needs something this demo does not have: a product catalog feed. The natural fit would be to register the catalog through the Content Source API so products are queryable in Graph, then feed behavioural signals from the existing mb_* event layer.",
    files: [],
  },
];

const STATUS_TABLE: { product: string; status: Status; note: string }[] = [
  { product: "Optimizely Graph", status: "live", note: "Core read path, 19 named queries" },
  { product: "SaaS CMS", status: "live", note: "Management API, preview, Visual Builder" },
  { product: "Feature Experimentation", status: "live", note: "Middleware, server and browser runtimes" },
  { product: "Data Platform (ODP)", status: "live", note: "zaius tag, /v3/events, /v3/graphql segments" },
  { product: "Web Experimentation", status: "live", note: "Blocking snippet plus cookie bridge" },
  { product: "DAM / CMP", status: "live", note: "Delivery side only, no DAM REST calls" },
  { product: "Content Source API", status: "live", note: "Seed time: quotes and branch locations" },
  { product: "Mark AI", status: "partial", note: "Docs and dev-time MCP, no runtime integration" },
  { product: "Content Recommendations", status: "reference", note: "Not integrated" },
  { product: "Product Recommendations", status: "reference", note: "Not integrated" },
];

const LIFECYCLE: { title: string; detail: React.ReactNode }[] = [
  {
    title: "Edge middleware",
    detail: (
      <>
        Mints or reads the <InlineCode>optimizelyEndUserId</InlineCode> cookie, applies CMS-managed
        redirects, runs FX <InlineCode>decideAll</InlineCode> against the cached datafile, keeps only
        flags marked as CMS flags whose route matches, and rewrites the URL with up to three{" "}
        <InlineCode>__v_flag--variation</InlineCode> segments. The WX cookie is folded in here too,
        only where FX has no decision for that flag.
      </>
    ),
  },
  {
    title: "Catch-all route",
    detail: (
      <>
        <InlineCode>extractVariations()</InlineCode> splits the variation segments back off the slug,
        then <InlineCode>buildUrlCandidates()</InlineCode> produces the locale-aware URL candidates to
        try. On the homepage only, with no FX variation, the ODP segment read runs and the route opts
        out of caching - which is why <InlineCode>/</InlineCode> is dynamic and every other route stays
        on ISR.
      </>
    ),
  },
  {
    title: "Graph query",
    detail: (
      <>
        <InlineCode>getContentByPath()</InlineCode> runs per candidate with a variation filter that
        always sets <InlineCode>includeOriginal: true</InlineCode>, so a visitor who matches no
        variation still gets the original page. A key-lookup fallback covers the case where the path
        query misses.
      </>
    ),
  },
  {
    title: "Render",
    detail: (
      <>
        The component registry dispatches the returned type to an experience or page component, which
        walks the composition tree and renders each block. The variation actually served is reported
        back to FX as an impression from the client.
      </>
    ),
  },
  {
    title: "Invalidate",
    detail: (
      <>
        An editor publishes, Graph reindexes and fires its webhook, and the webhook route calls{" "}
        <InlineCode>revalidateTag</InlineCode> for every tag in <InlineCode>CACHE_TAGS</InlineCode>.
        The one-hour TTL is only the fallback ceiling.
      </>
    ),
  },
];

// Box geometry (x, y, w, h). Arrow endpoints below are hand-computed from these,
// so moving a box means fixing its arrows too.
//   CMS:         24,  48,  176, 76  -> cx=112 cy=86  right=200 bottom=124
//   DAM:         24,  146, 176, 76  -> cx=112 cy=184 right=200
//   ContentSrc:  24,  244, 176, 88  -> cx=112 cy=288 right=200
//   Mark AI:        24,  366, 176, 76  -> cx=112 top=366
//   Graph:       286, 150, 152, 140 -> cx=362 cy=220 right=438 bottom=290
//   App frame:   500, 40,  320, 404 -> right=820 bottom=444
//   Middleware:  520, 72,  272, 88  -> cx=656 left=520 right=792 bottom=160
//   Server:      520, 182, 272, 100 -> cx=656 left=520 right=792 bottom=282
//   Client:      520, 304, 272, 100 -> cx=656 left=520 right=792 bottom=404
//   FX:          940, 72,  200, 76  -> cx=1040 cy=110 left=940
//   WX:          940, 170, 200, 76  -> cx=1040 cy=208 left=940
//   ODP:         940, 268, 200, 88  -> cx=1040 cy=312 left=940 bottom=356
//   ContentRecs: 940, 388, 200, 68  -> cx=1040 left=940 bottom=456
//   ProductRecs: 940, 476, 200, 68  -> cx=1040 left=940

function Box({
  x, y, w = 176, h = 76,
  hc, title, sub = [], dashed = false,
}: {
  x: number; y: number; w?: number; h?: number;
  hc: string;
  title: string; sub?: string[]; dashed?: boolean;
}) {
  const hh = 24;
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx={8}
        fill="var(--surface-container-low)"
        stroke={dashed ? hc : "var(--outline-variant)"}
        strokeWidth={dashed ? 1.5 : 1}
        strokeDasharray={dashed ? "4,3" : undefined}
      />
      {!dashed && (
        <>
          <rect x={x} y={y} width={w} height={hh} rx={8} fill={hc} />
          <rect x={x} y={y + hh - 8} width={w} height={8} fill={hc} />
        </>
      )}
      {dashed && (
        <line
          x1={x + 10} y1={y + hh} x2={x + w - 10} y2={y + hh}
          stroke={hc} strokeWidth={1} strokeDasharray="3,3"
        />
      )}
      <text
        x={x + w / 2} y={y + hh / 2 + 5}
        textAnchor="middle"
        fill={dashed ? "var(--on-surface)" : "var(--surface-container-lowest)"}
        fontSize={11} fontWeight="bold" fontFamily="system-ui,sans-serif"
      >
        {title}
      </text>
      {sub.map((line, i) => (
        <text
          key={i}
          x={x + w / 2} y={y + hh + 14 + i * 13}
          textAnchor="middle" fill="var(--on-surface-variant)"
          fontSize={9.5} fontFamily="system-ui,sans-serif"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function ColumnLabel({ x, children }: { x: number; children: string }) {
  return (
    <text
      x={x} y={22} textAnchor="middle"
      fill="var(--on-surface-variant)" fontSize={9} fontWeight="bold"
      letterSpacing={1.4} fontFamily="system-ui,sans-serif"
    >
      {children}
    </text>
  );
}

export default function OptimizelyOnePage() {
  return (
    <>
      <DemoHero
        title="Optimizely One Platform"
        description="How Graph, SaaS CMS, DAM, the Content Source API, Feature Experimentation, Web Experimentation, ODP, recommendations and Mark AI compose inside a single Next.js application - and which of them are actually wired up in this demo."
      />

      <div className="max-w-6xl mx-auto px-8 py-16 space-y-20">

        <KeyPoints
          points={[
            <>
              <strong>Graph is the only read API.</strong> CMS content, DAM asset metadata and
              external systems registered through the Content Source API all converge on it, so the
              app has one query language and one cache story instead of one integration per product.
            </>,
            <>
              <strong>Experimentation happens before rendering.</strong> FX decides in edge
              middleware and the variation is encoded into the URL as{" "}
              <InlineCode>__v_flag--variation</InlineCode>, which gives every bucket its own stable
              ISR cache entry. Personalised pages stay statically cached instead of going dynamic.
            </>,
            <>
              <strong>Client-side tools can still reach server-rendered output.</strong> Web
              Experimentation runs in the browser but writes a cookie that middleware reads on the
              next request, so the variation survives into the server render with no flash.
            </>,
            <>
              <strong>ODP closes the loop.</strong> Behavioural events go out, audience membership
              comes back, and a segment is mapped to a Graph variation key. Data collected on one
              request changes the content served on the next.
            </>,
            <>
              <strong>Two of these products are not integrated here.</strong> Content
              Recommendations and Product Recommendations are drawn as reference boxes, and Mark AI is
              authoring-side only. See the <a href="#status" className="text-brand hover:underline">status table</a>.
            </>,
          ]}
        />

        <section id="diagram">
          <DemoSectionHeading id="diagram">Architecture Diagram{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Content supply on the left, Graph as the hub, the Next.js app in the middle split by
            runtime, and the decisioning and data products on the right. Solid boxes are wired up in
            this repo; dashed boxes are reference architecture.
          </p>

          <div className="rounded-2xl border border-ghost-border bg-surface-lowest p-4 overflow-x-auto">
            <svg
              viewBox="0 0 1180 640"
              width="100%"
              style={{ minWidth: 900 }}
              aria-label="Diagram of the Optimizely One platform composed inside a Next.js application"
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

              <ColumnLabel x={112}>CONTENT SUPPLY</ColumnLabel>
              <ColumnLabel x={362}>DELIVERY HUB</ColumnLabel>
              <ColumnLabel x={656}>APPLICATION RUNTIME</ColumnLabel>
              <ColumnLabel x={1040}>DECISION + DATA</ColumnLabel>

              {/* Arrows are drawn first so the boxes paint over their endpoints. */}

              {/* CMS / DAM / Content Source -> Graph */}
              <path d="M 200,86 C 244,86 244,180 282,180"
                fill="none" stroke="var(--primary-fill-dim)" strokeWidth={2} markerEnd="url(#m-supply)" />
              <path d="M 200,184 C 240,184 244,216 282,218"
                fill="none" stroke="var(--primary-fill-dim)" strokeWidth={2} markerEnd="url(#m-supply)" />
              <path d="M 200,288 C 244,288 244,258 282,256"
                fill="none" stroke="var(--primary-fill-dim)" strokeWidth={2} markerEnd="url(#m-supply)" />

              {/* Mark AI -> CMS authoring, routed down the far left */}
              <path d="M 40,366 L 10,366 L 10,66 L 20,66"
                fill="none" stroke="var(--primary-dim)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-ai)" />

              {/* Server -> Graph query, Graph -> Server content */}
              <line x1={518} y1={198} x2={444} y2={198}
                stroke="var(--primary)" strokeWidth={2} markerEnd="url(#m-app)" />
              <line x1={438} y1={226} x2={514} y2={226}
                stroke="var(--error)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-graph)" />

              {/* Graph publish webhook -> Server, routed below the app frame */}
              <path d="M 362,290 L 362,596 L 470,596 L 470,262 L 514,262"
                fill="none" stroke="var(--primary-fill)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-hook)" />

              {/* FX -> middleware */}
              <line x1={940} y1={104} x2={798} y2={104}
                stroke="var(--tertiary)" strokeWidth={2} markerEnd="url(#m-decide)" />

              {/* WX -> client (the snippet runs in the browser) */}
              <path d="M 940,208 C 880,208 858,336 798,338"
                fill="none" stroke="var(--tertiary)" strokeWidth={2} markerEnd="url(#m-decide)" />

              {/* WX variation cookie: client -> middleware, an app-internal hop
                  bulging into the frame padding so it reads as cross-runtime. */}
              <path d="M 792,326 C 816,300 816,184 796,158"
                fill="none" stroke="var(--tertiary)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-decide)" />

              {/* Client -> ODP events, ODP -> Server segments */}
              <path d="M 796,380 C 860,384 880,360 936,348"
                fill="none" stroke="var(--secondary-container)" strokeWidth={2} markerEnd="url(#m-data)" />
              <path d="M 940,284 C 886,284 860,238 796,234"
                fill="none" stroke="var(--secondary-container)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-data)" />

              {/* ODP profile -> the two recommendation products */}
              <line x1={1040} y1={356} x2={1040} y2={382}
                stroke="var(--on-surface-variant)" strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#m-ref)" />
              <path d="M 990,356 L 990,372 L 916,372 L 916,502 L 934,502"
                fill="none" stroke="var(--on-surface-variant)" strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#m-ref)" />

              {/* The Next.js app frame, drawn under its inner boxes */}
              <rect
                x={500} y={40} width={320} height={404} rx={12}
                fill="none" stroke="var(--outline-variant)" strokeWidth={1} strokeDasharray="2,3"
              />
              <text
                x={656} y={60} textAnchor="middle"
                fill="var(--on-surface-variant)" fontSize={9} fontStyle="italic"
                fontFamily="system-ui,sans-serif"
              >
                one Next.js deployment, three runtimes
              </text>

              {/* Boxes */}
              <Box x={24} y={48} hc="var(--primary-fill-dim)"
                title="Optimizely SaaS CMS"
                sub={["authoring · Visual Builder", "Management API · preview", "publishes into Graph"]} />

              <Box x={24} y={146} hc="var(--primary-fill-dim)"
                title="DAM / CMP Assets"
                sub={["asset metadata via Graph", "binaries via CMP CDN", "on-the-fly resize"]} />

              <Box x={24} y={244} h={88} hc="var(--primary-fill-dim)"
                title="Content Source API"
                sub={["systems that are not the CMS", "PIM · branches · quotes", "indexed as Graph types", "typed fields · GeoPoint"]} />

              <Box x={24} y={366} hc="var(--primary-dim)" dashed
                title="Mark AI"
                sub={["CMS MCP server", "authoring + review agents", "dev-time today"]} />

              <Box x={286} y={150} w={152} h={140} hc="var(--error)"
                title="Optimizely Graph"
                sub={["cg.optimizely.com", "one GraphQL read API", "for CMS · DAM meta ·", "external sources", "search · facets · geo", "variation filter for", "personalised content"]} />

              <Box x={520} y={72} w={272} h={88} hc="var(--primary)"
                title="Edge Middleware"
                sub={["FX decideAll at the edge", "rewrites __v_flag--variation", "one stable ISR key per bucket", "CMS redirects · visitor id"]} />

              <Box x={520} y={182} w={272} h={100} hc="var(--primary)"
                title="Server Components (RSC)"
                sub={["\"use cache\" + cacheTag", "Graph variation filter", "ODP segment read on /", "renders CMS compositions"]} />

              <Box x={520} y={304} w={272} h={100} hc="var(--primary)"
                title="Client / Browser"
                sub={["WX snippet (blocking)", "ODP zaius tag", "AutoTracker · mb_* events", "FX browser datafile"]} />

              <Box x={940} y={72} w={200} hc="var(--tertiary)"
                title="Feature Experimentation"
                sub={["datafile · 60s TTL", "decides at the edge, on the", "server and in the browser"]} />

              <Box x={940} y={170} w={200} hc="var(--tertiary)"
                title="Web Experimentation"
                sub={["client-side snippet", "shares the visitor cookie", "bridges into middleware"]} />

              <Box x={940} y={268} w={200} h={88} hc="var(--secondary-container)"
                title="Data Platform (ODP)"
                sub={["events in: zaius tag and", "server /v3/events", "segments out: /v3/graphql", "audiences → variation key"]} />

              <Box x={940} y={388} w={200} h={68} hc="var(--on-surface-variant)" dashed
                title="Content Recommendations"
                sub={["reference - not wired up", "would read the ODP profile"]} />

              <Box x={940} y={476} w={200} h={68} hc="var(--on-surface-variant)" dashed
                title="Product Recommendations"
                sub={["reference - not wired up", "catalog feed + behaviour"]} />

              {/* Arrow labels last, so they sit above every stroke */}
              <text x={478} y={190} textAnchor="middle" fill="var(--primary)" fontSize={9} fontFamily="system-ui,sans-serif">GraphQL</text>
              <text x={476} y={244} textAnchor="middle" fill="var(--error)" fontSize={9} fontStyle="italic" fontFamily="system-ui,sans-serif">content</text>
              <text x={480} y={612} textAnchor="start" fill="var(--primary-fill)" fontSize={9} fontFamily="system-ui,sans-serif">publish webhook · revalidateTag</text>
              <text x={869} y={96} textAnchor="middle" fill="var(--tertiary)" fontSize={8.5} fontFamily="system-ui,sans-serif">datafile · decideAll</text>
              <text x={786} y={176} textAnchor="end" fill="var(--tertiary)" fontSize={8.5} fontFamily="system-ui,sans-serif">opti_wx_variation cookie</text>
              <text x={866} y={398} textAnchor="middle" fill="var(--secondary-container)" fontSize={8.5} fontFamily="system-ui,sans-serif">mb_* events</text>
              <text x={925} y={272} textAnchor="end" fill="var(--secondary-container)" fontSize={8.5} fontFamily="system-ui,sans-serif">segments</text>
            </svg>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-xs text-on-surface-variant">
            {LEGEND.map(({ color, label, dashed }) => (
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

          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <svg width={30} height={14} aria-hidden="true">
                <rect x={1} y={2} width={26} height={10} rx={3} fill="var(--surface-container-low)" stroke="var(--outline-variant)" />
              </svg>
              <span>Solid border - integrated in this repo</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width={30} height={14} aria-hidden="true">
                <rect x={1} y={2} width={26} height={10} rx={3} fill="var(--surface-container-low)" stroke="var(--on-surface-variant)" strokeDasharray="4,3" />
              </svg>
              <span>Dashed border - reference architecture, not integrated</span>
            </div>
          </div>
        </section>

        <section id="loops">
          <DemoSectionHeading id="loops">The Three Feedback Loops{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Boxes and arrows show what talks to what. These loops are the reason the stack is worth
            composing: each one carries a signal from one product back into another and changes what
            the next request renders.
          </p>

          <div className="space-y-8">
            {[
              {
                title: "Data to decision to content",
                blurb: "Behaviour observed in the browser becomes audience membership in ODP, which becomes a variation key in a Graph query. The content served changes because of what the visitor did earlier.",
                steps: [
                  { label: "mb_* event", sub: "AutoTracker" },
                  { label: "ODP profile", sub: "zaius tag" },
                  { label: "Audience", sub: "/v3/graphql" },
                  { label: "variation key", sub: "resolveVariationKey()", highlight: true },
                  { label: "Graph filter", sub: "includeOriginal" },
                  { label: "Personalised page", sub: "RSC render" },
                ],
              },
              {
                title: "Publish to invalidate",
                blurb: "Nothing polls. An editor publishing is what makes the cache drop, and the one-hour TTL is only the ceiling if a webhook is ever missed.",
                steps: [
                  { label: "Editor publishes", sub: "Visual Builder" },
                  { label: "Graph reindexes", sub: "~30-60s" },
                  { label: "Webhook", sub: "doc.updated" },
                  { label: "revalidateTag", sub: "every CACHE_TAG", highlight: true },
                  { label: "Next request", sub: "rerenders once" },
                ],
              },
              {
                title: "Client decision to server render",
                blurb: "The loop that makes a client-side tool safe on a statically cached site. WX picks its variation in the browser, but the visible render on the next navigation is server-side, so there is no flash of the original.",
                steps: [
                  { label: "WX snippet", sub: "browser" },
                  { label: "opti_wx_variation", sub: "cookie" },
                  { label: "Middleware", sub: "validates vs datafile", highlight: true },
                  { label: "__v_ segment", sub: "URL rewrite" },
                  { label: "Cached variant", sub: "own ISR entry" },
                ],
              },
            ].map(({ title, blurb, steps }) => (
              <div key={title} className="rounded-2xl border border-ghost-border bg-surface-lowest p-6">
                <h3 className="font-display font-bold text-base text-on-surface mb-2">{title}</h3>
                <p className="text-sm text-on-surface-variant mb-5 max-w-3xl">{blurb}</p>
                <Pipeline steps={steps} />
              </div>
            ))}
          </div>
        </section>

        <section id="products">
          <DemoSectionHeading id="products">Product by Product{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            What each product does in this architecture, how it is actually connected, and where that
            connection lives in the code.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            {PRODUCTS.map(({ name, status, role, mechanism, files }) => {
              const chip = STATUS_CHIP[status];
              return (
                <div
                  key={name}
                  className={`rounded-2xl border border-ghost-border p-6 ${
                    status === "reference" ? "bg-surface-lowest/50" : "bg-surface-lowest"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className={`font-display font-bold text-base ${
                      status === "reference" ? "text-on-surface-variant" : "text-on-surface"
                    }`}>
                      {name}
                    </h3>
                    <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${chip.className}`}>
                      {chip.label}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">{role}</p>
                  <p className="text-xs text-on-surface-variant/80 leading-relaxed mb-4">{mechanism}</p>
                  {files.length > 0 && (
                    <ul className="space-y-1">
                      {files.map((file) => (
                        <li key={file} className="text-[11px] font-mono text-on-surface-variant/70 truncate">
                          {file}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section id="request-lifecycle">
          <DemoSectionHeading id="request-lifecycle">Request Lifecycle{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            One request for a CMS page, from the edge to the rendered HTML, plus the invalidation that
            follows a publish. This is the path the diagram traces.
          </p>

          <ol className="space-y-5">
            {LIFECYCLE.map(({ title, detail }, i) => (
              <li key={title} className="flex gap-4">
                <StepBadge size="lg">{i + 1}</StepBadge>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-sm text-on-surface mb-1">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="status">
          <DemoSectionHeading id="status">What Is Actually Wired Up{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            The diagram is a reference architecture, so it includes products this demo does not use.
            This table is the honest version: what you can go and read the code for today.
          </p>

          <div className="rounded-2xl border border-ghost-border bg-surface-lowest overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ghost-border bg-surface-low">
                  <th className="text-left font-semibold text-on-surface px-5 py-3">Product</th>
                  <th className="text-left font-semibold text-on-surface px-5 py-3">Status</th>
                  <th className="text-left font-semibold text-on-surface px-5 py-3">In this repo</th>
                </tr>
              </thead>
              <tbody>
                {STATUS_TABLE.map(({ product, status, note }) => {
                  const chip = STATUS_CHIP[status];
                  return (
                    <tr key={product} className="border-b border-ghost-border last:border-0">
                      <td className="px-5 py-3 text-on-surface font-medium">{product}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${chip.className}`}>
                          {chip.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">{note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="related">
          <DemoSectionHeading id="related">Go Deeper{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            This page is the map. Each of these covers one region of it in detail.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { href: "/demo/architecture", label: "Architecture & CMS Editions", note: "The request and publish flow in isolation, plus SaaS CMS vs CMS 13" },
              { href: "/demo/caching", label: "Caching", note: "ISR, \"use cache\", cache tags and the publish webhook" },
              { href: "/demo/feature-experimentation", label: "Experimentation", note: "Flags, bucketing and the variation URL segment" },
              { href: "/demo/personalization", label: "Personalization", note: "ODP audiences, personas and the Web Experimentation bridge" },
              { href: "/demo/event-tracking", label: "Event Tracking", note: "The mb_* event layer and its three destinations" },
              { href: "/demo/external-content", label: "External Content", note: "Registering a non-CMS system through the Content Source API" },
              { href: "/demo/media", label: "Media & DAM Assets", note: "Asset references, renditions and CDN resizing" },
              { href: "/demo/mark-ai", label: "Mark AI Agents", note: "The agents, the workflow builder and the CMS MCP server" },
            ].map(({ href, label, note }) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border border-ghost-border bg-surface-lowest p-5 hover:border-brand/40 transition-colors"
              >
                <p className="font-display font-bold text-sm text-on-surface mb-1">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{note}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
