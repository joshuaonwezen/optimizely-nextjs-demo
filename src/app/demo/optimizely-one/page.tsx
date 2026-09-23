import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";
import KeyPoints from "@/components/demo/KeyPoints";
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
  { id: "m-flow", color: "var(--on-surface-variant)" },
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
  { color: "var(--on-surface-variant)", label: "Request flow inside the Next.js deployment", dashed: false },
  { color: "var(--tertiary)", label: "Decisions and conversions to experiment results", dashed: false },
  { color: "var(--on-surface-variant)", label: "Leaves the request path - into systems you own", dashed: true },
];

// `role` is what the product is for; `mechanism` is how you integrate it. Both are
// written at the platform level - the concrete choices a given implementation makes
// belong in the prose around them, not here.
const PRODUCTS: {
  name: string;
  role: string;
  mechanism: string;
}[] = [
  {
    name: "Optimizely Graph",
    role: "The single read API. Every content-shaped thing in the stack converges here: CMS pages, DAM asset metadata, and external systems registered through the Content Source API.",
    mechanism: "Query it server-side over GraphQL with a delivery key. The integration decision that matters is caching: queries whose shape is fixed and whose inputs come from a closed set can be cached and tagged for invalidation, while queries keyed on unbounded visitor input - search terms, coordinates - must stay uncached, or every request mints a cache entry nothing will ever read again.",
  },
  {
    name: "SaaS CMS",
    role: "Authoring, Visual Builder compositions, display templates, preview and the editorial workflow. Publishes sync into Graph rather than being read directly by the app.",
    mechanism: "Define content types in code and push them, so the model is version-controlled alongside the components that render it. Reads go through Graph, never the CMS directly. Writes - seeding, migrations, bulk edits - go through the Management API under service credentials. Preview is its own path: a short-lived token for editors in context, and app-level credentials where a draft link has to work for someone with no CMS login.",
  },
  {
    name: "Feature Experimentation",
    role: "Flags, A/B tests and server-side bucketing. The decision that matters most is made before rendering, so each variation can be cached independently.",
    mechanism: "The SDK decides from a locally cached datafile, so a decision costs no network call. Decide as early in the request as you can - at the edge, before rendering - and carry the result forward rather than deciding again per component. Suppress the impression everywhere a flag is read for routing, and fire it once from whatever actually renders the variant, or a page that decides several times will over-count. The SDK can also fetch ODP segments itself, letting an audience carry a segment condition directly instead of you mapping segments to variations by hand; keep that lookup off the hot path, since unlike a datafile decision it is a real network round trip.",
  },
  {
    name: "Data Platform (ODP)",
    role: "The behavioural profile store. Events flow out of the app, come back as audience membership, and are mapped to a content variation so the next render is personalised.",
    mechanism: "Four channels, and they are worth separating. A browser tag for pageviews and interaction events. A server-side event call for things the browser should not be trusted with, like a form submission. A server-side query that reads back which audiences a visitor qualifies for, cached, because membership changes slowly. And customer-attribute writes, which are the ones that change who can use the platform: an event stream needs someone to write a segment rule, whereas an attribute carrying the visitor\'s content interests turns an audience into a dropdown a marketer can use unaided.",
  },
  {
    name: "Web Experimentation",
    role: "Visual, marketer-owned client-side testing on top of the same visitor identity as Feature Experimentation. Useful for changes that do not need a code deploy.",
    mechanism: "The snippet must load blocking in the head, or the original paints before the variation applies. Because it decides in the browser after the server has already responded, connecting it to server-rendered content means persisting its decision - typically to a cookie - and letting the next request act on it. Traffic should run both ways: push what you know about the visitor in as user attributes, and a marketer can target a content taxonomy term or a data-platform audience from the visual editor without a deploy. Audiences evaluate at page activation, so attributes pushed after the page loads apply from the next one.",
  },
  {
    name: "DAM / CMP Assets",
    role: "Asset library and delivery. Images arrive as references on content and are rendered with responsive srcsets and on-the-fly CDN resizing.",
    mechanism: "Delivery-side only is usually the right scope. Asset metadata rides along on the content reference from Graph, so no second lookup is needed, and the binary comes from the asset CDN with transform parameters applied per breakpoint. If you proxy those URLs to add caching or hide the origin, allow-list the hosts you will forward to rather than accepting arbitrary ones.",
  },
  {
    name: "Content Source API",
    role: "Brings systems that are not the CMS into Graph, so a PIM, a branch database or a quote feed can be queried with the same GraphQL and the same facets as CMS content.",
    mechanism: "Register a schema for the external system, then push rows into it. Once indexed they read back exactly like CMS content - same filters, same facets, same pagination - so a component does not need to know whether what it renders was authored or synced. This is the cheapest way to make a non-CMS system queryable without building a second delivery path.",
  },
  {
    name: "Analytics and tag management",
    role: "The analytics the customer already had. Not an Optimizely product, but the one every real stack has, and the place a marketer will ask to see experiment arms alongside everything else they measure.",
    mechanism: "Treat it as one more destination on the same event wrapper rather than a separate integration. The thing that makes it valuable is attribution: stamp each event with the variation the visitor was actually served, using the experiment-dimension convention the analytics tool already understands, and an Optimizely variation becomes a dimension in reports Optimizely does not own. Keep the tag bootstraps ahead of any tracking call so nothing fires into an undefined queue.",
  },
  {
    name: "Mark AI",
    role: "AI agents over the stack: content generation and review, SEO and GEO analysis, and natural-language authoring against the CMS.",
    mechanism: "Authoring-side rather than request-path. Agents reach the CMS and the experimentation platform through their published tool interfaces, driven from an editor or developer tool, so nothing here sits between a visitor and a response. That is the distinction to hold onto when scoping it: it accelerates the people producing the experience, and adds no runtime dependency to serving it.",
  },
  {
    name: "Experiment Results",
    role: "Where the experiment is actually measured. Every decision and every conversion lands here, and the stats engine turns them into lift and significance per variation.",
    mechanism: "Both event types should leave from where the visitor actually is, not from wherever the decision was computed - an impression fired at the edge records an exposure nobody necessarily saw. Decide at the edge with the impression suppressed, confirm what was rendered, then fire it from the client. Send conversions with the same attributes as the decision, or results cannot be segmented by the audiences that shaped them. Results are read in the console or pulled through the results API.",
  },
  {
    name: "Optimizely Analytics",
    role: "Warehouse-native product analytics: funnels, retention and cohort analysis over the same behavioural data, joined to whatever else the business already keeps in its warehouse.",
    mechanism: "The one product that does not ingest anything. An enriched export drops raw decision and conversion rows into storage the customer owns, that lands in their warehouse, and Analytics queries it in place rather than copying it. The value is that experiment results stop being a walled garden: a variation can be joined to revenue, churn or anything else already modelled there.",
  },
  {
    name: "Content Recommendations",
    role: "Picks the next best article or page per visitor from their behavioural profile, typically for a \"recommended for you\" rail.",
    mechanism: "The trap worth knowing before scoping it: it does not reuse the data-platform profile. It builds its own, from its own tracking script plus a crawl or feed of the content, and nothing syncs between the two stores. The most you can align is the visitor identifier. Integrating it means adding that script or its delivery API, then resolving the returned content keys through Graph so the rail renders with components you already have.",
  },
  {
    name: "Product Recommendations",
    role: "Catalog-driven merchandising: also-bought, trending and personalised product rails.",
    mechanism: "Needs a product catalog feed, and like Content Recommendations it keeps its own behavioural profile rather than reading the data platform - so an existing event stream cannot simply be piped in; the same signals have to be emitted to its tracker alongside the existing calls. Registering the catalog through the Content Source API first is what makes the returned products queryable next to everything else.",
  },
];


const LIFECYCLE: { title: string; detail: React.ReactNode }[] = [
  {
    title: "Identify and decide, at the edge",
    detail: (
      <>
        Establish the visitor id before anything else needs it, minting one on first request so the
        very first render is not anonymous. Apply CMS-managed redirects against the clean path,
        before any rewriting. Then decide flags from the cached datafile and encode the winning
        variations into the request itself. Two constraints worth designing in: only let flags that
        actually change CMS content reach this stage, and cap how many can stack, or the number of
        distinct cache entries multiplies with every flag you add.
      </>
    ),
  },
  {
    title: "Resolve the route",
    detail: (
      <>
        Split the variation keys back off the incoming path, and work out which content URLs to
        try - locale prefixes and trailing slashes both produce more than one candidate. This is
        also where you decide whether the request can stay cached: reading per-visitor state here
        makes the route dynamic, so scope that read to the few routes that genuinely need it rather
        than applying it globally.
      </>
    ),
  },
  {
    title: "Query content",
    detail: (
      <>
        Fetch by path with a variation filter, and <strong>always allow the original</strong> in
        the result set. Without that, a visitor who matches no variation gets nothing rather than
        the default page - the single most common way personalised routing produces a blank page in
        production. Keep a lookup fallback for the case where the path query misses.
      </>
    ),
  },
  {
    title: "Render",
    detail: (
      <>
        Dispatch the returned content type to a component and walk the composition tree. The
        variation that was actually rendered is what gets reported back as an impression, from the
        client - not the variation that was decided upstream, which may never have been shown.
      </>
    ),
  },
  {
    title: "Invalidate",
    detail: (
      <>
        Nothing polls. Publishing is what drops the cache: the CMS reindexes and fires a webhook,
        and the handler invalidates every cache tag the content could be behind. A time-based TTL
        is the fallback ceiling for a missed webhook, not the mechanism.
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
//   ODP:         940, 170, 200, 88  -> cx=1040 cy=214 left=940 bottom=258
//   WX:          940, 280, 200, 76  -> cx=1040 cy=318 left=940
//   ContentRecs: 940, 388, 200, 68  -> cx=1040 left=940 bottom=456
//   ProductRecs: 940, 476, 200, 68  -> cx=1040 left=940
//   ExpResults:  500, 600, 170, 72  -> cy=636 right=670
//   Warehouse:   750, 600, 170, 72  -> cy=636 left=750 right=920
//   Analytics:   970, 600, 170, 72  -> cy=636 left=970
//
// The right column is ordered so each product sits level with the runtime it talks to:
// FX <-> Middleware, ODP <-> Server (segments), WX <-> Client. The two 22px gaps between
// the runtime boxes (160..182 and 282..304) hold the request-spine connectors at x=600.

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
        description="How Graph, SaaS CMS, DAM, the Content Source API, Feature Experimentation, Web Experimentation, ODP, recommendations and Mark AI compose into one integration - what each product is responsible for, where they hand off to each other, and the decisions that make the difference between products running side by side and products actually composing."
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
              <strong>Experimentation happens before rendering.</strong> Decide the flag at the
              edge and make the winning variation part of the URL, so every bucket gets its own
              stable ISR cache entry. Personalised pages stay statically cached instead of going
              dynamic, which is the difference between personalisation you can afford at scale and
              personalisation you cannot.
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
              <strong>One profile, read by every product.</strong> Visitor id, decision attributes,
              audience membership and the content interests inferred from browsing belong in a
              single object rather than being re-derived per product. Composing it means reading
              per-visitor state, which makes a route dynamic - so anything that has to stay cached
              reads that profile from the browser instead of the server.
            </>,
            <>
              <strong>Not every product reads the same profile.</strong> The recommendation
              products each build their own from their own tracker, and warehouse analytics ingests
              nothing at all - it queries an export in place. Assuming one shared visitor profile
              across the whole suite is the most common scoping mistake.
            </>,
          ]}
        />

        <section id="diagram">
          <DemoSectionHeading id="diagram">Architecture Diagram{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Content supply on the left, Graph as the hub, the application in the middle split by
            runtime, and the decisioning and data products on the right. Solid edges are the request
            path; dashed edges leave it - a decision persisted for the next request, or an export
            into systems you own.
          </p>

          <div className="rounded-2xl border border-ghost-border bg-surface-lowest p-4 overflow-x-auto">
            <svg
              viewBox="0 0 1180 690"
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

              {/* The measurement band runs across the bottom rather than as a fifth column:
                  its events come from Client/Browser, and a fifth column would have to cross
                  the whole DECISION + DATA column to get there. */}
              <text x={24} y={584} textAnchor="start" fill="var(--on-surface-variant)" fontSize={9} fontWeight="bold" letterSpacing={1.4} fontFamily="system-ui,sans-serif">MEASUREMENT + ANALYTICS</text>

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

              {/* The request spine. The URL rewrite is the ONLY channel the FX decision uses
                  to reach the server render: the edge encodes the variation into the URL,
                  the catch-all parses them back off the slug and turns them into the Graph
                  variation filter. Nothing re-decides FX on the server. */}
              <path d="M 600,160 L 600,178"
                fill="none" stroke="var(--on-surface-variant)" strokeWidth={1.5} markerEnd="url(#m-flow)" />
              <path d="M 600,282 L 600,300"
                fill="none" stroke="var(--on-surface-variant)" strokeWidth={1.5} markerEnd="url(#m-flow)" />

              {/* Graph publish webhook -> Server, routed under Graph through the free corridor */}
              <path d="M 362,290 L 362,318 L 470,318 L 470,262 L 514,262"
                fill="none" stroke="var(--primary-fill)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-hook)" />

              {/* FX -> middleware */}
              <line x1={940} y1={104} x2={798} y2={104}
                stroke="var(--tertiary)" strokeWidth={2} markerEnd="url(#m-decide)" />

              {/* WX -> client (the snippet runs in the browser) */}
              <line x1={940} y1={348} x2={798} y2={398}
                stroke="var(--tertiary)" strokeWidth={2} markerEnd="url(#m-decide)" />

              {/* WX variation cookie: client -> middleware, up the frame's right gutter.
                  It is deliberately long - the point is that the cookie survives to the
                  NEXT request. It crosses only the dashed segments arrow, at a right angle. */}
              <path d="M 792,316 L 806,316 L 806,132 L 798,132"
                fill="none" stroke="var(--tertiary)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-decide)" />

              {/* Client -> ODP events, climbing left of the WX box (stays at x <= 936) */}
              <path d="M 796,344 C 856,336 886,292 936,254"
                fill="none" stroke="var(--secondary-container)" strokeWidth={2} markerEnd="url(#m-data)" />

              {/* ODP -> Server segments, level with the runtime it talks to */}
              <line x1={940} y1={214} x2={798} y2={214}
                stroke="var(--secondary-container)" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#m-data)" />

              {/* Nothing points at the two recommendation products on purpose: neither one
                  reads the ODP profile, each keeps its own from its own tracker. */}

              {/* Decisions and conversions leave the BROWSER, not the edge: middleware runs
                  decideAll with DISABLE_DECISION_EVENT behind a no-op requestHandler, so the
                  impression is fired by whatever renders the variant, and conversions by the tracking
                  destination (user.trackEvent). The line crosses the frame because the events
                  are leaving the deployment. */}
              <path d="M 585,404 L 585,596"
                fill="none" stroke="var(--tertiary)" strokeWidth={2} markerEnd="url(#m-decide)" />

              {/* Results -> warehouse, and Analytics reading the warehouse in place */}
              <line x1={670} y1={636} x2={746} y2={636}
                stroke="var(--on-surface-variant)" strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#m-flow)" />
              <line x1={970} y1={636} x2={924} y2={636}
                stroke="var(--on-surface-variant)" strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#m-flow)" />

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
                sub={["one GraphQL read API", "for CMS · DAM meta ·", "external sources", "search · facets · geo", "variation filter for", "personalised content"]} />

              <Box x={520} y={72} w={272} h={88} hc="var(--primary)"
                title="Edge Middleware"
                sub={["FX decideAll at the edge", "encodes the variation key", "one stable ISR key per bucket", "CMS redirects · visitor id"]} />

              <Box x={520} y={182} w={272} h={100} hc="var(--primary)"
                title="Server Components (RSC)"
                sub={["\"use cache\" + cacheTag", "Graph variation filter", "ODP segment read on /", "renders CMS compositions"]} />

              <Box x={520} y={304} w={272} h={100} hc="var(--primary)"
                title="Client / Browser"
                sub={["WX snippet (blocking)", "ODP zaius tag", "tag · interaction events", "FX browser datafile"]} />

              <Box x={940} y={72} w={200} hc="var(--tertiary)"
                title="Feature Experimentation"
                sub={["datafile · 60s TTL", "decides at the edge, on the", "server and in the browser"]} />

              <Box x={940} y={170} w={200} h={88} hc="var(--secondary-container)"
                title="Data Platform (ODP)"
                sub={["events in: zaius tag and", "server /v3/events", "segments out: /v3/graphql", "audiences → variation key"]} />

              <Box x={940} y={280} w={200} hc="var(--tertiary)"
                title="Web Experimentation"
                sub={["client-side snippet", "shares the visitor cookie", "bridges into middleware"]} />

              <Box x={940} y={388} w={200} h={68} hc="var(--on-surface-variant)" dashed
                title="Content Recommendations"
                sub={["keeps its own profile", "own tracker + content feed"]} />

              <Box x={940} y={476} w={200} h={68} hc="var(--on-surface-variant)" dashed
                title="Product Recommendations"
                sub={["keeps its own profile", "own tracker + catalog feed"]} />

              {/* Measurement band. The events really are sent from the browser, so Experiment
                  Results is solid; the export and everything downstream of it leaves the request path. */}
              <Box x={500} y={600} w={170} h={72} hc="var(--tertiary)"
                title="Experiment Results"
                sub={["decisions + conversions in", "stats engine computes lift", "read via the Results API"]} />

              <Box x={750} y={600} w={170} h={72} hc="var(--on-surface-variant)" dashed
                title="Data Warehouse"
                sub={["customer owned", "Snowflake · BigQuery", "raw decision + event rows"]} />

              <Box x={970} y={600} w={170} h={72} hc="var(--on-surface-variant)" dashed
                title="Optimizely Analytics"
                sub={["warehouse-native", "queries the warehouse", "no data copy"]} />

              {/* Arrow labels last, so they sit above every stroke */}
              <text x={478} y={190} textAnchor="middle" fill="var(--primary)" fontSize={9} fontFamily="system-ui,sans-serif">GraphQL</text>
              <text x={476} y={244} textAnchor="middle" fill="var(--error)" fontSize={9} fontStyle="italic" fontFamily="system-ui,sans-serif">content</text>
              <text x={424} y={333} textAnchor="middle" fill="var(--primary-fill)" fontSize={9} fontFamily="system-ui,sans-serif">publish webhook · revalidateTag</text>
              <text x={869} y={96} textAnchor="middle" fill="var(--tertiary)" fontSize={8.5} fontFamily="system-ui,sans-serif">datafile · decideAll</text>
              <text x={814} y={120} textAnchor="start" fill="var(--tertiary)" fontSize={8.5} fontFamily="system-ui,sans-serif">variation cookie</text>
              <text x={814} y={131} textAnchor="start" fill="var(--tertiary)" fontSize={8.5} fontFamily="system-ui,sans-serif">read next request</text>
              <text x={826} y={356} textAnchor="start" fill="var(--secondary-container)" fontSize={8.5} fontFamily="system-ui,sans-serif">mb_* events</text>
              <text x={869} y={206} textAnchor="middle" fill="var(--secondary-container)" fontSize={8.5} fontFamily="system-ui,sans-serif">segments</text>
              <text x={610} y={176} textAnchor="start" fill="var(--on-surface-variant)" fontSize={8.5} fontFamily="system-ui,sans-serif">variation in the URL</text>
              <text x={610} y={298} textAnchor="start" fill="var(--on-surface-variant)" fontSize={8.5} fontFamily="system-ui,sans-serif">rendered HTML</text>
              <text x={595} y={520} textAnchor="start" fill="var(--tertiary)" fontSize={8.5} fontFamily="system-ui,sans-serif">decisions · conversions</text>
              <text x={710} y={590} textAnchor="middle" fill="var(--on-surface-variant)" fontSize={8.5} fontFamily="system-ui,sans-serif">Enriched Events Export</text>
              <text x={945} y={590} textAnchor="middle" fill="var(--on-surface-variant)" fontSize={8.5} fontFamily="system-ui,sans-serif">queries in place</text>
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

        <section id="profile">
          <DemoSectionHeading id="profile">The Shared Visitor Profile{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            The loops below all need the same thing: one answer to &quot;who is this visitor&quot;
            that every product agrees on. That is one object, composed from the readers that
            already existed rather than replacing any of them.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-ghost-border bg-surface-lowest p-6">
              <h3 className="font-display font-bold text-base text-on-surface mb-3">What it composes</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                One object holding the visitor id, the attribute set decisions are made with,
                whatever segment or persona signal you derive from browsing, the audiences the data
                platform says they qualify for, and the variation those audiences resolve to.
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Compose it from the readers you already have rather than reimplementing them. The
                attribute set in particular must have exactly one definition: if the edge, the
                server and the browser each build their own, they will drift, and a visitor can be
                bucketed one way server-side and another in the browser.
              </p>
            </div>

            <div className="rounded-2xl border border-ghost-border bg-surface-lowest p-6">
              <h3 className="font-display font-bold text-base text-on-surface mb-3">
                Why cached pages read it from the browser
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                Composing the profile means reading per-visitor state, and reading per-visitor state
                on the server makes that route dynamic. In a CMS-driven site an editor can place a
                block on any page, so a block that reads the profile server-side can quietly take an
                arbitrary page out of the cache - and nobody finds out until the site gets slower.
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                The way out is to split it: render the shell from CMS fields on the server, and
                fetch the personalised part from the browser against an endpoint that is allowed to
                be dynamic. The page keeps its cache entry and the content still personalises.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-ghost-border bg-surface-lowest p-6 mt-5">
            <h3 className="font-display font-bold text-base text-on-surface mb-3">Three ways in</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant leading-relaxed">
              <li>
                <strong className="text-on-surface">Server</strong>, on a route that is already
                dynamic. Offer two depths: one that reads only local state and costs nothing, and
                one that adds the audience lookup, so callers are not forced to pay for a network
                round trip they do not need.
              </li>
              <li>
                <strong className="text-on-surface">A dedicated endpoint</strong>, explicitly
                dynamic, for anything running on a cached page. Give it a way to bypass the audience
                cache, because a verification or debugging surface has to show current state rather
                than what was true five minutes ago.
              </li>
              <li>
                <strong className="text-on-surface">Browser</strong>, through a small client-side
                reader that dedupes concurrent callers into one request per tab and refetches when a
                signal changes without a server round trip.
              </li>
            </ul>
          </div>
        </section>

        <section id="loops">
          <DemoSectionHeading id="loops">The Four Feedback Loops{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Boxes and arrows show what talks to what. These loops are the reason the stack is worth
            composing: each one carries a signal from one product back into another and changes what
            the next request renders.
          </p>

          <div className="space-y-8">
            {[
              {
                title: "Data to decision to content",
                blurb: "Behaviour observed in the browser becomes audience membership, which becomes a variation key on the content query. The page changes because of what the visitor did earlier, and the loop closes: every event fired afterwards carries the variation that was served, so the same stream that personalised the page also measures it.",
                steps: [
                  { label: "Interaction event", sub: "browser tag" },
                  { label: "Behavioural profile", sub: "data platform" },
                  { label: "Audience", sub: "segment query" },
                  { label: "Variation key", sub: "one shared string", highlight: true },
                  { label: "Content filter", sub: "allow the original" },
                  { label: "Personalised page", sub: "server render" },
                  { label: "Variation on events", sub: "attribution closes" },
                ],
              },
              {
                title: "Publish to invalidate",
                blurb: "Nothing polls. Publishing is what makes the cache drop, and a time-based TTL is only the ceiling for a webhook that never arrived.",
                steps: [
                  { label: "Editor publishes", sub: "authoring UI" },
                  { label: "Content reindexes", sub: "seconds, not instant" },
                  { label: "Webhook", sub: "content updated" },
                  { label: "Invalidate tags", sub: "every affected tag", highlight: true },
                  { label: "Next request", sub: "rerenders once" },
                ],
              },
              {
                title: "Client decision to server render",
                blurb: "The loop that makes a client-side tool safe on a statically cached site. The visual editor picks its variation in the browser, but the visible render on the next navigation is server-side, so there is no flash of the original.",
                steps: [
                  { label: "Visual editor", sub: "decides in browser" },
                  { label: "Persisted decision", sub: "cookie" },
                  { label: "Validate at the edge", sub: "reject unknown keys", highlight: true },
                  { label: "Variation in the URL", sub: "one key per bucket" },
                  { label: "Cached variant", sub: "its own cache entry" },
                ],
              },
              {
                title: "Content meaning to recommendation",
                blurb: "The content taxonomy stops being only a filing system and becomes a targeting vocabulary. The terms an editor tags an article with are the same strings the data platform builds an audience on and the content query filters by - so a personalised rail needs no new query and no schema change, because the filter was already there.",
                steps: [
                  { label: "Content category", sub: "term on the article" },
                  { label: "Content viewed", sub: "event carries the terms" },
                  { label: "Top categories", sub: "accumulated per visitor", highlight: true },
                  { label: "Customer attribute", sub: "targetable in the UI" },
                  { label: "Content filter", sub: "same terms, same query" },
                  { label: "Recommended rail", sub: "fetched client-side" },
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
            What each product is for, and what integrating it actually involves - the decisions that
            tend to matter, and the traps worth knowing before you scope the work.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            {PRODUCTS.map(({ name, role, mechanism }) => (
              <div
                key={name}
                className="rounded-2xl border border-ghost-border bg-surface-lowest p-6"
              >
                <h3 className="font-display font-bold text-base text-on-surface mb-3">{name}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-3">{role}</p>
                <p className="text-xs text-on-surface-variant/80 leading-relaxed">{mechanism}</p>
              </div>
            ))}
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
