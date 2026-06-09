import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";

export const metadata: Metadata = {
  title: "CMS MCP Server",
};

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

function ExampleCard({
  title,
  prompt,
  steps,
}: {
  title: string;
  prompt: string;
  steps: string[];
}) {
  return (
    <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-ghost-border">
        <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-1">Example</p>
        <h3 className="font-display font-semibold text-on-surface">{title}</h3>
      </div>
      <div className="p-6">
        <div className="bg-surface-low rounded-xl px-4 py-3 mb-5 border border-ghost-border">
          <p className="text-xs font-mono text-on-surface-variant mb-1">Developer prompt</p>
          <p className="text-sm text-on-surface italic leading-relaxed">&ldquo;{prompt}&rdquo;</p>
        </div>
        <ol className="space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-on-surface-variant">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-[10px]">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Pipeline({ steps }: { steps: { label: string; sub?: string; highlight?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`text-center rounded-xl px-4 py-3 min-w-[130px] ${
              step.highlight
                ? "bg-brand/10 border border-brand/30"
                : "bg-surface-low"
            }`}
          >
            <p className="text-xs font-mono font-semibold text-on-surface">{step.label}</p>
            {step.sub && (
              <p className="text-[10px] font-mono text-on-surface-variant mt-1">{step.sub}</p>
            )}
          </div>
          {i < steps.length - 1 && (
            <span className="text-on-surface-variant text-lg">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-surface-low border border-ghost-border text-on-surface">
      {children}
    </span>
  );
}

export default function McpServerDemoPage() {
  return (
    <>
      <DemoHero
        title="CMS MCP Server"
        description="The Optimizely SaaS CMS ships a native Model Context Protocol server. Connect any MCP-compatible AI assistant to your CMS and interact with content, schemas, and navigation through natural language - no GraphQL or REST knowledge required."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            Zero boilerplate setup
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            Works with Claude, Cursor, Copilot
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            Reads Graph, writes Management API
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            OAuth-authenticated
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        <section id="setup">
          <SectionHeading id="setup">Setup</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Add one entry to your project&apos;s{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">.mcp.json</code>{" "}
            file. The MCP server is hosted by Optimizely - there is nothing to deploy or
            maintain on your side. Your AI assistant discovers available tools automatically on
            first connection.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">.mcp.json</span>
              </div>
              <pre className="p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                <code>{`{
  "mcpServers": {
    "cms": {
      "type": "http",
      "url": "https://cms.mcp.opal.optimizely.com/mcp"
    }
  }
}`}</code>
              </pre>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">What the server exposes</h3>
              <div className="space-y-3">
                {[
                  { tool: "list_content_types", desc: "Returns all registered content types with their property schemas and base types" },
                  { tool: "get_content", desc: "Fetches a content item by key, URL, or Graph reference - supports draft and published modes" },
                  { tool: "create_content", desc: "Creates a new content item via the Management API with typed property validation" },
                  { tool: "update_content", desc: "Patches an existing content item - accepts partial property updates" },
                  { tool: "query_content", desc: "Issues a Graph query described in plain language and returns the matching items" },
                  { tool: "publish_content", desc: "Moves a draft to published status and triggers ISR revalidation" },
                ].map(({ tool, desc }) => (
                  <div key={tool} className="flex gap-3">
                    <span className="shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-brand/10 text-brand whitespace-nowrap">
                      {tool}
                    </span>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              How a prompt becomes a CMS operation
            </p>
            <Pipeline
              steps={[
                { label: "Developer prompt", sub: "natural language" },
                { label: "MCP client", sub: "Claude / Cursor / Copilot" },
                { label: "MCP server", sub: "cms.mcp.opal.optimizely.com", highlight: true },
                { label: "Graph / Mgmt API", sub: "authenticated request" },
                { label: "CMS updated", sub: "draft or published" },
              ]}
            />
          </div>
        </section>

        <section id="content-type-exploration">
          <SectionHeading id="content-type-exploration">Content Type Exploration</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Auditing content types in the CMS UI means navigating menus for each type individually.
            With MCP it is a single natural-language query. Useful when onboarding to an existing
            project, debugging a Graph query that returns unexpected fields, or figuring out what
            properties are available before writing a seed script.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <ExampleCard
              title="Inspect a content type"
              prompt="What properties does ArticlePage expose? Which ones are searchable and which are content references?"
              steps={[
                "MCP calls list_content_types and filters to ArticlePage",
                "Returns property names, types (string, richText, contentReference, array), and indexing flags",
                "Searchable fields are highlighted - these are what Graph full-text search covers",
                "Content reference fields include their allowedTypes so you know what can be linked",
              ]}
            />
            <ExampleCard
              title="Find all types that extend a base type"
              prompt="Which content types use _page as their base type, and which ones support display template variants?"
              steps={[
                "MCP calls list_content_types and groups results by baseType",
                "Types with registered display templates are flagged",
                "Useful when deciding whether a new page type should extend _page or _experience",
                "Returns the compositionBehaviors for each type (elementEnabled vs sectionEnabled)",
              ]}
            />
            <ExampleCard
              title="Check allowed types in a content area"
              prompt="What blocks are allowed inside the sections content area on DynamicExperience pages?"
              steps={[
                "MCP fetches the DynamicExperience content type definition",
                "Returns the allowedTypes array for the sections property",
                "Lists each allowed block type with its own property schema",
                "Useful before building a composition script to know what block types are valid",
              ]}
            />
            <ExampleCard
              title="Understand a property constraint"
              prompt="Does HeroBlock use elementEnabled or sectionEnabled? Can it contain child content areas?"
              steps={[
                "MCP fetches HeroBlock from the content type registry",
                "Returns compositionBehaviors: elementEnabled means it is a leaf node",
                "Confirms that adding a content area property to it would be silently ignored by the CMS",
                "Saves a round-trip of deploying a broken schema to find this out at runtime",
              ]}
            />
          </div>
        </section>

        <section id="content-authoring">
          <SectionHeading id="content-authoring">Content Authoring &amp; Seeding</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Create and update content items through conversation instead of writing seed scripts
            or using the CMS UI. The MCP server handles the Management API authentication,
            content reference format ({" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cms://content/key</code>
            {" "}), and property validation on your behalf.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <ExampleCard
              title="Create a draft article"
              prompt="Create an ArticlePage titled 'Five tax-efficient savings strategies for 2026' under /en/insights/articles. Set the category to personal-finance and tag it with savings, tax, and ISA."
              steps={[
                "MCP resolves ArticlePage schema to know the required property shape",
                "Calls create_content with title, slug, category enum, and tags array",
                "Content is created as a draft - no accidental publishes",
                "Returns the new content key and CMS edit link for immediate review",
              ]}
            />
            <ExampleCard
              title="Link a content reference"
              prompt="Set the author on the article we just created to Sarah Chen."
              steps={[
                "MCP calls query_content to find the AuthorBlock for Sarah Chen by display name",
                "Resolves the author's content key and forms the cms://content/{key} reference",
                "Calls update_content to patch the author field on the target article",
                "Handles the single reference format the Management API expects automatically",
              ]}
            />
            <ExampleCard
              title="Seed a batch of FAQ items"
              prompt="Create five FaqItemBlock entries covering common questions about Mosey Bank's savings accounts. Link them all to the /en/faqs page's faqItems content area."
              steps={[
                "MCP creates each FaqItemBlock individually and collects their keys",
                "Fetches the target FaqContainerBlock to read its current faqItems array",
                "Appends the new items using the { reference: 'cms://content/key' } array format",
                "Patches the container block in one update_content call with the merged array",
              ]}
            />
            <ExampleCard
              title="Publish a reviewed draft"
              prompt="The article looks good. Publish it and make sure the nav cache is cleared."
              steps={[
                "MCP calls publish_content with the article's content key",
                "Management API moves the draft to published status",
                "The configured publish webhook fires, triggering Next.js ISR revalidation",
                "The page tag and navigation tag are both invalidated so visitors see fresh content",
              ]}
            />
          </div>
        </section>

        <section id="querying-auditing">
          <SectionHeading id="querying-auditing">Querying &amp; Auditing</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Ask questions about your content library in plain language. The MCP server
            translates them into Graph queries with the correct filters, pagination, and locale
            scope - useful for audits, debugging, and ad hoc content checks during development.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <ExampleCard
              title="Find stale content"
              prompt="Which ArticlePages in the investments category haven't been updated in the last 60 days? Show me their titles and last-modified dates."
              steps={[
                "MCP builds a Graph query filtering by category='investments' and publishDate",
                "Sorts results by publishDate ascending to surface the most stale items first",
                "Returns titles, slugs, publishDate, and Management API edit links",
                "Can be followed up with: 'Flag all of them for review' to batch-patch their status",
              ]}
            />
            <ExampleCard
              title="Debug a missing content item"
              prompt="The page at /en/insights/articles/mortgage-rates-explained isn't rendering. Is it published? Does it have an author set?"
              steps={[
                "MCP calls get_content with the URL to fetch the item regardless of publish state",
                "Checks _metadata.status to confirm whether it is draft, published, or deleted",
                "Inspects the author field - single content references return only base metadata",
                "Reports missing fields and suggests the next fix (set author, publish draft, etc.)",
              ]}
            />
            <ExampleCard
              title="Count content by type"
              prompt="How many ArticlePages exist per category? I want to know if any category is underpopulated before we launch."
              steps={[
                "MCP queries ArticlePages with a facet on the category field",
                "Graph returns facet counts without fetching all items - efficient for large libraries",
                "Results show each category label alongside its article count",
                "Immediately actionable: 'Create two more articles in the business-banking category'",
              ]}
            />
            <ExampleCard
              title="Inspect navigation structure"
              prompt="Show me the full nav tree. I want to see every node, its URL, and how many levels deep it goes."
              steps={[
                "MCP calls query_content with the @recursive directive on the navigation type",
                "Returns the full tree with node labels, hrefs, and nesting depth",
                "Useful before running a seed script that modifies nav to understand the current shape",
                "Can be followed up with: 'Add a node under Insights for the new Savings hub'",
              ]}
            />
            <ExampleCard
              title="Plan a type deprecation"
              prompt="We are deprecating LegacyBannerBlock. Find every page that still has it in a content area and give me a list of URLs and edit links."
              steps={[
                "MCP queries Graph for all content items whose composition includes LegacyBannerBlock",
                "Returns parent page keys, titles, and CMS edit links for each affected item",
                "Surfaces draft and published pages separately so the migration can be phased",
                "Immediately actionable - follow up with 'Replace each one with HeroBlock using the same heading and image'",
              ]}
            />
          </div>
        </section>

        <section id="developer-workflow">
          <SectionHeading id="developer-workflow">Developer Workflow Integration</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The MCP server fits into common development tasks - not just one-off content
            operations. These examples show how it speeds up the feedback loop when building
            new content types, writing seed scripts, or debugging Graph query issues. It also
            helps when onboarding new developers - instead of learning the CMS UI to understand
            the content model, they can ask the MCP server directly.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <ExampleCard
              title="Validate a new content type before pushing"
              prompt="I'm about to push a new PressReleasePage type. Check whether anything in the existing schema conflicts with the property names I've defined."
              steps={[
                "MCP lists all registered content types and their property key namespaces",
                "Cross-references against the new type's property list for collisions",
                "Flags any property key that already exists on a parent or sibling type",
                "Saves a round-trip of running opti:push only to hit a schema validation error",
              ]}
            />
            <ExampleCard
              title="Generate a seed script from an existing item"
              prompt="Look at the case study at /en/insights/case-studies/local-bakery-growth and generate a seed script stub that creates a similar item."
              steps={[
                "MCP calls get_content on the case study URL to fetch its full property shape",
                "Reads referenced OutcomeItemBlock and TestimonialBlock keys from the composition",
                "Outputs a TypeScript snippet following the scripts/seed-modeling.ts pattern",
                "Includes the cms://content/{key} reference format for all content area items",
              ]}
            />
            <ExampleCard
              title="Reproduce a Graph query result locally"
              prompt="The GetArticles query is returning no results for the 'market-insights' category. Run it against the live CMS and tell me what's coming back."
              steps={[
                "MCP executes the query against the Graph delivery API with the given filter",
                "Returns the raw response including any empty arrays or null fields",
                "Reports whether the category enum value matches what is stored on published items",
                "Surfaces whether the articles exist as drafts but haven't been published yet",
              ]}
            />
            <ExampleCard
              title="Clean up after a seed run"
              prompt="The seed script created duplicate FAQ items. Find all FaqItemBlocks whose question starts with 'What is' and delete the extras, keeping only the most recently created one."
              steps={[
                "MCP queries FaqItemBlocks matching the question prefix filter",
                "Sorts by _metadata.created descending to identify the newest item",
                "Calls the Management API delete endpoint for each duplicate key",
                "Confirms deletion by re-querying and returning the remaining item count",
              ]}
            />
            <ExampleCard
              title="Scaffold a block component from a content type"
              prompt="Read the PricingTierBlock content type and generate a TypeScript React component that renders all its properties with the correct data-component attribute and preview utils."
              steps={[
                "MCP calls list_content_types and returns PricingTierBlock's full property schema",
                "AI maps each property type to its rendering pattern - string to <p>, richText to <RichText />, contentReference to <Image />",
                "Generates the component with correct TypeScript types, pa() preview attributes, and data-component",
                "No need to open the CMS UI, copy field names by hand, or guess at property shapes",
              ]}
            />
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">
              Supported MCP clients
            </p>
            <p className="text-sm text-on-surface-variant mb-5">
              Any tool implementing the Model Context Protocol can connect to the same server
              endpoint. No per-client integration is needed on the Optimizely side.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Claude Desktop", "Claude Code", "Cursor", "GitHub Copilot", "Windsurf", "Zed", "Any MCP-compatible client"].map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          </div>

          <Callout variant="note">
            <strong>Auth is handled once at connection time.</strong>{" "}
            The MCP server uses the same OAuth credentials as the Management API
            ({" "}<code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_CMS_CLIENT_ID</code>{" "}
            and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_CMS_CLIENT_SECRET</code>
            {" "}). Set them once in your environment and every tool call in the session is
            automatically authenticated - no token management in prompts.
          </Callout>
        </section>

        <section id="related">
          <SectionHeading id="related">Related Demos</SectionHeading>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/demo/management-api"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Related Demo</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Management API →
              </p>
              <p className="text-xs text-on-surface-variant">
                The REST API the MCP server calls under the hood - auth, content format rules, and seed script patterns
              </p>
            </Link>
            <Link
              href="/demo/opal"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Related Demo</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Opal AI Agents →
              </p>
              <p className="text-xs text-on-surface-variant">
                Pre-built and custom agents that use the same Management API and Graph paths the MCP server exposes
              </p>
            </Link>
            <Link
              href="/demo/graph-queries"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Related Demo</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Graph Queries →
              </p>
              <p className="text-xs text-on-surface-variant">
                The Graph delivery API the MCP server queries when you ask questions about your content library
              </p>
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
