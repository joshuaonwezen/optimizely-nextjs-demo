import type { Metadata } from "next";
import { getReferrals, GET_REFERRALS_QUERY } from "@/lib/graphql/queries/GetReferrals";

export const metadata: Metadata = {
  title: "External Content Sync Demo",
};

const TYPE_DEFINITION_SNIPPET = `// PUT https://cg.optimizely.com/api/content/v3/types?id=rfl
// Authorization: Basic base64(APP_KEY:APP_SECRET)
//
// _Item is a globally defined contract — no need to register it.
// We override _Metadata only to set displayName searchable:false;
// the global definition uses searchable:true which silently drops
// values from external sources via the full-text search pipeline.
{
  "propertyTypes": {
    "_Metadata": {
      "properties": {
        "key":          { "type": "String",   "searchable": false },
        "displayName":  { "type": "String",   "searchable": false },
        "lastModified": { "type": "DateTime", "searchable": false },
        "type":         { "type": "String",   "searchable": false }
      }
    }
  },
  "contentTypes": {
    "Referral": {
      "contentType": ["_Item"],
      "properties": {
        "name":    { "type": "String" },
        "comment": { "type": "String" }
      }
    }
  }
}`;

const SEED_DATA_SNIPPET = `// POST https://cg.optimizely.com/api/content/v2/data?id=rfl
// Content-Type: application/x-ndjson
// Authorization: Basic base64(APP_KEY:APP_SECRET)

// Each item is a pair of lines — action + data:
{"index": {"_id": 1, "language_routing": "en"}}
{
  "Id": "ref-1",
  "Name": "Referral - Sarah Chen",
  "_itemMetadata": {
    "key": "ref-1",
    "displayName": "Referral - Sarah Chen",
    "lastModified": "2026-05-14T00:00:00.000Z",
    "type": "Referral"
  },
  "name": "Sarah Chen",
  "comment": "Switched our content team to Optimizely...",
  "ContentType": ["Referral"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" },
  "RolesWithReadAccess": "Everyone"
}`;

export default async function ReferralsDemoPage() {
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

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* Referral cards */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Referrals
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">
            Each card is a <code className="bg-surface-low px-1 rounded text-xs font-mono">Referral</code> item
            synced from an external source. By inheriting from the{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_Item</code> global contract,
            each item exposes{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_itemMetadata</code> with
            key, displayName, and lastModified — populated from the seed payload.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((ref) => (
              <div
                key={ref.key}
                className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display font-semibold text-on-surface text-sm">{ref.name}</span>
                  {ref.lastModified && (
                    <span className="text-xs text-on-surface-variant opacity-50 shrink-0">
                      {new Date(ref.lastModified).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                  &ldquo;{ref.comment}&rdquo;
                </p>
                <div className="pt-2 border-t border-ghost-border space-y-1">
                  <div className="flex gap-2 text-xs font-mono text-on-surface-variant">
                    <span className="opacity-50">displayName</span>
                    <span className="truncate">{ref.displayName}</span>
                  </div>
                  <div className="flex gap-2 text-xs font-mono text-on-surface-variant">
                    <span className="opacity-50">key</span>
                    <span>{ref.key || "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The GraphQL query */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
            The Query
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Once synced, external content is queried exactly like CMS-managed content —
            same GraphQL endpoint, same{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_metadata</code> fields,
            same ISR caching. No distinction at query time between CMS and external sources.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{GET_REFERRALS_QUERY.trim()}</code>
          </pre>
        </section>

        {/* Type definition + seed data */}
        <section className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface mb-1">
              Content Type Registration
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              A single <code className="bg-surface-low px-1 rounded text-xs font-mono">PUT</code> registers
              the schema. <code className="bg-surface-low px-1 rounded text-xs font-mono">Referral</code> inherits
              from the <code className="bg-surface-low px-1 rounded text-xs font-mono">_Item</code> global
              contract, which adds <code className="bg-surface-low px-1 rounded text-xs font-mono">_itemMetadata</code> so
              the CMS can identify and display external items. Re-running is idempotent.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{TYPE_DEFINITION_SNIPPET}</code>
            </pre>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-on-surface mb-1">
              Pushing Data
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              Data is sent as NdJSON — each item is two lines: an action line with the
              internal index ID, then the data object. The{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_itemMetadata</code> object
              is passed explicitly in the payload and maps directly to the{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">_Item</code> contract fields
              queryable in Graph.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{SEED_DATA_SNIPPET}</code>
            </pre>
          </div>
        </section>

      </div>
    </div>
  );
}
