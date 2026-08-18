import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";

export const metadata: Metadata = {
  title: "System Architecture",
};

const MARKERS = [
  { id: "arr-blue",   color: "#007b79" },
  { id: "arr-purple", color: "#8f4764" },
  { id: "arr-orange", color: "#ff99b6" },
  { id: "arr-teal",   color: "#197050" },
  { id: "arr-red",    color: "#7ddd3d" },
  { id: "arr-green",  color: "#3ab533" },
  { id: "arr-lblue",  color: "#91dbda" },
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
          textAnchor="middle" fill="var(--on-surface-variant)"
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
//   Edge CDN:         x=370, y=185, w=148 → cx=444, cy=222, right=518, bottom=259
//   Next.js:          x=550, y=185, w=152 → cx=626, cy=222, right=702, bottom=259
//   Graph:            x=740, y=92,  w=158 → cx=819, cy=129, right=898, bottom=166
//   CMS:              x=740, y=296, w=158 → cx=819, cy=333, right=898, top=296

export default function ArchitecturePage() {
  return (
    <>

      <DemoHero
        title="System Architecture"
        description="How Optimizely SaaS CMS, Graph, and this Next.js app connect - request flow, ISR caching, and cache invalidation on publish - plus how the managed SaaS CMS compares to self-run CMS 13."
      />

      <div className="max-w-6xl mx-auto px-8 py-16 space-y-20">

        <section id="what-is-headless">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            What is a headless CMS?{" "}
            <a href="#what-is-headless" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            A CMS (Content Management System) is where editors write, organise, and publish content. "Headless" describes how it connects to your website. A CMS can be coupled (it renders the site itself), headless (it only serves content as data), or hybrid - one backend that does both. Optimizely CMS 13 enables that hybrid path.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {[
              {
                title: "Traditional (coupled)",
                steps: [
                  { label: "Browser", sub: "GET /articles", amber: false },
                  { label: "Coupled CMS server", sub: "e.g. CMS 12 - .NET controller looks up content", amber: false },
                  { label: "Razor view (MVC)", sub: "renders the full HTML", amber: true },
                  { label: "Browser", sub: "shows the HTML page", amber: false },
                ],
              },
              {
                title: "Hybrid (CMS 13)",
                steps: [
                  { label: "Browser", sub: "GET /page", amber: false },
                  { label: "CMS 13 backend", sub: "same content, two delivery modes", amber: false },
                  { label: "Coupled: Razor view (MVC)", sub: "CMS 13 renders the HTML itself", amber: true },
                  { label: "Headless: Optimizely Graph", sub: "frontend queries JSON, renders HTML", amber: false, sep: "or" },
                ],
              },
              {
                title: "Headless (this demo)",
                steps: [
                  { label: "Browser", sub: "GET /articles", amber: false },
                  { label: "Next.js app", sub: "owns the route - queries Optimizely Graph", amber: false },
                  { label: "Optimizely Graph", sub: "returns content as JSON", amber: false },
                  { label: "Next.js renders HTML", sub: "RSC, on ISR cache miss - then cached at the CDN", amber: true },
                ],
              },
            ].map(({ title, steps }) => (
              <div key={title} className="rounded-2xl border border-ghost-border bg-surface-lowest p-5">
                <h3 className="font-display font-bold text-sm text-on-surface text-center mb-4">{title}</h3>
                <div className="flex flex-col items-stretch">
                  {steps.map((step, i) => (
                    <div key={i} className="flex flex-col items-stretch">
                      {i > 0 && ("sep" in step && step.sep ? (
                        <span className="self-center text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60 py-1.5">{step.sep}</span>
                      ) : (
                        <span aria-hidden="true" className="self-center text-on-surface-variant/40 text-xs leading-none py-1.5">▼</span>
                      ))}
                      <div className={`rounded-xl border p-3 text-center ${step.amber ? "border-error/30 bg-error/10" : "border-ghost-border bg-surface-low"}`}>
                        <p className={`text-sm font-semibold ${step.amber ? "text-error" : "text-on-surface"}`}>{step.label}</p>
                        <p className={`text-xs ${step.amber ? "text-error" : "text-on-surface-variant"}`}>{step.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mb-8 flex items-center gap-2 text-xs text-on-surface-variant">
            <span aria-hidden="true" className="shrink-0 w-4 h-4 rounded border border-error/30 bg-error/10" />
            <span>Where the HTML is rendered - in a coupled CMS the CMS renders the page; in a headless setup your frontend does; in a hybrid setup the CMS 13 backend can do both.</span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-ghost-border bg-surface-lowest p-5">
              <h3 className="font-display font-bold text-sm text-on-surface mb-1">Traditional ("coupled") CMS - e.g. CMS 12 / CMS 13</h3>
              <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                One system handles both authoring and rendering. Optimizely CMS 12 and CMS 13 are examples of this model.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Editors write content in the CMS admin.",
                  "The CMS generates the HTML and sends it to visitors directly.",
                  "Changing the look of the site means changing CMS themes or templates.",
                  "Content is locked to one presentation - it can only appear on the site the CMS controls.",
                ].map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="shrink-0 font-bold text-on-surface-variant">-</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-tertiary/20 bg-tertiary/5 p-5">
              <h3 className="font-display font-bold text-sm text-tertiary mb-1">Hybrid CMS - Optimizely CMS 13</h3>
              <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                One backend does double duty. CMS 13 can render its own pages (the head) and expose the same content as data through Optimizely Graph - so each application decides which model it consumes.
              </p>
              <ul className="space-y-1.5">
                {[
                  "One .NET backend both renders pages (MVC / Razor) and serves content as data via Optimizely Graph.",
                  "CMS 13 can run fully coupled like CMS 12, or deliver headless through Graph - the same delivery layer this demo uses.",
                  "Editors keep a single CMS; each application decides whether to consume rendered pages or content as data.",
                  "Enables incremental migration - keep the existing server-rendered site while a new headless app is built alongside it.",
                ].map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="shrink-0 font-bold text-tertiary">-</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
              <h3 className="font-display font-bold text-sm text-brand mb-1">Headless CMS (this demo)</h3>
              <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                The CMS stores and manages content. A separate frontend (this Next.js app) fetches that content via API and decides how to display it.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Editors write content in Optimizely CMS.",
                  "Content is delivered as structured data via Optimizely Graph (a GraphQL API) - not as HTML.",
                  "This Next.js app fetches that data, renders it, and sends HTML to visitors.",
                  "The same content can power a website, a mobile app, and an email newsletter - all from one source.",
                  "Developers and editors work independently - no code deployment is needed when content changes.",
                ].map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="shrink-0 font-bold text-brand">-</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* SaaS vs CMS 13 */}
        <section id="saas-vs-cms13">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            SaaS CMS vs CMS 13 - who maintains what{" "}
            <a href="#saas-vs-cms13" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-2xl">
            SaaS CMS (what this demo runs) and CMS 13 are both Optimizely CMS with the same authoring experience. The choice between them is operational - who runs the backend, who owns versions and upgrades, and where the maintenance work lands.
          </p>
          <div className="mb-8 rounded-xl border border-ghost-border bg-surface-lowest p-4">
            <p className="text-sm font-semibold text-on-surface mb-1">Same editor experience</p>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-3xl">
              CMS 13 and SaaS CMS share the same authoring UI and content modelling, so editors see no difference between them. Everything below is about operations, not authoring.
            </p>
          </div>
          <div className="rounded-2xl border border-ghost-border overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[200px_1fr_1fr] bg-surface-low">
              <div className="p-3" />
              <div className="p-3 font-display font-bold text-sm text-brand">SaaS CMS (headless, this demo)</div>
              <div className="p-3 font-display font-bold text-sm text-on-surface">Optimizely CMS 13</div>
            </div>
            {[
              {
                dimension: "Hosting & backend ops",
                saas: "Fully managed by Optimizely - no servers, runtime, or database for you to run.",
                cms13: "You host and operate it (PaaS / DXP or self-managed) - infrastructure, runtime, and database are yours.",
              },
              {
                dimension: "Version management",
                saas: "Evergreen - there is no version to track; everyone is always on the current release.",
                cms13: "Pinned to a CMS 13.x version; you track packages and decide when to move.",
              },
              {
                dimension: "Upgrades & patching",
                saas: "Automatic and continuous - features and fixes ship with no upgrade projects.",
                cms13: "You plan, test, and run upgrades and security patches on your own schedule.",
              },
              {
                dimension: "Scaling & availability",
                saas: "Optimizely scales the backend and Graph; delivery scales at your hosting CDN.",
                cms13: "You size, scale, and plan availability of the backend infrastructure.",
              },
              {
                dimension: "What you build & maintain instead",
                saas: "The whole delivery side - the Next.js frontend, hosting / CDN, Graph queries, ISR caching, publish webhooks, and search and other integrations.",
                cms13: "Less delivery plumbing if you use the coupled head - MVC / Razor renders pages directly; stand up a separate headless app alongside it only when a channel needs one.",
              },
              {
                dimension: "Extensibility & built-in features",
                saas: "A managed, closed runtime with a fixed feature surface - you extend it through APIs, webhooks, apps, and your frontend, not by adding backend code. Capabilities beyond what it ships become extra dev you build and maintain outside the CMS.",
                cms13: "Full .NET extensibility - custom editor UI, server-side logic, scheduled jobs, content providers, add-ons, and in-process integrations all run inside the app. More is built in and more can be added, but that code is yours to maintain through upgrades.",
              },
              {
                dimension: "Rendering model",
                saas: "Headless only - a separate frontend always renders.",
                cms13: "Coupled, headless, or hybrid - render in the CMS, via a frontend, or both.",
              },
              {
                dimension: "Best fit",
                saas: "Teams wanting zero backend maintenance and ready to own a modern delivery stack (this demo).",
                cms13: "Teams wanting control of the backend and version lifecycle, or needing coupled rendering alongside headless (incremental migration).",
              },
            ].map(({ dimension, saas, cms13 }) => (
              <div key={dimension} className="grid md:grid-cols-[200px_1fr_1fr] border-t border-ghost-border">
                <div className="p-3 text-sm font-semibold text-on-surface bg-surface-lowest md:bg-transparent">{dimension}</div>
                <div className="p-3 text-xs text-on-surface-variant leading-relaxed border-t md:border-t-0 md:border-l border-ghost-border">
                  <span className="md:hidden block text-[10px] font-semibold uppercase tracking-wider text-brand/70 mb-0.5">SaaS CMS</span>
                  {saas}
                </div>
                <div className="p-3 text-xs text-on-surface-variant leading-relaxed border-t md:border-t-0 md:border-l border-ghost-border">
                  <span className="md:hidden block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60 mb-0.5">CMS 13</span>
                  {cms13}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-ghost-border bg-surface-lowest p-5">
            <p className="text-sm font-semibold text-on-surface mb-2">Where the SaaS feature gap shows up</p>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-3 max-w-3xl">
              CMS 13 can absorb these inside the .NET app; on SaaS CMS they usually become build-and-maintain work in your own services or frontend, because they cannot run inside the managed CMS:
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                "Server-side personalization and visitor targeting (on SaaS these run as separate experimentation / personalization services plus your frontend).",
                "Custom editor UI - bespoke property editors, admin plugins, and dashboard widgets.",
                "Custom server-side logic - publish-pipeline event handlers, scheduled jobs, and content providers.",
                "Installable add-ons and the wider .NET / NuGet package ecosystem.",
                "Integrations that run in-process rather than as separate services you host.",
                "Direct database and schema access, plus custom indexing and search backends.",
              ].map((p, i) => (
                <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                  <span className="shrink-0 font-bold text-on-surface-variant">-</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 text-xs text-on-surface-variant leading-relaxed max-w-3xl">
            The net: neither option removes the work, it moves it. SaaS hands backend hosting, versioning, and upgrades to Optimizely and keeps the CMS itself low-maintenance, in exchange for you owning the delivery stack and rebuilding anything beyond its feature surface outside the CMS. CMS 13 gives you a broader built-in feature set and a fully extensible backend, in exchange for you owning that code, the infrastructure, and the version and upgrade lifecycle.
          </p>
        </section>

        <section id="building-blocks">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The building blocks of a headless site{" "}
            <a href="#building-blocks" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            A headless CMS site has more moving parts than a traditional coupled CMS because the concerns are separated. Here is every piece you need and what it does.
          </p>
          <div className="space-y-2">
            {[
              {
                n: "1",
                label: "Headless CMS",
                sub: "Optimizely SaaS CMS in this demo",
                detail: "Where editors create, manage, and publish content. Stores content as structured data - text, images, references, rich text. Generates no HTML and knows nothing about how content will be displayed. Exposes content via a management API and fires webhooks when content is published.",
              },
              {
                n: "2",
                label: "Content Delivery API",
                sub: "Optimizely Graph in this demo",
                detail: "A read-optimized, globally distributed API that makes CMS content queryable by the frontend. In this demo it is a GraphQL API at cg.optimizely.com with its own CDN cache layer. The frontend queries this - not the CMS management API directly - because the delivery API is built for high-traffic reads, not authoring operations.",
              },
              {
                n: "3",
                label: "Frontend application",
                sub: "Next.js in this demo",
                detail: "The application that fetches content from the delivery API and renders it into HTML for visitors. Entirely your code, hosted wherever you choose. Because it is separate from the CMS, it can be rebuilt, rewritten, or replaced without touching the CMS or migrating content. The same CMS content can simultaneously serve a web app, a mobile app, and a third-party integration.",
              },
              {
                n: "4",
                label: "Frontend hosting and CDN",
                sub: "Vercel in this demo",
                detail: "Where the frontend application runs and where rendered pages are cached. The CDN stores pre-rendered copies of pages at edge nodes close to users and serves them in ~10-50ms without involving the frontend server. Any hosting provider that supports your framework works here - Vercel, Netlify, Cloudflare Pages, AWS, and others all handle this pattern.",
              },
              {
                n: "5",
                label: "Cache invalidation via webhook",
                sub: "Optimizely Graph fires a POST to /api/webhooks",
                detail: "When an editor publishes content, something needs to tell the frontend its cached pages are out of date. This is done via webhook - Optimizely Graph sends a POST request to the frontend's webhook endpoint, which marks the relevant cache entries as stale. The next visitor request triggers a background re-render with fresh content.",
              },
            ].map(({ n, label, sub, detail }) => (
              <div key={n} className="flex gap-4 p-4 rounded-xl bg-surface-lowest border border-ghost-border">
                <div className="shrink-0 w-7 h-7 rounded-full bg-brand flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{n}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{label}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60 mb-0.5">{sub}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="diagram">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Architecture Diagram{" "}
            <a href="#diagram" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Request flow left to right. The CDN serves pages from its ISR cache; on a miss it forwards to
            Next.js, which renders from Optimizely Graph. CMS publishes sync into Graph, which fires a
            webhook to invalidate the ISR cache.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/1-installation.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
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
                stroke="#91dbda" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-lblue)" />

              {/* Browser → Edge CDN - HTTPS */}
              <line x1={144} y1={222} x2={370} y2={222}
                stroke="#007b79" strokeWidth={2} markerEnd="url(#arr-blue)" />

              {/* Edge CDN → Next.js - ISR miss */}
              <line x1={518} y1={222} x2={550} y2={222}
                stroke="#8f4764" strokeWidth={2} markerEnd="url(#arr-purple)" />

              {/* Next.js → Graph - GraphQL query */}
              <path d="M 702,210 C 726,210 740,155 740,129"
                fill="none" stroke="#ff99b6" strokeWidth={2} markerEnd="url(#arr-orange)" />

              {/* Graph → Next.js - content response (dashed) */}
              <path d="M 740,148 C 730,180 718,232 702,232"
                fill="none" stroke="#ff99b6" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-orange)" />

              {/* CMS → Graph - content sync on publish */}
              <line x1={819} y1={296} x2={819} y2={166}
                stroke="#3ab533" strokeWidth={2} markerEnd="url(#arr-green)" />

              {/* Graph → Next.js - webhook for ISR invalidation (red dashed, routes below) */}
              <path d="M 898,132 L 926,132 L 926,412 L 626,412 L 626,259"
                fill="none" stroke="#7ddd3d" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-red)" />

              {/* ── Boxes (drawn on top of arrows) ── */}

              <Box x={14}  y={185} w={130} hc="#007b79" bc="var(--surface-container-low)" stroke="var(--outline-variant)"
                title="Browser" sub={["visitor · editor"]} />

              <Box x={370} y={185} w={148} hc="#8f4764" bc="var(--surface-container-low)" stroke="var(--outline-variant)"
                title="Edge CDN" sub={["ISR full-route cache", "one entry per page URL"]} />

              <Box x={550} y={185} w={152} hc="#197050" bc="var(--surface-container-low)" stroke="var(--outline-variant)"
                title="Next.js Server" sub={["App Router · RSC", "ISR · revalidate"]} />

              <Box x={740} y={92}  w={158} hc="#ff99b6" bc="var(--surface-container-low)" stroke="var(--outline-variant)"
                title="Optimizely Graph" sub={["cg.optimizely.com", "GraphQL delivery API"]} />

              <Box x={740} y={296} w={158} hc="#7ddd3d" bc="var(--surface-container-low)" stroke="var(--outline-variant)"
                title="Optimizely CMS" sub={["authoring UI", "Visual Builder"]} />

              {/* ── Arrow labels (drawn last, on top) ── */}
              <text x={294} y={163} textAnchor="middle" fill="#91dbda" fontSize={9} fontFamily="system-ui,sans-serif" fontStyle="italic">HTML response</text>
              <text x={257} y={215} textAnchor="middle" fill="#007b79" fontSize={9} fontFamily="system-ui,sans-serif">HTTPS</text>
              <text x={534} y={215} textAnchor="middle" fill="#8f4764" fontSize={9} fontFamily="system-ui,sans-serif">ISR miss</text>
              <text x={726} y={175} textAnchor="end" fill="#ff99b6" fontSize={9} fontFamily="system-ui,sans-serif">GraphQL</text>
              <text x={714} y={220} textAnchor="middle" fill="#ff99b6" fontSize={9} fontFamily="system-ui,sans-serif" fontStyle="italic">content</text>
              <text x={858} y={232} textAnchor="start" fill="#3ab533" fontSize={9} fontFamily="system-ui,sans-serif">content sync</text>
              <text x={780} y={425} textAnchor="middle" fill="#7ddd3d" fontSize={9} fontFamily="system-ui,sans-serif">Graph webhook</text>

            </svg>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-xs text-on-surface-variant">
            {[
              { color: "#007b79", label: "HTTPS request",                              dashed: false },
              { color: "#91dbda", label: "HTML response",                               dashed: true  },
              { color: "#8f4764", label: "CDN miss forwarded to Next.js",               dashed: false },
              { color: "#ff99b6", label: "GraphQL query · content response",            dashed: true  },
              { color: "#3ab533", label: "CMS content sync on publish",                 dashed: false },
              { color: "#7ddd3d", label: "Graph webhook - ISR cache invalidation",      dashed: true  },
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
                label: "Edge CDN / ISR Cache",
                color: "border-tertiary/30 bg-tertiary/10",
                hcolor: "text-tertiary",
                points: [
                  "Stores the fully rendered HTML of every page, one entry per page URL. Any CDN that supports path-based caching can serve this - no custom cache configuration needed.",
                  "TTL is set by export const revalidate in the catch-all route. Warm cache hits are served in ~10-50ms from the nearest edge node - the Next.js server is not involved.",
                  "Busted on publish: the Graph webhook calls revalidatePath(\"/\", \"layout\") + revalidateTag(\"page\") which marks entries as stale.",
                  "This layer absorbs almost all visitor traffic; the server only runs on a cache miss.",
                ],
              },
              {
                label: "Next.js Server",
                color: "border-brand/30 bg-brand/10",
                hcolor: "text-brand",
                points: [
                  "Renders CMS pages with ISR. No cookies() or headers() calls anywhere in the server render tree - these would force cache-control: no-store globally.",
                  "Runs only on an ISR cache miss - the first request for a URL, or after a webhook marks it stale.",
                  "Queries Optimizely Graph for the page content and renders React Server Components to HTML.",
                  "Writes the rendered output back to the CDN cache so subsequent requests skip the server.",
                ],
              },
              {
                label: "Optimizely Graph",
                color: "border-error/30 bg-error/10",
                hcolor: "text-error",
                points: [
                  "GraphQL delivery API at cg.optimizely.com. Serves CMS content, navigation, and banners.",
                  "Read-optimized and globally distributed - built for high-traffic reads, not authoring operations.",
                  "Has its own CDN cache layer independent of Next.js. Bypass with ?cache=false for preview/seed scripts.",
                  "Fires a webhook to /api/webhooks on every content change: bulk.completed, doc.updated, doc.expired.",
                ],
              },
              {
                label: "Optimizely CMS",
                color: "border-error/30 bg-error/10",
                hcolor: "text-error",
                points: [
                  "Authors create and manage pages, blocks, and navigation in Visual Builder.",
                  "Stores content as structured data and generates no HTML of its own.",
                  "On publish: content syncs to Optimizely Graph. Graph fires a webhook to trigger ISR invalidation.",
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
            <div className="rounded-2xl border border-error/30 bg-error/10 p-5">
              <h3 className="font-display font-bold text-sm text-error mb-1">Content Editor</h3>
              <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                Works entirely inside Optimizely CMS. Never interacts with the Next.js app directly.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Opens Visual Builder - edits page composition, block content, and navigation.",
                  "Clicks Publish. The CMS syncs the change to Optimizely Graph, which fires a POST webhook to /api/webhooks.",
                  "The webhook marks the ISR cache as stale. The next visitor request triggers a background re-render. The editor does not wait for the CDN to clear.",
                  "Preview mode bypasses the ISR cache entirely - the editor sees draft content via a previewToken that the app reads from the URL.",
                ].map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="shrink-0 font-bold text-error">-</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-tertiary/30 bg-tertiary/10 p-5">
              <h3 className="font-display font-bold text-sm text-tertiary mb-1">Visitor</h3>
              <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                Makes an HTTPS request. The CDN answers it, falling back to the Next.js server only on a cache miss.
              </p>
              <ul className="space-y-1.5">
                {[
                  "The request hits the CDN edge. A warm ISR cache hit returns the page in ~10-50ms with no server involvement.",
                  "On a cache miss, the Next.js server renders the page from Graph data and caches the result. The visitor receives the same HTML either way.",
                  "After the HTML arrives, React hydrates in the browser. Client components handle any interactivity - no server round-trip.",
                  "Static assets (JS, CSS, images) are fetched from the CDN and cached in the browser.",
                ].map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="shrink-0 font-bold text-tertiary">-</span>
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
            What happens between a browser request and the page appearing, step by step.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <div className="space-y-2">
            {[
              {
                n: "1", color: "bg-tertiary",
                label: "Browser sends HTTPS request",
                detail: "e.g. GET /en/investments/stocks-isa - arrives at Vercel's edge network.",
              },
              {
                n: "2", color: "bg-tertiary",
                label: "Edge CDN checks the ISR cache",
                detail: "The requested URL is looked up. Cache HIT: the ISR-cached page is returned to the browser in ~10-50ms. Cache MISS: the request is forwarded to the Next.js server.",
              },
              {
                n: "3", color: "bg-brand-fill",
                label: "Next.js renders the page (ISR miss only)",
                detail: "The catch-all route queries Optimizely Graph for the page content - no cookies() or headers() calls. Renders React Server Components to HTML with export const revalidate. The rendered output is stored in the CDN cache.",
              },
              {
                n: "4", color: "bg-tertiary",
                label: "HTML returned to browser",
                detail: "The response is served - from CDN on a hit, from Next.js on a miss. The browser receives identical HTML either way, then React hydrates for any client-side interactivity.",
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
            What happens when an editor publishes content in the CMS. For webhook endpoint details
            and ISR revalidation tag strategy, see the{" "}
            <a href="/demo/caching#revalidate-flow" className="text-brand hover:underline">Caching demo</a>.
          </p>
          <div className="space-y-2">
            {[
              {
                n: "1", color: "bg-error",
                label: "Editor publishes in Optimizely CMS",
                detail: "Content is saved. The CMS begins syncing the change to Optimizely Graph.",
              },
              {
                n: "2", color: "bg-error",
                label: "Graph indexes the content",
                detail: "Optimizely Graph processes the change and makes the new content queryable via its GraphQL API.",
              },
              {
                n: "3", color: "bg-error",
                label: "Graph fires a POST webhook to /api/webhooks",
                detail: "A small JSON payload signals that content changed. The webhook handler calls revalidatePath(\"/\", \"layout\") and revalidateTag() for page, navigation, banner, and quotes. Nothing is re-rendered yet - entries are just marked stale.",
              },
              {
                n: "4", color: "bg-tertiary",
                label: "Next visitor gets the stale version instantly",
                detail: "ISR always serves the existing cached page first. The visitor does not wait. In the background Next.js re-renders the page with fresh data from Graph.",
              },
              {
                n: "5", color: "bg-brand-fill",
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

        {/* Cache layers */}
        <section id="cache-layers">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The Cache Layers{" "}
            <a href="#cache-layers" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            A request can be answered at any of five layers between the visitor and the CMS. Each layer down adds latency, and each has its own invalidation story. This is the conceptual map - the{" "}
            <a href="/demo/caching" className="text-brand hover:underline">ISR Caching demo</a>{" "}
            covers the mechanics (tags, TTLs, and code).
          </p>
          <div className="space-y-2">
            {[
              {
                n: "1",
                label: "Browser HTTP cache",
                sub: "~0ms - invalidated by hashed filenames",
                detail: "Hashed static assets (JS, CSS) are cached immutably in the visitor's browser - a new deploy produces new filenames, so stale assets are never served. HTML documents are not long-cached by the browser; every navigation revalidates against the CDN.",
              },
              {
                n: "2",
                label: "CDN edge / ISR full-route cache",
                sub: "~10-50ms - invalidated by the Graph webhook",
                detail: "Stores the fully rendered HTML of every page, one entry per page URL. A warm hit is served from the nearest edge node without touching the Next.js server. This is the layer that absorbs almost all visitor traffic.",
              },
              {
                n: "3",
                label: "Next.js Data Cache",
                sub: "saves the Graph round-trip - invalidated by revalidateTag()",
                detail: "A fetch-level cache inside the Next.js server, keyed per query with revalidate and tags (page 60s, navigation 300s). When a page re-renders, tagged data that is still fresh is reused instead of re-querying Graph. The webhook handler calls revalidateTag() to mark entries stale on publish.",
              },
              {
                n: "4",
                label: "Optimizely Graph CDN cache",
                sub: "independent of this app - managed by Optimizely",
                detail: "Graph runs its own CDN cache in front of its content index at cg.optimizely.com. Even when the Next.js Data Cache misses, a repeated query is often answered from Graph's cache rather than its index. Preview and seed scripts bypass it with ?cache=false.",
              },
              {
                n: "5",
                label: "Source of truth",
                sub: "CMS content, synced into Graph's index on publish",
                detail: "The bottom of the stack. Content lives in the CMS and is synced into Graph's index when an editor publishes. The CMS itself never serves visitor traffic. A full ISR-miss render (Next.js render plus Graph query) costs a few hundred milliseconds - and only happens on the first request for a URL or after invalidation.",
              },
            ].map(({ n, label, sub, detail }) => (
              <div key={n} className="flex gap-4 p-4 rounded-xl bg-surface-lowest border border-ghost-border">
                <div className="shrink-0 w-7 h-7 rounded-full bg-brand flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{n}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{label}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60 mb-0.5">{sub}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Failure modes */}
        <section id="failure-modes">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            What Happens When Something Is Down{" "}
            <a href="#failure-modes" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Separated concerns mean partial failure instead of total failure. What each outage actually does to the site - for the code-level patterns (error boundaries, fallbacks, not-found), see the{" "}
            <a href="/demo/error-handling" className="text-brand hover:underline">Error Handling demo</a>.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                label: "CMS down or in maintenance",
                color: "border-error/30 bg-error/10",
                hcolor: "text-error",
                points: [
                  "Graph keeps serving from its own index - it does not read from the CMS at request time.",
                  "Visitors see no difference: ISR pages keep rendering with data from Graph.",
                  "Editors are blocked from authoring until the CMS is back. Nothing published is lost.",
                ],
              },
              {
                label: "Optimizely Graph unreachable",
                color: "border-error/30 bg-error/10",
                hcolor: "text-error",
                points: [
                  "Warm pages keep serving from the CDN ISR cache - a cache hit never queries Graph.",
                  "When a render does happen, wrap each content query so a Graph failure returns static or cached fallback data instead of throwing - shared layout elements like navigation and footer keep rendering.",
                  "Page content queries without a fallback surface to Next.js error boundaries rather than crashing the whole site.",
                ],
              },
              {
                label: "Webhook missed or delayed",
                color: "border-tertiary/30 bg-tertiary/10",
                hcolor: "text-tertiary",
                points: [
                  "The revalidate TTL is the backstop: page caches expire after their TTL and re-render on the next request.",
                  "Worst case, visitors briefly see slightly stale content - then the next request triggers a background re-render with fresh Graph data.",
                  "No manual intervention needed; the system self-heals on the next TTL expiry.",
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

        {/* Media delivery */}
        <section id="media-delivery">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Media Has Its Own Delivery Path{" "}
            <a href="#media-delivery" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Images and other assets do not flow through Graph or the ISR HTML cache - they are delivered on a separate path with an independent cache lifecycle. See the{" "}
            <a href="/demo/media" className="text-brand hover:underline">Media & DAM demo</a>{" "}
            for the asset workflow.
          </p>
          <div className="rounded-xl border border-ghost-border bg-surface-lowest p-5">
            <ul className="space-y-1.5">
              {[
                "Graph returns only the image URL, never the bytes - the rendered HTML contains an image tag pointing at the asset host.",
                "The browser fetches assets from the Optimizely asset hosts (*.cms.optimizely.com and *.cmp.optimizely.com - the allowed remotePatterns in next.config.ts).",
                "next/image sits in front: it resizes, converts to modern formats, and caches the optimized result on the hosting CDN.",
                "Consequence: publishing new content invalidates page HTML, but images keep serving from their own cache - media and pages age independently.",
              ].map((p, i) => (
                <li key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                  <span className="shrink-0 font-bold text-brand">-</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CDN compatibility */}
        <section id="cdn-compatibility">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            CDN Compatibility{" "}
            <a href="#cdn-compatibility" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            The ISR full-route cache is the layer that absorbs visitor traffic. It relies only on standard, portable CDN behaviour.
          </p>
          <div className="rounded-xl border border-ghost-border bg-surface-lowest p-5">
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-3xl">
              This demo deploys to Vercel, but the ISR pattern works with any CDN that caches by URL path - which is the default everywhere. Netlify, AWS CloudFront, Cloudflare, Akamai, and Fastly all serve path-keyed cache entries out of the box, so no custom cache configuration is needed. Freshness is driven by the publish webhook (revalidatePath / revalidateTag), with the per-route revalidate TTL as a backstop.
            </p>
          </div>
        </section>

        <section id="glossary">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Key Terms{" "}
            <a href="#glossary" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Definitions of the technical terms used throughout this page.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              {
                term: "CDN",
                full: "Content Delivery Network",
                def: "A global network of servers that cache copies of your pages close to users. Instead of every request travelling to one central server, it is served from the nearest node - reducing latency from hundreds of milliseconds to tens.",
              },
              {
                term: "Edge",
                def: "Servers at CDN edge nodes - physically distributed around the world, close to users. Running code at the edge means it executes at these locations rather than a central server. Latency can drop from ~200ms to under 5ms.",
              },
              {
                term: "ISR",
                full: "Incremental Static Regeneration",
                def: "A Next.js feature. Pages are pre-rendered to static HTML and cached. They serve instantly from cache. After a set time (or on demand via webhook), the page is regenerated in the background with fresh data - no redeploy needed.",
              },
              {
                term: "GraphQL",
                def: "A query language for APIs. Instead of many fixed endpoints (like REST), you send one query describing exactly the data you want and get exactly that back - no over-fetching, no under-fetching. Optimizely Graph exposes its content delivery API via GraphQL.",
              },
              {
                term: "Webhook",
                def: "When something happens in one system, it automatically sends an HTTP POST request to notify another system. When an editor publishes in Optimizely CMS, Optimizely Graph fires a webhook to tell this Next.js app to invalidate its cache.",
              },
              {
                term: "RSC",
                full: "React Server Components",
                def: "A Next.js and React feature where components render on the server and send HTML to the browser instead of JavaScript that runs client-side. Used for CMS content rendering so the page arrives pre-rendered and cacheable.",
              },
            ].map(({ term, full, def }) => (
              <div key={term} className="rounded-xl border border-ghost-border bg-surface-lowest p-4">
                <div className="mb-1">
                  <span className="font-display font-bold text-sm text-on-surface">{term}</span>
                  {full && <span className="ml-2 text-xs text-on-surface-variant">{full}</span>}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{def}</p>
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
              { href: "/demo/feature-experimentation", label: "Experimentation",    description: "Feature flags, A/B tests, and how a variation is chosen and served." },
              { href: "/demo/personalization",         label: "Personalization",            description: "Audience targeting and serving content per visitor persona." },
              { href: "/demo/error-handling",          label: "Error Handling",             description: "Graceful degradation: error boundaries, fallbacks, and not-found handling." },
              { href: "/demo/media",                   label: "Media & DAM",                description: "Asset workflow, image delivery, and next/image optimization." },
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
