import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import NestedNavMenu from "@/components/demo/NestedNavMenu";
import FlatNavList from "@/components/demo/FlatNavList";
import { getNavigation, GET_NAVIGATION_QUERY } from "@/lib/graphql/queries/GetNavigation";
import { getNavigationFromFlags, GET_NAVIGATION_FROM_FLAGS_QUERY } from "@/lib/graphql/queries/GetNavigationFromFlags";
import { getNavigationFromHierarchy, GET_CHILDREN_BY_ANCESTOR_QUERY } from "@/lib/graphql/queries/GetNavigationFromHierarchy";
import { getNavigationFromContentType, GET_NAVIGATION_FROM_CONTENT_TYPE_QUERY } from "@/lib/graphql/queries/GetNavigationFromContentType";
import SourcePanel from "@/components/demo/SourcePanel";

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

const getNavigationTs       = readSource("src/lib/graphql/queries/GetNavigation.ts");
const getNavigationFlagsTs  = readSource("src/lib/graphql/queries/GetNavigationFromFlags.ts");
const getNavigationHierTs   = readSource("src/lib/graphql/queries/GetNavigationFromHierarchy.ts");
const getNavigationCtypeTs  = readSource("src/lib/graphql/queries/GetNavigationFromContentType.ts");

export const metadata: Metadata = {
  title: "Navigation Strategies Demo",
};

const S1_CONTENT_TYPE_SNIPPET = `// NavigationItem — self-referential content area
export const NavigationItemType = contentType({
  key: "NavigationItem",
  baseType: "_component",
  properties: {
    label:       { type: "string",  displayName: "Label" },
    href:        { type: "string",  displayName: "URL" },
    description: { type: "string",  displayName: "Description" },
    openInNewTab: { type: "boolean", displayName: "Open in New Tab" },
    children: {
      type: "array",
      displayName: "Child Items",
      items: { type: "content", allowedTypes: ["_self"] },
    },
  },
});

// NavigationRoot — singleton populated once by editors
export const NavigationRootType = contentType({
  key: "NavigationRoot",
  baseType: "_component",
  properties: {
    name: { type: "string", displayName: "Name" },
    navItems: {
      type: "array",
      displayName: "Top-level Items",
      items: { type: "content", allowedTypes: [NavigationItemType] },
    },
  },
});`;

const S1_CMS_SETUP = `1. Create one "Navigation Root" item in the CMS (e.g. "Main Nav").

2. Open it and add NavigationItem entries to the "Top-level Items" content area.
   Each NavigationItem has a "Child Items" content area for the next level.

3. Nest down to 5 levels — the @recursive directive handles any depth:

   NavigationRoot
   └── navItems  (content area)
       └── NavigationItem  (L1)
           └── children  (content area)
               └── NavigationItem  (L2)

4. Publish. The query fetches all levels in one round-trip.
   On-demand revalidation: revalidateTag("navigation") from a webhook.`;

const S2_TREE_BUILDER_SNIPPET = `// Server-side tree builder — no extra queries needed.
// All opted-in pages come back flat; parent = longest URL prefix match.
function buildTree(items) {
  const sorted = items.sort((a, b) => a.href.length - b.href.length);
  const nodeMap = new Map();
  const roots = [];

  for (const item of sorted) {
    const node = { ...item, children: [] };
    nodeMap.set(item.href, node);

    // Longest other opted-in URL that is a strict prefix → direct parent
    const parent = sorted
      .filter(p => p.href !== item.href && item.href.startsWith(p.href))
      .sort((a, b) => b.href.length - a.href.length)[0];

    if (parent && nodeMap.has(parent.href)) {
      nodeMap.get(parent.href).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}`;

const S2_CONTENT_TYPE_SNIPPET = `// Add three properties to your page content type:
export const LandingPageType = contentType({
  key: "TraditionalPage",
  baseType: "_page",
  properties: {
    // ... existing fields ...
    includeInNavigation: {
      type: "boolean",
      displayName: "Include in Navigation",
      indexingType: "queryable",   // ← enables where-filter on this field
    },
    navLabel: {
      type: "string",
      displayName: "Navigation Label",
    },
    navOrder: {
      type: "integer",
      displayName: "Nav Order",
      indexingType: "queryable",
    },
  },
});`;

const S3_HOW_IT_WORKS = `// Two-step query:
// 1. Find parent page by its known URL
// 2. Query all _Page items where _ancestors contains the parent key

const parent = await graphqlFetch(GET_PARENT_KEY_QUERY);
const parentKey = parent._Page.items[0]._metadata.key;

const children = await graphqlFetch(GET_CHILDREN_BY_ANCESTOR_QUERY, { parentKey });
// → returns Current Account, Savings, etc.`;

const S4_HOW_IT_WORKS = `// Query ArticlePage directly — the content type IS the navigation scope.
// No flag, no hierarchy: every published ArticlePage is a nav candidate.
// orderBy and limit control what surfaces.

const { items } = await graphqlFetch(GET_ARTICLE_NAVIGATION_QUERY);
// items: [{ title, category, _metadata.url.default }, ...]`;

function TradeOffs({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
      <div>
        <p className="font-semibold text-on-surface mb-2">Strengths</p>
        <ul className="space-y-1">
          {pros.map((p) => (
            <li key={p} className="flex gap-2 text-on-surface-variant">
              <span className="text-green-600 shrink-0">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-semibold text-on-surface mb-2">Trade-offs</p>
        <ul className="space-y-1">
          {cons.map((c) => (
            <li key={c} className="flex gap-2 text-on-surface-variant">
              <span className="text-amber-600 shrink-0">✗</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StrategyBadge({ n, label }: { n: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-3">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-on-brand text-xs font-bold shrink-0">
        {n}
      </span>
      <span className="font-display font-bold text-on-surface">{label}</span>
    </span>
  );
}

export default async function NavigationDemoPage() {
  const [
    { tree, fromCms: s1FromCms },
    { tree: s2Tree, fromCms: s2FromCms },
    { parentLabel, parentHref, items: s3Items, fromCms: s3FromCms },
    { items: s4Items, fromCms: s4FromCms },
  ] = await Promise.all([
    getNavigation(),
    getNavigationFromFlags(),
    getNavigationFromHierarchy(),
    getNavigationFromContentType(),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Navigation Strategies
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Four ways to drive site navigation from Optimizely Graph — each with live
            data fetched server-side so you can see exactly what each query returns.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            {[
              "S1 · Manual block + @recursive",
              "S2 · Include-in-nav flag",
              "S3 · _ancestors hierarchy",
              "S4 · Content type query",
            ].map((label) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Strategy 1 */}
        <section id="strategy-1">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="font-display text-2xl font-bold text-on-surface flex items-center gap-2">
              <StrategyBadge n="1" label="Manual Navigation Block" />
              <a href="#strategy-1" className="text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant mb-2 max-w-3xl">
            A standalone <code className="bg-surface-low px-1 rounded text-xs font-mono">NavigationRoot</code> content item
            holds the entire tree. Editors build it once and maintain it independently of page content.
            Optimizely Graph&apos;s{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">@recursive</code> directive
            fetches all 5 levels in one round-trip.
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand mb-6">
            {s1FromCms ? "✓ Live from CMS" : "◎ Demo data — add a NavigationRoot in the CMS"}
          </span>

          {/* Interactive tree */}
          <section id="nav-tree">
            <h3 className="font-display text-lg font-bold text-on-surface mb-2">
              Navigation Tree
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Hover a row to reveal its URL. Click the chevron to collapse a branch.
              <code className="bg-surface-low px-1 rounded text-xs font-mono mx-1">L1</code>–<code className="bg-surface-low px-1 rounded text-xs font-mono">L5</code>
              badges show depth; the number badge is the child count.
            </p>
            <div className="bg-surface-lowest rounded-2xl border border-ghost-border p-6">
              <NestedNavMenu tree={tree} />
            </div>
          </section>

          <div className="mt-8 grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">
                The <code className="font-mono text-brand">@recursive</code> Query
              </h3>
              <p className="text-sm text-on-surface-variant mb-3 max-w-xl">
                One fragment applied at every nesting level up to the given depth. No repeated inline fragments.
              </p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed max-h-72">
                <code>{GET_NAVIGATION_QUERY.trim()}</code>
              </pre>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">
                Content Types &amp; CMS Setup
              </h3>
              <p className="text-sm text-on-surface-variant mb-3">
                <code className="bg-surface-low px-1 rounded text-xs font-mono">NavigationItem</code> uses{" "}
                <code className="bg-surface-low px-1 rounded text-xs font-mono">allowedTypes: [&quot;_self&quot;]</code> so
                only other NavigationItems can be nested inside it.
              </p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed max-h-72">
                <code>{S1_CONTENT_TYPE_SNIPPET}</code>
              </pre>
            </div>
          </div>

          <details className="mt-4 group">
            <summary className="cursor-pointer text-sm text-brand hover:underline list-none">
              CMS setup walkthrough
            </summary>
            <pre className="mt-3 bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{S1_CMS_SETUP}</code>
            </pre>
          </details>

          <TradeOffs
            pros={[
              "Full editorial control — reorder, rename, add non-page items (labels, external links)",
              "Supports deep trees (up to depth 10 with @recursive)",
              "Navigation lifecycle is independent of page lifecycle",
              "One content item to cache and invalidate",
            ]}
            cons={[
              "Editors maintain a second object — nav can drift from actual pages",
              "New pages must be manually wired into the tree",
              "Setup cost: NavigationRoot and items must be seeded or built in the CMS UI",
            ]}
          />
          <p className="mt-4 text-xs text-on-surface-variant">
            <strong>Best for:</strong> most production sites — when editors need precise control over labels,
            ordering, and the ability to include items that don&apos;t map to real pages (e.g. external links, section headings).
          </p>
        </section>

        <hr className="border-ghost-border" />

        {/* Strategy 2 */}
        <section id="strategy-2">
          <h2 className="font-display text-2xl font-bold text-on-surface flex items-center gap-2 mb-1">
            <StrategyBadge n="2" label="Include in Navigation Flag" />
            <a href="#strategy-2" className="text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Add three properties to your page content type:{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">includeInNavigation</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">navLabel</code>, and{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">navOrder</code>.
            The query returns <em>all</em> opted-in pages in one round-trip — then a
            URL-prefix tree builder groups children under their parents on the server.
            Any page that sets the flag, at any depth, is automatically nested under the
            nearest ancestor that also has the flag.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface mb-2">Content type additions</h3>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{S2_CONTENT_TYPE_SNIPPET}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-on-surface mb-2">Graph query</h3>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{GET_NAVIGATION_FROM_FLAGS_QUERY.trim()}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-on-surface mb-2">Server-side tree builder</h3>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed max-h-60">
                  <code>{S2_TREE_BUILDER_SNIPPET}</code>
                </pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-on-surface">Live result</h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-lowest text-brand">
                  {s2FromCms ? "✓ Live from CMS" : "◎ Fallback data — run seed-nav-strategy-demo.ts"}
                </span>
              </div>
              <div className="bg-surface-lowest rounded-2xl border border-ghost-border p-4">
                <NestedNavMenu tree={s2Tree} />
              </div>
              <p className="mt-3 text-xs text-on-surface-variant">
                Tree built from URL prefixes server-side — no extra queries.
                Child pages nest under whichever ancestor also has the flag set.
              </p>
            </div>
          </div>

          <TradeOffs
            pros={[
              "Nav auto-syncs: publish a page with the flag → it appears in nav",
              "Nested trees supported — child pages nest under opted-in parents automatically",
              "No separate navigation object to maintain",
              "Impossible for nav and page to get out of sync",
              "Easy to audit: filter pages by includeInNavigation in the CMS UI",
            ]}
            cons={[
              "Cannot include non-page items (external links, section labels)",
              "Editors must set the flag on every page they want in the nav",
              "Tree depth depends on URL structure — URL must mirror desired nesting",
            ]}
          />
          <p className="mt-4 text-xs text-on-surface-variant">
            <strong>Best for:</strong> sites where nav items map 1:1 to CMS pages and editors
            want nav membership controlled per-page without a separate object to maintain.
          </p>
        </section>

        <hr className="border-ghost-border" />

        {/* Strategy 3 */}
        <section id="strategy-3">
          <h2 className="font-display text-2xl font-bold text-on-surface flex items-center gap-2 mb-1">
            <StrategyBadge n="3" label="Folder / Page Hierarchy" />
            <a href="#strategy-3" className="text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Use Optimizely Graph&apos;s{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">_ancestors</code> filter
            to mirror the CMS content tree. Two steps: find the parent page by its known URL, then
            query all <code className="bg-surface-low px-1 rounded text-xs font-mono">_Page</code> items
            whose <code className="bg-surface-low px-1 rounded text-xs font-mono">_ancestors</code> array
            contains that key. The result below shows the live children of the{" "}
            <strong>{parentLabel}</strong> section.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface mb-2">How it works</h3>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{S3_HOW_IT_WORKS}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-on-surface mb-2">Children query</h3>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{GET_CHILDREN_BY_ANCESTOR_QUERY.trim()}</code>
                </pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-on-surface">
                  Live result — children of <em>{parentLabel}</em>
                </h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-lowest text-brand">
                  {s3FromCms ? "✓ Live from CMS" : "◎ Fallback data — run seed-content.ts"}
                </span>
              </div>
              <div className="bg-surface-lowest rounded-2xl border border-ghost-border p-4">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ghost-border">
                  <span className="text-xs font-mono text-on-surface-variant">parent →</span>
                  <a href={parentHref} className="text-sm font-medium text-brand hover:underline">{parentLabel}</a>
                  <span className="text-xs font-mono text-on-surface-variant">{parentHref}</span>
                </div>
                <FlatNavList items={s3Items} />
              </div>
              <p className="mt-3 text-xs text-on-surface-variant">
                The <code className="font-mono">_ancestors</code> filter returns all descendants at any depth.
                Apply a URL depth check to retrieve only direct children if needed.
              </p>
            </div>
          </div>

          <TradeOffs
            pros={[
              "Zero editorial overhead — create and publish a page → it appears in nav",
              "Navigation exactly mirrors URL/folder structure",
              "No extra fields or objects to maintain",
            ]}
            cons={[
              "All published pages appear — no opt-out mechanism without additional filtering",
              "Ordering follows CMS sort order, not editorial preference",
              "Cannot include non-page items or override labels",
              "Requires two serial Graph requests (parent key lookup + children query)",
            ]}
          />
          <p className="mt-4 text-xs text-on-surface-variant">
            <strong>Best for:</strong> documentation sites, microsites, or any site where the URL hierarchy
            should equal the navigation hierarchy with zero maintenance.
          </p>
        </section>

        <hr className="border-ghost-border" />

        {/* Strategy 4 */}
        <section id="strategy-4">
          <h2 className="font-display text-2xl font-bold text-on-surface flex items-center gap-2 mb-1">
            <StrategyBadge n="4" label="Content Type–Driven Section Menu" />
            <a href="#strategy-4" className="text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Query a specific content type directly — every published item of that type becomes a
            nav candidate. Ideal for section menus like &quot;all articles&quot; or &quot;all case studies&quot; inside
            a larger manually-framed top nav. The scope is enforced by the type itself, not by flags or folder position.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface mb-2">How it works</h3>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{S4_HOW_IT_WORKS}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-on-surface mb-2">Graph query</h3>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                  <code>{GET_NAVIGATION_FROM_CONTENT_TYPE_QUERY.trim()}</code>
                </pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-on-surface">Live result — ArticlePage items</h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-lowest text-brand">
                  {s4FromCms ? "✓ Live from CMS" : "◎ Fallback data — run seed-nav-strategy-demo.ts"}
                </span>
              </div>
              <div className="bg-surface-lowest rounded-2xl border border-ghost-border p-4">
                <FlatNavList items={s4Items} />
              </div>
              <p className="mt-3 text-xs text-on-surface-variant">
                Category is shown as a pill. Hover reveals the article URL.
                Add <code className="font-mono">where: {"{ category: { eq: \"personal-finance\" } }"}</code> to scope a subsection.
              </p>
            </div>
          </div>

          <TradeOffs
            pros={[
              "Perfectly scoped — the content type boundary defines what appears",
              "Great for megamenu section panels populated from real content",
              "No editorial overhead beyond authoring the pages themselves",
              "Supports rich filtering: by category, tag, date, or any queryable field",
            ]}
            cons={[
              "Only items of that specific type appear — can't mix types in one query",
              "Requires a separate query per section type",
              "No override mechanism for labels or ordering without dedicated fields",
            ]}
          />
          <p className="mt-4 text-xs text-on-surface-variant">
            <strong>Best for:</strong> section mega-menus (&quot;all our articles&quot;, &quot;all case studies&quot;),
            or anywhere content-type membership is a natural navigation boundary.
          </p>
        </section>

        <SourcePanel
          heading="Source files"
          files={[
            { label: "GetNavigation.ts",              path: "src/lib/graphql/queries/GetNavigation.ts",              content: getNavigationTs      },
            { label: "GetNavigationFromFlags.ts",     path: "src/lib/graphql/queries/GetNavigationFromFlags.ts",     content: getNavigationFlagsTs },
            { label: "GetNavigationFromHierarchy.ts", path: "src/lib/graphql/queries/GetNavigationFromHierarchy.ts", content: getNavigationHierTs  },
            { label: "GetNavigationFromContentType.ts", path: "src/lib/graphql/queries/GetNavigationFromContentType.ts", content: getNavigationCtypeTs },
          ]}
        />

      </div>
    </div>
  );
}
