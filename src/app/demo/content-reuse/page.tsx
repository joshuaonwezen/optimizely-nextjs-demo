import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const faqContainerTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/FaqContainerBlock/index.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Content Reuse",
};

const COMPONENT_SNIPPET = `// type: "component" - inline embed
// The child is stored inside the parent record. No independent CMS identity.
cta: {
  type: "component",
  contentType: ButtonComponentType,
  displayName: "CTA Button",
}`;

const CONTENT_REF_SNIPPET = `// type: "content" - Content Area Item (single slot)
// The parent stores a pointer to an independent content item.
// Graph returns only _metadata (key, url) - fields are NOT inline-expanded.
featuredBlock: {
  type: "content",
  allowedTypes: [FaqContainerBlockType],
  displayName: "Featured FAQ Block",
}`;

const ARRAY_SNIPPET = `// type: "array" - Content Area (ordered list)
// Graph DOES inline-expand these - all item fields arrive in the page query.
faqItems: {
  type: "array",
  items: { type: "content", allowedTypes: [FaqItemBlockType] },
  displayName: "FAQ Items",
}`;

const CONTENT_REFERENCE_SNIPPET = `// type: "contentReference" - reference to existing content only
// Editors pick from the content tree - they cannot create inline.
// With allowedTypes: Graph returns _metadata (key + url) only.
// With contentType (specific type): Graph returns the full object.
backgroundImage: {
  type: "contentReference",
  allowedTypes: ["_image"],
  displayName: "Background Image",
  indexingType: "disabled",
}`;

const CONTENT_AREA_DEFINITION_SNIPPET = `// Full content area definition with constraints
export const FaqContainerBlockType = contentType({
  key: "FaqContainerBlock",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"], // sectionEnabled required for arrays
  properties: {
    heading: { type: "string" },
    faqItems: {
      type: "array",
      items: {
        type: "content",
        allowedTypes: [FaqItemBlockType], // restricts what editors can drop in
      },
      displayName: "FAQ Items",
      minItems: 1,   // editor must add at least one item
      maxItems: 20,  // upper bound
    },
  },
});`;

const CONTENT_AREA_GRAPH_SNIPPET = `# Graph query for a content area
# Graph inlines all items - use inline fragments to access typed fields.
# __typename tells you which concrete type each item is.
query {
  FaqContainerBlock(limit: 1) {
    items {
      heading
      faqItems {
        __typename
        ... on FaqItemBlock {
          question
          answer
        }
      }
    }
  }
}`;

const CONTENT_REF_TYPED_SNIPPET = `// contentReference with a specific contentType
// Graph returns the full typed object - no self-fetch needed.
featuredAuthor: {
  type: "contentReference",
  contentType: AuthorBlockType, // typed - Graph expands to full AuthorBlock fields
  displayName: "Featured Author",
}

// Usage in the component - fields arrive directly:
export default function ArticlePage({ content }) {
  const author = content.featuredAuthor; // full fields, no extra fetch
  return <div>{author.name} - {author.bio}</div>;
}`;

const CONTENT_REF_ALLOWED_SNIPPET = `// contentReference with allowedTypes
// Graph returns _metadata (key + url) only - same as type: "content" standalone.
// Use for images and DAM assets where you only need the URL.
backgroundImage: {
  type: "contentReference",
  allowedTypes: ["_image"],
  indexingType: "disabled", // required for image references
}

// In the component - only _metadata.url is available:
const bgUrl = content.backgroundImage?._metadata?.url?.default;`;

const SELF_FETCH_SNIPPET = `// src/components/blocks/FaqContainerBlock/index.tsx
//
// FaqContainerBlock placed as a single reference receives only _metadata
// from the page query. The guard clause detects this and self-fetches.

export default async function FaqContainerBlock(props) {
  let data = props.content ?? props;

  if (!data.heading) {
    const res = await graphqlFetch(FETCH_QUERY, {}, { next: { revalidate: 60 } });
    data = res.data?.FaqContainerBlock?.items?.[0] ?? data;
  }

  return <div>...</div>;
}`;

const GET_CONTENT_SNIPPET = `// SDK 2.0.0 alternative: getContent() by key or graph:// reference.
// _metadata.key and _metadata.url.graph are always present on references.

import { getClient } from "@optimizely/cms-sdk";

export default async function FeaturedBlock({ content }) {
  let data = content;

  if (!data.headline && data._metadata?.key) {
    // Option A - fetch by CMS key
    data = await getClient().getContent({ key: data._metadata.key });
  }

  // Option B - fetch by graph:// URL directly
  // data = await getClient().getContent(data._metadata.url.graph);

  return <div>{data.headline}</div>;
}

// Add previewToken for draft content:
// data = await getClient().getContent({ key }, { previewToken: token });`;

export default function ContentReuseDemoPage() {
  return (
    <>
      <DemoHero
        title="Content Reuse"
        description="Referenced vs. embedded content - when one update should propagate everywhere, when copies are intentional, and how Graph handles each in queries."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="spectrum">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Four ways to relate content
            <SectionAnchor id="spectrum" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            The SDK offers four property types for attaching content to a parent. They differ in
            how tightly the child is coupled to its parent, how Graph resolves them in queries,
            and whether editing the child affects every parent that uses it.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <CodeBlock code={COMPONENT_SNIPPET} />
            </div>

            <div className="space-y-3">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">type: &quot;content&quot;</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  A single slot for an independent item. The editor can pick an existing item
                  or create a new inline block. Updating the referenced item affects every parent.
                </p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Graph: </span>Returns <code className="bg-surface px-1 rounded font-mono">_metadata</code> only - must self-fetch</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Example: </span>Featured FAQ on a product page</p>
              </div>
              <CodeBlock code={CONTENT_REF_SNIPPET} />
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
              <CodeBlock code={ARRAY_SNIPPET} />
            </div>

            <div className="space-y-3">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">type: &quot;contentReference&quot;</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  A reference to an existing item only - editors pick from the content tree,
                  they cannot create inline. The only reference type available on{" "}
                  <code className="bg-surface px-1 rounded font-mono text-xs">elementEnabled</code> blocks.
                </p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Graph: </span>Full object (specific type) or <code className="bg-surface px-1 rounded font-mono">_metadata</code> (allowedTypes)</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Example: </span>Background image on a hero</p>
              </div>
              <CodeBlock code={CONTENT_REFERENCE_SNIPPET} />
            </div>
          </div>
        </section>

        <section id="cms-terminology">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            CMS terminology vs SDK types
            <SectionAnchor id="cms-terminology" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The Optimizely CMS UI and the official docs use different names than the SDK property types.
            This table maps them so you can read either without confusion.
          </p>

          <div className="overflow-auto rounded-2xl border border-ghost-border mb-6">
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

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Content Area</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                What Visual Builder calls the drop zone where editors add blocks. Backed by a{" "}
                <code className="bg-surface px-1 rounded font-mono">type: &quot;array&quot;</code> property.
                Each block dropped into it is a Content Area Item. Editors drag-and-drop to reorder.
                Items can be newly created inline blocks (no separate CMS record) or existing items
                pulled in from the content tree.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Content Area Item</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Two meanings depending on context. (1) Each individual block inside a Content Area.
                (2) A standalone <code className="bg-surface px-1 rounded font-mono">type: &quot;content&quot;</code> property -
                a single editable slot. In both cases, editors can create new inline or pick existing.
                Standalone items return only <code className="bg-surface px-1 rounded font-mono">_metadata</code> from Graph.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Content Reference</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                A{" "}
                <code className="bg-surface px-1 rounded font-mono">type: &quot;contentReference&quot;</code>{" "}
                property. Editors can only pick existing content - there is no create-inline option.
                Most common use is images and DAM assets. The only reference type that works on{" "}
                <code className="bg-surface px-1 rounded font-mono">elementEnabled</code> blocks.
              </p>
            </div>
          </div>
        </section>

        <section id="content-area">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Content Area deep dive
            <SectionAnchor id="content-area" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A Content Area (<code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;array&quot;</code>)
            is an ordered, editable list of blocks. Understanding its constraints and how Graph
            handles it determines how you define and query content area properties.
          </p>

          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div className="space-y-3">
              <p className="text-xs font-medium text-on-surface-variant">Definition with constraints</p>
              <CodeBlock code={CONTENT_AREA_DEFINITION_SNIPPET} label="contentType() - array with minItems / maxItems" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium text-on-surface-variant">Querying with inline fragments</p>
              <CodeBlock code={CONTENT_AREA_GRAPH_SNIPPET} label="Graph - inline fragments required for typed fields" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "allowedTypes",
                body: "Restricts which content types editors can drop in. Set on the items object. Without it, any content type is allowed.",
                code: 'items: { type: "content", allowedTypes: [FaqItemBlockType] }',
              },
              {
                label: "minItems / maxItems",
                body: "Validation constraints. minItems makes the area required. maxItems caps how many blocks editors can add.",
                code: "minItems: 1, maxItems: 20",
              },
              {
                label: "sectionEnabled required",
                body: "Content areas are silently ignored on elementEnabled blocks. The block must have sectionEnabled in compositionBehaviors.",
                code: 'compositionBehaviors: ["sectionEnabled"]',
              },
              {
                label: "Graph inlining",
                body: "Graph inlines all items in a single query. No extra fetch needed. Use __typename + inline fragments to access typed fields.",
                code: "... on FaqItemBlock { question answer }",
              },
            ].map(({ label, body, code }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-on-surface mb-2 font-mono">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-3">{body}</p>
                <code className="text-xs font-mono text-brand bg-surface px-2 py-1 rounded block">{code}</code>
              </div>
            ))}
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 max-w-3xl">
            <p className="text-xs font-semibold text-on-surface mb-3">Inline items vs referenced items inside a Content Area</p>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
              When an editor drops a block into a Content Area in Visual Builder, the block can be either:
            </p>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li className="flex gap-2">
                <span className="text-brand font-bold shrink-0">1.</span>
                <span>
                  <strong className="text-on-surface">A new inline block</strong> - created inside
                  this area with no independent CMS record. Editing it affects only this parent.
                  Deleting the parent deletes the block. This is the default when an editor clicks
                  &quot;Add block&quot; and fills in fields directly.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand font-bold shrink-0">2.</span>
                <span>
                  <strong className="text-on-surface">An existing referenced item</strong> - an item
                  that already exists in the CMS, picked from the content tree. Editing that item
                  propagates to every Content Area that references it. This is the shared-content pattern.
                </span>
              </li>
            </ul>
            <p className="text-xs text-on-surface-variant mt-4 pt-4 border-t border-ghost-border">
              Both appear identically in Graph - the full typed fields arrive either way. The difference
              is purely editorial: only the referenced items have their own independent lifecycle in the CMS.
            </p>
          </div>
        </section>

        <section id="item-vs-reference">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Content Area Item vs Content Reference
            <SectionAnchor id="item-vs-reference" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;content&quot;</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;contentReference&quot;</code>{" "}
            look similar in the SDK - both accept <code className="bg-surface-low px-1 rounded font-mono text-xs">allowedTypes</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">contentType</code> - but
            they behave differently for editors and produce different Graph responses.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <p className="text-xs font-mono font-semibold text-on-surface mb-3">type: &quot;content&quot; - Content Area Item</p>
              <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Editor can <strong className="text-on-surface">create new</strong> inline blocks or pick existing ones</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Graph always returns only <code className="bg-surface px-1 rounded font-mono">_metadata</code> for standalone properties - regardless of <code className="bg-surface px-1 rounded font-mono">contentType</code> or <code className="bg-surface px-1 rounded font-mono">allowedTypes</code></li>
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Component must self-fetch to get typed field data</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Not available on <code className="bg-surface px-1 rounded font-mono">elementEnabled</code> blocks</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Use when editors need to build or configure the linked block themselves</li>
              </ul>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <p className="text-xs font-mono font-semibold text-on-surface mb-3">type: &quot;contentReference&quot; - Content Reference</p>
              <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Editor can <strong className="text-on-surface">only pick existing</strong> content - no create-inline option</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Graph behavior depends on configuration: <strong className="text-on-surface">specific <code className="bg-surface px-1 rounded font-mono">contentType</code></strong> returns full object; <strong className="text-on-surface"><code className="bg-surface px-1 rounded font-mono">allowedTypes</code></strong> returns only <code className="bg-surface px-1 rounded font-mono">_metadata</code></li>
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Available on <code className="bg-surface px-1 rounded font-mono">elementEnabled</code> blocks (the only reference type that works)</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">-</span>Use for images, DAM assets, and typed references where Graph inline-expansion is useful</li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">contentReference with specific contentType - Graph expands</p>
              <CodeBlock code={CONTENT_REF_TYPED_SNIPPET} label="contentType set - Graph returns full object, no self-fetch" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">contentReference with allowedTypes - metadata only</p>
              <CodeBlock code={CONTENT_REF_ALLOWED_SNIPPET} label="allowedTypes set - Graph returns _metadata only" />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-3xl">
            <p className="text-xs font-semibold text-amber-800 mb-2">elementEnabled blocks</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">type: &quot;content&quot;</code> and{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">type: &quot;array&quot;</code> are silently
              ignored on <code className="bg-amber-100 px-1 rounded font-mono text-xs">elementEnabled</code> blocks - only{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">type: &quot;contentReference&quot;</code> works there.
              If you need a reference on a leaf block (e.g., a background image on a hero),{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">contentReference</code> is the right choice.
              To have content areas, the block must have{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">sectionEnabled</code> in its{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">compositionBehaviors</code>.
            </p>
          </div>
        </section>

        <section id="single-source">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Referenced content - single source of truth
            <SectionAnchor id="single-source" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            When multiple pages reference the same content item, updating that item propagates
            to all of them automatically after the next publish and ISR revalidation. No individual
            page edits required. This is the key benefit of{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;content&quot;</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;array&quot;</code>, and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;contentReference&quot;</code> -
            the referenced item has its own independent identity and lifecycle in the CMS.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-green-700 mb-3">Referenced - single source of truth</p>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                A promo block is referenced from 12 landing pages. The marketing team updates the
                offer text once in the CMS. All 12 pages show the new text after the next publish.
              </p>
              <p className="text-xs text-on-surface-variant italic">
                Edit count: 1. Pages updated: 12.
              </p>
            </div>
            <div className="bg-surface-lowest border border-orange-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-orange-700 mb-3">Embedded - copied on save</p>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                The same promo block is embedded as a{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;component&quot;</code>{" "}
                on each page. To update the offer text, an editor must open and re-publish all 12 pages individually.
              </p>
              <p className="text-xs text-on-surface-variant italic">
                Edit count: 12. Risk of inconsistency: high.
              </p>
            </div>
          </div>
        </section>

        <section id="drift">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Content drift
            <SectionAnchor id="drift" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Embedded content diverges over time. The more pages that hold their own copy of a piece
            of content, the higher the chance that some copies get updated and others don&apos;t.
            This is called content drift - and it&apos;s an editorial risk, not a developer bug.
          </p>
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 max-w-3xl">
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
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl leading-relaxed">
            <strong className="text-on-surface">Rule of thumb:</strong> if two pages showing
            different text for the same thing would be an editorial error, model it as a
            reference - not an embedded component.
          </p>
        </section>

        <section id="resolution">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Resolving single references in components
            <SectionAnchor id="resolution" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;content&quot;</code>{" "}
            standalone properties are not inline-expanded by Graph. The page query returns only{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata</code> - no
            typed fields. The component must resolve the full item separately. Two patterns exist:
            the self-fetch guard (detect missing data, call{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch</code>
            directly) and the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getContent()</code> SDK
            method introduced in SDK 2.0.0.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Pattern A - self-fetch guard</p>
              <CodeBlock code={SELF_FETCH_SNIPPET} label="FaqContainerBlock - detect missing data, call graphqlFetch" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Pattern B - getContent() by key</p>
              <CodeBlock code={GET_CONTENT_SNIPPET} label="SDK 2.0.0 - getContent({ key }) or getContent(graphRef)" />
            </div>
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 max-w-3xl text-xs text-on-surface-variant leading-relaxed">
            <strong className="text-on-surface block mb-1">
              This does NOT apply to <code className="font-mono">type: &quot;contentReference&quot;</code> with a specific <code className="font-mono">contentType</code>.
            </strong>
            When <code className="bg-surface px-1 rounded font-mono">contentReference</code> has a typed{" "}
            <code className="bg-surface px-1 rounded font-mono">contentType</code> (not <code className="bg-surface px-1 rounded font-mono">allowedTypes</code>),
            Graph returns the full object - no self-fetch needed. The self-fetch patterns above apply only
            to standalone <code className="bg-surface px-1 rounded font-mono">type: &quot;content&quot;</code> properties.
          </div>
        </section>

        <section id="decision">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            When to reference vs. embed
            <SectionAnchor id="decision" label="#" />
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-green-700 mb-4">
                Content Area (<code className="font-mono">type: &quot;array&quot;</code>) when:
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
                Reference (<code className="font-mono">type: &quot;content&quot;</code> / <code className="font-mono">type: &quot;contentReference&quot;</code>) when:
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
                Embed (<code className="font-mono">type: &quot;component&quot;</code>) when:
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

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-3xl">
            <p className="text-xs font-semibold text-amber-800 mb-2">Choosing between type: &quot;content&quot; and type: &quot;contentReference&quot;</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              Both are references to independent items. Use{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">type: &quot;contentReference&quot;</code> when
              the linked item always exists independently (an image, a DAM asset, a typed block you want
              Graph to expand). Use{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">type: &quot;content&quot;</code> when
              editors need the flexibility to create a new block inline or pick an existing one. Remember:{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">contentReference</code> with a
              specific <code className="bg-amber-100 px-1 rounded font-mono text-xs">contentType</code> will
              give you full Graph expansion - no self-fetch required.
            </p>
          </div>
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">type: &quot;content&quot; standalone properties always return only _metadata from Graph.</strong> Fields like heading, body, and image are never inline-expanded regardless of allowedTypes or contentType. Self-fetch or use getContent() to get them.</>,
          <><strong className="text-on-surface">type: &quot;contentReference&quot; with a specific contentType returns the full object from Graph.</strong> No self-fetch needed. With allowedTypes (multiple types), Graph returns only _metadata - same behavior as type: &quot;content&quot;.</>,
          <><strong className="text-on-surface">type: &quot;array&quot; content areas ARE inline-expanded.</strong> All item fields arrive with the page query. Use <code className="bg-surface-low px-1 rounded font-mono text-xs">__typename</code> and <code className="bg-surface-low px-1 rounded font-mono text-xs">... on TypeName</code> inline fragments to access typed fields.</>,
          <><strong className="text-on-surface">elementEnabled blocks can only use type: &quot;contentReference&quot; for content relationships.</strong> type: &quot;content&quot; and type: &quot;array&quot; are silently ignored on elements. The block must have sectionEnabled to support content areas.</>,
          <><strong className="text-on-surface">Content Area Items can be inline or referenced - Graph treats them the same.</strong> An inline block (created in the area, no separate CMS record) and a referenced item (pulled from the content tree) both arrive as full typed objects in Graph. The difference is editorial lifecycle only.</>,
          <><strong className="text-on-surface">Referenced content = single source of truth.</strong> Update the referenced item once - every page that points to it reflects the change on next ISR revalidation.</>,
          <><strong className="text-on-surface">type: &quot;component&quot; copies data into the parent on save.</strong> Editing a component in one parent does not affect other parents. Use this for per-page configuration, not shared content.</>,
          <><strong className="text-on-surface">getContent() accepts a graph:// URL directly.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url.graph</code> is always populated on references - pass it straight to getClient().getContent() without a separate key lookup.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "FaqContainerBlock/index.tsx", path: "src/components/blocks/FaqContainerBlock/index.tsx", content: faqContainerTs },
          ]}
        />

      </div>
    </>
  );
}
