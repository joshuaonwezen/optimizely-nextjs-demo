import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const richTextBlockTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/RichTextBlock/index.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Rich Text",
};

const PROPERTY_TYPE_SNIPPET = `// In a content type definition, richText returns an object from Graph,
// not a plain string. The object has two representations: json and html.

export const ArticlePageType = contentType({
  key: "ArticlePage",
  baseType: "_page",
  properties: {
    headline: { type: "string" },    // Graph returns: string
    body:     { type: "richText" },  // Graph returns: { json: RichTextAst, html: string }
  },
});

// In the GraphQL fragment - request json for full rendering control,
// html for simpler cases where you just need to inject the markup:
fragment ArticlePageData on ArticlePage {
  headline
  body {
    json   # structured AST - use with <RichText> component
    html   # pre-rendered HTML string - use with dangerouslySetInnerHTML
  }
}`;

const JSON_RENDERING_SNIPPET = `// src/components/blocks/RichTextBlock/index.tsx
//
// Preferred approach: body.json → <RichText> from the SDK.
// The SDK component renders each node type (paragraph, heading, list, link,
// bold, italic, etc.) as semantic HTML. Customisable via a node renderer map.

import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export default function TextBlock(props) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data);

  if (data.body && typeof data.body === "object" && "json" in data.body) {
    return (
      <div {...pa("body")}>   {/* ← pa() on the WRAPPER, not on <RichText> */}
        <RichText content={data.body.json as RichTextProps["content"]} />
      </div>
    );
  }

  // Fallback: body arrived as a raw HTML string (legacy or alternative query)
  if (typeof data.body === "string" && data.body) {
    return <div {...pa("body")} dangerouslySetInnerHTML={{ __html: data.body }} />;
  }

  return null;
}`;

const HTML_RENDERING_SNIPPET = `// Alternative: body.html → dangerouslySetInnerHTML
// Simpler but less flexible - you cannot customise individual node renderers,
// and the HTML is pre-rendered by Graph with no way to inject React components
// at specific node positions.

export default function ArticleBody({ body }) {
  if (!body?.html) return null;

  return (
    <div
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: body.html }}
    />
  );
}

// When to use html vs json:
// html  → quick prototypes, simple articles, when you don't need embedded blocks
// json  → production rendering, custom node styles, embedded blocks, preview utilities`;

const PA_PLACEMENT_SNIPPET = `// pa("body") MUST go on the wrapper <div>, not on <RichText>.
//
// pa() returns data-epi-block-id attributes that the CMS overlay reads to
// identify which field you clicked on in Visual Builder. <RichText> is a
// function component - it renders multiple DOM elements and has no single
// root node to attach the attribute to.

// ✅ Correct
<div {...pa("body")}>
  <RichText content={data.body.json} />
</div>

// ❌ Wrong - pa() attributes are silently swallowed, inline editing breaks
<RichText content={data.body.json} {...pa("body")} />

// Same rule applies to other multi-root renders (lists, grids, etc.) -
// always wrap them before applying pa().`;

const EMBEDDED_BLOCKS_SNIPPET = `// Blocks embedded inside rich text body copy are different from content areas.
//
// A CONTENT AREA (type: "array") renders blocks as siblings alongside the text.
// An EMBEDDED BLOCK lives inside the rich text - between paragraphs, inline.
//
// How Graph returns embedded blocks in the JSON AST:
{
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [{ "type": "text", "text": "Our rates:" }] },
    {
      "type": "optimizely-content-ref",   // ← embedded block node type
      "attrs": {
        "key": "abc123",                  // reference key
        "version": null,
        "locale": "en"
      }
    },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Apply today." }] }
  ]
}

// To render embedded blocks, pass a custom nodeRenderer to <RichText>:
import { OptimizelyComponent } from "@optimizely/cms-sdk/react/server";

<RichText
  content={data.body.json}
  nodeRenderer={{
    "optimizely-content-ref": async ({ node }) => {
      const block = await getClient().getContent({ key: node.attrs.key });
      return <OptimizelyComponent content={block} />;
    },
  }}
/>`;

const CONTENT_AREA_VS_RICHTEXT_SNIPPET = `// When to use richText vs. a content area (type: "array"):

// ✅ richText is right for:
//   - Longform prose: articles, blog posts, legal pages
//   - Mixed text + occasional embedded element (a callout, a chart)
//   - Content where editors control precise formatting (bold, italic, lists, links)

// ✅ Content area is right for:
//   - Page sections composed of distinct blocks (hero, FAQ, team grid)
//   - Multiple blocks of the same type in sequence
//   - Any content where editors need drag-to-reorder or display template switching

// ⚠️ Avoid richText when:
//   - You need structural layout (the "blocks" are full-width sections, not inline)
//   - You have >3 embedded block types - the nodeRenderer grows unwieldy
//   - Editors will drag-and-drop between sections - richText has no affordance for that

// Rule of thumb: if it could live in a Word document, richText.
// If it needs a layout builder, use a content area.`;

const SEARCH_SNIPPET = `// richText fields are indexed for full-text search by default -
// body copy is searchable via the _fulltext operator without any extra config.

query SearchArticles($q: String!) {
  ArticlePage(
    where: { _fulltext: { match: $q } }
    orderBy: { _ranking: RELEVANCE }
    limit: 10
  ) {
    items {
      _metadata { displayName url { default } }
      # _fulltext automatically searched body.json content -
      # you do not need to include body in this query.
    }
  }
}

// To exclude body from search (large pages, confidential content):
body: { type: "richText", indexingType: "disabled" }
//                         ↑ body content won't appear in _fulltext results`;

export default function RichTextDemoPage() {
  return (
    <>
      <DemoHero
        title="Rich Text"
        description={<>How the <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">richText</code> property
            type works in Optimizely Graph - JSON vs HTML rendering, preview attribute placement,
            embedded blocks, and when to use rich text vs. a content area.</>}
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="property-type">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            What Graph returns for a <code className="font-mono text-xl">richText</code> field
            <SectionAnchor id="property-type" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Unlike <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;string&quot;</code>{" "}
            which returns a plain scalar, a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;richText&quot;</code>{" "}
            property returns an object with two representations:{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">json</code> (a structured AST)
            and <code className="bg-surface-low px-1 rounded font-mono text-xs">html</code> (a pre-rendered
            HTML string). You choose which to request in your GraphQL fragment and which to render.
          </p>
          <CodeBlock code={PROPERTY_TYPE_SNIPPET} label="Content type definition + GraphQL fragment" />
        </section>

        <section id="rendering">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Two rendering strategies
            <SectionAnchor id="rendering" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The SDK provides a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;RichText&gt;</code> server
            component that renders the JSON AST as semantic HTML. Alternatively, request{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">body.html</code> from Graph
            and inject it with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">dangerouslySetInnerHTML</code>.
            The JSON path is preferred - it supports preview attributes, custom node renderers, and embedded blocks.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">JSON → &lt;RichText&gt; (recommended)</p>
              <CodeBlock code={JSON_RENDERING_SNIPPET} label="src/components/blocks/RichTextBlock/index.tsx" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">HTML → dangerouslySetInnerHTML</p>
              <CodeBlock code={HTML_RENDERING_SNIPPET} label="Alternative - simpler but less flexible" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                label: "body.json + <RichText>",
                pros: ["Customisable node renderers", "Supports embedded blocks", "Works with pa() preview attributes", "Can inject React components at specific nodes"],
                cons: ["Requires SDK import", "Slightly more setup"],
                good: true,
              },
              {
                label: "body.html + dangerouslySetInnerHTML",
                pros: ["Minimal code - one line", "No SDK dependency"],
                cons: ["No customisable rendering", "Cannot embed React components", "Preview inline editing doesn't highlight individual nodes", "XSS risk if content source is untrusted"],
                good: false,
              },
            ].map(({ label, pros, cons, good }) => (
              <div key={label} className={`bg-surface-lowest border rounded-2xl p-5 ${good ? "border-green-200" : "border-ghost-border"}`}>
                <p className="text-xs font-mono font-semibold text-on-surface mb-3">{label}</p>
                <div className="space-y-1 mb-3">
                  {pros.map((p) => <p key={p} className="text-xs text-green-700 flex gap-1.5"><span>✓</span>{p}</p>)}
                </div>
                <div className="space-y-1">
                  {cons.map((c) => <p key={c} className="text-xs text-on-surface-variant/60 flex gap-1.5"><span>–</span>{c}</p>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="pa-placement">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Preview attribute placement - <code className="font-mono text-xl">pa(&quot;body&quot;)</code> on the wrapper
            <SectionAnchor id="pa-placement" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">pa(&quot;body&quot;)</code> returns
            a <code className="bg-surface-low px-1 rounded font-mono text-xs">data-epi-block-id</code> attribute
            that the Visual Builder overlay reads to identify which field you clicked. Place it on the
            wrapper <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;div&gt;</code> -
            never on{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;RichText&gt;</code> itself.
            The component renders multiple DOM nodes and cannot receive spread attributes as a single root.
          </p>
          <CodeBlock code={PA_PLACEMENT_SNIPPET} label="pa() placement - wrapper div, not RichText component" />
        </section>

        <section id="embedded-blocks">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Embedded blocks inside body copy
            <SectionAnchor id="embedded-blocks" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Editors can embed CMS blocks (callouts, charts, code snippets) directly inside rich text body
            copy - between paragraphs, not in a content area. Graph returns these as{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizely-content-ref</code>{" "}
            nodes in the JSON AST, each carrying the referenced item&apos;s{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">key</code>. Render them by
            passing a <code className="bg-surface-low px-1 rounded font-mono text-xs">nodeRenderer</code>{" "}
            map to{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;RichText&gt;</code> that
            fetches each referenced block and dispatches it through{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">OptimizelyComponent</code>.
          </p>
          <CodeBlock code={EMBEDDED_BLOCKS_SNIPPET} label="optimizely-content-ref node + custom nodeRenderer" />
        </section>

        <section id="vs-content-area">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Rich text vs. content areas - when to use each
            <SectionAnchor id="vs-content-area" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Both{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;richText&quot;</code>{" "}
            and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;array&quot;</code>{" "}
            (content area) can hold structured content. They model different editorial affordances - rich
            text is a WYSIWYG document editor, content areas are a drag-and-drop layout builder.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={CONTENT_AREA_VS_RICHTEXT_SNIPPET} label="Decision guide: richText vs content area" />
            <CodeBlock code={SEARCH_SNIPPET} label="richText fields are indexed for _fulltext search" />
          </div>
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">richText returns an object, not a string.</strong> Request <code className="bg-surface-low px-1 rounded font-mono text-xs">body &#123; json &#125;</code> or <code className="bg-surface-low px-1 rounded font-mono text-xs">body &#123; html &#125;</code> in your fragment - not bare <code className="bg-surface-low px-1 rounded font-mono text-xs">body</code>.</>,
          <><strong className="text-on-surface">Prefer body.json + &lt;RichText&gt; over body.html.</strong> JSON gives you customisable node renderers, embedded block support, and working preview attributes.</>,
          <><strong className="text-on-surface">pa(&quot;body&quot;) goes on the wrapper div, not on &lt;RichText&gt;.</strong> Placing it on the component breaks Visual Builder&apos;s inline editing overlay.</>,
          <><strong className="text-on-surface">Embedded blocks use optimizely-content-ref nodes in the AST.</strong> Handle them with a nodeRenderer that fetches the block by key and dispatches it through OptimizelyComponent.</>,
          <><strong className="text-on-surface">richText body is indexed for _fulltext search by default.</strong> Opt out with <code className="bg-surface-low px-1 rounded font-mono text-xs">indexingType: &quot;disabled&quot;</code> if the content should not be searchable.</>,
          <><strong className="text-on-surface">Use a content area instead of richText for layout sections.</strong> If editors need drag-to-reorder or display template switching, a content area is the right model.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "RichTextBlock/index.tsx", path: "src/components/blocks/RichTextBlock/index.tsx", content: richTextBlockTs },
          ]}
        />

      </div>
    </>
  );
}
