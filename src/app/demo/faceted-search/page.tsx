import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";
import FacetedSearchDemo from "./FacetedSearchDemo";

export const dynamic = "force-dynamic";

const searchQueryTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/SearchContent.ts"),
  "utf8"
);
const searchRouteTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/search/route.ts"),
  "utf8"
);
const autocompleteRouteTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/search/autocomplete/route.ts"),
  "utf8"
);
const facetedSearchDemoTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/demo/faceted-search/FacetedSearchDemo.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Facets & Autocomplete",
};

const FACETS_SNIPPET = `# facets sits alongside items/total and returns aggregations with
# live counts. Facet fields must be indexed with
# indexingType: "queryable" (or be metadata fields, which always are).
#
# orderType: COUNT | VALUE  - sort buckets by frequency or alphabetically
# orderBy:   ASC | DESC

query SearchFaceted($query: String!, $categories: [String!], $tags: [String!]) {
  ArticlePage(
    where: {
      _fulltext: { match: $query }
      category: { in: $categories }   # null variables are ignored -
      tags: { in: $tags }             # no filter until a facet is picked
    }
    orderBy: { _ranking: RELEVANCE }
    limit: 10
  ) {
    total
    items {
      _score
      category
      tags
      _metadata { displayName url { default } }
    }
    facets {
      category(orderType: COUNT, orderBy: DESC, limit: 10) { name count }
      tags(orderType: COUNT, orderBy: DESC, limit: 12) { name count }
    }
  }
}`;

const DRILLDOWN_SNIPPET = `// Drill-down: the selected facet values feed straight back into where.
// Facet counts are computed on the FILTERED set, so they narrow as
// the user drills down.

// 1. First query - no filters. Facets show the full corpus:
//    category: personal-finance (4), business-banking (3), market-insights (2)

// 2. User checks "business-banking" - re-query with:
{ query: "banking", categories: ["business-banking"], tags: null }

// 3. Facets now reflect only matching articles:
//    category: business-banking (3)
//    tags:     cashflow (2), startups (2), tax (2)

// Passing null (not []) for an unused filter makes Graph skip it
// entirely - the API route converts empty selections to null.`;

const TYPES_FACET_SNIPPET = `# Metadata fields facet too - no schema changes needed.
# _metadata.types buckets results by content type, useful for
# an "All / Articles / Pages" filter bar on a global search.

query SearchWithTypeFacet($query: String!) {
  _Content(where: { _fulltext: { match: $query } }) {
    total
    facets {
      _metadata {
        types(limit: 10) { name count }
      }
    }
  }
}

# → _Page (26), DynamicExperience (12), TraditionalPage (7),
#   ArticlePage (5), FaqItemBlock (4), ...`;

const AUTOCOMPLETE_SNIPPET = `# autocomplete also sits alongside items/total. Each eligible field
# takes (limit, value) and returns matching VALUES from the index -
# not documents. Two flavours used here:
#
#   - ArticlePage tags: suggest query terms ("mo" → mortgage)
#   - _Content _metadata.url.default: suggest pages by path segment
#     ("sav" → /articles-demo/savings-tips-2025/)

query Autocomplete($value: String!) {
  ArticlePage {
    autocomplete {
      tags(limit: 5, value: $value)
    }
  }
  _Content {
    autocomplete {
      _metadata {
        url { default(limit: 6, value: $value) }
      }
    }
  }
}`;

const INDEXING_SNIPPET = `// Facets and autocomplete only work on fields Graph indexed for
// querying. In the content type definition:

export const ArticlePageType = contentType({
  key: "ArticlePage",
  baseType: "_page",
  properties: {
    // searchable → _fulltext finds it, but it CANNOT facet
    title:    { type: "string", indexingType: "searchable" },

    // queryable → filter, sort, facet, autocomplete
    category: { type: "string", indexingType: "queryable", enum: { values: [...] } },
    tags:     { type: "array", items: { type: "string" }, indexingType: "queryable" },
  },
});

// Metadata fields (_metadata.types, url, locale, status) are always
// facetable - no configuration needed.`;

export default function FacetedSearchDemoPage() {
  return (
    <>
      <DemoHero
        title="Facets & Autocomplete"
        description={<>Faceted drill-down filtering with live counts and type-ahead suggestions -
          both computed by Optimizely Graph in the same query as the results, no separate
          aggregation service needed.</>}
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="live">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live demo
            <SectionAnchor id="live" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Type <strong>banking</strong> or <strong>mortgage</strong> and pause - autocomplete
            suggests tags and page paths as you type. Then use the checkboxes to drill into the
            results: counts update because Graph recomputes facets on the filtered set with every
            query.
          </p>
          <FacetedSearchDemo />
        </section>

        <section id="facets">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The <code className="font-mono text-xl">facets</code> field
            <SectionAnchor id="facets" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Facets are aggregations over the result set - each bucket is a distinct field value with
            the number of matching items. They come back in the <em>same query</em> as the results,
            so a search page with counts is still a single round-trip. Any field indexed with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">indexingType: &quot;queryable&quot;</code>{" "}
            can facet; here <code className="bg-surface-low px-1 rounded font-mono text-xs">category</code>{" "}
            (an enum string) and <code className="bg-surface-low px-1 rounded font-mono text-xs">tags</code>{" "}
            (a string array) on ArticlePage.
          </p>
          <CodeBlock code={FACETS_SNIPPET} label="Faceted search query used by this page" />
        </section>

        <section id="drilldown">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Drill-down: facets feed the filter
            <SectionAnchor id="drilldown" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The pattern is a loop: facet values render as checkboxes, checked values go back into the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">where</code> clause via{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">in</code> operators, and the
            next response returns both narrowed results and narrowed counts. Graph ignores filter
            operators whose variable is{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">null</code>, so one query
            handles every combination of active filters - no query building on the client.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={DRILLDOWN_SNIPPET} label="The drill-down loop" />
            <CodeBlock code={TYPES_FACET_SNIPPET} label="Faceting on metadata: _metadata.types" />
          </div>
        </section>

        <section id="autocomplete">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Autocomplete
            <SectionAnchor id="autocomplete" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The <code className="bg-surface-low px-1 rounded font-mono text-xs">autocomplete</code>{" "}
            field returns matching <em>values</em> from the index rather than documents - ideal for
            type-ahead because it&apos;s cheap and needs no ranking. This page combines two sources in
            one query: tag values (suggesting search terms) and URL paths (suggesting pages to jump
            to directly). Like search, autocomplete responses must use{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cache: &quot;no-store&quot;</code> -
            every keystroke is a unique query string.
          </p>
          <CodeBlock code={AUTOCOMPLETE_SNIPPET} label="Two autocomplete sources in one query" />
        </section>

        <section id="indexing">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Prerequisite: <code className="font-mono text-xl">queryable</code> indexing
            <SectionAnchor id="indexing" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">searchable</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">queryable</code> serve
            different engines: searchable feeds the full-text index (prose fields users search),
            queryable feeds the structured index (metadata you filter, sort, and facet on). A title
            should be searchable; a category enum should be queryable. Trying to facet on a
            searchable-only field returns a schema error, not empty buckets.
          </p>
          <CodeBlock code={INDEXING_SNIPPET} label="indexingType decides what can facet" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Facets ride along with results in one query.</strong> The <code className="bg-surface-low px-1 rounded font-mono text-xs">facets</code> selection returns value buckets with counts - no second request, no separate aggregation service.</>,
          <><strong className="text-on-surface">Facet counts are computed on the filtered set.</strong> Drill-down narrows both results and counts, which is exactly what users expect from e-commerce-style filtering.</>,
          <><strong className="text-on-surface">Null filter variables are ignored by Graph.</strong> Write one query with all possible <code className="bg-surface-low px-1 rounded font-mono text-xs">in</code> filters and pass <code className="bg-surface-low px-1 rounded font-mono text-xs">null</code> for inactive ones - the API route converts empty selections to null.</>,
          <><strong className="text-on-surface">Facet ordering uses orderType, not orderBy.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">orderType: COUNT | VALUE</code> picks the sort key; <code className="bg-surface-low px-1 rounded font-mono text-xs">orderBy: ASC | DESC</code> picks the direction.</>,
          <><strong className="text-on-surface">Autocomplete returns values, not documents.</strong> Each field takes <code className="bg-surface-low px-1 rounded font-mono text-xs">(limit, value)</code> and suggests indexed values - combine multiple fields (tags, URL paths) in one query for richer suggestions.</>,
          <><strong className="text-on-surface">Faceting requires queryable indexing.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">indexingType: &quot;queryable&quot;</code> on the field definition; metadata fields like <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.types</code> facet out of the box.</>,
          <><strong className="text-on-surface">Facets add query cost.</strong> Each facet selection adds to Graph&apos;s complexity budget (visible in the response <code className="bg-surface-low px-1 rounded font-mono text-xs">extensions.costSummary</code>) - request only the facets the UI renders.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "SearchContent.ts", path: "src/lib/graphql/queries/SearchContent.ts", content: searchQueryTs },
            { label: "search/route.ts", path: "src/app/api/search/route.ts", content: searchRouteTs },
            { label: "autocomplete/route.ts", path: "src/app/api/search/autocomplete/route.ts", content: autocompleteRouteTs },
            { label: "FacetedSearchDemo.tsx", path: "src/app/demo/faceted-search/FacetedSearchDemo.tsx", content: facetedSearchDemoTs },
          ]}
        />

      </div>
    </>
  );
}
