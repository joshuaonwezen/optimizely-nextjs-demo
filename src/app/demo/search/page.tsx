import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";
import SearchDemo from "./SearchDemo";
import BranchFinder from "./BranchFinder";

export const dynamic = "force-dynamic";

const searchQueryTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/SearchContent.ts"),
  "utf8"
);
const searchRouteTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/search/route.ts"),
  "utf8"
);
const searchDemoTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/demo/search/SearchDemo.tsx"),
  "utf8"
);
const searchOverlayTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/SearchOverlay/index.tsx"),
  "utf8"
);
const locationsQueryTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetLocations.ts"),
  "utf8"
);
const nearbyRouteTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/locations/nearby/route.ts"),
  "utf8"
);
const geocodeTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/geocode.ts"),
  "utf8"
);
const branchFinderTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/demo/search/BranchFinder.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Search & Filtering",
};

const FULLTEXT_SNIPPET = `# _fulltext searches across ALL text fields that were indexed for a type -
# displayName, string properties, richText body, and any field with
# indexingType: "fulltext" (the default for string-type properties).
# Fields with indexingType: "disabled" are NOT searched.

query SearchRelevance($query: String!) {
  _Content(
    where: { _fulltext: { match: $query } }
    orderBy: { _ranking: RELEVANCE }
    limit: 10
  ) {
    total
    items {
      _score                          # relevance float (0–1)
      _metadata {
        displayName
        url { default }
      }
    }
  }
}`;

const SEMANTIC_SNIPPET = `# SEMANTIC ranking uses vector embeddings - it understands meaning,
# not just keyword presence. "home loan" matches content about "mortgage"
# even if that exact phrase doesn't appear.
#
# _semanticWeight controls the blend between keyword and semantic signals:
#   0.0 → pure keyword (same as RELEVANCE)
#   1.0 → pure semantic (ignores term frequency entirely)
#   0.5 → balanced (default in this project)

query SearchSemantic($query: String!, $weight: Float!) {
  _Content(
    where: { _fulltext: { match: $query } }
    orderBy: { _ranking: SEMANTIC, _semanticWeight: $weight }
    limit: 10
  ) {
    total
    items {
      _score
      _metadata { displayName url { default } }
    }
  }
}`;

const FILTERED_SNIPPET = `# Combine _fulltext with where clauses to narrow results by type,
# date range, or any indexed field.
#
# This query returns only _Page items (pages, not blocks or assets)
# published in the last 90 days, ranked by relevance.

query SearchPages($query: String!, $since: DateTime!) {
  _Page(
    where: {
      _fulltext: { match: $query }
      _metadata: { published: { gte: $since } }
    }
    orderBy: { _ranking: RELEVANCE }
    limit: 10
  ) {
    total
    cursor               # opaque string - pass back as $cursor for the next page
    items {
      _score
      _metadata {
        displayName
        published
        url { default }
        __typename         # lets the UI show the content type (ArticlePage, LandingPage…)
      }
    }
  }
}`;

const PAGINATION_SNIPPET = `# Cursor pagination: pass the cursor from the previous response
# to fetch the next page. Cursors are stable even if new content
# is published between requests - offset-based pagination isn't.

# Page 1 - no cursor
const page1 = await graphqlFetch(SEARCH_PAGES_QUERY, {
  query: "savings account",
  since: new Date(Date.now() - 90 * 86400_000).toISOString(),
});

const { items, cursor, total } = page1.data._Page;
// cursor = "eyJhbGciOiJub25lIn0.eyJza2lwIjoxMH0."  (opaque, don't parse)

// Page 2 - pass cursor back
const page2 = await graphqlFetch(SEARCH_PAGES_QUERY_WITH_CURSOR, {
  query: "savings account",
  since: ...,
  cursor: cursor,   // ← the cursor from page 1 response
});`;

const TRACKING_QUERY_SNIPPET = `# Add tracking: { phrase, source } to the _Content arguments.
# Graph records the search phrase automatically on each query execution.
# Each result item returns a _track URL containing the session ID,
# content ID, content type, and zero-based position.

query SearchRelevance($query: String!) {
  _Content(
    where: { _fulltext: { match: $query } }
    orderBy: { _ranking: RELEVANCE }
    limit: 10
    tracking: { phrase: $query, source: "/search" }
  ) {
    total
    items {
      _track                        # tracking URL returned per result
      _score
      _metadata {
        displayName
        url { default }
      }
    }
  }
}`;

const TRACKING_CLICK_SNIPPET = `// Graph does not embed auth in _track URLs - append the single key server-side.
// In your API route:
const trackUrl = item._track
  ? \`\${item._track}&auth=\${process.env.OPTIMIZELY_GRAPH_SINGLE_KEY}\`
  : null;

// On result click, fire a fire-and-forget GET to the tracking URL.
// Never await it or block navigation on it.
if (result.trackUrl) {
  fetch(result.trackUrl, { method: "GET", mode: "no-cors" }).catch(() => {});
}`;

const PINNED_SETUP_SNIPPET = `// 1. Create a collection (once, via REST - store the returned ID)
const collRes = await fetch(
  \`\${process.env.OPTIMIZELY_GRAPH_GATEWAY}/api/pinned/collections\`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "..." },
    body: JSON.stringify({ title: "Featured Results", isActive: true }),
  }
);
const { id: collectionId } = await collRes.json();

// 2. Add a pinned item - targetKey is the content GUID (from ContentLink.GuidValue)
await fetch(
  \`\${process.env.OPTIMIZELY_GRAPH_GATEWAY}/api/pinned/collections/\${collectionId}/items\`,
  {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "..." },
    body: JSON.stringify({
      phrases: ["savings account", "save money"],
      targetKey: "abc123...",   // content GUID
      language: "en",
      priority: 1,              // 1 = highest; top 5 pins are shown per query
      isActive: true,
    }),
  }
);`;

const PINNED_QUERY_SNIPPET = `# Add pinned: { phrase, collections } alongside where/orderBy.
# Graph prepends matching pinned items before organic results (up to 5).
# Omit collections to evaluate ALL active collections automatically.

query SearchWithPinned($query: String!, $collectionId: String) {
  _Content(
    where: { _fulltext: { match: $query } }
    orderBy: { _ranking: RELEVANCE }
    limit: 10
    pinned: { phrase: $query, collections: $collectionId }
  ) {
    total
    items {
      _score
      _metadata { displayName url { default } }
    }
  }
}`;

const SYNONYMS_UPLOAD_SNIPPET = `// Synonyms are uploaded via REST as a CSV string.
// PUT replaces the entire slot - always upload the full set.

const csv = [
  // Bi-directional: all terms are interchangeable in both directions
  "mortgage, home loan, house loan",
  "ISA, individual savings account",
  // Uni-directional: left-side terms expand to right-side terms only
  "H2O => water",
  "current account => checking account",
].join("\\n");

await fetch(\`\${process.env.OPTIMIZELY_GRAPH_GATEWAY}/resources/synonyms\`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: \`Basic \${btoa(\`\${process.env.OPTIMIZELY_GRAPH_APP_KEY}:\`)}\`,
  },
  body: new URLSearchParams({
    synonym_slot: "ONE",
    language_routing: "en",
    synonyms: csv,
  }),
});`;

const SYNONYMS_QUERY_SNIPPET = `# Apply synonym expansion on field-level operators via the synonyms parameter.
# Supported operators: contains, in, notIn, eq, notEq.
# ONE and TWO are independent slots per language - use both if you manage
# separate synonym groups (e.g. product terms in ONE, acronyms in TWO).

{
  _Content(
    where: {
      Title: { contains: "home loan", synonyms: ONE }
    }
    orderBy: { _ranking: RELEVANCE }
    limit: 10
  ) {
    total
    items {
      _score
      _metadata { displayName url { default } }
    }
  }
}

# Multiple slots:
# where: { Name: { eq: "ISA", synonyms: [ONE, TWO] } }

# Note: _fulltext { match } uses BM25 without synonym expansion.
# Use field-level contains with synonyms, or switch to SEMANTIC ranking
# which handles meaning-based matching implicitly.`;

const CACHE_SNIPPET = `// Search results must NEVER be cached - every query string is unique.
// Using the default ISR behaviour would create a separate cache entry
// per search term and balloon the Next.js data cache with useless entries.

// ✅ Correct - graphqlFetch with explicit cache: "no-store"
const results = await graphqlFetch(SEARCH_QUERY, { query: q }, { cache: "no-store" });

// ✅ Also correct - API route passes cache: "no-store" to graphqlFetch
// (see src/app/api/search/route.ts)

// ❌ Wrong - using the default 60s ISR for search queries
const results = await graphqlFetch(SEARCH_QUERY, { query: q });
// ^ stores every unique query string in the data cache forever (until server restart)

// Compare with navigation, which IS cacheable because
// it's always the same query with no user-provided variables:
graphqlFetch(GET_NAV_QUERY, {}, { next: { revalidate: 300, tags: ["navigation"] } });`;

const GEO_SCHEMA_SNIPPET = `# Content Source schema — a single GeoPoint field, NOT two floats.
# Geo operators only attach to a field of type "GeoPoint".

PUT https://cg.optimizely.com/api/content/v3/types?id=locs
{
  "contentTypes": {
    "BankLocation": {
      "contentType": ["_Item"],
      "properties": {
        "branchName": { "type": "String" },
        "location":   { "type": "GeoPoint" }
      }
    }
  },
  "useTypedFieldNames": true
}

# Data payload (NdJSON) — GeoPoint is a nested { lat, lon } object:
"location$$GeoPoint": { "lat": 52.3676, "lon": 4.9041 }`;

const GEO_QUERY_SNIPPET = `# distance filters by radius from an origin; orderBy sorts nearest-first.
# NOTE: the radius argument is typed Int, not Float — a $radius: Float
# variable is rejected with "used in position expecting type Int".

query GetNearbyBankLocations($lat: Float!, $lon: Float!, $radius: Int) {
  BankLocation(
    where: {
      location: {
        distance: { origin: { lat: $lat, lon: $lon }, radius: $radius, unit: KM }
      }
    }
    orderBy: { location: { origin: { lat: $lat, lon: $lon } } }
  ) {
    items {
      branchName
      city
      location { lat lon }   # Graph returns coords only — no computed distance
    }
  }
}`;

export default function SearchDemoPage() {
  return (
    <>
      <DemoHero
        title="Search & Filtering"
        description={<>Full-text and semantic search using Optimizely Graph&apos;s{" "}
            <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">_fulltext</code> operator -
            with live results, ranking modes, and cursor pagination.</>}
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="live">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live demo
            <SectionAnchor id="live" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            The input below calls <code className="bg-surface-low px-1 rounded font-mono text-xs">/api/search</code> with
            a 300ms debounce. Try searching for content from the Mosey Bank site -
            &ldquo;savings&rdquo;, &ldquo;mortgage&rdquo;, &ldquo;team&rdquo;, or &ldquo;FAQ&rdquo;. Switch to
            Semantic mode to see how it finds related content that doesn&apos;t contain the exact phrase.
          </p>
          <SearchDemo />
        </section>

        <section id="fulltext">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The <code className="font-mono text-xl">_fulltext</code> operator
            <SectionAnchor id="fulltext" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_fulltext</code> searches
            across all text fields that were indexed for a content type - including{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">displayName</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">string</code> properties, and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">richText</code> body. Fields
            declared with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">indexingType: &quot;disabled&quot;</code>{" "}
            are excluded from the index and are never searched. You can search on{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_Content</code> (all types) or
            any specific type such as{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_Page</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">ArticlePage</code>, etc.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <CodeBlock code={FULLTEXT_SNIPPET} label="Basic relevance search across all content" />
        </section>

        <section id="ranking">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Relevance vs. Semantic ranking
            <SectionAnchor id="ranking" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Graph supports two ranking modes. <strong>RELEVANCE</strong> is classic BM25 - term
            frequency, inverse document frequency, and field weighting. It works well for exact-phrase
            search but misses synonyms. <strong>SEMANTIC</strong> uses vector embeddings and finds
            conceptually related content even when the words don&apos;t match.{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_semanticWeight</code> blends
            the two signals.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "RELEVANCE",
                note: "Fast, no GPU required. Best for: exact product names, error codes, known terms.",
                good: true,
              },
              {
                label: "SEMANTIC (weight: 0.5)",
                note: "Blended. \"home loan\" matches \"mortgage\" content. Best for: general search bars.",
                good: true,
              },
              {
                label: "SEMANTIC (weight: 1.0)",
                note: "Pure semantic. Best for: discovery / recommendation use cases. Can surprise users.",
                good: null,
              },
            ].map(({ label, note, good }) => (
              <div
                key={label}
                className={`bg-surface-lowest rounded-2xl p-5 border ${good === true ? "border-green-200" : good === false ? "border-orange-200" : "border-ghost-border"}`}
              >
                <p className="text-xs font-mono font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{note}</p>
              </div>
            ))}
          </div>

          <CodeBlock code={SEMANTIC_SNIPPET} label="Semantic search with configurable weight" />
        </section>

        <section id="filtering">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Filtering and cursor pagination
            <SectionAnchor id="filtering" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_fulltext</code> can be
            combined with any{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">where</code> clause. Common
            combinations: filter by base type ({" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_Page</code> vs.{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_Content</code>), published
            date range, or a specific content type. Results are paginated using an opaque{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cursor</code> string - more
            stable than offset pagination because new publishes don&apos;t shift pages.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Filtered query with cursor</p>
              <CodeBlock code={FILTERED_SNIPPET} label="Search pages only, published within 90 days" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Consuming the cursor in code</p>
              <CodeBlock code={PAGINATION_SNIPPET} label="Cursor-based pagination" />
            </div>
          </div>
        </section>

        <section id="cache">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Cache strategy - always <code className="font-mono text-xl">no-store</code>
            <SectionAnchor id="cache" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Search queries must never be cached. Each user types a different string, so ISR would create
            a cache entry per unique query - polluting the Next.js data cache with entries that are never
            reused. The <code className="bg-surface-low px-1 rounded font-mono text-xs">/api/search</code>{" "}
            route in this project passes{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cache: &quot;no-store&quot;</code>{" "}
            to <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch</code>{" "}
            explicitly - bypassing both Next.js ISR and Graph CDN.
          </p>
          <CodeBlock code={CACHE_SNIPPET} label="Why search bypasses ISR" />
        </section>

        <section id="tracking">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Search hit tracking
            <SectionAnchor id="tracking" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Graph can record two kinds of search data. <strong>Phrase tracking</strong> - which queries
            users run - is automatic: add a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">tracking</code> argument to
            the <code className="bg-surface-low px-1 rounded font-mono text-xs">_Content</code> call and
            every query execution is logged. <strong>Click tracking</strong> - which result the user
            selected - requires a client-side step: each result item returns a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_track</code> URL, and you
            fire a GET request to that URL when the user clicks. Together they give you the full picture -
            what was searched and what was chosen.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Query with tracking enabled</p>
              <CodeBlock code={TRACKING_QUERY_SNIPPET} label="Add tracking param and _track field" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Client-side click handler</p>
              <CodeBlock code={TRACKING_CLICK_SNIPPET} label="Fire _track URL on result click" />
            </div>
          </div>
        </section>

        <section id="pinned">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Pinned results
            <SectionAnchor id="pinned" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Pinned results let editors guarantee that specific content always appears at the top of
            search results when a user&apos;s query matches a configured phrase - regardless of
            ranking score. Common uses: promoted products, campaign pages, curated editorial picks.
            Pins are managed via REST and applied in GraphQL with a single{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">pinned</code> argument.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Create a collection and add pinned items</p>
              <CodeBlock code={PINNED_SETUP_SNIPPET} label="REST API - collection setup" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Apply pinned results in a GraphQL query</p>
              <CodeBlock code={PINNED_QUERY_SNIPPET} label="pinned argument in _Content query" />
            </div>
          </div>

          <div className="bg-surface-lowest rounded-2xl p-5 border border-ghost-border">
            <p className="text-xs font-mono font-semibold text-on-surface mb-2">Pinned items are prepended, not ranked</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Graph prepends matching pinned items before the organic result set - they don&apos;t
              compete for ranking position. Up to 5 pinned items appear per query; organic results fill
              the remainder of the{" "}
              <code className="bg-surface px-1 rounded font-mono">limit</code>. Omit{" "}
              <code className="bg-surface px-1 rounded font-mono">collections</code> to evaluate all
              active collections automatically.
            </p>
          </div>
        </section>

        <section id="synonyms">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Synonyms
            <SectionAnchor id="synonyms" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Synonyms expand what Graph considers a match, reducing zero-result searches and search
            abandonment. Graph supports two synonym slots per language (
            <code className="bg-surface-low px-1 rounded font-mono text-xs">ONE</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">TWO</code>) so you can
            manage independent synonym groups - for example product terminology in{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">ONE</code> and financial
            acronyms in{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">TWO</code>. Synonyms are
            uploaded as CSV via REST and applied at query time via the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">synonyms</code> parameter
            on field operators.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Bi-directional",
                note: "Comma-separated terms. All are interchangeable in both directions. mortgage, home loan, house loan",
              },
              {
                label: "Uni-directional",
                note: "Arrow notation. Left-side terms expand to right-side only. H2O => water",
              },
              {
                label: "Slot ONE / TWO",
                note: "Two independent synonym sets per language. Apply one or both per field: synonyms: [ONE, TWO]",
              },
            ].map(({ label, note }) => (
              <div
                key={label}
                className="bg-surface-lowest rounded-2xl p-5 border border-ghost-border"
              >
                <p className="text-xs font-mono font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{note}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Upload synonyms via REST (CSV format)</p>
              <CodeBlock code={SYNONYMS_UPLOAD_SNIPPET} label="PUT /resources/synonyms" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Apply synonym expansion in a query</p>
              <CodeBlock code={SYNONYMS_QUERY_SNIPPET} label="synonyms parameter on field operators" />
            </div>
          </div>
        </section>

        <section id="geo">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Geo search with <code className="font-mono text-xl">GeoPoint</code>
            <SectionAnchor id="geo" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Graph supports geospatial search. The key is the data model: geo operators
            (<code className="bg-surface-low px-1 rounded font-mono text-xs">distance</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">withIn</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">orderBy</code> by distance) only
            attach to a single field of type{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">GeoPoint</code> - never to two
            separate <code className="bg-surface-low px-1 rounded font-mono text-xs">lat</code>/
            <code className="bg-surface-low px-1 rounded font-mono text-xs">lon</code> floats. The Mosey Bank
            branches are pushed as an external content source with a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">GeoPoint</code> field.{" "}
            <a href="https://docs.developers.optimizely.com/platform-optimizely/docs/geo-search" target="_blank" rel="noopener" className="text-brand hover:underline">Geo search docs ↗</a>
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            The input below calls <code className="bg-surface-low px-1 rounded font-mono text-xs">/api/locations/nearby</code>,
            which geocodes your text to coordinates (OpenStreetMap Nominatim), runs the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">distance</code> query, and attaches a
            Haversine <code className="bg-surface-low px-1 rounded font-mono text-xs">distanceKm</code> to each
            result (Graph ranks by distance but does not return the value). Try{" "}
            &ldquo;Berlin&rdquo;, &ldquo;London&rdquo;, or &ldquo;Stockholm&rdquo; and expand the response
            panel to see the raw JSON.
          </p>
          <BranchFinder />
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <CodeBlock code={GEO_SCHEMA_SNIPPET} label="GeoPoint schema + NdJSON data payload" />
            <CodeBlock code={GEO_QUERY_SNIPPET} label="distance filter + nearest-first orderBy" />
          </div>
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">_fulltext searches indexed text fields automatically.</strong> String properties are indexed by default. Opt out per-field with <code className="bg-surface-low px-1 rounded font-mono text-xs">indexingType: &quot;disabled&quot;</code>.</>,
          <><strong className="text-on-surface">RELEVANCE = BM25 keyword matching.</strong> Fast, deterministic. SEMANTIC = vector similarity - slower but understands meaning and synonyms.</>,
          <><strong className="text-on-surface">Combine _fulltext with any where clause</strong> to restrict by type, date, or tag. Filtering narrows the candidate set before ranking is applied.</>,
          <><strong className="text-on-surface">Cursor pagination is stable;</strong> offset pagination shifts when new content is published. Always use the cursor returned by Graph, not a computed skip value.</>,
          <><strong className="text-on-surface">Search queries must use cache: &quot;no-store&quot;.</strong> Every user query is unique - ISR would fill the data cache with one-time entries. Navigation queries are the opposite - same query for every visitor, perfect for ISR.</>,
          <><strong className="text-on-surface">_score is a float between 0 and 1.</strong> Use it to show relevance indicators in the UI or to filter out low-confidence results below a threshold.</>,
          <><strong className="text-on-surface">Add <code className="bg-surface-low px-1 rounded font-mono text-xs">tracking</code> to record search phrases.</strong> Each result item returns a <code className="bg-surface-low px-1 rounded font-mono text-xs">_track</code> URL - call it with a GET request when the user clicks a result. Tracking should never block or interrupt navigation.</>,
          <><strong className="text-on-surface">Use <code className="bg-surface-low px-1 rounded font-mono text-xs">pinned</code> to guarantee editorial picks appear first.</strong> Create a collection, add items with trigger phrases, then pass <code className="bg-surface-low px-1 rounded font-mono text-xs">pinned: &#123; phrase, collections &#125;</code> in the GraphQL query. Up to 5 pinned items are prepended before organic results.</>,
          <><strong className="text-on-surface">Synonyms reduce zero-result searches by expanding query terms.</strong> Upload a CSV to slot ONE or TWO via REST, then enable synonym expansion per field using <code className="bg-surface-low px-1 rounded font-mono text-xs">synonyms: ONE</code> on <code className="bg-surface-low px-1 rounded font-mono text-xs">contains</code>, <code className="bg-surface-low px-1 rounded font-mono text-xs">in</code>, or <code className="bg-surface-low px-1 rounded font-mono text-xs">eq</code> operators.</>,
          <><strong className="text-on-surface">Geo search needs a single <code className="bg-surface-low px-1 rounded font-mono text-xs">GeoPoint</code> field, not two floats.</strong> Filter with <code className="bg-surface-low px-1 rounded font-mono text-xs">distance</code> and sort with <code className="bg-surface-low px-1 rounded font-mono text-xs">orderBy</code> by origin. The <code className="bg-surface-low px-1 rounded font-mono text-xs">radius</code> argument is typed <code className="bg-surface-low px-1 rounded font-mono text-xs">Int</code>, not Float. Graph returns coordinates only - compute distance labels yourself with Haversine.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "SearchContent.ts", path: "src/lib/graphql/queries/SearchContent.ts", content: searchQueryTs },
            { label: "search/route.ts", path: "src/app/api/search/route.ts", content: searchRouteTs },
            { label: "SearchDemo.tsx", path: "src/app/demo/search/SearchDemo.tsx", content: searchDemoTs },
            { label: "SearchOverlay/index.tsx", path: "src/components/layout/SearchOverlay/index.tsx", content: searchOverlayTs },
            { label: "GetLocations.ts", path: "src/lib/graphql/queries/GetLocations.ts", content: locationsQueryTs },
            { label: "locations/nearby/route.ts", path: "src/app/api/locations/nearby/route.ts", content: nearbyRouteTs },
            { label: "geocode.ts", path: "src/lib/geocode.ts", content: geocodeTs },
            { label: "BranchFinder.tsx", path: "src/app/demo/search/BranchFinder.tsx", content: branchFinderTs },
          ]}
        />

      </div>
    </>
  );
}
