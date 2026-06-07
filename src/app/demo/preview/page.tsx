import type { Metadata } from "next";

export const metadata: Metadata = { title: "Draft Mode & Preview Demo" };

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const PREVIEW_PARAMS_SNIPPET = `// CMS is configured with Preview URL: https://your-app.com/preview
// It appends these query params automatically:

/preview?preview_token=<jwt>&key=<contentKey>&ctx=edit

// preview_token  - short-lived JWT issued by the CMS for this editor session.
//                  Passed to Graph as "Authorization: Bearer <token>" to
//                  fetch draft (unpublished) content instead of published.
// key            - UUID of the content item being previewed.
// ctx            - "edit" when opened inside the Visual Builder iframe;
//                  omitted for plain content preview.

`;

const GRAPHQL_PREVIEW_SNIPPET = `// src/lib/optimizely/client.ts
// When a previewToken is present, ISR is bypassed entirely

if (previewToken) {
  headers["Authorization"] = \`Bearer \${previewToken}\`;   // draft auth
} else {
  headers["Authorization"] = \`epi-single \${SINGLE_KEY}\`; // published auth
}

// Cache decision:
if (previewToken) {
  fetchOptions.cache = "no-store";   // always fetch fresh draft content
} else {
  fetchOptions.next = { revalidate: 60 };  // ISR for published content
}`;

const PREVIEW_PAGE_SNIPPET = `// src/app/preview/page.tsx
export const dynamic = "force-dynamic";  // never statically generate this page

import { getClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { PreviewComponent } from "@optimizely/cms-sdk/react/client";

async function PreviewPage({ searchParams }) {
  const params = await searchParams;
  const client = getClient();

  // getPreviewContent reads preview_token, key, ver, ctx from query params,
  // fetches the draft version, and populates the withAppContext context store.
  // OptimizelyComponent dispatches to the right component by __typename -
  // same path as the published page, no separate preview renderer needed.
  const content = await client.getPreviewContent(params as PreviewParams);

  return (
    <>
      <Script src={\`\${CMS_URL}/util/javascript/communicationinjector.js\`} strategy="afterInteractive" />
      <PreviewComponent />
      <OptimizelyComponent content={content} />
    </>
  );
}

export default withAppContext(PreviewPage);`;

const SHELL_SNIPPET = `// The preview shell injects two things:
//
// 1. communicationinjector.js - the bridge between this page and the CMS
//    iframe. Without it, click-to-edit events from the CMS never reach the
//    page. It listens for postMessage events from the parent iframe and
//    dispatches them as DOM events.
//
// 2. <PreviewComponent /> (from @optimizely/cms-sdk/react/client) - a
//    client component that sends real-time edit notifications back to the
//    CMS so outline overlays update instantly as content is saved.

const shell = (children) => (
  <>
    <Script
      src={\`\${CMS_URL}/util/javascript/communicationinjector.js\`}
      strategy="afterInteractive"
    />
    <PreviewComponent />
    {children}
  </>
);`;

const EPI_BLOCK_SNIPPET = `// data-epi-block-id is the contract between the frontend and the CMS overlay.
// The SDK's getPreviewUtils() handles this - pa(node) spreads data-epi-block-id
// onto structural wrappers, and pa("propertyName") adds data-epi-edit to leaf elements.

// In BlankSection - pa(node) on row/column wrappers
function Row({ children, node }) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;  // → data-epi-block-id={node.key}
}

// In DynamicExperience - ComponentWrapper wraps each composition component
function ComponentWrapper({ children, node }) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;  // → data-epi-block-id={node.key}
}

// In block components - pa("propertyName") enables click-to-edit on fields
export default function HeroBlock({ content }) {
  const { pa } = getPreviewUtils(content);
  return (
    <section>
      <h1 {...pa("headline")}>{content.headline}</h1>   // → data-epi-edit="headline"
      <p  {...pa("subheadline")}>{content.subheadline}</p>
    </section>
  );
}

// getPreviewUtils reads the withAppContext context - pa() only emits attributes
// when the request was initiated via getPreviewContent() (i.e. in preview mode).
// On published pages it returns empty objects, adding zero DOM overhead.`;

const VB_LAYOUT_SNIPPET = `// communicationinjector.js is injected on the /preview route only.
// The root layout (src/app/layout.tsx) does NOT inject it - the script is
// only needed when the page is loaded inside the CMS editor iframe.

// src/app/preview/page.tsx
return (
  <>
    <Script
      src={\`\${process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL}/util/javascript/communicationinjector.js\`}
      strategy="afterInteractive"
    />
    <PreviewComponent />
    <OptimizelyComponent content={content} />
  </>
);`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PreviewDemoPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Draft Mode &amp; Editorial Preview
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Editors can preview unpublished content in the live app - including
            in-context editing via Visual Builder - without affecting what visitors see.
            Two separate systems work together: Next.js draft mode for cache bypass,
            and Optimizely&apos;s communicationinjector for real-time edit events.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            {["force-dynamic /preview", "getPreviewContent()", "communicationinjector.js", "data-epi-block-id"].map(tag => (
              <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Two content modes */}
        <section id="content-modes">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Two Content Modes <a href="#content-modes" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The app serves content in two distinct modes depending on context.
            The caching strategy and Graph auth header change accordingly.
          </p>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
            {[
              {
                label: "Published",
                badge: "ISR",
                badgeColor: "bg-green-100 text-green-800",
                auth: "epi-single {SINGLE_KEY}",
                cache: "next: { revalidate: 60 }",
                description: "Default for all visitor traffic. Pages are pre-rendered and served from cache. Regenerated in the background after 60s or when a webhook fires.",
              },
              {
                label: "Draft / Preview",
                badge: "no-store",
                badgeColor: "bg-amber-100 text-amber-800",
                auth: "Bearer {previewToken}",
                cache: "cache: 'no-store'",
                description: "Activated when the CMS calls /preview?preview_token=X&key=Y. getPreviewContent() fetches the latest draft version - unpublished changes visible only to the editor. The /preview route is force-dynamic and renders inside the CMS iframe when ctx=edit.",
              },
            ].map(mode => (
              <div key={mode.label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-on-surface">{mode.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${mode.badgeColor}`}>{mode.badge}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-on-surface-variant">Auth</div>
                  <code className="block text-xs font-mono text-brand bg-surface-low px-2 py-1 rounded">{mode.auth}</code>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-on-surface-variant">Cache</div>
                  <code className="block text-xs font-mono text-brand bg-surface-low px-2 py-1 rounded">{mode.cache}</code>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{mode.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* URL flow */}
        <section id="preview-url">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The Preview URL Flow <a href="#preview-url" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The CMS is configured with a Preview URL pointing directly to{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">/preview</code>.
            When an editor clicks &ldquo;Preview&rdquo;, the CMS appends{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">preview_token</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">key</code>, and{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">ctx</code> automatically.
          </p>
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 overflow-x-auto mb-8">
            <pre className="text-xs font-mono text-on-surface-variant leading-relaxed">{`CMS editor clicks "Preview"
        │
        └─→ /preview?preview_token=<token>&key=<contentKey>&ctx=edit
                │
                ├─→ force-dynamic (never cached)
                ├─→ client.getPreviewContent(params) → draft content via previewToken
                ├─→ communicationinjector.js injected
                ├─→ <PreviewComponent /> mounted
                └─→ Render with data-epi-block-id attributes
                        │
                        └─→ Editor clicks any block → CMS panel highlights that property`}</pre>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">/preview query params</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{PREVIEW_PARAMS_SNIPPET}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">graphqlFetch - cache bypass with previewToken</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{GRAPHQL_PREVIEW_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* /preview render path */}
        <section id="preview-page">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The /preview Page <a href="#preview-page" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            <code className="bg-surface-low px-1 rounded text-xs font-mono">getPreviewContent()</code> handles
            all content types - experience pages, traditional pages, and shared blocks - and returns
            the item directly. <code className="bg-surface-low px-1 rounded text-xs font-mono">OptimizelyComponent</code>{" "}
            dispatches to the right React component by <code className="bg-surface-low px-1 rounded text-xs font-mono">__typename</code>,
            exactly as the published page does. No separate preview renderer needed.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{PREVIEW_PAGE_SNIPPET}</code>
          </pre>
        </section>

        {/* communicationinjector + data-epi-block-id */}
        <section id="preview-shell" className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface mb-2">
              The Preview Shell
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              Every preview render is wrapped in a &ldquo;shell&rdquo; that injects the two
              pieces the CMS needs to communicate with the page.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{SHELL_SNIPPET}</code>
            </pre>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface mb-2">
              data-epi-block-id
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              The contract between the frontend and the CMS overlay. The CMS reads
              this attribute to know which content item to highlight and which
              property panel to open when an editor clicks on the page.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{EPI_BLOCK_SNIPPET}</code>
            </pre>
          </div>
        </section>

        {/* communicationinjector scope */}
        <section id="communication-injector">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Where communicationinjector.js Lives <a href="#communication-injector" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The script is injected on the <code className="bg-surface-low px-1 rounded text-xs font-mono">/preview</code> route only -
            not in the root layout. It is only needed when the page is rendered inside the
            CMS editor iframe, so keeping it scoped to <code className="bg-surface-low px-1 rounded text-xs font-mono">/preview</code>{" "}
            avoids loading it on every visitor page.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{VB_LAYOUT_SNIPPET}</code>
          </pre>
        </section>

        {/* Setup guide */}
        <section id="setup-guide">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-4">
            Setup Guide <a href="#setup-guide" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display text-base font-semibold text-on-surface mb-3">Environment variables</h3>
              <div className="space-y-2">
                {[
                  { key: "NEXT_PUBLIC_OPTIMIZELY_CMS_URL", desc: "Your CMS instance URL. Used to build the communicationinjector.js script URL on the /preview route." },
                  { key: "OPTIMIZELY_GRAPH_SINGLE_KEY", desc: "Read-only key for published Graph queries. Already required for the main app." },
                  { key: "OPTIMIZELY_GRAPH_GATEWAY", desc: "Graph gateway URL (default: https://cg.optimizely.com/content/v2). Passed to config() in componentRegistry.ts." },
                ].map(({ key, desc }) => (
                  <div key={key} className="bg-surface-lowest border border-ghost-border rounded-xl p-3">
                    <code className="text-xs font-mono text-brand block mb-1">{key}</code>
                    <p className="text-xs text-on-surface-variant">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-on-surface mb-3">CMS admin configuration</h3>
              <ol className="space-y-3">
                {[
                  "In CMS admin: Settings → Sites → select your site.",
                  "Set the Preview URL to: https://your-app.com/preview",
                  "The CMS will append ?preview_token=X&key=Y&ctx=edit automatically when an editor clicks Preview.",
                  "For Visual Builder in-context editing: set NEXT_PUBLIC_OPTIMIZELY_CMS_URL so the /preview route can build the communicationinjector.js URL. No additional env var needed.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-on-brand text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="text-sm text-on-surface-variant leading-relaxed pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
