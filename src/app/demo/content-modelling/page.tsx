import type { Metadata } from "next";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";

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
// Graph returns only base metadata for type:"content" single references.
// Self-fetch inside the component to get the full field data.
export default async function FaqContainerBlock(props) {
  let data = props.content ?? props;

  // Graph didn't inline-expand the standalone reference → self-fetch
  if (!data.heading) {
    const res = await graphqlFetch(FETCH_QUERY, {}, { next: { revalidate: 60 } });
    data = res.FaqContainerBlock?.items?.[0] ?? data;
  }
  // … render
}`;

const PROPERTY_STRING = `// string - short text, no formatting
headline:  { type: "string", displayName: "Headline", indexingType: "searchable" },
badge:     { type: "string", displayName: "Badge Label" },
ctaText:   { type: "string", displayName: "Button Label" },`;

const PROPERTY_RICH = `// richText - long-form, editor gets a formatting toolbar
// Graph returns { json: {...} } - render with <RichText content={bio.json} />
bio:         { type: "richText", displayName: "Author Bio" },
body:        { type: "richText", displayName: "Article Body" },`;

const PROPERTY_URL = `// url - Graph returns { default: "https://…" }
// Unwrap with: const href = value?.default ?? value
ctaLink:     { type: "url", displayName: "Button URL" },
linkedinUrl: { type: "url", displayName: "LinkedIn Profile" },`;

const PROPERTY_REF = `// contentReference - single image or content item
// Graph returns only base metadata (_metadata.url, displayName, key).
// If you need full field data → use self-fetching pattern.
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

function Pre({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-ghost-border">
      {label && (
        <div className="bg-surface-low border-b border-ghost-border px-4 py-2">
          <span className="text-xs font-mono text-on-surface-variant">{label}</span>
        </div>
      )}
      <pre className="bg-surface-lowest p-5 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
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

        {/* 1. Three tiers */}
        <section id="three-tiers">
          <SectionHeading id="three-tiers">The Three-Tier Model</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Every piece of content in Visual Builder lives at one of three levels.
            Understanding this hierarchy determines what{" "}
            <Code>compositionBehaviors</Code> to assign and how editors build
            pages - before writing a single line of component code.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          {/* Visual tree */}
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed mb-6">
{`Experience  (DynamicExperience / LandingPage)   ← the page - owns the URL and SEO metadata
└── Section  (BlankSection / FaqContainerBlock)  ← layout container - groups elements into rows/columns
    └── Element  (HeroBlock / StatsCounterBlock) ← leaf block - pure content, no children`}
          </pre>

          <div className="grid md:grid-cols-3 gap-4">
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Experience</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                The page itself. Sets the URL, locale, SEO metadata, and overall
                layout strategy. Registered with{" "}
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
                A leaf content block. Has no children. Placed inside sections by
                editors in Visual Builder. Must have{" "}
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
            layout level but accepts any <Code>elementEnabled</Code> block rather than
            a typed list.
          </p>
        </section>

        {/* 2. compositionBehaviors */}
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
                Leaf node only. Cannot have a <Code>type: &quot;array&quot;</Code>{" "}
                content area property - the CMS will silently ignore it. Placed
                inside sections by editors.
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">
                <Code>[&quot;sectionEnabled&quot;]</Code>
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Container only. Can have <Code>type: &quot;array&quot;</Code>{" "}
                content areas. Cannot be placed inside another section. The SDK
                dispatches child blocks via <Code>OptimizelyGridSection</Code>.
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
            Pure content, no children → <Code>elementEnabled</Code>. Unsure → both.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Pre code={ELEMENT_SNIPPET} label="elementEnabled - leaf block" />
            <Pre code={SECTION_SNIPPET} label="sectionEnabled - container block" />
          </div>
        </section>

        {/* 3. Naming */}
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
            <Pre code={NAMING_GOOD} label="semantic naming" />
            <Pre code={NAMING_BAD} label="presentation naming - avoid" />
          </div>
        </section>

        {/* 4. Display templates vs new types */}
        <section id="display-templates-vs-types">
          <SectionHeading id="display-templates-vs-types">
            Display Template vs New Content Type
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The most common modelling decision: should a visual variation be a new
            content type or a display template on an existing one? The answer
            hinges on whether the <em>fields</em> differ.{" "}
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

          <Pre code={DISPLAY_TEMPLATE_SNIPPET} label="one content type, two display templates" />
        </section>

        {/* 5. Reuse patterns */}
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
                <li>Graph inline-expands <Code>type: &quot;array&quot;</Code> content areas automatically - no extra fetch needed</li>
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
                <li>Graph returns only base metadata for single references - full field data requires a self-fetch inside the component</li>
                <li>Examples: <Pill>AuthorBlock</Pill> linked from 10 articles, <Pill>FaqContainerBlock</Pill> on the FAQ page</li>
              </ul>
            </Callout>
          </div>

          <Callout variant="warning" label="Gotcha">
            <strong><Code>type: &quot;content&quot;</Code> single references return only base metadata from Graph</strong>{" "}
            - regardless of whether the field is set. Graph only inline-expands{" "}
            <Code>type: &quot;array&quot;</Code> content areas. For referenced blocks
            that need their own field data, use the self-fetching pattern: call{" "}
            <Code>graphqlFetch</Code> directly inside the component when the
            expected fields are absent.
          </Callout>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Pre code={INLINE_SNIPPET} label="inline - array content area (Graph auto-expands)" />
            <Pre code={REFERENCE_SNIPPET} label="referenced - self-fetching pattern" />
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
                  The AuthorBlock exists independently. Editing it once updates every article
                  that references it. Graph returns only its base metadata - full field data
                  requires a self-fetch inside the component.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Property types */}
        <section id="property-types">
          <SectionHeading id="property-types">
            Choosing the Right Property Type
          </SectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Each property type maps to a different editor experience in the CMS
            and a different shape in the Graph response. Choosing correctly
            affects both the editing UX and how you render the field in React.
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
                  { type: "contentReference", useWhen: "Single image or content item",                    returns: "Base metadata only (_metadata.url)",  examples: "authorImage, backgroundImage" },
                  { type: "array",            useWhen: "Ordered list of blocks (content area)",           returns: "Full inline-expanded objects",        examples: "faqItems, logos, navItems" },
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

          <Callout label="Indexing tip" className="mb-4 max-w-3xl">
            <p>
              Add <Code>indexingType: &quot;searchable&quot;</Code> to <Code>string</Code> fields editors
              should be able to search via Graph (e.g. <Code>heading</Code>,{" "}
              <Code>quote</Code>). Use <Code>indexingType: &quot;disabled&quot;</Code> for{" "}
              <Code>contentReference</Code> image fields - Graph can&apos;t index
              binary content and will throw if you omit it.
            </p>
          </Callout>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Pre code={PROPERTY_STRING} label="string" />
            <Pre code={PROPERTY_RICH}   label="richText" />
            <Pre code={PROPERTY_URL}    label="url" />
            <Pre code={PROPERTY_REF}    label="contentReference" />
            <Pre code={PROPERTY_ARRAY}  label="array (content area)" />
          </div>
        </section>

        {/* 7. Fetching referenced content */}
        <section id="fragment-colocation">
          <SectionHeading id="fragment-colocation">Fetching Referenced Content</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            For most blocks you do not write a GraphQL query at all.{" "}
            <Code>client.getContentByPath()</Code> in the catch-all page route fetches
            the full composition - every section, every inline element - in one
            request automatically.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The exception is <em>referenced content</em>. Graph does not inline-expand
            single <Code>type: &quot;contentReference&quot;</Code> properties - the component
            receives only base metadata (the item&apos;s key). To get full field data, call{" "}
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
                body: "Single contentReference properties are not inline-expanded. The component receives base metadata - key, URL - not the full fields.",
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
            <Pre code={GET_CONTENT_SINGLE} label="single reference - ArticlePage fetching its author" />
            <Pre code={GET_CONTENT_ARRAY}  label="reference array - TimelineBlock fetching its milestones" />
          </div>

          <Callout label="Which blocks use this in this demo" className="mt-4 max-w-3xl">
            <p>
              <Code>TimelineBlock</Code>, <Code>TeamGridBlock</Code>,{" "}
              <Code>ArticlePage</Code>, and <Code>CaseStudyPage</Code> all use{" "}
              <Code>getClient().getContent()</Code> to fetch their referenced content.
              Blocks whose content arrives fully inline-expanded via the page
              composition (most blocks) need no self-fetch at all.
            </p>
          </Callout>
        </section>

      </div>
    </>
  );
}
