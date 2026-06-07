import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Listing & Pagination",
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

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-ghost-border">
      {label && (
        <div className="bg-surface-low border-b border-ghost-border px-4 py-2">
          <span className="text-xs font-mono text-on-surface-variant">{label}</span>
        </div>
      )}
      <pre className="bg-surface-lowest p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionAnchor({ id, label }: { id: string; label: string }) {
  return (
    <a href={`#${id}`} className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">
      {label}
    </a>
  );
}

export default function ListingDemoPage() {
  return (
    <div className="min-h-screen bg-surface">

      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Content Listing &amp; Pagination
          </h1>
          <p className="text-on-brand opacity-80 max-w-2xl text-lg leading-relaxed">
            How to build a paginated article list - or any index page - using Graph cursor
            pagination, date sorting, and <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">where</code> filtering.
          </p>
        </div>
      </section>

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
            <code className="bg-surface-low px-1 rounded font-mono text-xs">summary</code>.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={LIST_QUERY_SNIPPET} label="List query - metadata + summary only" />
            <CodeBlock code={METADATA_FIELDS_SNIPPET} label="_metadata - available on every type" />
          </div>
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

        <section id="pagination">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Cursor pagination
            <SectionAnchor id="pagination" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Graph returns a <code className="bg-surface-low px-1 rounded font-mono text-xs">cursor</code>{" "}
            string alongside every result set. Pass it back on the next request to get the next page.
            Unlike offset-based pagination, cursors are stable even if new items are published between
            requests - the pointer into the result set doesn&apos;t shift.
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

        <section id="key-points" className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
          <h2 className="font-display text-lg font-bold text-on-surface mb-4">
            Key Things to Know
            <a href="#key-points" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            {[
              <><strong className="text-on-surface">List queries should fetch only metadata + summary fields.</strong> Avoid fetching composition, content areas, or block fragments - that data is for detail pages, not list cards.</>,
              <><strong className="text-on-surface">Use the specific content type, not _Content,</strong> when you need custom fields (summary, category, heroImage). _Content only exposes base _metadata fields.</>,
              <><strong className="text-on-surface">Cursor pagination is stable under concurrent publishes.</strong> Offset pagination re-numbers rows when new items are inserted - users on page 2 can see duplicates or miss items.</>,
              <><strong className="text-on-surface">cursor: null means there are no more pages.</strong> Always check before rendering a "Load more" or "Next page" control.</>,
              <><strong className="text-on-surface">Pre-render page 1 with generateStaticParams; leave pages 2+ on-demand.</strong> This gives the most-visited page zero TTFB without pre-building every paginated offset at deploy time.</>,
              <><strong className="text-on-surface">_metadata.published is the canonical sort key for recency.</strong> It reflects the last publish date, not the creation date - republishing updates it, which is the right behaviour for editors who update old articles.</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand font-bold shrink-0">→</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}
