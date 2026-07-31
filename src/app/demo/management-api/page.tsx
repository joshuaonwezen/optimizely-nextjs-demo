import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";
import LiveDemoShell from "@/components/demo/LiveDemoShell";
import SeedCmsPanel from "@/components/demo/SeedCmsPanel";

export const dynamic = "force-dynamic";

const authTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/auth.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Management API & Content Seeding",
};

const TOKEN_SNIPPET = `// src/lib/optimizely/auth.ts
//
// getManagementToken() obtains an OAuth2 client_credentials token
// and caches it in memory until 30s before it expires.
//
// Required env vars:
//   OPTIMIZELY_CMS_CLIENT_ID     - from CMS Settings > API Clients
//   OPTIMIZELY_CMS_CLIENT_SECRET - from CMS Settings > API Clients

const token = await getManagementToken();

// Use it as a Bearer token in fetch calls to the Management API:
const res = await fetch(\`\${CONTENT_ENDPOINT}/my-key\`, {
  method: "GET",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  cache: "no-store",
});

// CONTENT_ENDPOINT (fixed host - same base as the OAuth token endpoint):
const CONTENT_ENDPOINT = "https://api.cms.optimizely.com/v1/content";`;

const CREATE_TYPE_SNIPPET = `// Create or update a content type via the Management API.
// PUT is idempotent - safe to re-run in CI/CD pipelines.
//
// After this call, the type is available in Visual Builder and in Graph.

const token = await getManagementToken();

await fetch(\`\${CMS_URL}/api/content/v3/types\`, {
  method: "PUT",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    key:         "QuoteBlock",
    displayName: "Quote Block",
    baseType:    "component",     // or "_page", "_experience", etc.
    properties: {
      quote:      { type: "string",  displayName: "Quote text" },
      authorName: { type: "string",  displayName: "Author name" },
      authorRole: { type: "string",  displayName: "Author role" },
    },
  }),
});

// Equivalent to using contentType() + opti:push, but runs at runtime -
// useful when types are generated dynamically from an external schema.`;

const CREATE_CONTENT_SNIPPET = `// Create a content item via the Management API.
// POST to https://api.cms.optimizely.com/v1/content
//
// The body is a plain JSON object with a "locale" key and the content properties.
// Use the { reference: "cms://content/<key>" } format for content area items.

const token    = await getManagementToken();
const ENDPOINT = "https://api.cms.optimizely.com/v1/content";

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    Authorization:  \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    contentType: ["LandingPage"],
    locale:      "en",
    status:      "published",     // omit to create a draft
    name:        "Services",
    routeSegment: "services",     // sets the URL segment
    properties: {
      headline:    "Our Services",
      subheadline: "Banking built around you",
      // Content area - items must use the { reference } format:
      contentBlocks: [
        { reference: "cms://content/hero-block-key-abc" },
        { reference: "cms://content/faq-block-key-xyz" },
      ],
    },
  }),
  cache: "no-store",
});

const { key } = await res.json();  // key = "abc123" - the new item's CMS key`;

const UPDATE_PUBLISH_SNIPPET =`// Updating and publishing an existing content item.
// PATCH the item by key - only send the fields you want to change.

const token = await getManagementToken();

await fetch(\`\${CONTENT_ENDPOINT}/\${key}\`, {
  method: "PATCH",
  headers: {
    Authorization:  \`Bearer \${token}\`,
    "Content-Type": "application/merge-patch+json",   // ← merge-patch, not full replace
  },
  body: JSON.stringify({
    locale: "en",
    status: "published",      // publish immediately after patching
    properties: {
      headline: "Updated headline",
    },
  }),
  cache: "no-store",
});

// Publish a draft item separately (two-step):
await fetch(\`\${CONTENT_ENDPOINT}/\${key}/versions/\${version}\`, {
  method: "PATCH",
  headers: { Authorization: \`Bearer \${token}\`, "Content-Type": "application/merge-patch+json" },
  body: JSON.stringify({ locale: "en", status: "published" }),
});`;

export default function ManagementApiDemoPage() {
  return (
    <>
      <DemoHero
        title="Management API & Content Seeding"
        description="The write side of Optimizely CMS - creating content types and items programmatically via the Management API. Used for migrations, seed scripts, and CI/CD automation."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="two-planes">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Two API surfaces - read vs. write
            <SectionAnchor id="two-planes" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Optimizely SaaS CMS exposes two distinct API surfaces. <strong>Optimizely Graph</strong> is
            the GraphQL read API used by the Next.js app to deliver content to visitors - CDN-cached,
            efficient, and read-only for CMS content. The <strong>Management API</strong> is the REST
            write API used by developers and scripts to create, update, and publish content - never
            cached, always authoritative. They talk to the same underlying data store.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                label: "Optimizely Graph",
                pill: "READ",
                pillClass: "bg-surface-low text-on-surface-variant",
                auth: "epi-single <GRAPH_SINGLE_KEY>",
                format: "GraphQL",
                caching: "CDN-cached, ISR-friendly",
                use: "Content delivery - page rendering, search, navigation",
              },
              {
                label: "Management API",
                pill: "WRITE",
                pillClass: "bg-brand/10 text-brand",
                auth: "Bearer <OAuth2 token>",
                format: "REST JSON / NdJSON",
                caching: "No caching - always fresh",
                use: "Content creation, update, publish, delete, type registration",
              },
            ].map(({ label, pill, pillClass, auth, format, caching, use }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-on-surface">{label}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${pillClass}`}>
                    {pill}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-on-surface-variant">
                  <p><span className="font-medium">Auth: </span><code className="bg-surface-low px-1 rounded font-mono">{auth}</code></p>
                  <p><span className="font-medium">Format: </span>{format}</p>
                  <p><span className="font-medium">Caching: </span>{caching}</p>
                  <p><span className="font-medium">Use for: </span>{use}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mt-4 flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <span className="text-brand font-bold text-sm">!</span>
            </div>
            <div>
              <p className="font-display font-semibold text-on-surface text-sm mb-1">
                One exception - you can write to Graph, but only for external sources
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Graph is read-only for content the CMS owns, but external-source data (product
                reviews, quotes, third-party feeds) can be written <em>directly</em> into Graph via
                the <strong>Content Source API</strong> - it never touches the CMS. See the{" "}
                <a href="#ndjson" className="text-brand hover:underline">bulk import section below ↓</a>{" "}
                and the{" "}
                <Link href="/demo/external-content" className="text-brand hover:underline">External Content demo →</Link>.
              </p>
            </div>
          </div>
        </section>

        <section id="auth">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Authentication - <code className="font-mono text-xl">getManagementToken()</code>
            <SectionAnchor id="auth" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The Management API uses OAuth2 client credentials. Create an API client in CMS Settings
            to get a <code className="bg-surface-low px-1 rounded font-mono text-xs">CLIENT_ID</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">CLIENT_SECRET</code>. The{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getManagementToken()</code> helper
            in this project exchanges those credentials for a Bearer token and caches it in memory with a
            30-second expiry buffer - so scripts that make many requests don&apos;t re-authenticate on
            every call.
          </p>
          <CodeBlock code={TOKEN_SNIPPET} label="Using getManagementToken() in a seed script" />
        </section>

        <section id="content-types">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Creating content types at runtime
            <SectionAnchor id="content-types" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Content types can be registered via the Management API instead of{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">opti:push</code>. The{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">PUT /api/content/v3/types</code>{" "}
            endpoint is idempotent - running it twice with the same payload is safe. This is useful when
            types are generated dynamically from an external schema (e.g., Stripe product catalog → CMS
            content type, Shopify collection → CMS block).{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/13-cli-commands.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <CodeBlock code={CREATE_TYPE_SNIPPET} label="PUT /api/content/v3/types - create or update a type" />
        </section>

        <section id="create-content">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Creating and publishing content items
            <SectionAnchor id="create-content" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            POST a JSON body to{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/v1/content</code>{" "}
            to create a new content item. Include{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">status: &quot;published&quot;</code> to
            publish immediately, or omit it to create a draft. Content area items <strong>must</strong> use
            the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&#123; reference: &quot;cms://content/key&quot; &#125;</code>{" "}
            format - plain key strings or{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&#123; key: &quot;...&quot; &#125;</code> will error.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/4-create-content.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={CREATE_CONTENT_SNIPPET} label="POST /v1/content - create a page" />
            <CodeBlock code={UPDATE_PUBLISH_SNIPPET} label="PATCH - update fields and publish" />
          </div>
        </section>

        <section id="ndjson">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Bulk import via NdJSON (Content Source API)
            <SectionAnchor id="ndjson" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The <strong>Content Source API</strong> is a different endpoint from the Management API -
            it accepts NdJSON (newline-delimited JSON) for bulk syncing external data directly into
            Graph. Use it for data that originates outside the CMS (product reviews, quotes,
            third-party articles). The{" "}
            <Link href="/demo/external-content" className="text-brand hover:underline">External Content demo →</Link>{" "}
            covers the NdJSON format, base-type contracts, and sync paths in full; the table below
            shows how it sits next to the Management API and the CLI.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: "Management API", endpoint: "/v1/content", use: "CMS-managed pages, blocks, experiences. Full editorial lifecycle.", auth: "OAuth2 Bearer" },
              { label: "Content Source API", endpoint: "/api/content/v2/data", use: "External data synced into Graph. Queryable alongside CMS content.", auth: "Basic (GRAPH_APP_KEY:)" },
              { label: "opti:push (CLI)", endpoint: "npm run opti:push", use: "Content type registration from TypeScript definitions. Run in CI.", auth: "CLIENT_ID + CLIENT_SECRET env vars" },
            ].map(({ label, endpoint, use, auth }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs font-mono text-on-surface-variant mb-2">{endpoint}</p>
                <p className="text-xs text-on-surface-variant mb-2 leading-relaxed">{use}</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Auth: </span>{auth}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="use-cases">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            When to use the Management API
            <SectionAnchor id="use-cases" label="#" />
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                label: "Data migration from a legacy CMS",
                desc: "Export content from the old CMS, transform it to the new schema, POST each item via the Management API. Use the NdJSON bulk endpoint for large datasets.",
              },
              {
                label: "CI/CD seed scripts",
                desc: "Run seed scripts on each deploy to ensure required content items (global settings, navigation roots, demo pages) exist and are published. PUT is idempotent - safe to re-run.",
              },
              {
                label: "Auto-page creation from external events",
                desc: "A new product is created in an e-commerce platform → webhook triggers a script that creates a matching CMS page via the Management API → page is live in seconds.",
              },
              {
                label: "Programmatic CMS variation updates",
                desc: "Once a CMS variation is created in Visual Builder, PATCH its version with a new composition and publish it - enabling automated A/B content setup. See CLAUDE.md for the full workflow.",
              },
              {
                label: "Test data seeding",
                desc: "Create repeatable test content for E2E tests. DELETE it after the test suite runs. Keeps the CMS clean and tests deterministic.",
              },
              {
                label: "Content type scaffolding",
                desc: "Generate CMS content types from an external schema (OpenAPI, Prisma, Contentful) by calling PUT /api/content/v3/types from a codegen script.",
              },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="seed-cms">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Reseed this CMS instance
            <SectionAnchor id="seed-cms" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-3xl mb-4">
            Seed a fresh CMS instance or reseed an existing one without leaving the browser. It runs
            the full seed orchestration (<code className="bg-surface-low px-1 rounded font-mono text-xs">npx tsx scripts/seed-runner.ts</code>)
            on the server and streams its output live.
          </p>
          <ul className="text-sm text-on-surface-variant leading-relaxed max-w-3xl space-y-1.5 mb-2">
            {[
              <>Pick a stored instance from the dropdown to have its credentials resolved server-side from <code className="bg-surface-low px-1 rounded font-mono text-xs">.env.local</code>, or choose no instance to enter values manually.</>,
              <>Manual fields left blank fall back to the values in <code className="bg-surface-low px-1 rounded font-mono text-xs">.env.local</code>.</>,
              <>The client ID and secret must be a content API key with write access (Settings → API Keys) - CLI-only credentials fail at the config-push and content-creation steps.</>,
              <>Available in local development only; the API route returns 403 in production builds.</>,
            ].map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-brand shrink-0">→</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <LiveDemoShell
            badge="Internal Tool"
            label="Runs the full seed orchestration and streams its output"
          >
            <SeedCmsPanel />
          </LiveDemoShell>
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Graph = read, Management API = write.</strong> Use Graph for everything your Next.js app serves to visitors. Use the Management API only in scripts, webhooks, and migrations - never in the page render path.</>,
          <><strong className="text-on-surface">getManagementToken() caches the OAuth2 token in memory.</strong> Call it at the top of every Management API script - it re-authenticates only when the cached token is about to expire.</>,
          <><strong className="text-on-surface">Content area items must use &#123; reference: &quot;cms://content/key&quot; &#125;.</strong> Plain key strings or &#123; key: &quot;...&quot; &#125; formats will return a 400 error: &quot;A content component must have either reference or contentType set&quot;.</>,
          <><strong className="text-on-surface">PUT /api/content/v3/types is idempotent.</strong> Run type registration in CI - re-running with the same payload is safe and doesn&apos;t reset existing content.</>,
          <><strong className="text-on-surface">After writing via the Management API, wait for Graph to sync.</strong> There is a short delay (usually &lt;10s) before new or updated content is visible in Graph queries.</>,
          <><strong className="text-on-surface">NdJSON (Content Source API) is for external data, not CMS pages.</strong> Use the Management API for pages and blocks that editors own. Use Content Source API for data that originates in external systems and is synced in bulk.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "auth.ts", path: "src/lib/optimizely/auth.ts", content: authTs },
          ]}
        />

      </div>
    </>
  );
}
