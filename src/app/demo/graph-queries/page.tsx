import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const navQueryTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetNavigation.ts"),
  "utf8"
);
const faqContainerTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/FaqContainerBlock/index.tsx"),
  "utf8"
);
const teamGridTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/TeamGridBlock/index.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Graph Query Design",
};


const SDK_PAGE_QUERY_SNIPPET = `# What getContentByPath() sends to Optimizely Graph
# The CMS SDK builds this automatically from your registered components.
# ~32 block types → one request → all page data arrives in one response.

query GetPage($url: String!, $variation: VariationInput) {
  _Content(
    where: { _metadata: { url: { default: { eq: $url } } } }
    variation: $variation
    limit: 10
  ) {
    items {
      __typename
      _metadata { key version url { default } variation }
      ... on DynamicExperience {
        composition {
          ... on CompositionStructureNode {
            nodes {
              ... on CompositionElementNode {
                element {
                  ... on HeroBlock {
                    headline subheadline ctaText ctaLink
                    backgroundImage { _metadata { url { default } } }
                  }
                  ... on RichTextBlock  { body { json } }
                  ... on ProductCardBlock { title description linkUrl { default } }
                  ... on TestimonialBlock { quote authorName authorRole }
                  # ... + 28 more registered block types
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const NAIVE_PAGE_SNIPPET = `// ❌ The naive approach: one fetch per block
// Even a simple page with 8 blocks fires 9 sequential requests.

async function CmsPage({ url }) {
  const page     = await graphqlFetch(PAGE_QUERY, { url });
  const hero     = await graphqlFetch(HERO_QUERY, { key: page.heroKey });
  const richText = await graphqlFetch(TEXT_QUERY, { key: page.textKey });
  const products = await graphqlFetch(CARD_QUERY, { key: page.cardKey });
  // ...

  return <Page hero={hero} text={richText} products={products} />;
}

// ✅ What getContentByPath() does instead:
// All block types registered → SDK generates one query with union spreads →
// single Graph request → all data in one response. No per-block round-trips.`;

const RECURSIVE_SNIPPET = `# src/lib/graphql/queries/GetNavigation.ts
#
# @recursive tells Graph to apply this fragment to the 'children' content
# area field at every nesting level, up to the given depth.
# depth: 5 → Root → L1 → L2 → L3 → L4 → L5 in one single round-trip.

fragment NavItemFields on _IContent {
  ... on NavigationItem {
    __typename
    _metadata { key }
    label
    href { url { default } }
    description
    openInNewTab
    children @recursive(depth: 5)   # ← Optimizely Graph extension
  }
}

query GetNavigation {
  Navigation(limit: 1) {
    items {
      name
      navItems { ...NavItemFields }
    }
  }
}`;

const NAIVE_RECURSIVE_SNIPPET = `# Without @recursive - depth is hardcoded and the query grows fast.
# This handles 3 levels; adding a 4th means editing the query string.

fragment NavItemFields on _IContent {
  ... on NavigationItem {
    label
    href { url { default } }
    children {
      ... on NavigationItem {
        label
        href { url { default } }
        children {
          ... on NavigationItem {
            label
            href { url { default } }
            # Want level 4? Add another nesting block here.
          }
        }
      }
    }
  }
}`;

const LAYOUT_SPLIT_SNIPPET = `// src/app/layout.tsx - these components self-fetch with ISR.
// They are NOT inside the force-dynamic page route, so their fetches
// are cached independently by Next.js and by Graph CDN.

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GlobalBanner />      {/* graphqlFetch, revalidate: 60  → cached */}
        <NavigationHeader />  {/* graphqlFetch, revalidate: 300 → cached */}
        <main>{children}</main>
        <Footer />            {/* static - no fetch */}
      </body>
    </html>
  );
}

// src/app/[[...slug]]/page.tsx
export const dynamic = "force-dynamic"; // page re-executes on every request

async function CmsPage() {
  // FX decisions are per-visitor → must be fresh
  const user = await getOptimizelyUser();
  const decisions = user.decideAll();

  // Graph CDN bypass → always-fresh personalised content
  const [page] = await client.getContentByPath(url, { ...variation, cache: false });
  return <OptimizelyComponent content={page} />;
}

// layout components are NOT affected by force-dynamic on the page -
// they run in their own render scope with their own cached fetches.`;

const CONTENT_AREA_SNIPPET = `# type: "array" content area → Graph inline-expands all items.
# FaqContainerBlock.faqItems is type: "array", so its children arrive in
# the page response with full typed fields - no extra fetch needed.

... on FaqContainerBlock {
  heading
  subheading
  faqItems {
    __typename
    ... on FaqItemBlock {
      question   # ← full field data, inline-expanded by Graph
      answer
    }
  }
}`;

const SINGLE_REF_SNIPPET = `# type: "content" single reference → Graph returns metadata only.
# TraditionalPage.featuredBlock is type: "content" (a single reference).
# Graph never inline-expands it - you only get the key and URL back.

... on TraditionalPage {
  headline
  featuredBlock {
    __typename
    _metadata { key url { default } version }
    # No typed fields here - Graph doesn't resolve the reference inline.
    # The component must self-fetch using the key.
  }
}`;

const SELF_FETCH_SNIPPET = `// src/components/blocks/FaqContainerBlock/index.tsx
// FaqContainerBlock placed as a single reference on TraditionalPage
// receives only { __typename, _metadata } from the page query.
// The guard clause detects this and fetches the real data from Graph.

export default async function FaqContainerBlock(props) {
  let data = props.content ?? props;

  if (!data.heading) {
    // Self-fetch: data arrived as a generic reference, not inline-expanded.
    const res = await graphqlFetch(FETCH_QUERY, {}, { next: { revalidate: 60 } });
    data = res.data?.FaqContainerBlock?.items?.[0] ?? data;
  }

  return <div>...</div>;
}`;

const BATCH_KEY_SNIPPET = `// src/components/blocks/TeamGridBlock/index.tsx
// The page query returns TeamGridBlock.members as an array of reference keys.
// One batch query fetches all full member records - not one-per-key.

const MEMBERS_BY_KEYS_QUERY = \`
  query TeamMembersByKeys($keys: [String!]) {
    TeamMemberBlock(where: { _metadata: { key: { in: $keys } } }) {
      items { ...TeamMemberBlockData }
    }
  }
  \${TEAM_MEMBER_FRAGMENT}
\`;

async function loadMembers(keys: string[]): Promise<MemberData[]> {
  if (keys.length === 0) return [];
  const res = await graphqlFetch(MEMBERS_BY_KEYS_QUERY, { keys }, { next: { revalidate: 300 } });
  const items = res.data?.TeamMemberBlock?.items ?? [];

  // Map results back by key to preserve original display order.
  const byKey = new Map(items.map((i) => [i._metadata?.key, i]));
  return keys.map((k) => byKey.get(k)).filter(Boolean);
}`;

const NAIVE_LOOP_SNIPPET = `// ❌ Naive: N queries for N members - sequential, uncacheable per request.
// 10 team members → 10 round-trips. Each fires independently,
// each has its own cache entry keyed by a single member key.

async function loadMembers(keys: string[]) {
  return Promise.all(
    keys.map((key) =>
      graphqlFetch(MEMBER_BY_KEY_QUERY, { key }, { next: { revalidate: 300 } })
    )
  );
}`;

const PREDICTABLE_SNIPPET = `// Graph CDN caches by (query string + variables).
// Static element queries are always identical → perfect cache hit rate.

// ✅ Navigation - same query, no variables → one CDN entry, shared by all visitors.
graphqlFetch(GET_NAVIGATION_QUERY, {}, { next: { revalidate: 300 } });

// ✅ Variation filter - structure is fixed; only value[] changes.
// Finite combinations ([], ["personal"], ["business"]) → Graph CDN caches each.
getContentByPath(url, {
  variation: { include: "SOME", value: activeVariations, includeOriginal: true },
});

// ❌ Anti-pattern: per-visitor data inside variables → every request is unique.
// Graph CDN can never cache this; every request hits the Graph backend.
graphqlFetch(PAGE_QUERY, {
  userId:    visitor.id,       // unique per visitor - cache miss every time
  sessionId: req.sessionId,    // random - makes CDN useless
});

// On the CMS page route, cache: false bypasses Graph CDN intentionally -
// the content is personalised and must be fresh on every request.
getContentByPath(url, { ...variationFilter, cache: false });`;

const DISABLED_FIELD_SNIPPET = `// src/components/blocks/TestimonialBlock/index.tsx
// authorImage is declared with indexingType: "disabled".
// Graph does not index this field - querying it always returns null.

export const TestimonialBlockType = contentType({
  key: "TestimonialBlock",
  properties: {
    quote:       { type: "string" },
    authorName:  { type: "string" },
    authorRole:  { type: "string" },
    authorImage: { type: "contentReference", indexingType: "disabled" },
    //                                        ↑ excluded from Graph's index
  },
});

// getClient().getContent() fetches via Graph - authorImage will always be null.
// The value only exists in composition snapshots (when the block is placed
// inline in Visual Builder). Do not try to render it from a self-fetched item.
const testimonial = await getClient().getContent({ key });
// testimonial.authorImage → null`;


export default function GraphQueriesDemoPage() {
  return (
    <>
      <DemoHero
        title="Graph Query Design"
        description="How this project talks to Optimizely Graph - the patterns that keep queries fast, cacheable, and free of N+1 problems."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* ── SDK page query ── */}
        <section id="sdk-query">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            One request, all blocks - the SDK page query
            <SectionAnchor id="sdk-query" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getContentByPath()</code> issues
            a single GraphQL request to Optimizely Graph. The CMS SDK looks at every component registered
            in <code className="bg-surface-low px-1 rounded font-mono text-xs">componentRegistry.ts</code> and
            generates an inline{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">{"... on BlockType { <fields> }"}</code>{" "}
            spread for each one. This project registers ~32 block and page types - all their data arrives in one
            response with no per-block round-trips.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">SDK-generated (one request)</p>
              <CodeBlock code={SDK_PAGE_QUERY_SNIPPET} label="Theoretical GraphQL - generated by the SDK" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Naive alternative (N+1)</p>
              <CodeBlock code={NAIVE_PAGE_SNIPPET} label="Anti-pattern - one fetch per block" />
            </div>
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
            <h3 className="font-display font-semibold text-on-surface mb-3">When to write custom queries</h3>
            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
              The SDK page query covers registered page content. Three situations require custom{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch</code> calls:
            </p>
            <div className="space-y-3">
              {[
                {
                  label: "Non-page data",
                  desc: "Navigation trees, site banners, quote lists - data that exists independently of any page. These live in src/lib/graphql/queries/ and are called from layout components.",
                },
                {
                  label: "Self-fetching components",
                  desc: "Blocks placed as single content references (not content area items) are not inline-expanded by the SDK. They detect missing data and self-fetch with a guard clause.",
                },
                {
                  label: "Batch reference resolution",
                  desc: "Blocks that receive only reference keys from the page query (TeamGridBlock, TimelineBlock) batch all keys into a single { in: $keys } query to fetch full data.",
                },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-3">
                  <span className="text-brand font-bold shrink-0">→</span>
                  <div>
                    <span className="text-sm font-semibold text-on-surface">{label} - </span>
                    <span className="text-sm text-on-surface-variant">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant mt-4 pt-4 border-t border-ghost-border">
              Always use the{" "}
              <code className="bg-surface-low px-1 rounded font-mono">graphqlFetch</code> wrapper from{" "}
              <code className="bg-surface-low px-1 rounded font-mono">src/lib/optimizely/client.ts</code> - it
              handles published vs. preview auth and ISR config automatically. Export query strings as named
              constants, not anonymous inline literals - stable strings benefit from Graph CDN caching (see below).
            </p>
          </div>
        </section>

        {/* ── Static vs dynamic ── */}
        <section id="static-dynamic">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Static elements vs. dynamic content - don&apos;t pay twice
            <SectionAnchor id="static-dynamic" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The root layout renders{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">GlobalBanner</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">NavigationHeader</code>. These
            self-fetch with ISR. The CMS page route exports{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">force-dynamic</code> - but that
            only forces the page component to re-execute on every request. It does not affect the layout
            components&apos; fetches, which continue to use ISR and be served from Next.js data cache and
            Graph CDN. A visitor on any page pays nothing extra for nav and banner data after the first
            request in the cache window.
          </p>

          <CodeBlock code={LAYOUT_SPLIT_SNIPPET} label="Layout separation - static ISR vs force-dynamic page" />

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              { label: "GlobalBanner", cache: "revalidate: 60", tag: "banner", note: "Same query for all visitors" },
              { label: "NavigationHeader", cache: "revalidate: 300", tag: "navigation", note: "Same query for all visitors" },
              { label: "CMS page route", cache: "force-dynamic + cache: false", tag: "-", note: "Per-visitor, always fresh" },
            ].map(({ label, cache, tag, note }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs text-on-surface-variant mb-1">
                  <span className="font-medium">Cache: </span>
                  <code className="bg-surface-low px-1 rounded font-mono">{cache}</code>
                </p>
                {tag !== "-" && (
                  <p className="text-xs text-on-surface-variant mb-1">
                    <span className="font-medium">Tag: </span>
                    <code className="bg-surface-low px-1 rounded font-mono">{tag}</code>
                  </p>
                )}
                <p className="text-xs text-on-surface-variant italic mt-2">{note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── @recursive ── */}
        <section id="recursive">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            @recursive - hierarchical data in one round-trip
            <SectionAnchor id="recursive" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">@recursive(depth: N)</code> is an
            Optimizely Graph extension (not standard GraphQL). It tells Graph to apply the decorated fragment
            to the items in a content area field at every nesting level up to the given depth - fetching
            arbitrary tree depth in a single request. Without it, you manually nest inline fragments for each
            level and the depth limit is hardcoded in the query string.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">With @recursive - one query, any depth</p>
              <CodeBlock code={RECURSIVE_SNIPPET} label="src/lib/graphql/queries/GetNavigation.ts" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Without @recursive - manually nested, fixed depth</p>
              <CodeBlock code={NAIVE_RECURSIVE_SNIPPET} label="Alternative without the directive" />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant mt-4">
            The <code className="bg-surface-low px-1 rounded font-mono">depth</code> parameter is also a safety
            cap - it prevents Graph from traversing an unbounded tree if content editors create deeply nested
            structures. This query supports up to 5 levels (Root → L1 → L2 → L3 → L4 → L5).
          </p>
        </section>

        {/* ── Content areas vs references ── */}
        <section id="content-areas">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Content areas vs. single references
            <SectionAnchor id="content-areas" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-2 max-w-3xl leading-relaxed">
            How a property is declared in the content type definition determines whether Graph returns its
            data inline or just returns metadata.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-green-700 mb-3">
                type: &quot;array&quot; - content area
              </p>
              <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">
                Graph inline-expands all items. Typed field data arrives with the page response - no extra
                fetch needed. Use for lists of blocks on a page.
              </p>
              <CodeBlock code={CONTENT_AREA_SNIPPET} />
            </div>
            <div className="bg-surface-lowest border border-orange-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-orange-700 mb-3">
                type: &quot;content&quot; - single reference
              </p>
              <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">
                Graph returns only base metadata (key, url, version) - never the referenced item&apos;s
                fields. The component must self-fetch if it needs real data.
              </p>
              <CodeBlock code={SINGLE_REF_SNIPPET} />
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            This is why <code className="bg-surface-low px-1 rounded font-mono text-xs">FaqContainerBlock</code>{" "}
            self-fetches when placed as a single reference on{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">TraditionalPage</code>. The guard
            clause <code className="bg-surface-low px-1 rounded font-mono text-xs">{"if (!data.heading)"}</code>{" "}
            detects that the page query only returned metadata and triggers a direct fetch.
          </p>
          <CodeBlock code={SELF_FETCH_SNIPPET} label="src/components/blocks/FaqContainerBlock/index.tsx" />
        </section>

        {/* ── Predictable queries ── */}
        <section id="predictable">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Predictable queries and Graph CDN caching
            <SectionAnchor id="predictable" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Optimizely Graph has its own CDN caching layer, separate from Next.js&apos;s fetch data cache.
            It caches responses by <strong>query string + variables</strong>. If two requests send exactly
            the same query with the same variables, the second is served from Graph&apos;s cache - no backend
            computation. The key to making this work is keeping queries{" "}
            <strong>predictable and stable</strong>.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Static queries",
                example: "Navigation, Banner",
                result: "Always same query + no variables → one Graph CDN entry, shared by every visitor on every page",
                good: true,
              },
              {
                label: "Variation filter",
                example: "CMS page variations",
                result: "Query structure is fixed; value[] has a finite set of combinations → Graph CDN caches each variation separately",
                good: true,
              },
              {
                label: "Per-user variables",
                example: "userId, sessionId in query",
                result: "Every request is unique → Graph CDN can never cache → every visit hits the Graph backend at full cost",
                good: false,
              },
            ].map(({ label, example, result, good }) => (
              <div
                key={label}
                className={`bg-surface-lowest rounded-2xl p-5 border ${good ? "border-green-200" : "border-orange-200"}`}
              >
                <p className={`text-xs font-semibold mb-1 ${good ? "text-green-700" : "text-orange-700"}`}>
                  {good ? "✓" : "✗"} {label}
                </p>
                <p className="text-xs text-on-surface-variant mb-2 font-mono">{example}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{result}</p>
              </div>
            ))}
          </div>

          <CodeBlock code={PREDICTABLE_SNIPPET} label="Predictable vs. per-user query variables" />
        </section>

        {/* ── Batch keys ── */}
        <section id="batch-keys">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Batch key queries - N items, 1 query
            <SectionAnchor id="batch-keys" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">TeamGridBlock</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">TimelineBlock</code> receive
            only reference keys from the page query. Rather than fetching one item at a time, they collect
            all keys and issue a single batch query using{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">{"{ key: { in: $keys } }"}</code>.
            Results are mapped back to the original key order so display order is stable.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Batch query - N keys, 1 request</p>
              <CodeBlock code={BATCH_KEY_SNIPPET} label="src/components/blocks/TeamGridBlock/index.tsx" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Naive loop - N keys, N requests</p>
              <CodeBlock code={NAIVE_LOOP_SNIPPET} label="Anti-pattern - one fetch per key" />
            </div>
          </div>
        </section>

        {/* ── indexingType disabled ── */}
        <section id="disabled-fields">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            indexingType: &quot;disabled&quot; fields
            <SectionAnchor id="disabled-fields" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Some fields are declared with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">indexingType: &quot;disabled&quot;</code>{" "}
            in the content type definition. Graph does not index these fields - querying them in GraphQL
            always returns <code className="bg-surface-low px-1 rounded font-mono text-xs">null</code>, even
            when the editor has set a value. The field data only exists in the Visual Builder composition
            snapshot. In this codebase,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">TestimonialBlock.authorImage</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">AuthorBlock.avatar</code> are both
            excluded from Graph queries for this reason.
          </p>
          <CodeBlock code={DISABLED_FIELD_SNIPPET} label="TestimonialBlock - indexingType: disabled field returns null from Graph" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">One CMS page = one Graph request.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">getContentByPath()</code> fetches the full composition automatically. Inline blocks need no additional queries.</>,
          <><strong className="text-on-surface">For referenced content keys, use <code className="bg-surface-low px-1 rounded font-mono text-xs">getClient().getContent(&#123; key &#125;)</code></strong> - no manual GraphQL query needed. Write custom <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch</code> queries only for non-page data like navigation or content listings.</>,
          <><strong className="text-on-surface">Always use the graphqlFetch wrapper</strong> - not raw fetch - so published/preview auth and ISR config are handled automatically.</>,
          <><strong className="text-on-surface">Put static data in layout components with ISR.</strong> force-dynamic on the page route does not affect layout-level fetches - nav and banner stay cached.</>,
          <><strong className="text-on-surface">Predictable query strings are Graph CDN-cacheable.</strong> Embedding per-user variables (userId, sessionId) makes every request a cache miss at the Graph layer.</>,
          <><strong className="text-on-surface">@recursive(depth: N)</strong> fetches arbitrary tree depth in one round-trip. The depth cap prevents unbounded traversal.</>,
          <><strong className="text-on-surface">type: &quot;array&quot; content areas inline-expand;</strong> type: &quot;content&quot; single references return metadata only - self-fetch if you need the data.</>,
          <><strong className="text-on-surface">indexingType: &quot;disabled&quot; fields return null in Graph.</strong> Do not try to read them from <code className="bg-surface-low px-1 rounded font-mono text-xs">getContent()</code> - the value only exists in composition snapshots when the block is placed inline.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "GetNavigation.ts", path: "src/lib/graphql/queries/GetNavigation.ts", content: navQueryTs },
            { label: "FaqContainerBlock/index.tsx", path: "src/components/blocks/FaqContainerBlock/index.tsx", content: faqContainerTs },
            { label: "TeamGridBlock/index.tsx", path: "src/components/blocks/TeamGridBlock/index.tsx", content: teamGridTs },
          ]}
        />

      </div>
    </>
  );
}
