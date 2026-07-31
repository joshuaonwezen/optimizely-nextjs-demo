import type { Metadata } from "next";
import Link from "next/link";
import { getQuotes, GET_QUOTES_QUERY } from "@/lib/graphql/queries/GetQuotes";
import { getQuoteBlocks, GET_QUOTE_BLOCKS_QUERY } from "@/lib/graphql/queries/GetQuoteBlocks";
import { GET_LOCATIONS_QUERY } from "@/lib/graphql/queries/GetLocations";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";

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
  "_rbac": "r:Everyone:Read",
  "_itemMetadata": {
    "key": "qt-1",
    "displayName___searchable": "Quote - Sarah Chen",
    "lastModified": "2026-06-07T00:00:00.000Z",
    "type": "Quote"
  },
  "_metadata": {
    "types": ["Quote", "_Item"],
    "locale": "en",
    "key": "qt-1",
    "status": "Published"
  },
  "author$$String": "Sarah Chen",
  "text$$String": "I moved my savings to Mosey after seeing their 5.1% AER rate...",
  "ContentType": ["Quote"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" }
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
  "_rbac": "r:Everyone:Read",
  "_itemMetadata": {
    "key": "doc-1",
    "displayName___searchable": "Product Datasheet",
    "lastModified": "2026-05-26T00:00:00.000Z",
    "type": "Document"
  },
  "_metadata": {
    "types": ["Document", "_AssetItem", "_Item"],
    "locale": "en",
    "key": "doc-1",
    "status": "Published"
  },
  "_assetMetadata": {
    "fileSize": 245760,
    "mimeType": "application/pdf",
    "url": "https://example.com/docs/product-datasheet.pdf"
  },
  "title$$String": "Product Datasheet",
  "description$$String": "Full technical specifications for the Enterprise plan.",
  "ContentType": ["Document"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" }
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
  "_rbac": "r:Everyone:Read",
  "_itemMetadata": {
    "key": "photo-1",
    "displayName___searchable": "Product Hero Image",
    "lastModified": "2026-05-26T00:00:00.000Z",
    "type": "Photo"
  },
  "_metadata": {
    "types": ["Photo", "_ImageItem", "_AssetItem", "_Item"],
    "locale": "en",
    "key": "photo-1",
    "status": "Published"
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
  "altText$$String": "Optimizely platform dashboard screenshot",
  "caption$$String": "The Visual Builder interface showing a live page edit.",
  "ContentType": ["Photo"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" }
}`;


export default async function ExternalContentPage() {
  const { items, fromGraph } = await getQuotes();
  const { items: cmsQuotes, fromGraph: cmsFromGraph } = await getQuoteBlocks();

  return (
    <>
      <DemoHero
        title="External Content Sync"
        description={
          <>
            Push any external data source directly into Optimizely Graph without touching the CMS.
            Define a schema once via the Content Source sync API, send NdJSON over HTTP, and your
            data is instantly queryable alongside CMS-managed content - same GraphQL endpoint, same
            ISR caching. When the CMS itself is the source of truth, push into the CMS instead so
            editors can edit it - see{" "}
            <Link href="/demo/management-api" className="underline hover:no-underline">Management API</Link>.
          </>
        }
      >
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
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Two ingestion paths - orientation */}
        <section id="two-paths">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Two Ways In - CMS-native vs External <a href="#two-paths" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            There are two ways to make data queryable in Optimizely Graph, and they are not
            interchangeable. Both end up on the same GraphQL endpoint, but they differ in{" "}
            <strong className="text-on-surface">who owns the data and whether editors can edit it</strong>.
            Choose based on where the source of truth lives - not on which API is easier to call.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">

            {/* Push into the CMS - editable */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-on-surface">Push into the CMS</h3>
                  <p className="text-xs text-on-surface-variant">Management API / Visual Builder</p>
                </div>
                <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-md bg-brand/10 text-brand text-xs font-medium whitespace-nowrap">
                  Editable · CMS-native
                </span>
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  The content is authored via the Management API (<code className="bg-surface-low px-1 rounded font-mono text-xs">v1/content</code>)
                  or directly in Visual Builder, and lives entirely inside the CMS. Editors own it
                  and can change any field.
                </p>
                <ul className="space-y-1.5 text-sm text-on-surface-variant">
                  {[
                    "Editors author and edit every field",
                    "Draft / review / publish lifecycle",
                    "Preview mode - CMS inline edit + preview",
                    "FX experiment targeting via CMS Variations",
                    "Per-locale values on isLocalized fields",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="text-brand shrink-0">→</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-surface-low rounded-xl p-3 text-xs text-on-surface-variant mt-auto">
                  <strong className="text-on-surface">Use when the CMS is the source of truth.</strong>{" "}
                  See <Link href="/demo/management-api" className="text-brand hover:underline">Management API ↗</Link>{" "}
                  for the seeding and authoring workflow.
                </div>
              </div>
            </div>

            {/* Push into Graph - read-only */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-on-surface">Push into Graph</h3>
                  <p className="text-xs text-on-surface-variant">Content Source API - this page</p>
                </div>
                <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-md bg-surface-low text-on-surface-variant text-xs font-medium whitespace-nowrap">
                  Read-only · External
                </span>
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Data is pushed straight into Graph via the Content Source API. The external system
                  owns every field; the CMS surfaces it as a read-only connected type that editors
                  can browse and reference but cannot edit.
                </p>
                <ul className="space-y-1.5 text-sm text-on-surface-variant">
                  {[
                    "Source system owns every field",
                    "Not editable in the CMS",
                    "Browse and reference via Connect from Graph",
                    "No draft/publish, preview, or FX targeting",
                    "Re-sync from the source to update",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="text-brand shrink-0">→</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-surface-low rounded-xl p-3 text-xs text-on-surface-variant mt-auto">
                  <strong className="text-on-surface">Use only when the source of truth is another
                  system</strong> - CRM, PIM, commerce, or DAM. This is the path the rest of this
                  page documents.
                </div>
              </div>
            </div>

          </div>

          {/* Decision rule */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <span className="text-brand font-bold text-sm">?</span>
            </div>
            <div>
              <p className="font-display font-semibold text-on-surface text-sm mb-1">
                Rule of thumb - pick by where the source of truth lives
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                If editors need to create or change the content, or it has no home outside
                Optimizely, push it into the CMS. Reach for the Content Source API only when a
                separate system already owns the data and the CMS just needs to reference it.
                For the full capability breakdown, see{" "}
                <a href="#cms-native-vs-external" className="text-brand hover:underline">CMS-native vs External Content ↓</a>.
              </p>
            </div>
          </div>
        </section>

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
            <code className="bg-surface-low px-1 rounded text-xs font-mono">null</code> at query time.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Quotes</p>
              <CodeBlock code={GET_QUOTES_QUERY.trim()} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Bank Locations</p>
              <CodeBlock code={GET_LOCATIONS_QUERY.trim()} />
            </div>
          </div>
        </section>

        {/* Sync paths */}
        <section id="sync-paths">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Sync Paths - Getting Data into Graph{" "}
            <a href="#sync-paths" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Three paths push external data straight into Optimizely Graph. All three end up in
            the same place - data queryable via GraphQL alongside CMS content - but differ in
            who owns the pipeline, whether scheduling is managed, and what third-party tooling
            is involved. When the content is something the CMS itself should own, use the fourth
            method - Direct to CMS - instead: you author it in the CMS and it is published to Graph
            for you, fully editable.
          </p>

          {/* CMS connection note */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mb-8 flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <span className="text-brand font-bold text-sm">→</span>
            </div>
            <div>
              <p className="font-display font-semibold text-on-surface text-sm mb-1">
                Connecting to CMS - same step for every external path
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Once data is in Graph, wire it to CMS via{" "}
                <strong>Admin → Content Types → Create new… → Connect from Graph</strong>.
                Choose the source ID, schema, a CMS base type (Page, Component, Media, Image, or Video),
                and the fields to use as the content ID and display name. CMS creates a read-only
                connected content type editors can reference and browse in the Content Manager.
                Note: the label is <em>Connect from Graph</em>, not "Import from Graph" - a common
                source of confusion in the UI. The Direct to CMS method below skips this entirely -
                that content is already native CMS content.
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
                <div className="text-xs text-on-surface-variant mt-auto space-y-1.5">
                  <p>
                    ⚠ <strong className="text-on-surface">The payload format has several undocumented requirements</strong>{" "}
                    (schema flags, typed field names, metadata objects,{" "}
                    <code className="bg-surface-low px-1 rounded font-mono">_rbac</code>) - see{" "}
                    <a href="#base-types" className="text-brand hover:underline">Base Type Contracts ↓</a>{" "}
                    for the full rules and working examples.
                  </p>
                  <p>
                    Additional sources may need to be enabled by Optimizely - contact support if the types endpoint returns a source-limit error.
                  </p>
                </div>
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

            {/* Direct to CMS - editable, not a Graph-ingestion path */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-sm font-bold shrink-0">✎</span>
                <div>
                  <h3 className="font-display font-semibold text-on-surface">Direct to CMS</h3>
                  <p className="text-xs text-on-surface-variant">Management API - editable CMS-native content</p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Skip Graph and push into the CMS itself. Create the item with{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">POST /v1/content</code>{" "}
                  on the Management API (field values wrapped as{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">PropertyData</code>), then
                  publish it via the versions publish endpoint - or author it directly in Visual Builder.
                  The CMS owns the item and publishes it into Graph for you, so it lands on the same
                  GraphQL endpoint as everything else.
                </p>
                <div className="space-y-1.5 text-xs">
                  {[
                    ["Schema", "CMS content types"],
                    ["Data", "Authored in the CMS"],
                    ["Sync", "CMS publishes to Graph"],
                    ["Infra you own", "None - CMS-managed"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-on-surface-variant w-20 shrink-0">{label}</span>
                      <span className="bg-surface-low rounded px-2 py-0.5 font-mono text-on-surface">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-surface-low rounded-xl p-3 text-xs text-on-surface-variant">
                  <strong className="text-on-surface">Best for:</strong> Content the CMS should own -
                  editors create and edit it, and it needs a draft/publish lifecycle, preview, or FX
                  targeting. Unlike the paths above, this content is fully editable and never goes
                  through Connect from Graph.
                </div>
                <div className="text-xs text-on-surface-variant mt-auto">
                  <p>
                    See{" "}
                    <Link href="/demo/management-api" className="text-brand hover:underline">Management API ↗</Link>{" "}
                    for the full content-creation workflow - endpoints, payload shape, and publishing.
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
                ["Content the CMS should own and editors need to edit", "Direct to CMS", "Authored via the Management API or Visual Builder - editable, not read-only"],
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
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed mt-3">
              Three additional payload rules apply to every push. First,{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_rbac</code> must be the
              string <code className="bg-surface-low px-1 rounded text-xs font-mono">"r:Everyone:Read"</code> - sending
              an object here (e.g. <code className="bg-surface-low px-1 rounded text-xs font-mono">{"{ read: [\"Everyone\"] }"}</code>) triggers an Elasticsearch
              mapper_parsing_exception that corrupts the index and silently drops every record; the
              only fix is to delete the entire source and re-register. Second, custom field names
              must include a <code className="bg-surface-low px-1 rounded text-xs font-mono">$$Type</code> suffix
              matching their schema type: <code className="bg-surface-low px-1 rounded text-xs font-mono">field$$String</code>,{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">field$$Float</code>,{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">field$$Boolean</code>, etc. - plain field
              names are accepted but not indexed. Third, a top-level{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_metadata</code> object is
              required alongside <code className="bg-surface-low px-1 rounded text-xs font-mono">_itemMetadata</code>,
              carrying <code className="bg-surface-low px-1 rounded text-xs font-mono">types</code>,{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">locale</code>,{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">key</code>, and{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">status</code>.
              All three rules are absent from the official docs; the examples below reflect the
              working format confirmed with Optimizely engineers.
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
                <CodeBlock code={ITEM_TYPE_SNIPPET} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Data Payload (NdJSON)</p>
                <CodeBlock code={ITEM_DATA_SNIPPET} />
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
                <CodeBlock code={ASSET_TYPE_SNIPPET} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Data Payload (NdJSON)</p>
                <CodeBlock code={ASSET_DATA_SNIPPET} />
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
                <CodeBlock code={IMAGE_TYPE_SNIPPET} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Data Payload (NdJSON)</p>
                <CodeBlock code={IMAGE_DATA_SNIPPET} />
              </div>
            </div>
          </div>
        </section>

        {/* CMS-native vs External comparison */}
        <section id="cms-native-vs-external" className="space-y-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              CMS-native vs External Content{" "}
              <a href="#cms-native-vs-external" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Data pushed via the Content Source API lands in Graph as <strong className="text-on-surface">read-only external content</strong>.
              Editors can browse and reference it in the CMS via{" "}
              <strong className="text-on-surface">Admin - Content Types - Connect from Graph</strong>,
              but they cannot edit the fields - the source system owns the data, and the only way to
              change it is to re-sync from that system.
            </p>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed mt-3">
              <strong className="text-on-surface">CMS-native content is the editable alternative.</strong>{" "}
              Instead of pushing into Graph, you push directly into the CMS - either through the
              Management API (<code className="bg-surface-low px-1 rounded text-xs font-mono">POST /v1/content</code>,
              as the seed scripts do) or by authoring in Visual Builder. The result is a real CMS
              content item, not a connected external type: it carries a{" "}
              <strong className="text-on-surface">draft - review - publish lifecycle</strong>, is
              editable field-by-field in the Content Manager, works in preview mode, can be targeted
              by FX experiments through CMS Variations, and holds per-locale values on{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">isLocalized</code> fields.
              It is still queryable through the same Graph endpoint - the CMS publishes it into Graph
              for you. The live grids below contrast both: external quotes pushed via the Content
              Source API against CMS-native <code className="bg-surface-low px-1 rounded text-xs font-mono">QuoteBlock</code>{" "}
              items you can open and edit in the CMS.
            </p>
          </div>

          {/* Comparison table */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-ghost-border">
              <h3 className="font-display font-semibold text-on-surface">Capability comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ghost-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant w-1/3">Capability</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">External (Content Source API)</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">CMS-native (Management API)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ghost-border">
                  {([
                    ["Edit fields in CMS",           "No - read-only connected type",        "Yes - full Visual Builder editing"],
                    ["Draft / publish lifecycle",     "No - status set at sync time",         "Yes - draft, review, publish"],
                    ["Preview mode",                  "No",                                   "Yes - CMS inline edit + preview"],
                    ["FX experiment targeting",       "No",                                   "Yes - CMS Variations per flag key"],
                    ["Localization",                  "Per-locale sync records",              "Yes - isLocalized fields per locale"],
                    ["Webhook revalidation",          "Manual revalidate tag call",            "Yes - publish webhook fires automatically"],
                    ["Queryable in Graph",            "Yes - same GraphQL endpoint",          "Yes - same GraphQL endpoint"],
                    ["Source of truth",               "External system (CRM, PIM, etc.)",     "Optimizely CMS"],
                  ] as [string, string, string][]).map(([cap, ext, cms]) => (
                    <tr key={cap}>
                      <td className="px-6 py-3 font-medium text-on-surface">{cap}</td>
                      <td className="px-6 py-3 text-on-surface-variant">{ext}</td>
                      <td className="px-6 py-3 text-on-surface-variant">{cms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-side live data grids */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* External quotes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-display font-semibold text-on-surface">External quotes</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-low text-on-surface-variant text-xs font-mono">
                  {fromGraph ? "live from Graph" : "demo data"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mb-4">
                Pushed via <code className="bg-surface-low px-1 rounded">POST /api/content/v2/data</code>.
                Not editable in the CMS - the seed script owns every field.
              </p>
              <div className="space-y-3">
                {items.slice(0, 3).map((q) => (
                  <div
                    key={q.author}
                    className="bg-surface-lowest border border-ghost-border rounded-2xl p-4 flex flex-col gap-2"
                  >
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      &ldquo;{q.text}&rdquo;
                    </p>
                    <p className="text-xs font-semibold text-on-surface">{q.author}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CMS-native QuoteBlock items */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-display font-semibold text-on-surface">CMS-native quotes</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand/10 text-brand text-xs font-mono">
                  {cmsFromGraph ? "live from Graph" : "run seed-quote-blocks.ts"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mb-4">
                Created as <code className="bg-surface-low px-1 rounded">QuoteBlock</code> shared
                blocks via the Management API. Open any in the CMS to edit author, role, and quote text.
              </p>
              {cmsFromGraph ? (
                <div className="space-y-3">
                  {cmsQuotes.slice(0, 3).map((q) => (
                    <div
                      key={q.author}
                      className="bg-surface-lowest border border-ghost-border rounded-2xl p-4 flex flex-col gap-2"
                    >
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        &ldquo;{q.text}&rdquo;
                      </p>
                      <div>
                        <p className="text-xs font-semibold text-on-surface">{q.author}</p>
                        {q.role && <p className="text-xs text-on-surface-variant">{q.role}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 text-center">
                  <p className="text-sm text-on-surface-variant mb-3">No CMS-native quotes found in Graph yet.</p>
                  <ol className="text-xs text-on-surface-variant text-left space-y-1 max-w-xs mx-auto">
                    <li>1. Run <code className="bg-surface-low px-1 rounded">npm run opti:push</code> to register <code className="bg-surface-low px-1 rounded">QuoteBlock</code></li>
                    <li>2. Run <code className="bg-surface-low px-1 rounded">npx tsx scripts/seed-quote-blocks.ts</code></li>
                    <li>3. Wait ~60s for Graph to index, then reload</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Graph query for CMS-native blocks */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
              Graph query - CMS-native QuoteBlock
            </p>
            <CodeBlock code={GET_QUOTE_BLOCKS_QUERY.trim()} />
          </div>
        </section>

      </div>
    </>
  );
}
