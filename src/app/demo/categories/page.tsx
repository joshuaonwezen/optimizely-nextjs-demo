import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";
import { getTaxonomyTerms } from "@/lib/graphql/queries/GetTaxonomyTerms";
import {
  buildTermTree,
  expandToUris,
  flattenTree,
  rollUpCounts,
  termLabel,
  type TermNode,
} from "@/lib/taxonomy";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import LiveDemoShell from "@/components/demo/LiveDemoShell";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const metadata: Metadata = {
  title: "Categories & Taxonomy",
};

const taxonomyLibTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/taxonomy.ts"),
  "utf8"
);
const taxonomyQueryTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetTaxonomyTerms.ts"),
  "utf8"
);
const taxonomyClientTs = fs.readFileSync(
  path.join(process.cwd(), "scripts/_taxonomy.ts"),
  "utf8"
);
const taxonomyTreeTs = fs.readFileSync(
  path.join(process.cwd(), "scripts/taxonomy-tree.ts"),
  "utf8"
);
const seedCategoriesTs = fs.readFileSync(
  path.join(process.cwd(), "scripts/seed-categories.ts"),
  "utf8"
);

const BROWSE_QUERY = /* GraphQL */ `
  query CategoryBrowse($categories: [String], $limit: Int) {
    _Content(
      limit: $limit
      locale: en
      where: {
        _itemMetadata: { categories: { in: $categories } }
        _metadata: { url: { default: { exist: true } } }
      }
      orderBy: { _metadata: { displayName: ASC } }
    ) {
      total
      items {
        _metadata { displayName types url { default } }
        _itemMetadata { categories }
      }
      facets {
        _itemMetadata {
          categories(orderType: COUNT, orderBy: DESC, limit: 40) { name count }
        }
      }
    }
  }
`;

const TERMS_QUERY_SNIPPET = `# Every category is indexed as its own _TaxonomyTerm document.
# The tree is reconstructed client-side from the parent field.

query GetTaxonomyTerms($locale: [Locales]) {
  _TaxonomyTerm(limit: 100, locale: $locale) {
    total
    items {
      _metadata {
        key           # "mortgages" - the stable API identifier
        taxonomy      # "categories" - the only taxonomy that exists today
        displayName   # "Mortgages" - localized, editor-facing
        description
        usage         # "Public" | "Internal"
        parent        # parent term key, or null for a root
      }
    }
  }
}

# NOTE: the public docs list key/displayName/description/usage/taxonomy but
# omit parent. It IS in the schema - without it there is no way to render a
# hierarchy, only a flat list.`;

const ON_CONTENT_SNIPPET = `# Assigned categories live on _itemMetadata, NOT _metadata.
#
# _Content._metadata     is typed IContentMetadata  -> has NO categories field
# _Content._itemMetadata is typed _Metadata         -> has categories: [String]
#
# Querying _metadata { categories } fails with:
#   Cannot query field "categories" on type "IContentMetadata".

query GetContentWithCategories {
  ArticlePage(limit: 10) {
    items {
      _metadata     { displayName url { default } }
      _itemMetadata { categories }   # ["cms://taxonomy/categories/mortgages", ...]
    }
  }
}

# The value is an array of URI strings, never display names:
#   cms://taxonomy/categories/<termKey>
# Resolve labels by joining against _TaxonomyTerm on the key.`;

const FILTER_SNIPPET = `# Filter by one category
where: { _itemMetadata: { categories: { eq: "cms://taxonomy/categories/mortgages" } } }

# Filter by any of several (OR)
where: { _itemMetadata: { categories: { in: [
  "cms://taxonomy/categories/mortgages",
  "cms://taxonomy/categories/isas"
] } } }

# Only content that has been categorised at all
where: { _itemMetadata: { categories: { exist: true } } }

# Combine with a content type
where: {
  _and: [
    { _metadata: { types: { eq: "ArticlePage" } } }
    { _itemMetadata: { categories: { eq: "cms://taxonomy/categories/mortgages" } } }
  ]
}

# A null variable is ignored, so ONE query serves the filtered and
# unfiltered cases - no need for two query constants.
query GetArticles($categories: [String]) {
  ArticlePage(where: { _itemMetadata: { categories: { in: $categories } } }) { ... }
}`;

const FACETS_SNIPPET = `# Categories are facetable, so a browse UI gets its counts for free.
# Bucket names come back as term URIs, not display names.

query CategoryFacets {
  _Content {
    total
    facets {
      _itemMetadata {
        categories(orderType: COUNT, orderBy: DESC, limit: 40) {
          name    # "cms://taxonomy/categories/mortgages"
          count   # 11
        }
      }
    }
  }
}

# Because this hangs off _Content rather than a single page type, the counts
# span EVERY content type at once. The old per-type ArticlePage.category
# property could never do this: each type had its own separate enum.`;

const REST_API_SNIPPET = `# Terms are managed through the experimental Taxonomy REST API.
# Requires an api:admin token AND CMS admin rights; feature-flagged per instance.

GET    /v1/experimental/taxonomies/categories/terms?pageIndex=0&pageSize=100
POST   /v1/experimental/taxonomies/categories/terms
GET    /v1/experimental/taxonomies/categories/terms/{termKey}
PATCH  /v1/experimental/taxonomies/categories/terms/{termKey}
DELETE /v1/experimental/taxonomies/categories/terms/{termKey}

# Create a term. Parents MUST exist first - a child pointing at an unknown
# parent is a 400. A term's parent can never be changed afterwards.
POST /v1/experimental/taxonomies/categories/terms
{
  "key": "mortgages",           # ^[A-Za-z][_0-9A-Za-z]+$ - NO HYPHENS
  "displayName": "Mortgages",
  "parent": "product",
  "sortOrder": 30,
  "isAvailable": true,          # false = hidden from the UI and from Graph
  "isSelectable": true          # false = a grouping node nobody can tag with
}

# Assignment is NOT a taxonomy endpoint. \`categories\` is a built-in property
# on a content VERSION - you do not declare it on any content type:
PATCH /v1/content/{key}/versions/{version}
Content-Type: application/merge-patch+json
{ "properties": { "categories": { "value": [
    "cms://taxonomy/categories/mortgages"
] } } }

# The CMS validates every URI and rejects, with the property named:
#   "The taxonomy term 'x' could not be found in taxonomy 'categories'."
#   "The taxonomy term 'x' is not selectable."
#   "The taxonomy 'tags' is not supported."`;

const LOCALIZATION_SNIPPET = `# Graph does NOT fall back to the master language for taxonomy terms.
#
# Master language  -> the value stored when the term was created
# Other languages  -> an en-dash placeholder "–" when no translation exists
#
# So a Dutch query for an untranslated term returns displayName: "–", not the
# English name. Treat that literal as "missing" and fall back yourself:

export const MISSING_TRANSLATION = "–";

export function termLabel(terms, keyOrUri) {
  const key  = toTermKey(keyOrUri);
  const name = terms.find((t) => t.key === key)?.displayName;
  if (!name || name === MISSING_TRANSLATION) return humanizeKey(key);
  return name;
}`;

const EXPANSION_SNIPPET = `// Content is tagged leaf-only, so "show me everything under Mortgages"
// means expanding the term to its descendants before querying.
// src/lib/taxonomy.ts

export function descendantKeys(terms, key) {
  const childrenOf = new Map();
  for (const term of terms) {
    if (!term.parent) continue;
    childrenOf.set(term.parent, [...(childrenOf.get(term.parent) ?? []), term.key]);
  }
  const out = [];
  const walk = (k, seen) => {
    if (seen.has(k)) return;
    seen.add(k);
    out.push(k);
    for (const child of childrenOf.get(k) ?? []) walk(child, seen);
  };
  walk(toTermKey(key), new Set());
  return out;
}

// mortgages -> [mortgages, first_time_buyer_mortgage, remortgaging,
//               buy_to_let, overpayments]
const uris = expandToUris(terms, ["mortgages"]);

// Then it is an ordinary \`in\` filter:
//   where: { _itemMetadata: { categories: { in: $categories } } }
//
// On this instance that turns 3 exact matches into 11.`;

function typeOf(types: string[] | null | undefined): string {
  const ignore = new Set([
    "_Content", "_Item", "_Page", "SEO", "EditorialContent", "_Experience", "_Component",
  ]);
  return (types ?? []).find((t) => !ignore.has(t)) ?? "Content";
}

function TermTree({ nodes }: { nodes: TermNode[] }) {
  const rows = flattenTree(nodes);
  return (
    <ul data-component="TermTree" className="space-y-1 font-mono text-xs">
      {rows.map((node) => (
        <li
          key={node.key}
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: `${node.depth * 20}px` }}
        >
          <span className="text-on-surface-variant opacity-40">
            {node.depth === 0 ? "■" : "└"}
          </span>
          <span className="text-on-surface font-semibold">{node.displayName}</span>
          <span className="text-on-surface-variant opacity-60">{node.key}</span>
          {node.usage && node.usage !== "Public" && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-low text-on-surface-variant">
              {node.usage}
            </span>
          )}
          {node.children.length > 0 && (
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant opacity-50">
              grouping
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function buildHref(active: string[], toggle: string): string {
  const next = active.includes(toggle)
    ? active.filter((c) => c !== toggle)
    : [...active, toggle];
  const params = new URLSearchParams();
  next.forEach((c) => params.append("category", c));
  const str = params.toString();
  return `${str ? `?${str}` : "?"}#browse`;
}

export default async function CategoriesDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const active = sp.category
    ? Array.isArray(sp.category)
      ? sp.category
      : [sp.category]
    : [];

  // The taxonomy is fetched first because the filter has to be expanded through
  // it: content is tagged leaf-only, so selecting "Mortgages" has to match every
  // term beneath it as well.
  const taxonomy = await getTaxonomyTerms();
  const terms = taxonomy.terms;

  const [browse, unfiltered] = await Promise.all([
    graphqlFetch<BrowseResponse>(
      BROWSE_QUERY,
      { limit: 8, categories: active.length ? expandToUris(terms, active) : null },
      { next: { revalidate: CACHE_TTL, tags: ["page"] } }
    ),
    graphqlFetch<BrowseResponse>(
      BROWSE_QUERY,
      { limit: 1, categories: null },
      { next: { revalidate: CACHE_TTL, tags: ["page"] } }
    ),
  ]);

  const tree = buildTermTree(terms);
  const results = browse.data?._Content;
  // Facet counts come from the UNFILTERED result so buckets do not vanish as
  // soon as a filter is applied. Rolling them up through the tree is what lets
  // grouping nodes appear at all: with leaf-only tagging, Graph never returns a
  // bucket for a parent like "Loans and Overdrafts".
  const buckets = unfiltered.data?._Content?.facets?._itemMetadata?.categories ?? [];
  const rows = rollUpCounts(terms, buckets).filter((row) => row.totalCount > 0);
  const hasTaxonomy = terms.length > 0;

  return (
    <>
      <DemoHero
        title="Categories & Taxonomy"
        description={
          <>
            A hierarchical, editor-managed taxonomy that crosses content types. Terms are indexed
            into Graph as{" "}
            <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">_TaxonomyTerm</code>{" "}
            documents, and each content item carries its assignments as URI references on{" "}
            <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">
              _itemMetadata.categories
            </code>
            .
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">
        <section id="why">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Why categories and not a property
            <SectionAnchor id="why" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            This demo still carries the older approach alongside the new one, so you can compare
            them directly. <code className="bg-surface-low px-1 rounded font-mono text-xs">ArticlePage.category</code>{" "}
            is a string enum declared on one content type; the CMS taxonomy is a tree that any
            content type can point at.
          </p>
          <KeyPoints
            points={[
              <>
                <strong>Cross-type.</strong> One category applies to articles, case studies and
                marketing pages alike. A per-type enum needs redeclaring on every type, and its
                facets can never be combined.
              </>,
              <>
                <strong>Editor-managed.</strong> Adding a term is a CMS action in Settings &gt;
                Categories. Adding an enum value is a code change plus an{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">opti:push</code> to
                every instance.
              </>,
              <>
                <strong>Hierarchical.</strong> Terms have parents, so you get browsable paths like
                Product &gt; Savings &gt; ISAs. An enum is flat.
              </>,
              <>
                <strong>No content type change.</strong>{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">categories</code> is
                a built-in property on a content version. There is nothing to declare and nothing
                to push.
              </>,
            ]}
          />
        </section>

        <section id="term-tree">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The term tree
            <SectionAnchor id="term-tree" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Each category is its own document in Graph. There is no nested structure in the index:
            you fetch the flat list and rebuild the tree from{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">parent</code>. Terms
            marked <em>grouping</em> below are not selectable, so an editor can use them to organise
            the picker without anyone being able to tag content with a bare &ldquo;Product&rdquo;.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={TERMS_QUERY_SNIPPET} label="Query the taxonomy" language="graphql" />
            {hasTaxonomy ? (
              <LiveDemoShell label={`${terms.length} terms from your CMS`}>
                <TermTree nodes={tree} />
              </LiveDemoShell>
            ) : (
              <LiveDemoShell label="No taxonomy terms">
                <EmptyTaxonomy />
              </LiveDemoShell>
            )}
          </div>
        </section>

        <section id="on-content">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Categories on content
            <SectionAnchor id="on-content" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The single most common mistake here is reaching for{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata</code>.
            Assignments live on{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_itemMetadata</code>,
            and they are URI strings rather than display names, so a browse UI always needs the
            term documents too.
          </p>
          <CodeBlock code={ON_CONTENT_SNIPPET} label="_itemMetadata.categories" language="graphql" />
        </section>

        <section id="filtering">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Filtering
            <SectionAnchor id="filtering" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Categories accept the standard string filters, so one query covers single-term,
            multi-term and &ldquo;any category at all&rdquo; cases.
          </p>
          <CodeBlock code={FILTER_SNIPPET} label="where clauses" language="graphql" />
        </section>

        <section id="browse">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Cross-type browse with facets
            <SectionAnchor id="browse" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            This runs against{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_Content</code>, not a
            single page type, so one filter returns articles, case studies and marketing pages
            together. Counts come from the unfiltered result so buckets stay visible after you
            narrow, and they are rolled up through the tree, so a parent shows everything beneath
            it. Pick a grouping row like <strong>Borrowing</strong> and you get every mortgage,
            loan and credit card page at once.
          </p>
          <CodeBlock code={FACETS_SNIPPET} label="Facet counts across every type" language="graphql" />

          <div className="mt-6">
            <LiveDemoShell
              label={
                active.length
                  ? `Filtered by: ${active.map((c) => termLabel(terms, c)).join(", ")}`
                  : "All categories - click one to filter"
              }
              action={
                active.length ? (
                  <Link
                    href="?#browse"
                    className="text-xs text-brand/60 hover:text-brand transition-colors"
                  >
                    Clear filters
                  </Link>
                ) : undefined
              }
            >
              {hasTaxonomy && rows.length > 0 ? (
                <div className="grid md:grid-cols-[260px_1fr] gap-6">
                  <nav className="shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                      Category
                    </p>
                    <ul className="space-y-0.5 max-h-[30rem] overflow-y-auto pr-1">
                      {rows.map((row) => {
                        const isActive = active.includes(row.key);
                        // A grouping node cannot be assigned to content, but it
                        // can still be filtered on: the click expands to its
                        // descendants.
                        const isRollUpOnly = row.ownCount === 0;
                        return (
                          <li key={row.key}>
                            <Link
                              href={buildHref(active, row.key)}
                              style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                              className={`flex items-center justify-between pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                                isActive
                                  ? "bg-brand text-on-brand font-semibold"
                                  : "text-on-surface-variant hover:bg-surface-low"
                              }`}
                            >
                              <span className={`truncate ${isRollUpOnly && !isActive ? "opacity-70" : ""}`}>
                                {termLabel(terms, row.key)}
                              </span>
                              <span
                                className={`tabular-nums ml-2 ${
                                  isActive ? "opacity-80" : "opacity-50"
                                }`}
                              >
                                {row.totalCount}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  <div>
                    <p className="text-xs text-on-surface-variant mb-3">
                      {results?.total ?? 0} item{(results?.total ?? 0) === 1 ? "" : "s"} match
                    </p>
                    <ul className="space-y-2 divide-y divide-ghost-border">
                      {(results?.items ?? []).map((item, i) => (
                        <li key={i} className="pt-2 first:pt-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <a
                              href={item._metadata?.url?.default ?? "#"}
                              className="text-sm text-brand hover:underline truncate"
                            >
                              {item._metadata?.displayName ?? "Untitled"}
                            </a>
                            <span className="text-[10px] uppercase tracking-wider font-mono text-on-surface-variant shrink-0">
                              {typeOf(item._metadata?.types)}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1 flex flex-wrap gap-1.5">
                            {(item._itemMetadata?.categories ?? []).map((uri) => (
                              <span
                                key={uri}
                                className="px-1.5 py-0.5 rounded bg-surface-low font-mono text-[10px]"
                              >
                                {termLabel(terms, uri)}
                              </span>
                            ))}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {(results?.items ?? []).length === 0 && (
                      <p className="text-xs text-on-surface-variant italic">
                        No content carries that combination of categories.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyTaxonomy />
              )}
            </LiveDemoShell>
          </div>
        </section>

        <section id="expansion">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Leaf-only tagging and query-time expansion
            <SectionAnchor id="expansion" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Content here is tagged with its <strong>most specific</strong> term only. A page under{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/mortgage/remortgaging/</code>{" "}
            carries <code className="bg-surface-low px-1 rounded font-mono text-xs">remortgaging</code>,
            not also Mortgages, Borrowing and Product. That keeps the stored data honest and the chip
            row on an article short, but it means filtering by a parent has to expand to its
            descendants before it hits Graph. This is the reason{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">parent</code> being in the
            schema matters.
          </p>
          <CodeBlock
            code={EXPANSION_SNIPPET}
            label="Expanding a parent to its descendants"
          />
          <div className="mt-6">
            <KeyPoints
              points={[
                <>
                  <strong>The alternative is denormalizing.</strong> You could tag every page with
                  its whole ancestor chain so a plain{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">eq</code> works and
                  counts roll up natively. That trades clean data and short chip rows for simpler
                  queries. Either is defensible; know which one you picked.
                </>,
                <>
                  <strong>Grouping nodes never appear in facets.</strong> Nothing can be tagged with
                  Borrowing, so Graph returns no bucket for it. The sidebar sums each term with its
                  descendants locally, which is what lets it render a tree instead of a flat list of
                  leaves.
                </>,
                <>
                  <strong>Cash ISA is in the tree but not in the facets.</strong> It is a real,
                  selectable term with no content behind it yet. Facets only return buckets that are
                  in use, so the full taxonomy and the applied taxonomy are not the same list - worth
                  knowing before you build navigation off facet output.
                </>,
              ]}
            />
          </div>
        </section>

        <section id="usage">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Public vs Internal
            <SectionAnchor id="usage" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Every term carries a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">usage</code> flag,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">Public</code> or{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">Internal</code>. It is
            documentation, not access control: Internal terms are indexed into Graph and returned by
            queries exactly like Public ones. Filtering them out of a public-facing navigation is
            the front end&apos;s job. Note that{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">usage</code> is absent
            from the taxonomy write schema, so API-created terms are Public until an editor changes
            them in Settings &gt; Categories.
          </p>
          <CodeBlock
            code={`# Public terms only
query PublicTerms {
  _TaxonomyTerm(where: { _metadata: { usage: { eq: "Public" } } }) {
    items { _metadata { key displayName usage } }
  }
}

# The Editorial Lifecycle branch in this demo (evergreen / needs_review /
# campaign_2026) is what you would mark Internal: useful for editors,
# meaningless to a visitor.`}
            label="Filter by usage"
            language="graphql"
          />
        </section>

        <section id="localization">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Localization has no fallback
            <SectionAnchor id="localization" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            This is the sharpest edge on the feature. Content falls back to the master language;
            taxonomy terms do not. Query an untranslated term in Dutch and you get an en dash, not
            the English name, so any multi-language UI has to implement its own fallback.
          </p>
          <CodeBlock code={LOCALIZATION_SNIPPET} label="Handling the placeholder" />
        </section>

        <section id="rest-api">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Managing terms over REST
            <SectionAnchor id="rest-api" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Terms have their own experimental API, and assignment rides on the normal content API.
            The whole taxonomy in this demo is seeded by{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">
              npm run seed:categories
            </code>
            , which creates the tree parents-first and then tags every page by URL.
          </p>
          <CodeBlock code={REST_API_SNIPPET} label="Taxonomy REST API" language="bash" />
          <div className="mt-6">
            <KeyPoints
              points={[
                <>
                  <strong>Keys cannot contain hyphens.</strong> The pattern is{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">
                    ^[A-Za-z][_0-9A-Za-z]+$
                  </code>
                  , so a slug like{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">
                    personal-finance
                  </code>{" "}
                  is rejected. This demo uses snake_case throughout.
                </>,
                <>
                  <strong>Create parents before children</strong>, and choose the tree carefully: a
                  term&apos;s parent cannot be changed later. Moving one means deleting and
                  recreating it, which drops it from every item already tagged.
                </>,
                <>
                  <strong>Only visible terms are indexed.</strong>{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">
                    isAvailable: false
                  </code>{" "}
                  keeps a term out of Graph entirely, which is how you retire one without deleting
                  the history.
                </>,
                <>
                  <strong>Assignment is version-scoped.</strong> Categories belong to a content
                  version, so they follow the normal draft-then-publish flow and a published version
                  cannot be patched directly.
                </>,
              ]}
            />
          </div>
        </section>

        <SourcePanel
          files={[
            { label: "taxonomy.ts", path: "src/lib/taxonomy.ts", content: taxonomyLibTs },
            {
              label: "GetTaxonomyTerms.ts",
              path: "src/lib/graphql/queries/GetTaxonomyTerms.ts",
              content: taxonomyQueryTs,
            },
            { label: "_taxonomy.ts", path: "scripts/_taxonomy.ts", content: taxonomyClientTs },
            {
              label: "taxonomy-tree.ts",
              path: "scripts/taxonomy-tree.ts",
              content: taxonomyTreeTs,
            },
            {
              label: "seed-categories.ts",
              path: "scripts/seed-categories.ts",
              content: seedCategoriesTs,
            },
          ]}
        />
      </div>
    </>
  );
}

function EmptyTaxonomy() {
  return (
    <div className="text-xs text-on-surface-variant space-y-2">
      <p className="italic">No taxonomy terms found on this instance.</p>
      <p>
        Run <code className="bg-surface-low px-1 rounded font-mono">npm run seed:categories</code> to
        create the tree and tag content, then wait ~60s for Graph to index it.
      </p>
    </div>
  );
}

interface BrowseResponse {
  _Content?: {
    total?: number | null;
    items?: Array<{
      _metadata?: {
        displayName?: string | null;
        types?: string[] | null;
        url?: { default?: string | null } | null;
      } | null;
      _itemMetadata?: { categories?: string[] | null } | null;
    }> | null;
    facets?: {
      _itemMetadata?: {
        categories?: Array<{ name: string; count: number }> | null;
      } | null;
    } | null;
  } | null;
}
