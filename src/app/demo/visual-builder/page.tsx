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
  tag: "Centered",          // links to the "Centered" key in the resolver tags object
  settings: {
    height: {
      editor: "select",
      choices: { default: { displayName: "Default" }, tall: { displayName: "Full Viewport" } },
    },
    overlay: { editor: "checkbox", displayName: "Dark Overlay on Image" },
  },
});`;

const COMPONENT_SNIPPET = `type HeroBlockProps = {
  content: ContentProps<typeof HeroBlockType>;
  displaySettings?: ContentProps<typeof HeroCenteredTemplate>;
};

export default function HeroBlock({ content, displaySettings }: HeroBlockProps) {
  const { pa } = getPreviewUtils(content);
  const isTall      = displaySettings?.height === "tall";
  const showOverlay = displaySettings?.overlay === true;

  return (
    <section className={isTall ? "min-h-screen" : "min-h-[640px]"}>
      {content.backgroundImage && (
        <Image
          src={src(content.backgroundImage)}
          className={showOverlay ? "opacity-20" : "opacity-30"}
          fill
        />
      )}
      <h1 {...pa("headline")}>{content.headline}</h1>
      <p  {...pa("subheadline")}>{content.subheadline}</p>
      <a  href={content.ctaLink}>{content.ctaText}</a>
    </section>
  );
}`;

const REGISTRY_SNIPPET = `// src/lib/optimizely/componentRegistry.ts
import { config, initContentTypeRegistry, initDisplayTemplateRegistry } from "@optimizely/cms-sdk";
import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";
import HeroBlock, { HeroBlockType, HeroCenteredTemplate } from "@/components/blocks/HeroBlock";
import DynamicExperience from "@/components/experience/DynamicExperience";
import BlankSection     from "@/components/experience/BlankSection";

// Configure Graph client once — all getClient() calls in page routes use this.
config({ apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "" });

export function initComponentRegistry() {
  initContentTypeRegistry([HeroBlockType, /* … */]);
  initDisplayTemplateRegistry([HeroCenteredTemplate, /* … */]);

  initReactComponentRegistry({
    resolver: {
      // Experience / section types
      DynamicExperience,
      BlankSection,

      // Blocks — tags map displayTemplateKey → component variant
      HeroBlock: {
        default: HeroBlock,
        tags: { Centered: HeroCenteredTemplate }, // HeroCenteredTemplate.tag = "Centered"
      },
    },
  });
}`;

const SDK_QUERY_SNIPPET = `// src/app/[[...slug]]/page.tsx
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

initComponentRegistry(); // registers types + calls config()

async function CmsPage({ params }) {
  const { slug } = await params;
  const client = getClient(); // no env vars needed here — config() set them once

  // SDK auto-generates the full GraphQL query from all registered content types.
  // One call fetches the page + every possible block type in a single round-trip.
  const [page] = await client.getContentByPath(\`/en/\${slug.join("/")}/\`);

  return <OptimizelyComponent content={page} />;
  // OptimizelyComponent reads page.__typename → dispatches to DynamicExperience
  // or TraditionalPage via the resolver — no manual type switching needed.
}

export default withAppContext(CmsPage);`;

const EXPERIENCE_SNIPPET = `// src/components/experience/DynamicExperience.tsx
import { OptimizelyComposition, getPreviewUtils, type ComponentContainerProps }
  from "@optimizely/cms-sdk/react/server";

// Wraps each component node with preview attributes so editors can click-to-edit.
function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;
}

export default function DynamicExperience({ content }: { content: any }) {
  // content.composition.nodes = top-level section + standalone element nodes.
  // OptimizelyComposition walks the tree:
  //   - Component nodes → ComponentWrapper → OptimizelyComponent (dispatches to block)
  //   - Section nodes   → OptimizelyComponent (dispatches to BlankSection)
  return (
    <OptimizelyComposition
      nodes={content?.composition?.nodes ?? []}
      ComponentWrapper={ComponentWrapper}
    />
  );
}`;

const SECTION_SNIPPET = `// src/components/experience/BlankSection.tsx
import { OptimizelyGridSection, getPreviewUtils, type StructureContainerProps }
  from "@optimizely/cms-sdk/react/server";

function Row({ children, node, displaySettings }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  const count  = (node as any).nodes?.length ?? 1;
  const grid   = count === 2 ? "md:grid-cols-2"
               : count === 3 ? "md:grid-cols-3"
               : count >= 4  ? "md:grid-cols-4" : "";
  const gap    = displaySettings?.gap === "compact" ? "gap-4"
               : displaySettings?.gap === "spacious" ? "gap-16" : "gap-8";
  return (
    <div className={[count > 1 ? \`grid grid-cols-1 \${grid}\` : "", gap].join(" ")} {...pa(node)}>
      {children}
    </div>
  );
}

function Column({ children, node, displaySettings }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  const bg      = displaySettings?.background === "surface" ? "bg-surface" : "";
  const padding = displaySettings?.padding === "compact" ? "p-4" : "";
  const rounded = displaySettings?.rounded ? "rounded-2xl" : "";
  return (
    <div className={[bg, padding, rounded].join(" ")} {...pa(node)}>{children}</div>
  );
}

export default function BlankSection({ content }: { content: any }) {
  const { pa } = getPreviewUtils(content);
  // content.nodes = row/column nodes inside the section.
  // OptimizelyGridSection walks rows → columns → dispatches leaf blocks.
  return (
    <section {...pa(content)}>
      <OptimizelyGridSection nodes={content?.nodes ?? []} row={Row} column={Column} />
    </section>
  );
}`;

const PREVIEW_SNIPPET = `// src/app/preview/page.tsx
export const dynamic = "force-dynamic";

import { getClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { PreviewComponent } from "@optimizely/cms-sdk/react/client";
import Script from "next/script";

async function PreviewPage({ searchParams }) {
  const params = await searchParams;
  const client = getClient();

  // getPreviewContent reads preview_token, key, ver, ctx from query params,
  // fetches the draft version, and populates the withAppContext context store.
  const content = await client.getPreviewContent(params as PreviewParams);

  return (
    <>
      {/* Establishes the postMessage channel between the CMS iframe and this page. */}
      <Script src={\`\${process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL}/util/javascript/communicationinjector.js\`} />
      {/* SDK client component that receives live content-change events from the CMS. */}
      <PreviewComponent />
      {/* Same dispatch path as the published page — no separate preview renderer needed. */}
      <OptimizelyComponent content={content} />
    </>
  );
}

export default withAppContext(PreviewPage);`;

// ---------------------------------------------------------------------------
// Block table rows
// ---------------------------------------------------------------------------

const BLOCKS = [
  { name: "HeroBlock",            templates: "HeroCenteredTemplate (tag: Centered)" },
  { name: "ProductHeroBlock",     templates: "ProductHeroCompactTemplate (tag: Compact)" },
  { name: "SectionHeadingBlock",  templates: "SectionHeadingCenteredTemplate (tag: Centered)" },
  { name: "RichTextBlock",        templates: "TextBlockNarrowTemplate (tag: Narrow)" },
  { name: "CallToActionBlock",    templates: "CallToActionOutlineTemplate, CallToActionSurfaceTemplate" },
  { name: "ProductCardBlock",     templates: "ProductCardFeaturedTemplate (tag: Featured)" },
  { name: "FeatureItemBlock",     templates: "FeatureItemOutlinedTemplate, FeatureItemFlatTemplate" },
  { name: "TestimonialBlock",     templates: "TestimonialCardTemplate (tag: Card)" },
  { name: "StatsCounterBlock",    templates: "—" },
  { name: "ImageBlock",           templates: "ImageBlockRoundedTemplate (tag: Rounded)" },
  { name: "FaqContainerBlock",    templates: "—" },
  { name: "FaqItemBlock",         templates: "—" },
  { name: "FeaturedContentBlock", templates: "—" },
  { name: "LogoGridBlock",        templates: "—" },
  { name: "FormContainerBlock",   templates: "—" },
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
            How the Optimizely CMS SDK turns Visual Builder page compositions into
            rendered React — using the SDK&apos;s built-in rendering pipeline instead
            of hand-written GraphQL queries or manual tree-walking.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              SDK · config · getClient · withAppContext
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              OptimizelyComponent · OptimizelyComposition · OptimizelyGridSection
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              15 blocks · display templates · display settings
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Composition model */}
        <section id="composition-model">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Composition Model <a href="#composition-model" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Visual Builder pages are a tree. The SDK flattens and dispatches that
            tree through three components — one per level.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
{`Experience (DynamicExperience)
└── composition.nodes
    └── Section node  → OptimizelyComposition dispatches to BlankSection
        └── content.nodes
            └── Row   → OptimizelyGridSection dispatches to Row component
                └── Column → dispatches to Column component
                    └── HeroBlock → OptimizelyComponent dispatches to HeroBlock`}
          </pre>
          <div className="mt-6 grid sm:grid-cols-3 gap-4 max-w-3xl">
            <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
              <p className="text-xs font-semibold text-on-surface mb-1">OptimizelyComposition</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">Iterates <code className="bg-surface px-1 rounded font-mono">composition.nodes</code>. Dispatches section nodes to their registered component. Wraps leaf blocks with <code className="bg-surface px-1 rounded font-mono">ComponentWrapper</code>.</p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
              <p className="text-xs font-semibold text-on-surface mb-1">OptimizelyGridSection</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">Iterates <code className="bg-surface px-1 rounded font-mono">content.nodes</code> (rows/columns). Calls your custom <code className="bg-surface px-1 rounded font-mono">row</code> and <code className="bg-surface px-1 rounded font-mono">column</code> wrappers so you control layout with Tailwind.</p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
              <p className="text-xs font-semibold text-on-surface mb-1">OptimizelyComponent</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">Reads <code className="bg-surface px-1 rounded font-mono">content.__typename</code> (and <code className="bg-surface px-1 rounded font-mono">__tag</code> for display template variants), looks up the resolver, renders the matching React component.</p>
            </div>
          </div>
        </section>

        {/* Page route */}
        <section id="page-route">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Page Route <a href="#page-route" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded text-xs font-mono">config()</code> sets the
            Graph credentials once at module init. Every page route then calls{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">getClient()</code> — no env vars
            threaded through props. The SDK auto-generates the full GraphQL query from all
            registered content types, so one{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">getContentByPath()</code> call
            fetches the page and every possible block type in a single round-trip. The{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">withAppContext</code> HOC
            initialises request-scoped context storage required for preview utilities.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{SDK_QUERY_SNIPPET}</code>
          </pre>
        </section>

        {/* Registry */}
        <section id="component-registry">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Component Registry <a href="#component-registry" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded text-xs font-mono">initComponentRegistry()</code>{" "}
            is called once (guarded by an <code className="bg-surface-low px-1 rounded text-xs font-mono">initialized</code> flag)
            and registers all content types, display templates, and React components. Display template
            variants use the <code className="bg-surface-low px-1 rounded text-xs font-mono">tags</code> pattern
            so the SDK routes by <code className="bg-surface-low px-1 rounded text-xs font-mono">displayTemplateKey</code>{" "}
            automatically — no manual <code className="bg-surface-low px-1 rounded text-xs font-mono">if/switch</code> on the template key in components.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{REGISTRY_SNIPPET}</code>
          </pre>
        </section>

        {/* Experience and Section components */}
        <section id="experience-section">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Experience & Section Components <a href="#experience-section" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The SDK provides <code className="bg-surface-low px-1 rounded text-xs font-mono">OptimizelyComposition</code>{" "}
            and <code className="bg-surface-low px-1 rounded text-xs font-mono">OptimizelyGridSection</code> to walk
            the composition tree. You only need to supply the layout components —
            the SDK handles all JSON traversal.
          </p>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                DynamicExperience — top-level composition entry point
              </p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{EXPERIENCE_SNIPPET}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                BlankSection — row/column grid rendering
              </p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{SECTION_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section id="preview-route">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Preview Route <a href="#preview-route" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded text-xs font-mono">getPreviewContent()</code>{" "}
            reads the <code className="bg-surface-low px-1 rounded text-xs font-mono">preview_token</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">key</code>, and{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">ver</code> query params,
            fetches the draft content, and stores them in the{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">withAppContext</code> context — which{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">getPreviewUtils</code> reads to know
            whether to emit <code className="bg-surface-low px-1 rounded text-xs font-mono">data-epi-*</code> attributes.
            The rendered output goes through the exact same{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">OptimizelyComponent</code> path
            as the published page — no separate preview renderer.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{PREVIEW_SNIPPET}</code>
          </pre>
        </section>

        {/* Building a block */}
        <section id="building-a-block">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Building a Block <a href="#building-a-block" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Each block colocates its{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">contentType()</code> definition,
            optional <code className="bg-surface-low px-1 rounded text-xs font-mono">displayTemplate()</code> definitions,
            and the React component. The component receives typed{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">content</code> and{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">displaySettings</code> props;
            the SDK dispatches the right variant via the <code className="bg-surface-low px-1 rounded text-xs font-mono">tags</code> registry entry.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Content type + display template</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{CONTENT_TYPE_SNIPPET}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">React component (typed props + display settings)</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
                <code>{COMPONENT_SNIPPET}</code>
              </pre>
            </div>
          </div>
          <div className="mt-6 bg-surface-low border border-ghost-border rounded-2xl p-5 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">Checklist — adding a new block</p>
            <ol className="text-sm text-on-surface-variant space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Create <code className="bg-surface px-1 rounded text-xs font-mono">src/components/blocks/MyBlock/index.tsx</code> — export <code className="bg-surface px-1 rounded text-xs font-mono">MyBlockType</code> (contentType) and default component.</li>
              <li>Add <code className="bg-surface px-1 rounded text-xs font-mono">MyBlockType</code> to <code className="bg-surface px-1 rounded text-xs font-mono">initContentTypeRegistry()</code> in <code className="bg-surface px-1 rounded text-xs font-mono">componentRegistry.ts</code>.</li>
              <li>Add <code className="bg-surface px-1 rounded text-xs font-mono">MyBlock</code> to <code className="bg-surface px-1 rounded text-xs font-mono">initReactComponentRegistry()</code> resolver — use <code className="bg-surface px-1 rounded text-xs font-mono">{"{ default: MyBlock, tags: { Variant: MyBlockVariant } }"}</code> if you have display template variants.</li>
              <li>Register display templates via <code className="bg-surface px-1 rounded text-xs font-mono">initDisplayTemplateRegistry()</code>.</li>
              <li>Push updated content types to CMS: <code className="bg-surface px-1 rounded text-xs font-mono">npm run opti:push</code></li>
            </ol>
          </div>
        </section>

        {/* Block registry */}
        <section id="registered-blocks">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Registered Blocks <a href="#registered-blocks" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            All blocks registered in{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">componentRegistry.ts</code>.
            Tags are the key the SDK uses to dispatch to a variant component when an
            editor selects that display template in Visual Builder.
          </p>
          <div className="overflow-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Block</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Display templates (tag key)</th>
                </tr>
              </thead>
              <tbody>
                {BLOCKS.map((b, i) => (
                  <tr
                    key={b.name}
                    className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}
                  >
                    <td className="px-4 py-2.5 text-brand">{b.name}</td>
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
