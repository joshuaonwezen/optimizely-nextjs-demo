import type { Metadata } from "next";
import { getQuotes, GET_QUOTES_QUERY } from "@/lib/graphql/queries/GetQuotes";
import { Callout } from "@/components/blocks/CalloutBlock";

export const metadata: Metadata = {
  title: "External Content Sync Demo",
};


const ITEM_TYPE_SNIPPET = `PUT https://cg.optimizely.com/api/content/v3/types?id=quot
Content-Type: application/json
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{
  "contentTypes": {
    "Quote": {
      "contentType": ["_Item"],
      "properties": {
        "author": { "type": "String" },
        "text":   { "type": "String" }
      }
    }
  },
  "preset": "next",
  "useTypedFieldNames": true
}`;

const ITEM_DATA_SNIPPET = `POST https://cg.optimizely.com/api/content/v2/data?id=quot
Content-Type: text/plain
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{"index": {"_id": 1, "language_routing": "en"}}
{
  "_itemMetadata": {
    "key": "qt-1",
    "displayName___searchable": "Quote - Sarah Chen",
    "lastModified": "2026-06-07T00:00:00.000Z",
    "type": "Quote"
  },
  "author": "Sarah Chen",
  "text": "I moved my savings to Mosey after seeing their 5.1% AER rate...",
  "ContentType": ["Quote"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" },
  "_rbac": { "read": ["Everyone"] }
}`;

const ASSET_TYPE_SNIPPET = `PUT https://cg.optimizely.com/api/content/v3/types?id=docs
Content-Type: application/json
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{
  "contentTypes": {
    "Document": {
      "contentType": ["_AssetItem"],
      "properties": {
        "title":       { "type": "String" },
        "description": { "type": "String" }
      }
    }
  },
  "preset": "next",
  "useTypedFieldNames": true
}`;

const ASSET_DATA_SNIPPET = `POST https://cg.optimizely.com/api/content/v2/data?id=docs
Content-Type: text/plain
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{"index": {"_id": 1, "language_routing": "en"}}
{
  "_itemMetadata": {
    "key": "doc-1",
    "displayName___searchable": "Product Datasheet",
    "lastModified": "2026-05-26T00:00:00.000Z",
    "type": "Document"
  },
  "_assetMetadata": {
    "fileSize": 245760,
    "mimeType": "application/pdf",
    "url": "https://example.com/docs/product-datasheet.pdf"
  },
  "title": "Product Datasheet",
  "description": "Full technical specifications for the Enterprise plan.",
  "ContentType": ["Document"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" },
  "_rbac": { "read": ["Everyone"] }
}`;

const IMAGE_TYPE_SNIPPET = `PUT https://cg.optimizely.com/api/content/v3/types?id=photos
Content-Type: application/json
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{
  "contentTypes": {
    "Photo": {
      "contentType": ["_ImageItem"],
      "properties": {
        "altText": { "type": "String" },
        "caption": { "type": "String" }
      }
    }
  },
  "preset": "next",
  "useTypedFieldNames": true
}`;

const IMAGE_DATA_SNIPPET = `POST https://cg.optimizely.com/api/content/v2/data?id=photos
Content-Type: text/plain
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{"index": {"_id": 1, "language_routing": "en"}}
{
  "_itemMetadata": {
    "key": "photo-1",
    "displayName___searchable": "Product Hero Image",
    "lastModified": "2026-05-26T00:00:00.000Z",
    "type": "Photo"
  },
  "_assetMetadata": {
    "fileSize": 1048576,
    "mimeType": "image/jpeg",
    "url": "https://example.com/images/product-hero.jpg"
  },
  "_imageMetadata": {
    "width": 1920,
    "height": 1080
  },
  "altText": "Optimizely platform dashboard screenshot",
  "caption": "The Visual Builder interface showing a live page edit.",
  "ContentType": ["Photo"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" },
  "_rbac": { "read": ["Everyone"] }
}`;


export default async function ExternalContentPage() {
  const { items, fromGraph } = await getQuotes();

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            External Content Sync
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Push any external data source directly into Optimizely Graph without
            touching the CMS. Define a schema once via the Content Source sync API,
            send NdJSON over HTTP, and your data is instantly queryable alongside
            CMS-managed content - same GraphQL endpoint, same ISR caching.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              {fromGraph ? "✓ Live from Graph" : "◎ Demo data - run npx tsx scripts/seed-quotes.ts"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Graph Content Source API
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              NdJSON · PUT types · POST data
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              ISR · 60s + on-demand tag
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Live quote cards */}
        <section id="live-example">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Example - Quotes <a href="#live-example" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Each card is a <code className="bg-surface-low px-1 rounded text-xs font-mono">Quote</code> item
            synced from an external source via the{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_Item</code> base type.
            Custom properties (<code className="bg-surface-low px-1 rounded text-xs font-mono">author</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">text</code>) hold
            application data and are queried directly.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((q) => (
              <div
                key={q.author}
                className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex flex-col gap-3"
              >
                <span className="font-display font-semibold text-on-surface text-sm">{q.author}</span>
                <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                  &ldquo;{q.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* GraphQL query */}
        <section id="querying">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
            Querying External Content <a href="#querying" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Once synced, external content is queried exactly like CMS-managed content -
            same GraphQL endpoint, same ISR caching. Query your custom properties directly;{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_itemMetadata</code> fields
            are search-indexed internals and return{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">null</code> at query time.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{GET_QUOTES_QUERY.trim()}</code>
          </pre>
        </section>

        {/* Sync paths */}
        <section id="sync-paths">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Sync Paths - Getting Data into Graph{" "}
            <a href="#sync-paths" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Three paths exist for pushing external data into Optimizely Graph. All three end up in
            the same place - data queryable via GraphQL alongside CMS content - but differ in
            who owns the pipeline, whether scheduling is managed, and what third-party tooling
            is involved.
          </p>

          {/* CMS connection note */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mb-8 flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <span className="text-brand font-bold text-sm">→</span>
            </div>
            <div>
              <p className="font-display font-semibold text-on-surface text-sm mb-1">
                Connecting to CMS - same step for every path
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Once data is in Graph, wire it to CMS via{" "}
                <strong>Admin → Content Types → Create new… → Connect from Graph</strong>.
                Choose the source ID, schema, a CMS base type (Page, Component, Media, Image, or Video),
                and the fields to use as the content ID and display name. CMS creates a read-only
                connected content type editors can reference and browse in the Content Manager.
                Note: the label is <em>Connect from Graph</em>, not "Import from Graph" - a common
                source of confusion in the UI.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">

            {/* Path 1 */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">1</span>
                <div>
                  <h3 className="font-display font-semibold text-on-surface">Direct to Graph</h3>
                  <p className="text-xs text-on-surface-variant">Content Source API - NdJSON over HTTP</p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Register a schema via{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">PUT /api/content/v3/types</code>{" "}
                  and push NdJSON records via{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">POST /api/content/v2/data</code>.
                  No third-party tools required. You build and run all sync logic.
                </p>
                <div className="space-y-1.5 text-xs">
                  {[
                    ["Schema", "Registered via API"],
                    ["Data", "Pushed directly to Graph"],
                    ["Sync", "Your code, your schedule"],
                    ["Infra you own", "Everything"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-on-surface-variant w-20 shrink-0">{label}</span>
                      <span className="bg-surface-low rounded px-2 py-0.5 font-mono text-on-surface">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-surface-low rounded-xl p-3 text-xs text-on-surface-variant">
                  <strong className="text-on-surface">Best for:</strong> Custom or proprietary data
                  with no off-the-shelf integration. Teams comfortable owning scheduling, retries,
                  and rebuilds.
                </div>
                <p className="text-xs text-on-surface-variant mt-auto">
                  ⚠ Two undocumented-but-required fields:{" "}
                  <code className="bg-surface-low px-1 rounded font-mono">"preset": "next"</code> on
                  the schema and{" "}
                  <code className="bg-surface-low px-1 rounded font-mono">displayName___searchable</code>{" "}
                  in <code className="bg-surface-low px-1 rounded font-mono">_itemMetadata</code>.
                  See <a href="#base-types" className="text-brand hover:underline">Base Type Contracts ↓</a> for full examples.
                  Additional sources may need to be enabled by Optimizely - contact support if the
                  types endpoint returns a source-limit error.
                </p>
              </div>
            </div>

            {/* Path 2 */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">2</span>
                <div>
                  <h3 className="font-display font-semibold text-on-surface">OCP - Free Tier</h3>
                  <p className="text-xs text-on-surface-variant">Public apps + Custom Endpoints (real-time)</p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Included with SaaS CMS. Ships with public apps for common platforms - each app
                  handles auth, schema registration, and field mapping automatically. If no public
                  app exists, Custom Endpoints (real-time) adds a field-mapping UI over what you&apos;d
                  build for Path 1.
                </p>
                <div className="space-y-1.5 text-xs">
                  {[
                    ["Schema", "OCP config + Graph"],
                    ["Data", "Webhook ingestion"],
                    ["Sync", "Real-time only (free tier)"],
                    ["Infra you own", "Your data pipeline"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-on-surface-variant w-20 shrink-0">{label}</span>
                      <span className="bg-surface-low rounded px-2 py-0.5 font-mono text-on-surface">{value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface mb-2">Public apps (free)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Bynder", "Brandfolder", "Commercetools", "Shopify", "WordPress"].map((app) => (
                      <span key={app} className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand/10 text-brand text-xs font-medium">
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-surface-low rounded-xl p-3 text-xs text-on-surface-variant mt-auto">
                  <strong className="text-on-surface">Best for:</strong> Customers using a supported
                  public app - this is the unambiguous recommendation for Bynder, Brandfolder, or
                  Commercetools. For custom data with no matching app, the free tier adds little
                  over Path 1 and doesn&apos;t support scheduled syncs from your source.
                </div>
              </div>
            </div>

            {/* Path 3 */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">3</span>
                <div>
                  <h3 className="font-display font-semibold text-on-surface">OCP - Paid Tier</h3>
                  <p className="text-xs text-on-surface-variant">Managed staging DB + scheduled syncs</p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Unlocks the OCP database as a hosted staging layer and scheduled outbound syncs
                  to Graph via the Sync Manager. Data reaches OCP via S3 CSV, REST API, webhook, or
                  an OCP app - from there OCP handles the sync to Graph on your chosen interval.
                </p>
                <div className="space-y-1.5 text-xs">
                  {[
                    ["Schema", "OCP database + Graph"],
                    ["Data", "S3 / API / app → OCP DB → Graph"],
                    ["Sync", "Scheduled or real-time (OCP managed)"],
                    ["Infra you own", "Less - OCP hosts staging + intervals"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-on-surface-variant w-20 shrink-0">{label}</span>
                      <span className="bg-surface-low rounded px-2 py-0.5 font-mono text-on-surface">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-surface-low rounded-xl p-3 text-xs text-on-surface-variant">
                  <strong className="text-on-surface">Best for:</strong> Customers who want OCP to
                  manage the staging layer and scheduling without building their own pipeline. Also
                  the right path if data needs to flow from one source to multiple OCP destinations.
                </div>
                <div className="text-xs text-on-surface-variant mt-auto space-y-1">
                  <p>
                    ⚠ <strong className="text-on-surface">Paid tier required</strong> - confirm pricing
                    with the CSM before scoping.
                  </p>
                  <p>
                    Reference OCP app:{" "}
                    <a
                      href="https://github.com/joshuaonwezen/ocp-product-catalog"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline font-mono"
                    >
                      joshuaonwezen/ocp-product-catalog
                    </a>
                    {" "}- TypeScript app with KV store, REST API, and bulk + real-time Graph sync.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Recommendation matrix */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-ghost-border">
              <h3 className="font-display font-semibold text-on-surface">Recommendation Matrix</h3>
            </div>
            <div className="divide-y divide-ghost-border">
              {([
                ["Custom data, full control, no managed layer needed", "Path 1", ""],
                ["Using Bynder, Brandfolder, Commercetools, Shopify, or WordPress", "Path 2", "Public app handles auth, schema, and field mapping"],
["Want managed scheduling + staging layer, paid tier acceptable", "Path 3", "Confirm pricing with CSM before scoping"],
                ["Free OCP tier + scheduled (not real-time) syncs from source", "Path 1 or 3", "Free tier only supports real-time push - scheduled source syncs are paid-only"],
              ] as [string, string, string][]).map(([situation, path, note]) => (
                <div key={situation} className="px-6 py-4 flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-sm text-on-surface">{situation}</p>
                    {note && <p className="text-xs text-on-surface-variant mt-0.5">{note}</p>}
                  </div>
                  <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-md bg-brand/10 text-brand text-xs font-mono font-semibold whitespace-nowrap">
                    {path}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Base type contracts */}
        <section id="base-types" className="space-y-16">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-3">
              Base Type Contracts <a href="#base-types" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Graph ships three built-in base type contracts. Inherit from one when registering
              a content type - it adds the metadata property Graph needs to identify, index,
              and surface your items. All registrations require{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">"preset": "next"</code> and{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">"useTypedFieldNames": true</code>.
            </p>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed mt-3">
              When pushing data, the <code className="bg-surface-low px-1 rounded text-xs font-mono">displayName</code> field
              inside any metadata object must be written as{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">displayName___searchable</code>.
              This is because <code className="bg-surface-low px-1 rounded text-xs font-mono">displayName</code> is
              marked <code className="bg-surface-low px-1 rounded text-xs font-mono">searchable: true</code> in
              the contract definition - with <code className="bg-surface-low px-1 rounded text-xs font-mono">useTypedFieldNames</code> enabled,
              Graph appends <code className="bg-surface-low px-1 rounded text-xs font-mono">___searchable</code> to
              distinguish full-text indexed fields from plain stored fields in the payload.
              Fields in <code className="bg-surface-low px-1 rounded text-xs font-mono">_assetMetadata</code> and{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_imageMetadata</code> are not
              searchable and keep their original names.
            </p>
          </div>

          {/* _Item */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="font-display text-xl font-bold text-on-surface">_Item</h3>
              <span className="text-xs font-mono text-on-surface-variant">→ adds _itemMetadata</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
              The base contract for all external items. Use this for structured data without
              a file attachment - testimonials, product catalog entries, CRM records, quotes.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Type Registration</p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{ITEM_TYPE_SNIPPET}</code>
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Data Payload (NdJSON)</p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{ITEM_DATA_SNIPPET}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* _AssetItem */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="font-display text-xl font-bold text-on-surface">_AssetItem</h3>
              <span className="text-xs font-mono text-on-surface-variant">→ adds _itemMetadata + _assetMetadata</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
              Extends <code className="bg-surface-low px-1 rounded text-xs font-mono">_Item</code> with{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_assetMetadata</code> - adds{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">fileSize</code>,{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">mimeType</code>, and{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">url</code>. Use for PDFs,
              videos, audio, or any binary-backed asset from a DAM or CDN.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Type Registration</p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{ASSET_TYPE_SNIPPET}</code>
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Data Payload (NdJSON)</p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{ASSET_DATA_SNIPPET}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* _ImageItem */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="font-display text-xl font-bold text-on-surface">_ImageItem</h3>
              <span className="text-xs font-mono text-on-surface-variant">→ adds _itemMetadata + _assetMetadata + _imageMetadata</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
              Extends <code className="bg-surface-low px-1 rounded text-xs font-mono">_AssetItem</code> with{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_imageMetadata</code> - adds{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">width</code> and{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">height</code>. Use for images
              from a DAM or media library where you need dimensions queryable at render time -
              for example to compute aspect ratios or avoid layout shift.
              All three metadata objects are required in the payload.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Type Registration</p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{IMAGE_TYPE_SNIPPET}</code>
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Data Payload (NdJSON)</p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{IMAGE_DATA_SNIPPET}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
