import type { Metadata } from "next";
import { Callout } from "@/components/blocks/CalloutBlock";
import CodeBlock from "@/components/demo/CodeBlock";
import DemoHero from "@/components/demo/DemoHero";
import LiveDemoShell from "@/components/demo/LiveDemoShell";
import { getEditorialContent, type EditorialItem } from "@/lib/graphql/queries/GetEditorialContent";

export const metadata: Metadata = {
  title: "Contracts, Mappings & Bindings Demo",
};

// ── Contracts ──────────────────────────────────────────────────────────────

const CONTRACT_DEFINE_SNIPPET = `// optimizely.config.mjs
//
// Properties shared by ArticlePage and CaseStudyPage, defined once.
// contract() is exported by @optimizely/cms-sdk since 2.1.0.

import { contract } from "@optimizely/cms-sdk";

export const EditorialContentContract = contract({
  key: "EditorialContent",
  displayName: "Editorial Content",
  properties: {
    title:     { type: "string",           displayName: "Title",     indexingType: "searchable", isLocalized: true },
    summary:   { type: "string",           displayName: "Summary",   indexingType: "searchable", isLocalized: true },
    heroImage: { type: "contentReference", displayName: "Hero Image", allowedTypes: ["_image"] },
    tags:      { type: "array",            displayName: "Tags",      indexingType: "queryable",  items: { type: "string" } },
  },
});`;

const CONTRACT_EXTEND_SNIPPET = `// optimizely.config.mjs
//
// Both types declare  extends: [SEOContract, EditorialContentContract].
// No duplicated field definitions - contentType() merges the contract
// properties into the type at definition time.

export const ArticlePageType = contentType({
  key: "ArticlePage",
  baseType: "_page",
  extends: [SEOContract, EditorialContentContract],
  properties: {
    body:        { type: "richText",         displayName: "Body",         indexingType: "searchable", isLocalized: true },
    author:      { type: "contentReference", displayName: "Author",       allowedTypes: ["AuthorBlock"] },
    publishDate: { type: "dateTime",         displayName: "Publish Date", indexingType: "queryable" },
    category:    { type: "string",           displayName: "Category",     indexingType: "queryable", enum: CATEGORY_ENUM },
    relatedArticles: { type: "array", items: { type: "contentReference", allowedTypes: ["ArticlePage"] } },
  },
});

export const CaseStudyPageType = contentType({
  key: "CaseStudyPage",
  baseType: "_page",
  extends: [SEOContract, EditorialContentContract],
  properties: {
    clientName: { type: "string",   displayName: "Client Name", indexingType: "queryable", isLocalized: true },
    industry:   { type: "string",   displayName: "Industry",    indexingType: "queryable", enum: CATEGORY_ENUM },
    challenge:  { type: "richText", displayName: "Challenge",   indexingType: "searchable", isLocalized: true },
    solution:   { type: "richText", displayName: "Solution",    indexingType: "searchable", isLocalized: true },
    // ...outcomes, testimonial, relatedCaseStudies
  },
});`;

const CONTRACT_REGISTER_SNIPPET = `// src/lib/optimizely/componentRegistry.ts
//
// Contracts do NOT need to be registered. contentType() merges the
// contract's properties into the type object at definition time, so the
// registry (and the SDK's generated Graph fragments) see the full
// property set on each type.

initContentTypeRegistry([
  ArticlePageType,            // ← extends [SEOContract, EditorialContentContract]
  CaseStudyPageType,          // ← extends [SEOContract, EditorialContentContract]
  // ...other types
]);`;

const CONTRACT_GRAPH_BEFORE_SNIPPET = `# Without a contract: two separate queries, merged in application code.
# src/lib/graphql/queries/GetEditorialContent.ts

query GetEditorialContent($limit: Int) {
  ArticlePage(
    limit: $limit
    orderBy: { _metadata: { published: DESC } }
    where: { _metadata: { url: { default: { exist: true } } } }
  ) {
    items {
      title summary tags
      _metadata { published url { default } __typename }
    }
  }
  CaseStudyPage(
    limit: $limit
    orderBy: { _metadata: { published: DESC } }
    where: { _metadata: { url: { default: { exist: true } } } }
  ) {
    items {
      title summary tags
      _metadata { published url { default } __typename }
    }
  }
}
# Then merge + sort in code: [...articles, ...caseStudies].sort(byDate)`;

const CONTRACT_GRAPH_AFTER_SNIPPET = `# With a contract: one query, sorted by Graph, no merging in code.
# Requires the EditorialContent contract to be created in the CMS first.

query GetEditorialContent($limit: Int) {
  IEditorialContent(
    limit: $limit
    orderBy: { _metadata: { published: DESC } }
    where: { _metadata: { url: { default: { exist: true } } } }
  ) {
    items {
      title
      summary
      tags
      _metadata { published url { default } __typename }
      ... on ArticlePage  { category }
      ... on CaseStudyPage { clientName industry }
    }
  }
}`;

// ── Bindings + Mappings ───────────────────────────────────────────────────

const BINDING_CREATE_SNIPPET = `const token = await getManagementToken(); // OAuth2 client_credentials

await fetch("https://api.cms.optimizely.com/v1/contenttypebindings", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    key: "ArticleTeaserBinding",   // unique identifier for this binding definition
    from: "ArticlePage",           // source content type
    to: "ArticleTeaser",           // target content type

    // propertyMappings: keys are target property names, values reference source
    // properties. Use dot notation to reach into nested component properties.
    propertyMappings: {
      teaserTitle:   { from: "title" },
      teaserSummary: { from: "summary" },
      teaserImage:   { from: "heroImage" },        // top-level property
      teaserAuthor:  { from: "metadata.author" },  // nested via dot notation
    },
  }),
});`;

const BINDING_PATCH_SNIPPET = `// List all bindings:
GET  https://api.cms.optimizely.com/v1/contenttypebindings

// Get one binding:
GET  https://api.cms.optimizely.com/v1/contenttypebindings/ArticleTeaserBinding

// Partial update (only send changed mappings):
PATCH https://api.cms.optimizely.com/v1/contenttypebindings/ArticleTeaserBinding
{
  "propertyMappings": {
    "teaserImage": { "from": "hero.image" }
  }
}

// Delete:
DELETE https://api.cms.optimizely.com/v1/contenttypebindings/ArticleTeaserBinding`;

const BINDING_COMPAT_SNIPPET = `// These are CMS-internal type names (not SDK "type:" values).
// Most pairs must match exactly; ShortString has some flexibility:
//
// ShortString → ShortString, LongString, XHTMLString, LinkItem, URL  ✓
// LongString  → LongString, XHTMLString                               ✓
// Integer     → Integer only                                           ✓
// DateTime    → DateTime only                                          ✓
// ContentRef  → ContentRef (same allowedTypes)                         ✓
//
// SDK type mapping:
//   string    ≈ ShortString
//   richText  ≈ XHTMLString / LongString
//   url       ≈ URL / LinkItem
//   integer   ≈ Integer
//   dateTime  ≈ DateTime
//   contentReference ≈ ContentRef`;

// ── Binding Content ────────────────────────────────────────────────────────

const BIND_INSTANCE_SNIPPET = `const token = await getManagementToken();

// Create a new ArticleTeaser bound to an existing ArticlePage:
await fetch("https://api.cms.optimizely.com/v1/content", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    contentType: "ArticleTeaser",
    initialVersion: {
      locale: "en",
      displayName: "Article Teaser (Bound)",
      binding: {
        contentTypeBinding: "ArticleTeaserBinding",
        source: "cms://content/256c585881ad452dbd6df90eafadb137?loc=en",
      },
    },
  }),
});

// The teaser's teaserTitle / teaserSummary / teaserImage are now populated
// from the linked ArticlePage and stay in sync on every publish.`;

const BIND_COMPONENT_SNIPPET = `// To bind a single component property rather than the whole item,
// nest the binding inside the property value:

await fetch("https://api.cms.optimizely.com/v1/content", {
  method: "POST",
  headers: { Authorization: \`Bearer \${token}\`, "Content-Type": "application/json" },
  body: JSON.stringify({
    contentType: "LandingPage",
    initialVersion: {
      locale: "en",
      displayName: "Landing Page",
      properties: {
        featuredTeaser: {
          value: {
            binding: {
              contentTypeBinding: "ArticleTeaserBinding",
              source: "cms://content/256c585881ad452dbd6df90eafadb137?loc=en",
            },
          },
        },
      },
    },
  }),
});`;

// ── Helpers ───────────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
      {children}{" "}
      <a href={`#${id}`} className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">
        #
      </a>
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 className="font-display text-lg font-semibold text-on-surface mb-2">
      {children}{" "}
      <a href={`#${id}`} className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">
        #
      </a>
    </h3>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-surface-low px-1 rounded text-xs font-mono">{children}</code>
  );
}

function EditorialCard({ item }: { item: EditorialItem }) {
  const url = item._metadata?.url?.default ?? "#";
  const type = item._metadata?.__typename ?? "Content";
  const date = item._metadata?.published
    ? new Date(item._metadata.published).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
    : null;
  return (
    <a
      href={url}
      className="block bg-surface-lowest border border-ghost-border rounded-2xl p-5 hover:border-brand/40 transition-colors"
    >
      <span className="text-xs font-semibold text-brand mb-2 block">{type}</span>
      <p className="font-display text-sm font-bold text-on-surface mb-2 line-clamp-2 leading-snug">
        {item.title ?? "Untitled"}
      </p>
      {item.summary && (
        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{item.summary}</p>
      )}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {(item.tags.filter(Boolean) as string[]).slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand">{tag}</span>
          ))}
        </div>
      )}
      {date && (
        <p className="text-xs text-on-surface-variant mt-3 opacity-60">{date}</p>
      )}
    </a>
  );
}

export default async function ContractsMappingsBindingsPage() {
  const { items, fromCms } = await getEditorialContent(6);

  return (
    <>
      <DemoHero
        title="Contracts, Mappings & Bindings"
        description="Three CMS-level features for sharing property definitions across types, connecting types so their data stays in sync, and querying all implementations together in Graph."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          {["Contracts", "Mappings", "Bindings"].map((b) => (
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

        {/* Overview */}
        <section id="overview">
          <div className="grid md:grid-cols-3 gap-4">
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Contracts</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Like a TypeScript <Code>interface</Code>. Declare shared fields (SEO
                metadata, authoring dates, categories) and apply the contract to any
                content type. Every implementing type gets those fields in the editor and
                in Graph.
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Bindings</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                A template that says <em>ArticlePage</em> feeds data into{" "}
                <em>ArticleTeaser</em>. Once defined, you apply the binding to actual
                content instances so their properties stay synchronized automatically.
              </p>
            </Callout>
            <Callout>
              <p className="text-xs font-semibold text-on-surface mb-2">Mappings</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                The field-level connections <em>inside</em> a binding:{" "}
                <Code>{"teaserImage: { from: \"hero.image\" }"}</Code>. Use dot
                notation to reach into nested component properties. Type compatibility
                rules determine which source/target combinations are valid.
              </p>
            </Callout>
          </div>
        </section>

        {/* ── Contracts ── */}
        <section id="contracts">
          <SectionHeading id="contracts">Contracts</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            A contract defines a named set of properties that content types can implement,
            analogous to an interface in TypeScript or Java. The CMS enforces that every
            implementing type exposes those fields. Optimizely Graph generates a shared
            interface type (e.g. <Code>IEditorialContent</Code>) so you can query all
            implementing types in one request instead of one query per type.
          </p>

          <div className="space-y-8">

            <div id="contracts-define" className="space-y-3">
              <SubHeading id="contracts-define">Defining a contract</SubHeading>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                In this project, <Code>ArticlePage</Code> and <Code>CaseStudyPage</Code>{" "}
                both need <Code>title</Code>, <Code>summary</Code>, <Code>heroImage</Code>,
                and <Code>tags</Code>. Instead of duplicating those definitions, they live
                in a single <Code>EditorialContentContract</Code> defined with{" "}
                <Code>contract()</Code> in <Code>optimizely.config.mjs</Code>.
              </p>
              <CodeBlock code={CONTRACT_DEFINE_SNIPPET} label="optimizely.config.mjs" />
              <Callout variant="note" label="SDK version">
                <Code>contract()</Code> requires <Code>@optimizely/cms-sdk</Code> 2.1.0 or
                later. On 2.0.0 the import fails at runtime - there, fall back to defining
                the shared properties as a plain object and spreading it into each
                type&apos;s <Code>properties</Code> block.
              </Callout>
            </div>

            <div id="contracts-extend" className="space-y-3">
              <SubHeading id="contracts-extend">Implementing the contract in content types</SubHeading>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Each type lists the contracts it implements in <Code>extends</Code>, then
                adds its own type-specific fields in <Code>properties</Code>. A type can
                extend a single contract or an array of them.
              </p>
              <CodeBlock code={CONTRACT_EXTEND_SNIPPET} label="optimizely.config.mjs" />
            </div>

            <div id="contracts-register" className="space-y-3">
              <SubHeading id="contracts-register">Registration</SubHeading>
              <CodeBlock code={CONTRACT_REGISTER_SNIPPET} label="src/lib/optimizely/componentRegistry.ts" />
              <Callout variant="note" label="No separate registration">
                Only content types go in <Code>initContentTypeRegistry</Code>. Because{" "}
                <Code>contentType()</Code> merges contract properties into the type object
                when it is defined, the registry and the SDK&apos;s query builder already
                see every inherited field - no ordering constraints, no contract entries.
              </Callout>
            </div>

            <div id="contracts-graph" className="space-y-3">
              <SubHeading id="contracts-graph">Unified Graph interface queries</SubHeading>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Once the <Code>EditorialContent</Code> contract exists in the CMS, Graph
                generates an <Code>IEditorialContent</Code> interface type. The query below
                compares what you write <em>before</em> the contract (two root fields, merged
                in code) versus <em>after</em> (one interface field, sorted by Graph).
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <CodeBlock code={CONTRACT_GRAPH_BEFORE_SNIPPET} label="Before: two queries merged in code" />
                <CodeBlock code={CONTRACT_GRAPH_AFTER_SNIPPET} label="After: one interface query" />
              </div>
            </div>

            {/* Live demo */}
            <div id="contracts-live" className="space-y-3">
              <SubHeading id="contracts-live">Live demo: editorial content feed</SubHeading>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                The cards below are fetched from <Code>ArticlePage</Code> and{" "}
                <Code>CaseStudyPage</Code> in a single GraphQL request and merged by
                publish date, matching what the <Code>IEditorialContent</Code> interface
                query would return once the contract is active in the CMS.
              </p>
              <LiveDemoShell label="ArticlePage + CaseStudyPage, merged by publish date">
                {fromCms ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, i) => (
                      <EditorialCard key={i} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-sm text-on-surface-variant">
                    <p className="mb-2 font-medium">No content found</p>
                    <p className="text-xs opacity-70">
                      Seed articles and case studies with{" "}
                      <code className="bg-surface-low px-1 rounded">npm run seed:modeling</code>{" "}
                      to populate this demo.
                    </p>
                  </div>
                )}
              </LiveDemoShell>
            </div>

          </div>
        </section>

        {/* ── Bindings + Mappings ── */}
        <section id="bindings">
          <SectionHeading id="bindings">Bindings &amp; Mappings</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            A <strong>content type binding</strong> is a template that declares which source
            type feeds data into which target type. <strong>Mappings</strong> are the
            individual field-to-field connections inside that template. Defining the binding
            is a one-time setup step; you then <em>apply</em> it to specific content
            instances to activate the sync (see the next section).
          </p>

          <div className="space-y-8">

            <div id="bindings-create" className="space-y-3">
              <SubHeading id="bindings-create">Creating a binding definition</SubHeading>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                POST to{" "}
                <code className="bg-surface-low px-1 rounded text-xs font-mono break-all">
                  https://api.cms.optimizely.com/v1/contenttypebindings
                </code>{" "}
                with the source type (<Code>from</Code>), target type (<Code>to</Code>), and
                the property mappings. This is typically done once in a seeding script.
              </p>
              <CodeBlock code={BINDING_CREATE_SNIPPET} label="scripts/seed-bindings.ts" />
            </div>

            <div id="bindings-manage" className="space-y-3">
              <SubHeading id="bindings-manage">Reading and updating bindings</SubHeading>
              <CodeBlock code={BINDING_PATCH_SNIPPET} label="REST API: binding management" />
            </div>

            <div id="mappings-compat" className="space-y-3">
              <SubHeading id="mappings-compat">Mapping type compatibility</SubHeading>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Not every source/target property type combination is valid. The compatibility
                table uses CMS-internal type names; the comment block maps them to their
                SDK equivalents.
              </p>
              <CodeBlock code={BINDING_COMPAT_SNIPPET} label="Property type compatibility" />
            </div>

          </div>
        </section>

        {/* ── Binding Content ── */}
        <section id="binding-content">
          <SectionHeading id="binding-content">Applying Bindings to Content Instances</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            Once the binding template exists, apply it to actual content by including a{" "}
            <Code>binding</Code> object in the create or PATCH body. Reference the template
            by key, and point <Code>source</Code> at the content instance to pull data from.
          </p>

          <div className="space-y-8">

            <div id="binding-content-instance" className="space-y-3">
              <SubHeading id="binding-content-instance">Binding a top-level content item</SubHeading>
              <CodeBlock code={BIND_INSTANCE_SNIPPET} label="scripts/bind-content.ts" />
              <Callout variant="note" label="Source URI format">
                <Code>source</Code> uses the CMS permanent URI:{" "}
                <Code>{"cms://content/<contentKey>?loc=<locale>"}</Code>. Use the
                content key (not the route segment) so the reference survives URL changes.
                Locale is required because properties are stored per locale.
              </Callout>
            </div>

            <div id="binding-content-component" className="space-y-3">
              <SubHeading id="binding-content-component">Binding a component property inside a page</SubHeading>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Bindings can target a single <Code>component</Code>-type property rather than
                the whole content item, useful when only one slot on a page should pull from
                an external source.
              </p>
              <CodeBlock code={BIND_COMPONENT_SNIPPET} label="Bind a component property" />
            </div>

            <Callout variant="note" label="Bindings vs. contentReference">
              A <Code>contentReference</Code> stores a pointer: the editor picks any item
              and the frontend fetches it at render time. A binding copies mapped property
              values directly into the target at publish time. Use a{" "}
              <Code>contentReference</Code> when the editor should choose freely; use a
              binding when the target should always mirror specific fields from a specific
              source.
            </Callout>

          </div>
        </section>

        {/* ── When to use each ── */}
        <section id="when-to-use">
          <SectionHeading id="when-to-use">When to use each</SectionHeading>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-ghost-border">
                  <th className="text-left py-3 pr-6 font-semibold text-on-surface">Scenario</th>
                  <th className="text-left py-3 pr-6 font-semibold text-on-surface">Use</th>
                </tr>
              </thead>
              <tbody className="text-on-surface-variant">
                <tr className="border-b border-ghost-border/50">
                  <td className="py-3 pr-6">Multiple page types share SEO, category, or date fields</td>
                  <td className="py-3 font-mono text-brand">Contract</td>
                </tr>
                <tr className="border-b border-ghost-border/50">
                  <td className="py-3 pr-6">Query all pages of different types in one Graph request</td>
                  <td className="py-3 font-mono text-brand">Contract → interface query</td>
                </tr>
                <tr className="border-b border-ghost-border/50">
                  <td className="py-3 pr-6">A teaser block should always reflect its parent article&apos;s title/image</td>
                  <td className="py-3 font-mono text-brand">Binding + Mappings</td>
                </tr>
                <tr className="border-b border-ghost-border/50">
                  <td className="py-3 pr-6">Editors need to pick any item from a list of content</td>
                  <td className="py-3"><Code>contentReference</Code> property</td>
                </tr>
                <tr className="border-b border-ghost-border/50">
                  <td className="py-3 pr-6">External product catalog should sync into CMS content types</td>
                  <td className="py-3 text-on-surface-variant">Content Source API (see External Content demo)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6">One type&apos;s data should populate a different type&apos;s nested component</td>
                  <td className="py-3 font-mono text-brand">Binding on a component property</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </>
  );
}
