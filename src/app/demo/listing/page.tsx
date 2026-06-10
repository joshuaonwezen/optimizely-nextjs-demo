import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, type ArticleListItem, type ArticleFacetBucket, type ArticleListResult } from "@/lib/graphql/queries/GetArticles";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import LiveDemoShell from "@/components/demo/LiveDemoShell";
import KeyPoints from "@/components/demo/KeyPoints";

export const metadata: Metadata = {
  title: "Content Listing & Discovery",
};

const CATEGORY_LABELS: Record<string, string> = {
  "personal-finance": "Personal Finance",
  "business-banking": "Business Banking",
  "investments": "Investments",
  "market-insights": "Market Insights",
};

const LIST_QUERY_SNIPPET = `# A list query fetches only the metadata fields needed for a list view -
# displayName, published date, and URL. No per-page content is fetched.
# This keeps list-page responses small regardless of how much body copy
# each article contains.

query GetArticles($limit: Int) {
  ArticlePage(
    limit: $limit
    orderBy: { _metadata: { published: DESC } }
    where: { _metadata: { url: { default: { exist: true } } } }
  ) {
    total
    cursor
    items {
      _metadata {
        displayName    # page title
        published      # ISO 8601 date
        url { default }
      }
      summary          # short description field on ArticlePage
      heroImage {
        _metadata { url { default } }
      }
    }
  }
}`;

const WHERE_SNIPPET = `# Combine multiple where conditions to filter the list.
# All conditions are ANDed together.

query GetRecentArticles($since: DateTime!, $tag: String) {
  ArticlePage(
    limit: 12
    orderBy: { _metadata: { published: DESC } }
    where: {
      _metadata: {
        published:  { gte: $since }                # published after this date
        url:        { default: { exist: true } }   # must have a public URL
      }
      # Filter by a tag/category stored on the content type:
      # category: { eq: $tag }
    }
  ) {
    total
    cursor
    items { _metadata { displayName published url { default } } summary }
  }
}

# Sort by displayName alphabetically instead of date:
orderBy: { _metadata: { displayName: ASC } }

# _Page includes ALL page types (ArticlePage, LandingPage, BlogPage…):
query GetAllPages {
  _Page(
    limit: 20
    orderBy: { _metadata: { published: DESC } }
  ) { total cursor items { _metadata { __typename displayName url { default } } } }
}`;

const CURSOR_SNIPPET = `# Cursor pagination - Graph returns an opaque cursor string.
# Pass it back on the next request to get the next page.
# Cursors remain valid even if new content is published between requests.

const PAGE_SIZE = 12;

// Page 1 - no cursor
const res1 = await graphqlFetch(GET_ARTICLES_QUERY, { limit: PAGE_SIZE });
const { items, cursor, total } = res1.data.ArticlePage;
// cursor = "eyJza2lwIjoxMn0="  (opaque - never parse it)

// Page 2 - add cursor to the query variable
const GET_ARTICLES_WITH_CURSOR = \`
  query GetArticles($limit: Int, $cursor: String) {
    ArticlePage(limit: $limit, cursor: $cursor, ...) {
      total
      cursor     # ← cursor for the NEXT page after this one
      items { ... }
    }
  }
\`;

const res2 = await graphqlFetch(GET_ARTICLES_WITH_CURSOR, {
  limit: PAGE_SIZE,
  cursor: cursor,   // ← cursor from page 1 response
});`;

const OFFSET_COMPARISON_SNIPPET = `# Why NOT offset pagination with Graph

# ❌ Offset (skip) - fragile under concurrent writes
# If 3 articles are published between page 1 and page 2 requests,
# skip: 12 will repeat 3 items already shown (or skip 3 unseen items).
query GetArticlesOffset($skip: Int) {
  ArticlePage(limit: 12) {  # Graph doesn't expose a native skip param
    items { ... }            # you'd have to slice results in app code
  }
}

# ✅ Cursor - stable pointer into the result set
# New publishes don't affect the cursor position - next page is always
# relative to the last item you saw, not an absolute row number.
query GetArticlesCursor($cursor: String) {
  ArticlePage(limit: 12, cursor: $cursor) {
    cursor   # the next page cursor - null when there are no more pages
    items { ... }
  }
}`;

const STATIC_PARAMS_SNIPPET = `// src/app/articles/page/[page]/page.tsx
//
// Option A - ISG: pre-render page 1; render subsequent pages on demand.
// Pages 2+ are generated on first request and cached as ISR.

export async function generateStaticParams() {
  return [{ page: "1" }];   // only page 1 pre-rendered at build time
}

export const revalidate = 60;   // ISR - stale-while-revalidate

export default async function ArticleListPage({ params }) {
  const pageNum = parseInt(params.page, 10) || 1;
  const cursor  = await getCursorForPage(pageNum, PAGE_SIZE);

  const res = await graphqlFetch(GET_ARTICLES_QUERY, { cursor, limit: PAGE_SIZE });
  return <ArticleList items={res.data.ArticlePage.items} />;
}

// Option B - force-dynamic: always serve fresh results.
// Use this when editors publish frequently and staleness matters.
export const dynamic = "force-dynamic";`;

const METADATA_FIELDS_SNIPPET = `// _metadata fields are available on every content type - no fragment needed.
// They are the minimum data required to render a list item without fetching full content.

type ListItem = {
  _metadata: {
    displayName: string;      // page title (always set)
    published:   string;      // ISO 8601 - use for sort order and "Published on" labels
    url: { default: string }; // the canonical public URL - href for the link
    __typename: string;       // "ArticlePage", "LandingPage", etc. - use for type badges
    locale: string;           // "en", "fr" - use when serving multi-locale lists
  };
  // plus whatever custom fields you include in your query (summary, heroImage, etc.)
};`;

const FACETS_QUERY_SNIPPET = `# Add a facets block alongside items to get per-field value counts.
# Facets are computed over the same result set the where clause produces,
# so counts always reflect the filtered view - not the full index.

query GetArticlesWithFacets($tag: [String], $since: DateTime) {
  ArticlePage(
    limit: 12
    orderBy: { _metadata: { published: DESC } }
    where: {
      category:  { in: $tag }                              # apply active filter
      _metadata: { published: { gte: $since } }
    }
  ) {
    total
    cursor
    items {
      _metadata { displayName published url { default } }
      summary
      category
    }
    facets {
      category {          # one bucket per unique value in "category"
        name              # the field value, e.g. "Mortgages"
        count             # how many items have this value given current filters
      }
      _metadata {
        published(        # date histogram - group by month
          unit: MONTH
          value: 10       # return up to 10 buckets
        ) {
          name            # human-readable label, e.g. "May 2025"
          count
          from            # ISO date for the bucket start (use as the $since value)
          to
        }
      }
    }
  }
}`;

const FACETS_FILTER_SNIPPET = `// Typical pattern: facet selection lives in URL search params so
// the list page is shareable and server-rendered.
//
// src/app/articles/page.tsx

type SearchParams = { category?: string | string[]; since?: string };

export default async function ArticleListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // Normalize multi-value param: ?category=Mortgages&category=Savings
  const tags = sp.category
    ? Array.isArray(sp.category) ? sp.category : [sp.category]
    : undefined;

  const since = sp.since ?? undefined;

  const res = await graphqlFetch(GET_ARTICLES_FACETS_QUERY, {
    tag: tags,
    since,
    limit: 12,
  });

  const { items, facets, total } = res.data.ArticlePage;

  return (
    <div className="grid grid-cols-[240px_1fr] gap-8">
      <FacetSidebar facets={facets} activeTag={tags} activeSince={since} />
      <ArticleGrid items={items} total={total} />
    </div>
  );
}`;

const FACETS_SIDEBAR_SNIPPET = `// Facet sidebar - each bucket is a link that sets (or clears) a search param.
// Using <Link> keeps this a server component with no useState.

function FacetSidebar({ facets, activeTag, activeSince }) {
  return (
    <nav>
      <h3>Category</h3>
      <ul>
        {facets.category.map(({ name, count }) => {
          const isActive = activeTag?.includes(name);
          const href = isActive
            ? buildUrl({ category: activeTag.filter(t => t !== name) })  // remove
            : buildUrl({ category: [...(activeTag ?? []), name] });       // add
          return (
            <li key={name}>
              <Link href={href} aria-current={isActive ? "true" : undefined}>
                {name} ({count})
              </Link>
            </li>
          );
        })}
      </ul>

      <h3>Published</h3>
      <ul>
        {facets._metadata.published.map(({ name, count, from }) => {
          const isActive = activeSince === from;
          const href = isActive
            ? buildUrl({ since: undefined })    // clear date filter
            : buildUrl({ since: from });         // set date filter
          return (
            <li key={from}>
              <Link href={href} aria-current={isActive ? "true" : undefined}>
                {name} ({count})
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}`;


function ArticleCard({ item }: { item: ArticleListItem }) {
  const url = item._metadata?.url?.default ?? "#";
  const categoryLabel = CATEGORY_LABELS[item.category ?? ""] ?? item.category;
  const date = item._metadata?.published
    ? new Date(item._metadata.published).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
    : null;
  return (
    <a
      href={url}
      className="block bg-surface-lowest border border-ghost-border rounded-2xl p-5 hover:border-brand/40 transition-colors"
    >
      {categoryLabel && (
        <span className="text-xs font-semibold text-brand mb-2 block">{categoryLabel}</span>
      )}
      <p className="font-display text-sm font-bold text-on-surface mb-2 line-clamp-2 leading-snug">
        {item.title ?? "Untitled"}
      </p>
      {item.summary && (
        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{item.summary}</p>
      )}
      {date && (
        <p className="text-xs text-on-surface-variant mt-3 opacity-60">{date}</p>
      )}
    </a>
  );
}

function buildFacetHref(
  active: string[],
  toggle: string,
  cursor: string | null = null
): string {
  const next = active.includes(toggle)
    ? active.filter(c => c !== toggle)
    : [...active, toggle];
  const params = new URLSearchParams();
  next.forEach(c => params.append("category", c));
  if (cursor) params.set("cursor", cursor);
  const str = params.toString();
  return `${str ? `?${str}` : "?"}#facets-demo`;
}

function FacetSidebarLive({
  facets,
  activeCategories,
}: {
  facets: ArticleListResult["facets"];
  activeCategories: string[];
}) {
  if (facets.category.length === 0) return null;
  return (
    <nav className="shrink-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">Category</p>
      <ul className="space-y-1">
        {facets.category.map(({ name, count }: ArticleFacetBucket) => {
          const isActive = activeCategories.includes(name);
          const href = buildFacetHref(activeCategories, name);
          return (
            <li key={name}>
              <Link
                href={href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  isActive
                    ? "bg-brand text-on-brand font-semibold"
                    : "text-on-surface-variant hover:bg-surface-low"
                }`}
              >
                <span>{CATEGORY_LABELS[name] ?? name}</span>
                <span className={`tabular-nums ${isActive ? "opacity-80" : "opacity-50"}`}>{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PaginationBar({
  total,
  shown,
  nextCursor,
  activeCursor,
  activeCategories,
}: {
  total: number;
  shown: number;
  nextCursor: string | null;
  activeCursor: string | null;
  activeCategories: string[];
}) {
  const catParams = new URLSearchParams();
  activeCategories.forEach(c => catParams.append("category", c));

  const prevHref = `${catParams.toString() ? `?${catParams.toString()}` : "?"}#facets-demo`;

  const nextParams = new URLSearchParams(catParams);
  if (nextCursor) nextParams.set("cursor", nextCursor);
  const nextHref = `?${nextParams.toString()}#facets-demo`;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-ghost-border">
      <p className="text-xs text-on-surface-variant">
        Showing <span className="font-semibold text-on-surface">{shown}</span> of{" "}
        <span className="font-semibold text-on-surface">{total}</span>
      </p>
      <div className="flex gap-2">
        {activeCursor && (
          <Link
            href={prevHref}
            className="text-xs px-3 py-1.5 rounded-lg border border-ghost-border text-on-surface-variant hover:bg-surface-low transition-colors"
          >
            First page
          </Link>
        )}
        {nextCursor && (
          <Link
            href={nextHref}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand text-on-brand hover:opacity-90 transition-opacity"
          >
            Next page
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-ghost-border bg-surface-lowest p-8 text-center">
      <p className="text-sm text-on-surface-variant">No articles found in your CMS.</p>
      <p className="text-xs text-on-surface-variant mt-1 opacity-60">
        Run the seed script to create sample content.
      </p>
    </div>
  );
}

export default async function ListingDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const activeCategories = sp.category
    ? Array.isArray(sp.category) ? sp.category : [sp.category]
    : [];
  const activeCursor = typeof sp.cursor === "string" ? sp.cursor : null;

  const [listResult, facetsResult] = await Promise.all([
    getArticles({ limit: 6 }),
    getArticles({ limit: 6, cursor: activeCursor, category: activeCategories.length ? activeCategories : null }),
  ]);

  const clearHref = `?#facets-demo`;

  return (
    <>
      <DemoHero
        title="Content Listing & Discovery"
        description={<>How to build article lists, filtered index pages, and faceted browsing interfaces
            using Graph queries, cursor pagination,{" "}
            <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">where</code> conditions,
            and facet aggregations.</>}
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="list-query">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The list query - metadata only
            <SectionAnchor id="list-query" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A list query fetches only the fields needed to render a card or row - title, date, URL, and
            a short summary. No composition, no block fragments, no content areas. This keeps the response
            small and the query predictable regardless of how much body copy each article has. Use the
            specific content type (
            <code className="bg-surface-low px-1 rounded font-mono text-xs">ArticlePage</code>) instead of{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_Content</code> so Graph
            can expose that type&apos;s own custom fields like{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">summary</code>.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={LIST_QUERY_SNIPPET} label="List query - metadata + summary only" />
            <CodeBlock code={METADATA_FIELDS_SNIPPET} label="_metadata - available on every type" />
          </div>

          {listResult.fromCms ? (
            <LiveDemoShell label={`${listResult.total} articles from your CMS - most recent 6`}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listResult.items.map((item, i) => (
                  <ArticleCard key={i} item={item} />
                ))}
              </div>
            </LiveDemoShell>
          ) : (
            <LiveDemoShell label="No CMS data">
              <EmptyState />
            </LiveDemoShell>
          )}
        </section>

        <section id="sorting-filtering">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Sorting and filtering
            <SectionAnchor id="sorting-filtering" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">orderBy</code> takes any
            indexed field. Date-descending is the most common for blogs and news. Filtering with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">where</code> narrows by
            metadata (date range, URL existence) or by content type fields (category, tag, author). All{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">where</code> conditions are
            ANDed together.
          </p>
          <CodeBlock code={WHERE_SNIPPET} label="Filtering by date, type, and sorting" />
        </section>

        <section id="facets">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Faceted filtering
            <SectionAnchor id="facets" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Facets let Graph count how many items match each field value within the current filtered
            result set. Request a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">facets</code> block
            alongside your{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">items</code> block in the
            same query - no extra round trip needed. The counts automatically reflect any active{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">where</code> filters, so
            the sidebar always shows how many results each option would produce given the current
            selection. For dates, Graph can produce a histogram bucketed by day, week, month, or year.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <CodeBlock code={FACETS_QUERY_SNIPPET} label="GraphQL query with category and date facets" />
            <CodeBlock code={FACETS_SIDEBAR_SNIPPET} label="Facet sidebar - Link-based, no useState" />
          </div>
          <CodeBlock code={FACETS_FILTER_SNIPPET} label="Page component - facets + list in one query, filters via searchParams" />

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {[
              {
                label: "String facets (category, tag, author)",
                desc: "Each unique string value becomes a bucket. Counts reflect the current where clause - selecting a second tag shows only items that have both.",
              },
              {
                label: "Date histogram facets",
                desc: "Pass unit (DAY / WEEK / MONTH / YEAR) and value (max buckets). The from field on each bucket is the ISO date you pass back as $since to activate that filter.",
              },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div id="facets-demo">
            <LiveDemoShell
              label={
                activeCategories.length
                  ? `Filtered by: ${activeCategories.map(c => CATEGORY_LABELS[c] ?? c).join(", ")}`
                  : "All categories - click a category to filter"
              }
              action={
                activeCategories.length ? (
                  <Link href={clearHref} className="text-xs text-brand/60 hover:text-brand transition-colors">
                    Clear filters
                  </Link>
                ) : undefined
              }
            >
              {facetsResult.fromCms || listResult.fromCms ? (
                <div className="grid md:grid-cols-[180px_1fr] gap-6">
                  <FacetSidebarLive
                    facets={listResult.facets}
                    activeCategories={activeCategories}
                  />
                  <div>
                    {facetsResult.items.length > 0 ? (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4 mb-4">
                          {facetsResult.items.map((item, i) => (
                            <ArticleCard key={i} item={item} />
                          ))}
                        </div>
                        <PaginationBar
                          total={facetsResult.total}
                          shown={facetsResult.items.length}
                          nextCursor={facetsResult.nextCursor}
                          activeCursor={activeCursor}
                          activeCategories={activeCategories}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-on-surface-variant py-4">
                        No articles match the current filters.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState />
              )}
            </LiveDemoShell>
          </div>
        </section>

        <section id="pagination">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Cursor pagination
            <SectionAnchor id="pagination" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Graph returns a <code className="bg-surface-low px-1 rounded font-mono text-xs">cursor</code>{" "}
            string alongside every result set. Pass it back on the next request to get the next page.
            Unlike offset-based pagination, cursors are stable even if new items are published between
            requests - the pointer into the result set doesn&apos;t shift. The{" "}
            <a href="#facets-demo" className="text-brand hover:opacity-80 underline underline-offset-2">live demo above</a>{" "}
            uses cursor pagination - the Next page button passes the cursor back in the URL.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={CURSOR_SNIPPET} label="Consuming cursor pagination in server components" />
            <CodeBlock code={OFFSET_COMPARISON_SNIPPET} label="Why cursor is better than offset" />
          </div>
        </section>

        <section id="static-params">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            ISG vs. force-dynamic for list pages
            <SectionAnchor id="static-params" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            List pages can be statically generated (ISR), rendered on demand (force-dynamic), or a
            hybrid: pre-render page 1 at build time and render subsequent pages on first request.{" "}
            <strong>ISR</strong> is ideal when the list changes infrequently - first page is pre-built,
            all visitors share the cache. <strong>force-dynamic</strong> is right when editors publish
            frequently and showing stale results for even 60s is unacceptable (e.g. a breaking-news feed).
          </p>
          <CodeBlock code={STATIC_PARAMS_SNIPPET} label="generateStaticParams + ISR for paginated list pages" />

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              {
                label: "generateStaticParams + revalidate",
                desc: "Page 1 pre-rendered at build. Pages 2+ rendered on first request, then ISR-cached. Lowest TTFB for popular pages.",
                when: "Blog, documentation, product catalogue",
              },
              {
                label: "force-dynamic",
                desc: "List re-fetched on every request. Always shows the latest publish. Higher TTFB.",
                when: "News feeds, real-time dashboards",
              },
              {
                label: "Server action / client fetch",
                desc: "Page shell is static; list data is loaded by the client after hydration. Progressive enhancement.",
                when: "Search results, filtered lists with user-driven criteria",
              },
            ].map(({ label, desc, when }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">{desc}</p>
                <p className="text-xs text-on-surface-variant">
                  <span className="font-medium">Best for: </span>{when}
                </p>
              </div>
            ))}
          </div>
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">List queries should fetch only metadata + summary fields.</strong> Avoid fetching composition, content areas, or block fragments - that data is for detail pages, not list cards.</>,
          <><strong className="text-on-surface">Use the specific content type, not _Content,</strong> when you need custom fields (summary, category, heroImage). _Content only exposes base _metadata fields.</>,
          <><strong className="text-on-surface">Cursor pagination is stable under concurrent publishes.</strong> Offset pagination re-numbers rows when new items are inserted - users on page 2 can see duplicates or miss items.</>,
          <><strong className="text-on-surface">cursor: null means there are no more pages.</strong> Always check before rendering a "Load more" or "Next page" control.</>,
          <><strong className="text-on-surface">Pre-render page 1 with generateStaticParams; leave pages 2+ on-demand.</strong> This gives the most-visited page zero TTFB without pre-building every paginated offset at deploy time.</>,
          <><strong className="text-on-surface">_metadata.published is the canonical sort key for recency.</strong> It reflects the last publish date, not the creation date - republishing updates it, which is the right behaviour for editors who update old articles.</>,
          <><strong className="text-on-surface">Facet counts are scoped to the active where clause.</strong> If a user has filtered by category, the date histogram counts only articles in that category - not the whole index. Request facets in the same query as items so you pay one round trip.</>,
        ]} />

      </div>
    </>
  );
}
