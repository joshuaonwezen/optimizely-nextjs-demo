import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visual Builder Demo",
};

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const CONTENT_TYPE_SNIPPET = `import { contentType, displayTemplate } from "@optimizely/cms-sdk";

export const HeroBlockType = contentType({
  key: "HeroBlock",
  displayName: "Hero Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    headline:        { type: "string", indexingType: "searchable" },
    subheadline:     { type: "string", indexingType: "searchable" },
    backgroundImage: { type: "contentReference", allowedTypes: ["_image"] },
    ctaText:         { type: "string" },
    ctaLink:         { type: "string" },
  },
});

export const HeroCenteredTemplate = displayTemplate({
  key: "HeroCenteredTemplate",
  displayName: "Centered Hero",
  contentType: "HeroBlock",
  tag: "Centered",
  settings: {
    height: {
      editor: "select",
      displayName: "Height",
      choices: {
        default: { displayName: "Default" },
        tall:    { displayName: "Full Viewport" },
      },
    },
    overlay: { editor: "checkbox", displayName: "Dark Overlay on Image" },
  },
});`;

const COMPONENT_SNIPPET = `type HeroBlockProps = {
  headline?: string | null;
  subheadline?: string | null;
  backgroundImage?: { _metadata?: { url?: { default?: string | null } } } | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  displaySettings?: Record<string, string | boolean>;
};

export default function HeroBlock(props: HeroBlockProps) {
  const ds = props.displaySettings;

  const isTall     = ds?.height === "tall";
  const showOverlay = ds?.overlay === true;
  const isCentered = ds?.alignment === "center";

  return (
    <section className={isTall ? "min-h-screen" : "min-h-[640px]"}>
      {props.backgroundImage && (
        <Image
          src={props.backgroundImage._metadata?.url?.default ?? ""}
          className={showOverlay ? "opacity-20" : "opacity-30"}
          fill
        />
      )}
      <div className={isCentered ? "text-center" : ""}>
        <h1>{props.headline}</h1>
        <p>{props.subheadline}</p>
        <a href={props.ctaLink}>{props.ctaText}</a>
      </div>
    </section>
  );
}`;

const REGISTRY_SNIPPET = `// src/lib/optimizely/componentRegistry.ts
import { initContentTypeRegistry, initDisplayTemplateRegistry } from "@optimizely/cms-sdk";
import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";
import HeroBlock, { HeroBlockType, HeroCenteredTemplate } from "@/components/blocks/HeroBlock";
// … other imports …

export function initComponentRegistry() {
  initContentTypeRegistry([HeroBlockType, /* … */]);
  initDisplayTemplateRegistry([HeroCenteredTemplate, /* … */]);
  initReactComponentRegistry({ resolver: { HeroBlock, /* … */ } });
}`;

const SDK_QUERY_SNIPPET = `// src/app/[[...slug]]/page.tsx
import { GraphClient } from "@optimizely/cms-sdk";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

// Must run before any GraphClient.getContentByPath call.
// The SDK reads the registry to know which properties to fetch per block type.
initComponentRegistry();

const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});

// One call — SDK auto-generates the full GraphQL query from all registered
// content types and fetches all blocks in a single round-trip.
const [page] = await client.getContentByPath("/en/homepage/");`;

const EXTRACT_ROWS_SNIPPET = `// src/lib/optimizely/extractRows.ts
export function extractRowsFromComposition(page: any): CompositionRow[] {
  const nodes = page?.composition?.nodes ?? page?.composition?.grids ?? [];

  return nodes.flatMap((gridNode) => {
    // Top-level component (standalone block outside a section)
    const topLevel = resolveComponent(gridNode);
    if (topLevel) return [{ key: gridNode.key, items: [topLevel] }];

    // Section node: walk columns → collect leaf components
    if (gridNode?.nodes) {
      const items = collectComponents(gridNode);
      return items.length ? [{ key: gridNode.key, items }] : [];
    }
    return [];
  });
}

// column key is propagated down so data-epi-block-id targets the column,
// not the leaf — that is the boundary the CMS selection overlay uses.
function collectComponents(node, columnKey?: string): ContentAreaItemWithSettings[] {
  const resolved = resolveComponent(node, columnKey);
  const childKey  = node.nodeType === "column" ? (node.key ?? columnKey) : columnKey;
  const children  = node.nodes?.flatMap((n) => collectComponents(n, childKey)) ?? [];
  return resolved ? [resolved, ...children] : children;
}`;

const COMPONENT_SELECTOR_SNIPPET = `// src/components/cms/ComponentSelector.tsx
export function ComponentSelector({ rows, inEditMode }: ComponentSelectorProps) {
  return rows.map((row) => {
    const rendered = row.items.map(({ item, nodeKey, displaySettings }) => {
      const Component = COMPONENT_REGISTRY[item.__typename];
      const blockId   = nodeKey ?? item._metadata?.key;

      return (
        // data-epi-block-id is only set in edit mode — omitted on published pages.
        // The CMS communicationinjector.js reads this attribute to draw selection outlines.
        <div key={blockId} data-epi-block-id={inEditMode ? blockId : undefined}>
          <Component {...item} displaySettings={displaySettings} />
        </div>
      );
    });

    const gridCols = rendered.length === 2 ? "md:grid-cols-2"
                   : rendered.length === 3 ? "md:grid-cols-3"
                   :                         "md:grid-cols-4";

    // Outer wrapper uses the row/section key; CMS targets sections before columns.
    return (
      <div key={row.key}
           data-epi-block-id={inEditMode ? row.key : undefined}
           className={rendered.length > 1 ? \`grid \${gridCols}\` : undefined}>
        {rendered}
      </div>
    );
  });
}`;

const PREVIEW_INJECT_SNIPPET = `// src/app/preview/page.tsx
import Script from "next/script";
import { PreviewComponent } from "@optimizely/cms-sdk/react/server";

// Always force-dynamic — preview responses must never be cached.
export const dynamic = "force-dynamic";

export default async function PreviewPage({ searchParams }) {
  const { preview_token, key, ctx } = await searchParams;
  const inEditMode = ctx === "edit";

  const [page] = await client.getContentByPath(url, { preview_token });

  return (
    <>
      {inEditMode && (
        // Loaded by the CMS iframe to establish a postMessage channel so the
        // selection outline overlay knows which DOM node is being edited.
        <Script src={\`\${process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL}/episerver/cms/latest/communicationinjector.js\`} />
      )}

      {/* Renders the composition or traditional page */}
      {page?.composition
        ? <DynamicExperience page={page} inEditMode={inEditMode} />
        : <TraditionalPage page={page} inEditMode={inEditMode} />}

      {inEditMode && <PreviewComponent />}
    </>
  );
}`;

// ---------------------------------------------------------------------------
// Block table rows
// ---------------------------------------------------------------------------

const BLOCKS = [
  { name: "HeroBlock",            baseType: "_component", templates: "HeroCenteredTemplate" },
  { name: "ProductHeroBlock",     baseType: "_component", templates: "ProductHeroCompactTemplate" },
  { name: "SectionHeadingBlock",  baseType: "_component", templates: "SectionHeadingCenteredTemplate" },
  { name: "RichTextBlock",        baseType: "_component", templates: "TextBlockNarrowTemplate" },
  { name: "CallToActionBlock",    baseType: "_component", templates: "CallToActionOutlineTemplate, CallToActionSurfaceTemplate" },
  { name: "ProductCardBlock",     baseType: "_component", templates: "ProductCardFeaturedTemplate" },
  { name: "FeatureItemBlock",     baseType: "_component", templates: "FeatureItemOutlinedTemplate, FeatureItemFlatTemplate" },
  { name: "TestimonialBlock",     baseType: "_component", templates: "TestimonialCardTemplate" },
  { name: "StatsCounterBlock",    baseType: "_component", templates: "—" },
  { name: "ImageBlock",           baseType: "_component", templates: "ImageBlockRoundedTemplate" },
  { name: "FaqContainerBlock",    baseType: "_component", templates: "—" },
  { name: "FaqItemBlock",         baseType: "_component", templates: "—" },
  { name: "FeaturedContentBlock", baseType: "_component", templates: "—" },
  { name: "LogoGridBlock",        baseType: "_component", templates: "—" },
  { name: "FormContainerBlock",   baseType: "_component", templates: "—" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VisualBuilderPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Visual Builder
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            How Optimizely Visual Builder enables editors to compose pages from blocks
            with zero code — and how the SDK auto-generates GraphQL queries from the
            component registry so you never write page-level queries by hand.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              SDK · GraphClient · contentType · displayTemplate
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              ComponentSelector · data-epi-block-id
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              15 blocks · display templates · display settings
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Composition model */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Composition Model
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A Visual Builder page is a tree of nodes. Editors see this as a canvas
            of rows and columns; developers see a JSON composition that the SDK
            flattens into{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">CompositionRow[]</code>{" "}
            before rendering.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
{`Experience (DynamicExperience)
└── Section (BlankSection / BlankExperience)
    └── Row  ──────────────────────── gridNode   ← extractRowsFromComposition iterates here
        ├── Column A  ─────────────── column key ← data-epi-block-id on <div> wrapper
        │   └── HeroBlock            leaf block  ← COMPONENT_REGISTRY["HeroBlock"]
        └── Column B
            └── CallToActionBlock`}
          </pre>
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl leading-relaxed">
            Standalone blocks (placed directly at row level, outside a section)
            are resolved as a single-item row. Multi-column rows auto-grid by count:
            2 → <code className="bg-surface-low px-1 rounded text-xs font-mono">md:grid-cols-2</code>,
            3 → <code className="bg-surface-low px-1 rounded text-xs font-mono">md:grid-cols-3</code>,
            4+ → <code className="bg-surface-low px-1 rounded text-xs font-mono">md:grid-cols-4</code>.
          </p>
        </section>

        {/* SDK auto-generated query */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            SDK Auto-Generated Query
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Instead of writing a hand-crafted GraphQL query for every page type,
            you register content types once and let the SDK build the query.{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">initComponentRegistry()</code>{" "}
            must run before the first{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">GraphClient.getContentByPath</code>{" "}
            call — the SDK reads the registry to know which properties to fetch for
            each block type in a single round-trip.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Registry Setup</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{REGISTRY_SNIPPET}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Page Route Query</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{SDK_QUERY_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Rendering pipeline */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Rendering Pipeline
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            After fetching, the composition JSON is processed in two steps before
            any React component is invoked.
          </p>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Step 1 — extractRowsFromComposition()
              </p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{EXTRACT_ROWS_SNIPPET}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Step 2 — ComponentSelector
              </p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{COMPONENT_SELECTOR_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Building a block */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Building a Block
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Every block colocates three things in one file: a{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">contentType()</code> definition
            (schema + base type), optional{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">displayTemplate()</code> definitions
            (alternate layouts + editor-configurable settings), and the React component that
            reads <code className="bg-surface-low px-1 rounded text-xs font-mono">displaySettings</code> to
            apply conditional styles.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Content Type + Display Template</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{CONTENT_TYPE_SNIPPET}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">React Component (display settings)</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{COMPONENT_SNIPPET}</code>
              </pre>
            </div>
          </div>
          <div className="mt-6 bg-surface-low border border-ghost-border rounded-2xl p-5 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">Checklist — adding a new block</p>
            <ol className="text-sm text-on-surface-variant space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Create <code className="bg-surface px-1 rounded text-xs font-mono">src/components/blocks/MyBlock/index.tsx</code> — export{" "}
                <code className="bg-surface px-1 rounded text-xs font-mono">MyBlockType</code> (contentType) and the default component.
              </li>
              <li>
                Add <code className="bg-surface px-1 rounded text-xs font-mono">MyBlockType</code> to{" "}
                <code className="bg-surface px-1 rounded text-xs font-mono">initContentTypeRegistry()</code> in{" "}
                <code className="bg-surface px-1 rounded text-xs font-mono">src/lib/optimizely/componentRegistry.ts</code>.
              </li>
              <li>
                Add <code className="bg-surface px-1 rounded text-xs font-mono">MyBlock</code> to{" "}
                <code className="bg-surface px-1 rounded text-xs font-mono">initReactComponentRegistry()</code> resolver in the same file.
              </li>
              <li>
                Add the component to{" "}
                <code className="bg-surface px-1 rounded text-xs font-mono">COMPONENT_REGISTRY</code> in{" "}
                <code className="bg-surface px-1 rounded text-xs font-mono">src/components/cms/ComponentSelector.tsx</code>.
              </li>
              <li>Register any display templates via <code className="bg-surface px-1 rounded text-xs font-mono">initDisplayTemplateRegistry()</code> — then editors can pick them in the Visual Builder panel.</li>
            </ol>
          </div>
        </section>

        {/* In-context editing */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            In-Context Editing
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            When the CMS opens the site in its Visual Builder iframe, it passes{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">ctx=edit</code> in the
            URL. The preview route then injects two things: a{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">{"<Script>"}</code> tag loading{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">communicationinjector.js</code> (establishes
            the postMessage channel between the CMS shell and the page iframe), and{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">{"<PreviewComponent />"}</code> (SDK helper
            that registers available content types with the CMS overlay).
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{PREVIEW_INJECT_SNIPPET}</code>
          </pre>
          <div className="mt-6 grid sm:grid-cols-2 gap-4 max-w-3xl">
            <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
              <p className="text-xs font-semibold text-on-surface mb-1">data-epi-block-id</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Set on each wrapper div when <code className="bg-surface px-1 rounded font-mono">inEditMode=true</code>.
                Value is the <em>column</em> key — not the leaf block key — because the CMS
                selection outline targets columns, not individual components.
                Omitted entirely on published pages (no overhead, no DOM pollution).
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
              <p className="text-xs font-semibold text-on-surface mb-1">getPreviewUtils(data)</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                SDK utility used inside block components. Returns a{" "}
                <code className="bg-surface px-1 rounded font-mono">pa(fieldKey)</code> helper that
                spreads <code className="bg-surface px-1 rounded font-mono">data-epi-edit</code> attributes
                onto inline elements — lets editors click directly on a headline or
                paragraph to open the property panel.
              </p>
            </div>
          </div>
        </section>

        {/* Block registry */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Registered Blocks
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            All blocks registered in <code className="bg-surface-low px-1 rounded text-xs font-mono">componentRegistry.ts</code>.
            Each can be placed anywhere in Visual Builder — standalone, in a 2/3/4-column
            grid, or nested inside a section.
          </p>
          <div className="overflow-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Block</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Base type</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Display templates</th>
                </tr>
              </thead>
              <tbody>
                {BLOCKS.map((b, i) => (
                  <tr
                    key={b.name}
                    className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}
                  >
                    <td className="px-4 py-2.5 text-brand">{b.name}</td>
                    <td className="px-4 py-2.5 text-on-surface-variant">{b.baseType}</td>
                    <td className="px-4 py-2.5 text-on-surface-variant">{b.templates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
