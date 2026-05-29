import type { Metadata } from "next";
import { getReferrals, GET_REFERRALS_QUERY } from "@/lib/graphql/queries/GetReferrals";

export const metadata: Metadata = {
  title: "External Content Sync Demo",
};

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const ITEM_TYPE_SNIPPET = `PUT https://cg.optimizely.com/api/content/v3/types?id=rfl
Content-Type: application/json
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{
  "contentTypes": {
    "Referral": {
      "contentType": ["_Item"],
      "properties": {
        "name":    { "type": "String" },
        "comment": { "type": "String" }
      }
    }
  },
  "preset": "next",
  "useTypedFieldNames": true
}`;

const ITEM_DATA_SNIPPET = `POST https://cg.optimizely.com/api/content/v2/data?id=rfl
Content-Type: text/plain
Authorization: Basic <base64(APP_KEY:APP_SECRET)>

{"index": {"_id": 1, "language_routing": "en"}}
{
  "_itemMetadata": {
    "key": "ref-1",
    "displayName___searchable": "Referral - Sarah Chen",
    "lastModified": "2026-05-26T00:00:00.000Z",
    "type": "Referral"
  },
  "name": "Sarah Chen",
  "comment": "Switched our content team to Optimizely SaaS CMS...",
  "ContentType": ["Referral"],
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ExternalContentPage() {
  const { items, fromGraph } = await getReferrals();

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
            CMS-managed content — same GraphQL endpoint, same ISR caching.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              {fromGraph ? "✓ Live from Graph" : "◎ Demo data — run npx tsx scripts/seed-referrals.ts"}
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

        {/* Live referral cards */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Example — Referrals
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Each card is a <code className="bg-surface-low px-1 rounded text-xs font-mono">Referral</code> item
            synced from an external source via the{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_Item</code> base type.
            Custom properties (<code className="bg-surface-low px-1 rounded text-xs font-mono">name</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">comment</code>) hold
            application data and are queried directly.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((ref) => (
              <div
                key={ref.name}
                className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex flex-col gap-3"
              >
                <span className="font-display font-semibold text-on-surface text-sm">{ref.name}</span>
                <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                  &ldquo;{ref.comment}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* GraphQL query */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
            Querying External Content
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Once synced, external content is queried exactly like CMS-managed content —
            same GraphQL endpoint, same ISR caching. Query your custom properties directly;{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_itemMetadata</code> fields
            are search-indexed internals and return{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">null</code> at query time.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{GET_REFERRALS_QUERY.trim()}</code>
          </pre>
        </section>

        {/* Base type contracts */}
        <section className="space-y-16">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-3">
              Base Type Contracts
            </h2>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Graph ships three built-in base type contracts. Inherit from one when registering
              a content type — it adds the metadata property Graph needs to identify, index,
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
              the contract definition — with <code className="bg-surface-low px-1 rounded text-xs font-mono">useTypedFieldNames</code> enabled,
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
              a file attachment — testimonials, product catalog entries, CRM records, referrals.
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
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_assetMetadata</code> — adds{" "}
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
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_imageMetadata</code> — adds{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">width</code> and{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">height</code>. Use for images
              from a DAM or media library where you need dimensions queryable at render time —
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
