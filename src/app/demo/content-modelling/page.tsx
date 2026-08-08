import type { Metadata } from "next";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";

export const metadata: Metadata = {
  title: "Content Modelling Demo",
};


const ELEMENT_SNIPPET = `// src/components/blocks/StatsCounterBlock/index.tsx
export const StatsCounterBlockType = contentType({
  key: "StatsCounterBlock",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"], // leaf - no children
  properties: {
    value:  { type: "string" },
    suffix: { type: "string" },
    label:  { type: "string" },
  },
});`;

const SECTION_SNIPPET = `// src/components/blocks/FaqContainerBlock/index.tsx
export const FaqContainerBlockType = contentType({
  key: "FaqContainerBlock",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"], // container - can hold children
  properties: {
    heading:  { type: "string" },
    faqItems: {
      type: "array",                          // content area - editors add items here
      items: { type: "content", allowedTypes: [FaqItemBlockType] },
    },
  },
});`;

const NAMING_GOOD = `// Good - describes what the content IS
export const TestimonialBlockType = contentType({ key: "TestimonialBlock", … });
export const PricingTierBlockType  = contentType({ key: "PricingTierBlock",  … });
export const SectionHeadingBlockType = contentType({ key: "SectionHeadingBlock", … });`;

const NAMING_BAD = `// Avoid - describes how it looks today (breaks after a redesign)
export const BlueCardBlockType     = contentType({ key: "BlueCardBlock",     … });
export const BigBoldHeadingType    = contentType({ key: "BigBoldHeading",    … });
export const ThreeColumnGridType   = contentType({ key: "ThreeColumnGrid",   … });`;

const DISPLAY_TEMPLATE_SNIPPET = `// src/components/blocks/TestimonialBlock/index.tsx
// One content type - identical fields - two visual presentations.
export const TestimonialCardTemplate = displayTemplate({
  key: "TestimonialCardTemplate",
  displayName: "Quote in a card (boxed)",
  contentType: "TestimonialBlock",
  tag: "Card",              // links to resolver tags.Card
  settings: {
    theme: {
      editor: "select",
      choices: {
        default: { displayName: "White" },
        brand:   { displayName: "Dark blue (brand)" },
      },
    },
  },
});

export const TestimonialMinimalTemplate = displayTemplate({
  key: "TestimonialMinimalTemplate",
  displayName: "Inline quote, no background",
  contentType: "TestimonialBlock",
  tag: "Minimal",           // links to resolver tags.Minimal
  settings: { … },
});

// Registry maps both tags to the SAME component - it reads displayTemplateKey
// to switch rendering logic internally.
TestimonialBlock: {
  default: TestimonialBlock,
  tags: { Card: TestimonialBlock, Minimal: TestimonialBlock },
}`;

const INLINE_SNIPPET = `// Inline composition - content lives inside the page composition.
// Graph inline-expands type:"array" automatically. No extra fetch needed.
export const ProductHeroBlockType = contentType({
  properties: {
    title:    { type: "string" },
    features: {
      type: "array",
      items: { type: "content", allowedTypes: [FeatureItemBlockType] },
    },
  },
});`;

const REFERENCE_SNIPPET = `// Referenced content - block exists independently, linked from many pages.
// Graph returns only base metadata (_Content) for type:"content" single references.
// Resolve the full item in the PARENT PAGE before passing it down.

// src/components/pages/TraditionalPage.tsx
export default async function TraditionalPage({ content }) {
  let featuredBlock = content.featuredBlock ?? null;

  // featuredBlock came back as _Content (base metadata only) - fetch the full item
  if (featuredBlock?.__typename === "_Content" && featuredBlock?._metadata?.key) {
    featuredBlock = await getClient()
      .getContent({ key: featuredBlock._metadata.key }, { next: { revalidate: 60 } })
      .catch(() => null);
  }

  return (
    // featuredBlock is now fully resolved - OptimizelyComponent can dispatch it
    <div>
      {featuredBlock && featuredBlock.__typename !== "_Content" && (
        <OptimizelyComponent content={featuredBlock} />
      )}
    </div>
  );
}`;

const PROPERTY_STRING = `// string - short text, no formatting
headline:  { type: "string", displayName: "Headline", indexingType: "searchable", isLocalized: true },
badge:     { type: "string", displayName: "Badge Label",   isLocalized: true },
ctaText:   { type: "string", displayName: "Button Label",  isLocalized: true },`;

const PROPERTY_RICH = `// richText - long-form, editor gets a formatting toolbar
// Graph returns { json: {...} } - render with <RichText content={bio.json} />
bio:  { type: "richText", displayName: "Author Bio",    indexingType: "searchable", isLocalized: true },
body: { type: "richText", displayName: "Article Body",  indexingType: "searchable", isLocalized: true },`;

const PROPERTY_URL = `// url - Graph returns { default: "https://…" }
// Unwrap with: const href = value?.default ?? value
ctaLink:     { type: "url", displayName: "Button URL" },
linkedinUrl: { type: "url", displayName: "LinkedIn Profile" },`;

const PROPERTY_REF = `// contentReference - single image or content item
// Graph returns only base metadata (_metadata.url, displayName, key).
// If you need full field data → resolve in the parent page component.
authorImage:     { type: "contentReference", allowedTypes: ["_image"],   indexingType: "disabled" },
backgroundImage: { type: "contentReference", allowedTypes: ["_image"],   indexingType: "disabled" },`;

const PROPERTY_ARRAY = `// array - ordered list, inline-expanded by Graph automatically
// Use this for content areas editors populate in Visual Builder.
faqItems: {
  type: "array",
  items: { type: "content", allowedTypes: [FaqItemBlockType] },
},
logos: {
  type: "array",
  items: { type: "content", allowedTypes: ["_image"] },
},`;

const GET_CONTENT_SINGLE = `// src/components/pages/ArticlePage.tsx
// The page receives an author contentReference - Graph returns only its key.
// getClient().getContent() fetches the full item without writing a query.
import { getClient } from "@optimizely/cms-sdk";

const author = await getClient().getContent(
  { key: content.author._metadata.key },
  { next: { revalidate: 300 } }
);`;

const GET_CONTENT_ARRAY = `// src/components/blocks/TimelineBlock/index.tsx
// milestones is a contentReference array - each item arrives as a key only.
// Fetch all in parallel; order is preserved by Promise.all.
import { getClient } from "@optimizely/cms-sdk";

const milestones = await Promise.all(
  keys.map((key) =>
    getClient().getContent({ key }, { next: { revalidate: 300 } })
  )
);`;

const INDEXING_SNIPPET = `// indexingType controls how Graph indexes a property.
// Only three values exist - and not all are valid on every type.

// "searchable" - full-text search. Apply to prose a user would type.
headline:    { type: "string",   displayName: "Headline",     indexingType: "searchable" },
bio:         { type: "richText", displayName: "Author Bio",   indexingType: "searchable" },
question:    { type: "string",   displayName: "Question",     indexingType: "searchable" },

// "queryable" - filter / sort in Graph. Apply to metadata, not prose.
publishDate: { type: "dateTime", displayName: "Publish Date", indexingType: "queryable" },
category:    { type: "string",   displayName: "Category",     indexingType: "queryable" },
navOrder:    { type: "integer",  displayName: "Nav Order",    indexingType: "queryable" },

// "disabled" - exclude from the index. Required on image contentReferences.
// contentReference fields only accept "disabled" - "searchable" / "queryable"
// are not valid on reference types and will be rejected by the CMS on push.
heroImage:   { type: "contentReference", allowedTypes: ["_image"], indexingType: "disabled" },

// omitting indexingType entirely - fine for fields you never query
ctaText:     { type: "string",   displayName: "CTA Text" },`;

const LOCALIZED_SNIPPET = `// isLocalized: true - editor stores a separate value per language.
// Add to every field a site visitor reads. Omit from structural fields.

// Localize: all user-visible text
headline:    { type: "string",   displayName: "Headline",  indexingType: "searchable", isLocalized: true },
body:        { type: "richText", displayName: "Body",      indexingType: "searchable", isLocalized: true },
columns:     { type: "json",     displayName: "Columns",                               isLocalized: true },
altText:     { type: "string",   displayName: "Alt Text",                              isLocalized: true },

// Do NOT localize: URLs, booleans, integers, dates, enums, identifiers
ctaLink:     { type: "url",      displayName: "CTA URL" },     // same URL for all locales
highlighted: { type: "boolean",  displayName: "Recommended" }, // structural flag
navOrder:    { type: "integer",  displayName: "Nav Order" },   // sort order
publishDate: { type: "dateTime", displayName: "Publish Date" }, // same timestamp
category:    { type: "string",   displayName: "Category",  indexingType: "queryable" }, // enum key`;

const SPECTRUM_COMPONENT = `// type: "component" - inline embed
// The child is stored inside the parent record. No independent CMS identity.
cta: {
  type: "component",
  contentType: ButtonComponentType,
  displayName: "CTA Button",
}`;

const SPECTRUM_CONTENT = `// type: "content" - Content Area Item (single slot)
// The parent stores a pointer to an independent content item.
// Graph returns only _metadata (key, url) - fields are NOT inline-expanded.
featuredBlock: {
  type: "content",
  allowedTypes: [FaqContainerBlockType],
  displayName: "Featured FAQ Block",
}`;

const SPECTRUM_ARRAY = `// type: "array" - Content Area (ordered list)
// Graph DOES inline-expand these - all item fields arrive in the page query.
faqItems: {
  type: "array",
  items: { type: "content", allowedTypes: [FaqItemBlockType] },
  displayName: "FAQ Items",
}`;

const SPECTRUM_REFERENCE = `// type: "contentReference" - reference to existing content only
// Editors pick from the content tree - they cannot create inline.
// With allowedTypes: Graph returns _metadata (key + url) only.
// With contentType (specific type): Graph returns the full object.
backgroundImage: {
  type: "contentReference",
  allowedTypes: ["_image"],
  displayName: "Background Image",
  indexingType: "disabled",
}`;


function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
      {children}{" "}
      <a
        href={`#${id}`}
        className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg"
      >
        #
      </a>
    </h2>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-surface-low px-1 rounded text-xs font-mono">{children}</code>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-brand/10 text-brand border border-brand/20">
      {children}
    </span>
  );
}


export default function ContentModellingPage() {
  return (
    <>

      <DemoHero
        title="Content Modelling"
        description="How to structure content in a headless CMS so editors can work efficiently, developers can query predictably, and the design can evolve without breaking everything."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          {["Composable", "Reusable", "Type-safe", "Graph-ready"].map((b) => (
            <span
              key={b}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand"
            >
              {b}
            </span>
          ))}
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* 1. Content model strategies */}
        <section id="content-model-strategies">
          <SectionHeading id="content-model-strategies">Content Model Strategies</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Before choosing base types or composition behaviors, you pick an{" "}
            <em>approach</em> for discovering the model itself. Every approach serves
            the same two principles: <strong>separate content from presentation</strong>{" "}
            (so the design can change without re-modelling) and{" "}
            <strong>design for reuse</strong> (so a block built once works everywhere).
            There are three common approaches.{" "}
            <a href="https://docs.developers.optimizely.com/content-management-system/v1.0.0-CMS-SaaS/docs/content-modeling-saas#content-model-strategies" target="_blank" rel="noopener" className="text-brand hover:underline">Docs ↗</a>
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Top-down</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                Start from a high-level overview - the main content types you need
                (marketing pages, articles, product pages) - then work down into each
                one&apos;s sections and fields, one level at a time.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-1">
                <span className="font-semibold text-on-surface">When:</span> content
                categories and hierarchy are already clear and well-defined.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                <span className="font-semibold text-on-surface">Tradeoff:</span> gives
                a clear structure fast, but can miss small details that only show up
                during the build.
              </p>
              <p className="text-xs text-on-surface-variant">
                <Pill>LandingPage</Pill>{" "}
                <Pill>ArticlePage</Pill>{" "}
                <Pill>BusinessBankingPage</Pill>
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Bottom-up</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                Begin at the smallest level - a button, a heading, a stat - and
                group those small building blocks up into larger blocks and, eventually,
                whole pages.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-1">
                <span className="font-semibold text-on-surface">When:</span> starting
                from existing assets, or when field-level requirements are well understood.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                <span className="font-semibold text-on-surface">Tradeoff:</span> slower
                to show a whole page early, but yields flexible, highly reusable
                components.
              </p>
              <p className="text-xs text-on-surface-variant">
                <Pill>ButtonBlock</Pill>{" "}
                <Pill>SectionHeadingBlock</Pill>{" "}
                <Pill>HeroBlock</Pill>
              </p>
            </Callout>
            <Callout variant="do" label="Hybrid - recommended">
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                Sketch the major content types top-down, then detail each one bottom-up
                from reusable elements - and iterate between the two as you learn.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-1">
                <span className="font-semibold text-on-surface">When:</span> most
                projects - it balances architectural clarity with practical build
                concerns.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                <span className="font-semibold text-on-surface">Tradeoff:</span> you go
                back and forth as you learn, but it avoids the downsides of the other two.
              </p>
              <p className="text-xs text-on-surface-variant">
                <Pill>DynamicExperience</Pill>{" "}
                <Pill>HeroBlock</Pill>{" "}
                <Pill>TestimonialBlock</Pill>
              </p>
            </Callout>
          </div>

          <div className="overflow-auto rounded-2xl border border-ghost-border mb-8">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Strategy</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Start from</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Best when</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Tradeoff</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { strategy: "Top-down",  from: "High-level content types (pages)",     best: "Categories and hierarchy already clear", tradeoff: "Fast clarity, can miss field-level detail" },
                  { strategy: "Bottom-up", from: "Atomic reusable elements",             best: "Existing assets or well-known fields",   tradeoff: "Reusable parts, slower to a whole page" },
                  { strategy: "Hybrid",    from: "Both - pages first, then elements",    best: "Most projects",                          tradeoff: "Needs iteration, lowest overall risk" },
                ].map((row, i) => (
                  <tr key={row.strategy} className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}>
                    <td className="px-4 py-3 font-semibold text-on-surface">{row.strategy}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.from}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.best}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.tradeoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-on-surface-variant mb-4 font-medium">
            The hybrid approach in practice - how this repo&apos;s Mosey Bank model was built:
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: "1",
                title: "Map the pages (top-down)",
                body: "List the page types Mosey Bank needs - Experience marketing pages, plus ArticlePage, CaseStudyPage and TeamMemberPage for structured content.",
              },
              {
                step: "2",
                title: "Factor out elements (bottom-up)",
                body: "Pull the pieces those pages share into reusable blocks - HeroBlock, StatsCounterBlock, TestimonialBlock and ButtonBlock - each modelled once and reused everywhere.",
              },
              {
                step: "3",
                title: "Wire together and iterate",
                body: "Assign each block its compositionBehaviors and slot it into the three-tier model, refining fields as real content lands.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-brand flex items-center justify-center text-on-brand text-sm font-bold font-display">
                  {s.step}
                </div>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-on-surface mb-1">{s.title}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <Callout variant="note" label="It all serves the same two principles" className="mt-6 max-w-3xl">
            <p className="text-xs">
              Whichever strategy you pick, the goal is the same: keep{" "}
              <strong>content separate from presentation</strong> (styling lives in{" "}
              <a href="#display-templates-vs-types" className="text-brand hover:underline">display templates</a>, not content types)
              and <strong>design for reuse</strong> (model a concept once, reference it
              from many pages). The mechanics for both are covered in the sections below -
              starting with the <a href="#three-tiers" className="text-brand hover:underline">three-tier model</a>.
            </p>
          </Callout>
        </section>

        {/* 2. Three tiers */}
        <section id="three-tiers">
          <SectionHeading id="three-tiers">The Three-Tier Model</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Every piece of content in Visual Builder lives at one of three levels.
            Knowing these levels tells you which{" "}
            <Code>compositionBehaviors</Code> to give a block, and how editors build
            pages - before you write a single line of component code.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          {/* Visual tree */}
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed mb-6">
{`Experience  (DynamicExperience / LandingPage)   ← the page - owns the URL and SEO metadata
└── Section  (BlankSection / FaqContainerBlock)  ← layout container - groups elements into rows/columns
    └── Element  (HeroBlock / StatsCounterBlock) ← a single block with nothing inside it`}
          </pre>

          <div className="grid md:grid-cols-3 gap-4">
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Experience</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                The page itself. Sets the URL, language, SEO metadata, and overall
                layout. Registered with{" "}
                <Code>baseType: &quot;_experience&quot;</Code>.
              </p>
              <p className="text-xs text-on-surface-variant">
                Examples:{" "}
                <Pill>DynamicExperience</Pill>{" "}
                <Pill>LandingPage</Pill>
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Section</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                A layout container inside the page. Groups elements into rows and
                columns. Must have <Code>sectionEnabled</Code> in{" "}
                <Code>compositionBehaviors</Code>. Can optionally hold a{" "}
                <Code>type: &quot;array&quot;</Code> content area.
              </p>
              <p className="text-xs text-on-surface-variant">
                Examples:{" "}
                <Pill>FaqContainerBlock</Pill>{" "}
                <Pill>LogoGridBlock</Pill>
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Element</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                A single content block with nothing inside it. Editors place it
                inside sections in Visual Builder. Must have{" "}
                <Code>elementEnabled</Code> in <Code>compositionBehaviors</Code>.
              </p>
              <p className="text-xs text-on-surface-variant">
                Examples:{" "}
                <Pill>StatsCounterBlock</Pill>{" "}
                <Pill>FeatureItemBlock</Pill>
              </p>
            </Callout>
          </div>

          <div className="mt-6 max-w-md">
            <p className="text-xs font-mono text-on-surface-variant mb-2">
              Custom section with typed children
            </p>
            <div className="border-2 border-brand/25 rounded-xl p-4 bg-surface-lowest">
              <p className="text-xs font-mono text-brand/60 mb-3">
                Experience - DynamicExperience
              </p>
              <div className="border border-on-surface-variant/20 rounded-lg p-3">
                <p className="text-xs font-mono text-on-surface-variant/60 mb-2">
                  Section - FaqContainerBlock{" "}
                  <span className="text-brand/50">[sectionEnabled]</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["FAQ Item 1", "FAQ Item 2", "FAQ Item 3"].map((item) => (
                    <div key={item} className="bg-surface-low rounded-md p-2 text-center">
                      <p className="text-[10px] font-mono text-brand/50 mb-0.5">Element</p>
                      <p className="text-[11px] text-on-surface-variant">FaqItemBlock</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant mt-3 max-w-3xl leading-relaxed">
            <Code>FaqContainerBlock</Code> has <Code>sectionEnabled</Code> and a{" "}
            <Code>type: &quot;array&quot;</Code> property - so editors add{" "}
            <Code>FaqItemBlock</Code> children directly on the section in Visual Builder.
            The SDK&apos;s built-in <Code>BlankSection</Code> works the same way at the
            layout level, but it accepts any <Code>elementEnabled</Code> block rather
            than a fixed list of allowed types.
          </p>
        </section>

        {/* 3. Page types */}
        <section id="page-types">
          <SectionHeading id="page-types">
            Page Types - Experience vs Page
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Optimizely SaaS CMS supports two base types for pages. Which one to use
            determines whether a page&apos;s layout is owned by the editor in Visual
            Builder or by the developer in React code.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Code>_experience</Code>
                <span className="text-xs text-on-surface-variant">base type</span>
              </div>
              <p className="text-xs font-semibold text-on-surface mb-3">Experience - editor-owned layout</p>
              <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
                <li>The editor assembles the page in Visual Builder by placing blocks into sections and columns.</li>
                <li>The React component (<Code>DynamicExperience</Code>) renders the layout the editor built using <Code>OptimizelyComposition</Code> - no layout logic lives in the component.</li>
                <li>Best for marketing pages, landing pages, homepages - anything where an editor needs layout control.</li>
                <li>Graph returns the full composition tree in one query - no extra fetches needed for composition nodes.</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-brand/10">
                <p className="text-[10px] font-mono text-brand/60 mb-1">Examples in this repo</p>
                <div className="flex flex-wrap gap-1">
                  {["LandingPage", "BusinessBankingPage", "InvestmentsPage"].map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-tertiary/20 bg-tertiary/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Code>_page</Code>
                <span className="text-xs text-on-surface-variant">base type</span>
              </div>
              <p className="text-xs font-semibold text-on-surface mb-3">Page - developer-owned layout</p>
              <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
                <li>The React component defines the layout. The editor only fills in content fields (headline, body, heroImage, etc.).</li>
                <li>Properties are defined with <Code>contentType()</Code> just like any block - Graph returns them as typed fields.</li>
                <li>Best for structured content with a consistent layout: article pages, team profiles, case studies.</li>
                <li><Code>type: &quot;content&quot;</Code> single-reference fields return just the basics from Graph (like the item&apos;s ID) - fetch the full item in the page component using <Code>getClient().getContent()</Code>.</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-tertiary/10">
                <p className="text-[10px] font-mono text-tertiary/60 mb-1">Examples in this repo</p>
                <div className="flex flex-wrap gap-1">
                  {["ArticlePage", "CaseStudyPage", "TeamMemberPage"].map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Callout label="How both page types reach the screen">
            <p>
              Both page types go through the same <Code>OptimizelyComponent</Code> - the part that picks the right React component to render. The catch-all route calls{" "}
              <Code>getContentByPath()</Code>, which returns either a{" "}
              <Code>DynamicExperience</Code> or a <Code>TraditionalPage</Code> (or any other registered type).{" "}
              <Code>OptimizelyComponent</Code> reads <Code>__typename</Code> and sends it to the matching React
              component - so there is no <Code>if/switch</Code> on the type in the route.
              The key difference is what that component does with its{" "}
              <Code>content</Code> prop - and it is only one extra step.{" "}
              <strong>Both then render components.</strong> An Experience first loops over{" "}
              <Code>content.composition.nodes</Code> (the blocks the editor arranged)
              and renders the component for each one. A Page skips that loop and renders
              its component straight from named fields like <Code>content.heading</Code>{" "}
              and <Code>content.body</Code>. In this app that means React components; on a
              native app or another framework it is whatever view that platform renders.
            </p>
          </Callout>

          <div className="mt-8">
            <p className="text-xs font-mono text-on-surface-variant mb-3">How each type renders</p>
            <div className="grid grid-cols-2 gap-5 max-w-2xl">
              <div>
                <p className="text-xs font-semibold text-brand mb-3 text-center">Experience</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-full rounded-lg border border-brand/25 bg-brand/5 p-3 text-xs text-on-surface-variant text-center min-h-[3.75rem] flex items-center justify-center">
                    Graph returns the saved layout
                  </div>
                  <p className="text-on-surface-variant/50 text-sm leading-none">↓</p>
                  <div className="w-full rounded-lg border-2 border-brand/40 bg-brand/10 p-3 text-xs text-on-surface text-center font-medium min-h-[3.75rem] flex items-center justify-center">
                    Loop over <span className="font-mono">&nbsp;composition.nodes</span>
                  </div>
                  <p className="text-on-surface-variant/50 text-sm leading-none">↓</p>
                  <div className="w-full rounded-lg border border-ghost-border bg-surface-low p-3 text-xs text-on-surface text-center min-h-[3.75rem] flex items-center justify-center gap-1">
                    <span className="text-green-500">✓</span> Render each block&apos;s component
                  </div>
                  <p className="text-on-surface-variant/50 text-sm leading-none">↓</p>
                  <div className="w-full rounded-lg border border-ghost-border bg-surface-lowest p-2 text-xs text-on-surface-variant text-center">
                    HTML page
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-tertiary mb-3 text-center">Page</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-full rounded-lg border border-tertiary/20 bg-tertiary/5 p-3 text-xs text-on-surface-variant text-center min-h-[3.75rem] flex items-center justify-center">
                    Graph returns the content fields
                  </div>
                  <p className="text-on-surface-variant/50 text-sm leading-none">↓</p>
                  <div className="w-full rounded-lg border border-dashed border-on-surface-variant/20 p-3 text-xs text-on-surface-variant/40 text-center italic min-h-[3.75rem] flex items-center justify-center">
                    no loop needed
                  </div>
                  <p className="text-on-surface-variant/50 text-sm leading-none">↓</p>
                  <div className="w-full rounded-lg border border-ghost-border bg-surface-low p-3 text-xs text-on-surface text-center min-h-[3.75rem] flex items-center justify-center gap-1">
                    <span className="text-green-500">✓</span> Render the component from fields
                  </div>
                  <p className="text-on-surface-variant/50 text-sm leading-none">↓</p>
                  <div className="w-full rounded-lg border border-ghost-border bg-surface-lowest p-2 text-xs text-on-surface-variant text-center">
                    HTML page
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant mt-3 max-w-2xl leading-relaxed">
              Both paths end in the same step - rendering the required components. The only
              difference is that an Experience loops over the blocks the editor arranged
              first, while a Page renders straight from its fields.
            </p>
          </div>

          <div className="mt-6 overflow-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Dimension</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Experience (_experience)</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Page (_page)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dim: "Layout owner", exp: "Editor in Visual Builder", trad: "Developer in React" },
                  { dim: "What Graph sends back", exp: "The full layout the editor built, with all block data", trad: "The page's content fields (heading, body, etc.)" },
                  { dim: "Single references", exp: "N/A - blocks are built into the layout", trad: "Just the basics - fetch the full item in the page component" },
                  { dim: "Ideal for", exp: "Marketing pages, campaign pages, homepages", trad: "Articles, profiles, structured documents" },
                  { dim: "Editor control", exp: "High - editor controls block order and layout", trad: "Low - layout is fixed in code" },
                ].map((row, i) => (
                  <tr key={row.dim} className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}>
                    <td className="px-4 py-3 font-semibold text-on-surface">{row.dim}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.exp}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.trad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Governance - editor flexibility vs lockdown */}
        <section id="governance">
          <SectionHeading id="governance">
            Governance - Editor Flexibility vs Lockdown
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A content model is also a set of guardrails. Too loose and editors can
            break brand and layout consistency; too tight and every small change needs
            a developer. Good modelling opens up the <em>content</em> - the copy and
            imagery editors own - while locking down the <em>structure</em> - the
            layouts and block types the brand depends on.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-brand">← Editor flexibility</span>
              <span className="text-tertiary">Developer control →</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-brand via-on-surface-variant/25 to-tertiary" />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Most editor freedom</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                An Experience with broad content areas. Editors control layout,
                block order, and which blocks appear in Visual Builder.
              </p>
              <Pill>Experience</Pill>
            </div>
            <div className="rounded-2xl border border-on-surface-variant/15 bg-surface-lowest p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Freedom within guardrails</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                An Experience with curated <Code>allowedTypes</Code>{" "}
                and a fixed set of display-template settings. Editors compose freely,
                but only from an approved palette.
              </p>
              <Pill>allowedTypes</Pill>{" "}
              <Pill>displayTemplate</Pill>
            </div>
            <div className="rounded-2xl border border-tertiary/20 bg-tertiary/5 p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Most developer control</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                A Page with a fixed React layout. Editors only fill in named
                content fields - the structure is owned entirely in code.
              </p>
              <Pill>Page</Pill>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-ghost-border mb-8">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Mechanism</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">What it constrains</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Governance effect</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { mech: "Page-type choice (_experience vs _page)", constrains: "Who owns the page layout",                        effect: "Editor-driven layout vs a developer-fixed one" },
                  { mech: "compositionBehaviors",                    constrains: "Where a block may be placed (element vs section)", effect: "Stops editors nesting the wrong things in the wrong slots" },
                  { mech: "mayContainTypes",                         constrains: "Which child content types a page or folder may hold", effect: "Enforces the intended information architecture" },
                  { mech: "Content-area allowedTypes",               constrains: "Which blocks fit a specific type: array slot",     effect: "A testimonials section only accepts TestimonialBlock" },
                  { mech: "Display-template settings (choices)",      constrains: "Which visual options an editor sees",             effect: "Bounded, plain-English choices instead of free CSS" },
                ].map((row, i) => (
                  <tr key={row.mech} className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}>
                    <td className="px-4 py-3 font-mono text-brand">{row.mech}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.constrains}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Callout variant="do" label="Do - lock structure, open content">
              <ul className="space-y-1.5 text-xs">
                <li>Fix the layout of transactional and legal pages where consistency is non-negotiable</li>
                <li>Restrict content areas to the block types that belong there via <Code>allowedTypes</Code></li>
                <li>Offer visual variety through curated display-template <Code>choices</Code>, not free-form styling</li>
                <li>Leave the actual copy, imagery, and ordering to editors</li>
              </ul>
            </Callout>
            <Callout variant="warning" label="Avoid - the two failure modes">
              <ul className="space-y-1.5 text-xs">
                <li><strong>Too open</strong> - every block allowed everywhere. Editors can build off-brand, broken layouts, and no one can reason about a page&apos;s shape.</li>
                <li><strong>Too locked</strong> - a developer is needed for every text tweak. Editors are blocked, and the CMS stops earning its keep.</li>
              </ul>
            </Callout>
          </div>

          <Callout variant="note" label="Governance is strategy made concrete" className="max-w-3xl">
            <p className="text-xs">
              These mechanisms are how you deliver <em>flexibility within guardrails</em>.
              Your chosen{" "}
              <a href="#content-model-strategies" className="text-brand hover:underline">content model strategy</a>{" "}
              decides <em>what</em> to model; governance decides <em>how much control</em>{" "}
              editors get over each piece of it.
            </p>
          </Callout>
        </section>

        {/* 5. compositionBehaviors - elementEnabled vs sectionEnabled */}
        <section id="composition-behaviors">
          <SectionHeading id="composition-behaviors">
            elementEnabled vs sectionEnabled
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <Code>compositionBehaviors</Code> is the single most important property
            on a content type. It controls where editors can place a block in Visual
            Builder and whether it can contain other blocks.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/8-experience.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">
                <Code>[&quot;elementEnabled&quot;]</Code>
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                A single block with nothing inside it. Cannot have a{" "}
                <Code>type: &quot;array&quot;</Code> content area property - the CMS
                will silently ignore it. Editors place it inside sections.
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">
                <Code>[&quot;sectionEnabled&quot;]</Code>
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                A container only. Can have <Code>type: &quot;array&quot;</Code>{" "}
                content areas. Cannot be placed inside another section. The SDK
                lays out the child blocks for you via <Code>OptimizelyGridSection</Code>.
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">
                <Code>[&quot;sectionEnabled&quot;, &quot;elementEnabled&quot;]</Code>
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Flexible - editors can place it at either level. Use when a block
                works both standalone (e.g. a testimonial section) and inside a
                grid (e.g. a testimonial card within a 3-col row).
              </p>
            </Callout>
          </div>

          <p className="text-xs text-on-surface-variant mb-4 font-medium">
            Rule of thumb: if the block has a <Code>type: &quot;array&quot;</Code> property → <Code>sectionEnabled</Code>.
            A single block with nothing inside it → <Code>elementEnabled</Code>. Unsure → both.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <CodeBlock code={ELEMENT_SNIPPET} label="elementEnabled - a standalone block" />
            <CodeBlock code={SECTION_SNIPPET} label="sectionEnabled - container block" />
          </div>
        </section>

        {/* 6. Naming */}
        <section id="naming">
          <SectionHeading id="naming">Name for Purpose, Not Appearance</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Content type names should describe <em>what the content is</em>, not
            how it looks today. Visual names break the moment the design changes -
            and they mislead editors about what belongs inside a block.
            Display templates handle the <em>how it looks</em> side.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Callout variant="do" label="Do - semantic names">
              <p>Name after the content&apos;s purpose or real-world concept.</p>
              <ul className="mt-2 space-y-1">
                <li><Pill>TestimonialBlock</Pill> - a customer quote with attribution</li>
                <li><Pill>PricingTierBlock</Pill> - a plan with price + feature list</li>
                <li><Pill>SectionHeadingBlock</Pill> - a heading + optional subheading</li>
                <li><Pill>HeroBlock</Pill> - the top-of-page primary message</li>
              </ul>
            </Callout>
            <Callout variant="warning" label="Avoid - visual/presentation names">
              <p>Avoid names that describe the CSS or layout - they rot fast.</p>
              <ul className="mt-2 space-y-1">
                <li><Pill>BlueCardBlock</Pill> - what if the colour changes?</li>
                <li><Pill>BigBoldHeading</Pill> - size is a display template setting</li>
                <li><Pill>ThreeColumnGrid</Pill> - column count is a layout concern</li>
                <li><Pill>BigHeroWithOverlay</Pill> - the overlay is a display setting</li>
              </ul>
            </Callout>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <CodeBlock code={NAMING_GOOD} label="semantic naming" />
            <CodeBlock code={NAMING_BAD} label="presentation naming - avoid" />
          </div>
        </section>

        {/* 7. Display templates vs new types */}
        <section id="display-templates-vs-types">
          <SectionHeading id="display-templates-vs-types">
            Display Template vs New Content Type
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The most common modelling decision: should a visual variation be a new
            content type or a display template on an existing one? It comes down to
            whether the <em>fields</em> are different.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/9-display-settings.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Callout variant="do" label="Do - use a display template when">
              <ul className="space-y-1.5">
                <li>The fields are <strong>identical</strong> - only the visual style differs</li>
                <li>An editor needs to pick a style without changing the content</li>
                <li>Examples: same <Pill>TestimonialBlock</Pill> shown as a white card or dark blue card - same quote, same author, different background</li>
                <li>Same <Pill>SectionHeadingBlock</Pill> shown left-aligned or centred</li>
              </ul>
            </Callout>
            <Callout variant="do" label="Do - create a new content type when">
              <ul className="space-y-1.5">
                <li>The content has <strong>different fields</strong> - a Testimonial has quote + author; a Pricing Tier has price + features list</li>
                <li>Editors need to search for or reuse this content independently across pages</li>
                <li>The content makes semantic sense as its own thing, not just a styled version of another</li>
              </ul>
            </Callout>
          </div>

          <CodeBlock code={DISPLAY_TEMPLATE_SNIPPET} label="one content type, two display templates" />
        </section>

        {/* 8. Reuse patterns */}
        <section id="reuse-patterns">
          <SectionHeading id="reuse-patterns">
            Content Reuse: Inline vs Referenced
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Blocks can be <em>composed inline</em> - created inside a page&apos;s
            Visual Builder session - or <em>referenced</em> - existing as
            independent CMS items linked from multiple pages. The choice affects
            how Graph fetches the data and how editors manage it.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-3">
                Inline composition - <Code>type: &quot;array&quot;</Code>
              </p>
              <ul className="text-xs text-on-surface-variant space-y-2 leading-relaxed">
                <li>Block is created <em>inside</em> the page - editing it affects only this page</li>
                <li>Graph includes the full data for <Code>type: &quot;array&quot;</Code> content areas automatically - no extra fetch needed</li>
                <li>Best for page-specific content: hero text, feature lists, stats grids</li>
                <li>Examples: <Pill>FeatureItemBlock</Pill> inside a business banking page, <Pill>StatsCounterBlock</Pill> in a grid</li>
              </ul>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-3">
                Referenced content - <Code>type: &quot;contentReference&quot;</Code>
              </p>
              <ul className="text-xs text-on-surface-variant space-y-2 leading-relaxed">
                <li>Block exists as its own CMS item - editing it once updates everywhere it&apos;s used</li>
                <li>Best for shared content: author bios, legal disclaimers, global FAQs</li>
                <li>Graph returns just the basics for single references - fetch the full data in the parent page component using <Code>getClient().getContent()</Code></li>
                <li>Examples: <Pill>AuthorBlock</Pill> linked from 10 articles, <Pill>FaqContainerBlock</Pill> on the FAQ page</li>
              </ul>
            </Callout>
          </div>

          <Callout variant="warning" label="Gotcha">
            <strong><Code>type: &quot;content&quot;</Code> single references return just the basics from Graph (like the item&apos;s ID)</strong>{" "}
            - even when the field is set. Graph only includes the full data for{" "}
            <Code>type: &quot;array&quot;</Code> content areas. For referenced blocks
            that need their own field data, fetch them in the{" "}
            <strong>parent page component</strong> using{" "}
            <Code>getClient().getContent({"{ key }"})</Code> before passing the
            block down. Never add self-fetch logic inside the block itself.
          </Callout>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <CodeBlock code={INLINE_SNIPPET} label="inline - array content area (Graph auto-expands)" />
            <CodeBlock code={REFERENCE_SNIPPET} label="referenced - parent resolves via getClient().getContent()" />
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-mono text-on-surface-variant mb-2">
                ContentArea - type: &quot;array&quot; (inline composition)
              </p>
              <div className="border border-ghost-border rounded-xl p-4 bg-surface-lowest h-full">
                <div className="border-2 border-brand/25 rounded-lg p-3 mb-3">
                  <p className="text-xs font-mono text-brand/60 mb-2">Page - Business Banking</p>
                  <div className="space-y-1.5">
                    {[
                      "Q: What are your business rates?",
                      "Q: How do I open an account?",
                      "Q: Can I add team members?",
                    ].map((q) => (
                      <div
                        key={q}
                        className="bg-surface-low rounded-md px-3 py-2 text-[11px] text-on-surface-variant"
                      >
                        {q}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-on-surface-variant/50 mt-2">
                    faqItems[ ] - lives inside this page composition
                  </p>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Items are created inside this page. Editing one affects only this page.
                  Delete the page and the items are gone.
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-mono text-on-surface-variant mb-2">
                ContentReference - type: &quot;contentReference&quot; (shared item)
              </p>
              <div className="border border-ghost-border rounded-xl p-4 bg-surface-lowest h-full">
                <div className="flex flex-col gap-2 mb-3">
                  {[
                    "Article: Q3 Report",
                    "Article: Product Launch",
                    "Article: Year in Review",
                  ].map((article) => (
                    <div key={article} className="flex items-center gap-2">
                      <div className="bg-surface-low rounded-md px-3 py-1.5 text-[11px] text-on-surface-variant flex-1">
                        {article}
                      </div>
                      <svg
                        className="w-4 h-4 text-brand/40 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </div>
                  ))}
                  <div className="border-2 border-brand/25 rounded-lg px-3 py-2 text-center mt-1">
                    <p className="text-[10px] font-mono text-brand/60 mb-0.5">
                      AuthorBlock - shared CMS item
                    </p>
                    <p className="text-xs font-semibold text-on-surface">Jane Smith</p>
                    <p className="text-[10px] text-on-surface-variant">Senior Writer</p>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  The AuthorBlock exists on its own. Editing it once updates every article
                  that references it. Graph returns just the basics - the parent page
                  fetches the full item via getClient().getContent() before rendering.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8b. The four ways to relate content */}
        <section id="content-spectrum">
          <SectionHeading id="content-spectrum">
            The four ways to relate content
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            The inline-vs-referenced choice above is really a spectrum of four property types. They
            differ in how tightly the child is coupled to its parent, how Graph resolves them in
            queries, and whether editing the child affects every parent that uses it.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="space-y-3">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">type: &quot;component&quot;</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  The child is stored <strong>inside</strong> the parent record. It has no independent
                  identity in the CMS - it only exists as part of this parent.
                </p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Graph: </span>Inline-expanded automatically</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Example: </span>CTA button on a hero block</p>
              </div>
              <CodeBlock code={SPECTRUM_COMPONENT} />
            </div>

            <div className="space-y-3">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">type: &quot;content&quot;</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  A single slot for an independent item. The editor can pick an existing item
                  or create a new inline block. Updating the referenced item affects every parent.
                </p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Graph: </span>Returns <Code>_metadata</Code> only - must self-fetch</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Example: </span>Featured FAQ on a product page</p>
              </div>
              <CodeBlock code={SPECTRUM_CONTENT} />
            </div>

            <div className="space-y-3">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">type: &quot;array&quot;</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  An ordered list of Content Area Items. Editors add blocks via drag-and-drop.
                  Graph <em>does</em> inline-expand these - all fields arrive with the page query.
                </p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Graph: </span>Inline-expanded automatically</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Example: </span>FAQ items list, logo grid</p>
              </div>
              <CodeBlock code={SPECTRUM_ARRAY} />
            </div>

            <div className="space-y-3">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">type: &quot;contentReference&quot;</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  A reference to an existing item only - editors pick from the content tree,
                  they cannot create inline. The only reference type available on{" "}
                  <Code>elementEnabled</Code> blocks.
                </p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Graph: </span>Full object (specific type) or <Code>_metadata</Code> (allowedTypes)</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Example: </span>Background image on a hero</p>
              </div>
              <CodeBlock code={SPECTRUM_REFERENCE} />
            </div>
          </div>

          <p className="text-sm font-semibold text-on-surface mb-3">CMS terminology vs SDK types</p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The Optimizely CMS UI and the official docs use different names than the SDK property
            types. This table maps them so you can read either without confusion.
          </p>
          <div className="overflow-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">CMS UI / docs term</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold font-mono">SDK type</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">When Graph expands it</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Can create inline?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { term: "Content Area", sdk: 'array (items: { type: "content" })', graph: "Always - all items inlined", inline: "Yes" },
                  { term: "Content Area Item (standalone)", sdk: "content", graph: "Never - _metadata only", inline: "Yes" },
                  { term: "Content Reference", sdk: "contentReference", graph: "Only with specific contentType", inline: "No" },
                  { term: "Component / Block (in UI)", sdk: "component", graph: "Always (no _metadata wrapper)", inline: "Stored inside parent" },
                ].map((row, i) => (
                  <tr
                    key={row.term}
                    className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}
                  >
                    <td className="px-4 py-3 text-on-surface-variant">{row.term}</td>
                    <td className="px-4 py-3 font-mono text-brand">{row.sdk}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.graph}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.inline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 8c. Content drift and single source of truth */}
        <section id="content-drift">
          <SectionHeading id="content-drift">
            Content drift and single source of truth
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The reason the reference-vs-embed choice matters editorially: embedded content diverges
            over time. The more pages that hold their own copy of a piece of content, the higher the
            chance that some copies get updated and others don&apos;t. This is content drift - an
            editorial risk, not a developer bug.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-green-700 mb-3">Referenced - single source of truth</p>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                A promo block is referenced from 12 landing pages. The marketing team updates the
                offer text once in the CMS. All 12 pages show the new text after the next publish and
                ISR revalidation.
              </p>
              <p className="text-xs text-on-surface-variant italic">Edit count: 1. Pages updated: 12.</p>
            </div>
            <div className="bg-surface-lowest border border-orange-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-orange-700 mb-3">Embedded - copied on save</p>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                The same promo is embedded as a <Code>type: &quot;component&quot;</Code> on each page.
                To update the offer text, an editor must open and re-publish all 12 pages individually.
              </p>
              <p className="text-xs text-on-surface-variant italic">Edit count: 12. Risk of inconsistency: high.</p>
            </div>
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 max-w-3xl mb-8">
            <p className="text-sm font-semibold text-on-surface mb-4">A real scenario</p>
            <ol className="space-y-3 text-sm text-on-surface-variant leading-relaxed list-none">
              {[
                "A legal disclaimer appears on 40 product pages. Each page has its own embedded copy.",
                "Legal sends a correction. A developer updates the disclaimer on 3 pages and marks the ticket done.",
                "The remaining 37 pages still show the old, incorrect disclaimer.",
                "Six months later, no one knows which pages are correct - there are now multiple versions in the wild.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-brand font-bold shrink-0 tabular-nums">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-on-surface mt-5 pt-5 border-t border-ghost-border">
              <strong>The fix:</strong> model the disclaimer as a single referenced content item.
              Legal updates it once - all 40 pages reflect the change automatically.
            </p>
          </div>

          <p className="text-sm font-semibold text-on-surface mb-4">When to reference vs embed</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-green-700 mb-4">
                Content Area (<Code>type: &quot;array&quot;</Code>) when:
              </p>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {[
                  "An ordered list of blocks editors assemble themselves",
                  "Items need drag-and-drop reordering in Visual Builder",
                  "Each item has its own fields editors fill in",
                  "Examples: FAQ list, logo grid, feature items, team members",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-green-600 shrink-0">-</span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-green-700 mb-4">
                Reference (<Code>type: &quot;content&quot;</Code> / <Code>type: &quot;contentReference&quot;</Code>) when:
              </p>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {[
                  "The same item appears on multiple pages",
                  "Editors need to update it once and see it everywhere",
                  "The item has its own editorial lifecycle (draft, review, publish)",
                  "Examples: shared promo, legal disclaimer, author bio, featured FAQ",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-green-600 shrink-0">-</span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <p className="text-xs font-semibold text-on-surface mb-4">
                Embed (<Code>type: &quot;component&quot;</Code>) when:
              </p>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {[
                  "The child is specific to this parent - no meaning outside it",
                  "Editors configure it per-parent, not from a shared library",
                  "It changes alongside the parent and only the parent",
                  "Examples: CTA button on a hero block, price badge on a product card",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-brand/50 shrink-0">-</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 9. Property types */}
        <section id="property-types">
          <SectionHeading id="property-types">
            Choosing the Right Property Type
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Each property type gives the editor a different input in the CMS,
            and comes back in a different shape from Graph. Choosing the right one
            affects both the editing experience and how you render the field in React.
          </p>

          <div className="overflow-auto rounded-2xl border border-ghost-border mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold font-mono">type</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Use when</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Graph returns</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Examples</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: "string",           useWhen: "Short text, no formatting needed",               returns: "Plain string",                       examples: "title, ctaText, badge, value" },
                  { type: "richText",         useWhen: "Long-form - editors need bold, links, headings",  returns: "{ json: {...} } - render with <RichText>", examples: "bio, body, description" },
                  { type: "url",              useWhen: "Links and external URLs",                         returns: "{ default: \"https://…\" }",              examples: "ctaLink, linkedinUrl" },
                  { type: "contentReference", useWhen: "Single image or content item",                    returns: "Just the basics (_metadata.url)",     examples: "authorImage, backgroundImage" },
                  { type: "array",            useWhen: "Ordered list of blocks (content area)",           returns: "The full data, included automatically", examples: "faqItems, logos, navItems" },
                ].map((row, i) => (
                  <tr
                    key={row.type}
                    className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}
                  >
                    <td className="px-4 py-3 font-mono text-brand">{row.type}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.useWhen}</td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-on-surface-variant/70">{row.returns}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Callout label="Indexing and localization" className="mb-4 max-w-3xl">
            <p>
              See the{" "}
              <a href="#indexing-and-localization" className="text-brand hover:underline">
                Graph Indexing and Localization
              </a>{" "}
              section below for a full guide on <Code>indexingType</Code> values and{" "}
              <Code>isLocalized</Code>.
            </p>
          </Callout>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CodeBlock code={PROPERTY_STRING} label="string" />
            <CodeBlock code={PROPERTY_RICH}   label="richText" />
            <CodeBlock code={PROPERTY_URL}    label="url" />
            <CodeBlock code={PROPERTY_REF}    label="contentReference" />
            <CodeBlock code={PROPERTY_ARRAY}  label="array (content area)" />
          </div>
        </section>

        {/* 10. Fetching referenced content */}
        <section id="fragment-colocation">
          <SectionHeading id="fragment-colocation">Fetching Referenced Content</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            For most blocks you do not write a GraphQL query at all.{" "}
            <Code>client.getContentByPath()</Code> in the catch-all page route fetches
            the full composition - every section, every inline element - in one
            request automatically.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The exception is <em>referenced content</em>. Graph does not include the full
            data for single <Code>type: &quot;contentReference&quot;</Code> properties - the component
            receives just the basics (the item&apos;s key). To get the full field data, call{" "}
            <Code>getClient().getContent(&#123; key &#125;)</Code> directly inside the
            component. No GraphQL query, no fragment file needed.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {[
              {
                step: "1",
                title: "SDK fetches the page automatically",
                body: "client.getContentByPath() retrieves the full composition. Inline blocks receive all their fields - no extra work required.",
              },
              {
                step: "2",
                title: "Referenced content returns keys only",
                body: "Single contentReference properties don't include the full data. The component receives just the basics - key, URL - not the full fields.",
              },
              {
                step: "3",
                title: "Call getContent() with the key",
                body: "getClient().getContent({ key }) fetches the full item. No manual GraphQL query. Works for single references and reference arrays alike.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-brand flex items-center justify-center text-on-brand text-sm font-bold font-display">
                  {s.step}
                </div>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-on-surface mb-1">{s.title}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <CodeBlock code={GET_CONTENT_SINGLE} label="single reference - ArticlePage fetching its author" />
            <CodeBlock code={GET_CONTENT_ARRAY}  label="reference array - TimelineBlock fetching its milestones" />
          </div>

          <Callout label="Which blocks use this in this demo" className="mt-4 max-w-3xl">
            <p>
              <Code>TimelineBlock</Code>, <Code>TeamGridBlock</Code>,{" "}
              <Code>ArticlePage</Code>, and <Code>CaseStudyPage</Code> all use{" "}
              <Code>getClient().getContent()</Code> to fetch their referenced content.
              Blocks whose content already arrives in full through the page
              layout (most blocks) need no self-fetch at all.
            </p>
          </Callout>
        </section>

        {/* 11. Indexing and localization */}
        <section id="indexing-and-localization">
          <SectionHeading id="indexing-and-localization">
            Graph Indexing and Localization
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Two per-field settings control how Graph stores and serves your
            content: <Code>indexingType</Code> decides whether a field can be
            searched or filtered in Graph queries, and <Code>isLocalized</Code>{" "}
            tells the CMS to store a separate value for each language.
          </p>

          {/* indexingType */}
          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            indexingType
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Only three values exist. The main rule: <Code>&quot;searchable&quot;</Code>{" "}
            and <Code>&quot;queryable&quot;</Code> work on basic value fields only
            (<Code>string</Code>, <Code>richText</Code>, <Code>integer</Code>,{" "}
            <Code>dateTime</Code>, <Code>boolean</Code>). The CMS rejects them on{" "}
            <Code>contentReference</Code> fields - those only accept{" "}
            <Code>&quot;disabled&quot;</Code>.
          </p>

          <div className="overflow-auto rounded-2xl border border-ghost-border mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="text-left px-4 py-3 font-mono text-on-surface-variant font-semibold">value</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">What it enables</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Apply to</th>
                  <th className="text-left px-4 py-3 text-on-surface-variant font-semibold">Examples in this repo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    value: "searchable",
                    what: "Full-text search in Graph queries",
                    apply: "Prose a user would type into a search box",
                    examples: "headline, title, summary, body, bio, question, answer",
                  },
                  {
                    value: "queryable",
                    what: "Filter / sort in Graph queries",
                    apply: "Metadata fields - dates, categories, flags, numbers",
                    examples: "publishDate, category, navOrder, includeInNavigation",
                  },
                  {
                    value: "disabled",
                    what: "Exclude from the Graph index entirely",
                    apply: "Image contentReferences. Required - binary content cannot be indexed.",
                    examples: "heroImage, backgroundImage, avatar, photo, logos",
                  },
                ].map((row, i) => (
                  <tr key={row.value} className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}>
                    <td className="px-4 py-3 font-mono text-brand">{row.value}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.what}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.apply}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CodeBlock code={INDEXING_SNIPPET} label="indexingType - all three values with notes" />

          {/* isLocalized */}
          <h3 className="font-display text-lg font-bold text-on-surface mb-2 mt-10">
            isLocalized
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            When <Code>isLocalized: true</Code> is set, the CMS stores a separate
            value for each language - editors can provide a French headline and an
            English headline for the same block. Without it, all languages share
            a single value.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Callout variant="do" label="Localize">
              <ul className="space-y-1 text-xs">
                <li>All <Code>string</Code> fields visible to site visitors (headlines, labels, CTA text, alt text)</li>
                <li>All <Code>richText</Code> fields (bio, body, description)</li>
                <li><Code>json</Code> fields containing display text (table columns/rows)</li>
              </ul>
            </Callout>
            <Callout variant="warning" label="Do NOT localize">
              <ul className="space-y-1 text-xs">
                <li><Code>url</Code> fields - the same URL serves all languages</li>
                <li><Code>boolean</Code>, <Code>integer</Code>, <Code>dateTime</Code> - behind-the-scenes values</li>
                <li>Fixed-choice keys (<Code>category</Code>, <Code>industry</Code>) - the key is shared; the label shown to visitors is stored separately</li>
                <li>Technical identifiers (<Code>fieldName</Code>, <Code>rendition</Code>, <Code>icon</Code>)</li>
              </ul>
            </Callout>
          </div>

          <CodeBlock code={LOCALIZED_SNIPPET} label="isLocalized - what to set and what to leave unset" />

          <Callout label="Gotcha - breaking change" className="mt-4 max-w-3xl">
            <p>
              Adding <Code>isLocalized: true</Code> to an existing field is a breaking
              schema change. The CMS CLI will refuse to push without{" "}
              <Code>--force</Code>. Existing content keeps its value in the default
              locale; other locales start empty. Plan accordingly before enabling
              localization on a field that already has published content.
            </p>
          </Callout>
        </section>

      </div>
    </>
  );
}
