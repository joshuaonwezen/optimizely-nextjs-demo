import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import NestedNavMenu from "@/components/demo/NestedNavMenu";
import { getNavigation, GET_NAVIGATION_QUERY } from "@/lib/graphql/queries/GetNavigation";
import SourcePanel from "@/components/demo/SourcePanel";

const getNavigationTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetNavigation.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Nested Navigation Demo",
};

const CONTENT_TYPE_SNIPPET = `// NavigationItem — self-referential content area
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

const CMS_SETUP = `1. Create one "Navigation Root" item in the CMS (e.g. "Main Nav").

2. Open it and add NavigationItem entries to the "Top-level Items" content area.
   Each NavigationItem has a "Child Items" content area for the next level.

3. Nest down to 5 levels — the @recursive directive handles any depth:

   NavigationRoot
   └── navItems  (content area)
       └── NavigationItem  (L1)
           └── children  (content area)
               └── NavigationItem  (L2)
                   └── children  (content area)
                       └── NavigationItem  (L3)
                           └── children  (content area)
                               └── NavigationItem  (L4)
                                   └── children  (content area)
                                       └── NavigationItem  (L5)

4. Publish. The query fetches all levels in one round-trip.
   On-demand revalidation: revalidateTag("navigation") from a webhook.`;

export default async function NavigationDemoPage() {
  const { tree, fromCms } = await getNavigation();

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Nested Navigation
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            CMS-driven navigation with real content areas at every level. Editors
            build the tree directly in the CMS. A single GraphQL query using
            Optimizely Graph&apos;s <code className="font-mono text-on-brand bg-black/10 px-1 rounded">@recursive</code> directive
            fetches all 5 levels in one round-trip — no explicit nesting required.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              {fromCms ? "✓ Live from CMS" : "◎ Demo data — add a NavigationRoot in the CMS"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Content areas · real CMS relationships
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              @recursive · single round-trip
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              ISR · 5 min + on-demand tag
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* Interactive tree */}
        <section id="nav-tree">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Navigation Tree <a href="#nav-tree" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">
            Hover a row to reveal its URL. Click the chevron to collapse a branch.
            <code className="bg-surface-low px-1 rounded text-xs font-mono mx-1">L1</code>–<code className="bg-surface-low px-1 rounded text-xs font-mono">L5</code>
            badges show depth; the number badge is the child count.
          </p>
          <div className="bg-surface-lowest rounded-2xl border border-ghost-border p-6">
            <NestedNavMenu tree={tree} />
          </div>
        </section>

        {/* The @recursive query — centrepiece of the demo */}
        <section id="recursive-query">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
            The Query — <code className="font-mono text-brand text-xl">@recursive</code> <a href="#recursive-query" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Optimizely Graph&apos;s <code className="bg-surface-low px-1 rounded text-xs font-mono">@recursive</code> directive
            applies a fragment to a content area field at every nesting level up to
            the given depth. One fragment definition replaces five levels of manually
            repeated inline fragments. The full tree arrives in a single request.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{GET_NAVIGATION_QUERY.trim()}</code>
          </pre>
          <p className="text-xs text-on-surface-variant mt-3 opacity-70">
            Increase <code className="font-mono">depth</code> (max 10) to support deeper trees. Decrease it to reduce response size.
          </p>
        </section>

        {/* Content types + CMS setup */}
        <section id="content-types" className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface mb-1">
              Content Types
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              <code className="bg-surface-low px-1 rounded text-xs font-mono">NavigationItem</code> uses{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">allowedTypes: [&quot;_self&quot;]</code> on
              its <em>children</em> content area so the CMS only allows other
              NavigationItems to be placed there.{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">NavigationRoot</code> is the singleton
              editors populate once.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{CONTENT_TYPE_SNIPPET}</code>
            </pre>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-on-surface mb-1">
              CMS Setup
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              Build the tree in the CMS visually — no code changes needed to add,
              remove, or reorder items at any level. The{" "}
              <code className="bg-surface-low px-1 rounded text-xs font-mono">@recursive</code> directive
              will follow whatever depth the editors create.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
              <code>{CMS_SETUP}</code>
            </pre>
          </div>
        </section>

        <SourcePanel
          heading="Source files"
          files={[
            {
              label: "GetNavigation.ts",
              path: "src/lib/graphql/queries/GetNavigation.ts",
              content: getNavigationTs,
            },
          ]}
        />

      </div>
    </div>
  );
}
