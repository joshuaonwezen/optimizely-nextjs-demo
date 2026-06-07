import fs from "fs";
import path from "path";
import type { Metadata } from "next";
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

const CONTENT_REF_SNIPPET = `// type: "content" - single reference
// The parent stores a pointer to an independent content item.
// Graph returns only _metadata (key, url) - fields are NOT inline-expanded.
featuredBlock: {
  type: "content",
  allowedTypes: [FaqContainerBlockType],
  displayName: "Featured FAQ Block",
}`;

const ARRAY_SNIPPET = `// type: "array" - content area (ordered list of references)
// Graph DOES inline-expand these - all item fields arrive in the page query.
faqItems: {
  type: "array",
  items: { type: "content", allowedTypes: [FaqItemBlockType] },
  displayName: "FAQ Items",
}`;

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

export default function ContentReuseDemoPage() {
  return (
    <div className="min-h-screen bg-surface">

      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Content Reuse
          </h1>
          <p className="text-on-brand opacity-80 max-w-2xl text-lg leading-relaxed">
            Referenced vs. embedded content - when one update should propagate everywhere,
            when copies are intentional, and how Graph handles each in queries.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="spectrum">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Three ways to relate content
            <SectionAnchor id="spectrum" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            The SDK offers three property types for attaching content to a parent. They differ in
            how tightly the child is coupled to its parent, how Graph resolves them in queries,
            and whether editing the child affects every parent that uses it.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-3">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">type: &quot;component&quot;</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  The child is stored <strong>inside</strong> the parent record. It has no independent
                  identity in the CMS - it only exists as part of this parent. Editing it affects
                  only this parent.
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
                  The parent stores a <strong>pointer</strong> to an independent item. Both exist
                  separately in the CMS. Updating the referenced item affects every parent that
                  points to it.
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
                  An ordered list of pointers to independent items. Like{" "}
                  <code className="bg-surface px-1 rounded font-mono text-xs">type: &quot;content&quot;</code> but
                  Graph <em>does</em> inline-expand these - all fields arrive with the page query.
                </p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Graph: </span>Inline-expanded automatically</p>
                <p className="text-xs text-on-surface-variant"><span className="font-medium">Example: </span>FAQ items list, team member grid</p>
              </div>
              <CodeBlock code={ARRAY_SNIPPET} />
            </div>
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
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;content&quot;</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;array&quot;</code> -
            the referenced item has its own independent identity and lifecycle in the CMS.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-green-700 mb-3">✓ Referenced - single source of truth</p>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                A promo block is referenced from 12 landing pages. The marketing team updates the
                offer text once in the CMS. All 12 pages show the new text after the next publish.
              </p>
              <p className="text-xs text-on-surface-variant italic">
                Edit count: 1. Pages updated: 12.
              </p>
            </div>
            <div className="bg-surface-lowest border border-orange-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-orange-700 mb-3">✗ Embedded - copied on save</p>
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
            single references are not inline-expanded by Graph. The page query returns only{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata</code> - no
            typed fields. The component must resolve the full item separately. Two patterns exist:
            the self-fetch guard (detect missing data, call{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch</code>
            directly) and the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getContent()</code> SDK
            method introduced in SDK 2.0.0.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Pattern A - self-fetch guard</p>
              <CodeBlock code={SELF_FETCH_SNIPPET} label="FaqContainerBlock - detect missing data, call graphqlFetch" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Pattern B - getContent() by key</p>
              <CodeBlock code={GET_CONTENT_SNIPPET} label="SDK 2.0.0 - getContent({ key }) or getContent(graphRef)" />
            </div>
          </div>
        </section>

        <section id="decision">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            When to reference vs. embed
            <SectionAnchor id="decision" label="#" />
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-green-700 mb-4">Reference (type: &quot;content&quot; or type: &quot;array&quot;) when:</p>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {[
                  "The same item appears on multiple pages",
                  "Editors need to update it once and see it everywhere",
                  "The item has its own editorial lifecycle (draft, review, publish)",
                  "Examples: shared promo, legal disclaimer, featured FAQ, author bio",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-green-600 shrink-0">→</span>{item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <p className="text-xs font-semibold text-on-surface mb-4">Embed (type: &quot;component&quot;) when:</p>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {[
                  "The child is specific to this parent - no meaning outside it",
                  "Editors configure it per-parent, not from a shared library",
                  "It changes alongside the parent and only the parent",
                  "Examples: CTA button on a hero block, price badge on a product card",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-brand/50 shrink-0">→</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-3xl">
            <p className="text-xs font-semibold text-amber-800 mb-2">Graph behaviour difference</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">type: &quot;array&quot;</code> content
              areas inline-expand automatically - all item fields arrive with the page query, no extra
              fetch needed.{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">type: &quot;content&quot;</code> single
              references return only <code className="bg-amber-100 px-1 rounded font-mono text-xs">_metadata</code> -
              the component must self-fetch or call{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">getContent()</code> for the rest.
            </p>
          </div>
        </section>

        <section id="key-points" className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
          <h2 className="font-display text-lg font-bold text-on-surface mb-4">
            Key Things to Know
            <a href="#key-points" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            {[
              <><strong className="text-on-surface">type: &quot;content&quot; single references return only _metadata from Graph.</strong> Fields like heading, body, and image are never inline-expanded. Self-fetch or use getContent() if you need them.</>,
              <><strong className="text-on-surface">type: &quot;array&quot; content areas ARE inline-expanded.</strong> All item fields arrive with the page query - no extra fetch needed.</>,
              <><strong className="text-on-surface">Referenced content = single source of truth.</strong> Update the referenced item once - every page that points to it reflects the change on next ISR revalidation.</>,
              <><strong className="text-on-surface">type: &quot;component&quot; copies data into the parent on save.</strong> Editing a component in one parent does not affect other parents. Use this for per-page configuration, not shared content.</>,
              <><strong className="text-on-surface">Content drift is an editorial risk, not a developer bug.</strong> Model shared content as references - embedded copies diverge as editors update some but miss others.</>,
              <><strong className="text-on-surface">getContent() accepts a graph:// URL directly.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url.graph</code> is always populated on references - pass it straight to getClient().getContent() without a separate key lookup.</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand font-bold shrink-0">→</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <SourcePanel
          heading="Source files"
          files={[
            { label: "FaqContainerBlock/index.tsx", path: "src/components/blocks/FaqContainerBlock/index.tsx", content: faqContainerTs },
          ]}
        />

      </div>
    </div>
  );
}
