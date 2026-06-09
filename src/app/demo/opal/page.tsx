import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/blocks/CalloutBlock";

export const metadata: Metadata = {
  title: "Opal AI Agents",
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

function AgentCard({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps?: string[];
}) {
  return (
    <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
      <h3 className="font-display font-semibold text-on-surface mb-2">{name}</h3>
      <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{description}</p>
      {steps && steps.length > 0 && (
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
      )}
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

export default function OpalDemoPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Opal: AI Agent Platform
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Opal is Optimizely&apos;s agent orchestration layer. It ships a library of pre-built
            specialized agents for GEO, SEO, content review, and compliance - and lets you build
            custom agents and multi-step automated workflows on top of your CMS, experimentation,
            and data stack.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              Pre-built agent library
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              No-code workflow builder
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Developer SDK
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Privacy-first
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* Platform Overview */}
        <section id="overview">
          <SectionHeading id="overview">Platform Overview</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Opal sits above your entire Optimizely stack - reading content via Graph, writing
            updates back through the Management API, and triggering experiments via Feature
            Experimentation. It exposes three building blocks that compose into any automation
            pattern your team needs.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">1</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Pre-built Agents</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                A curated library of specialized agents for GEO, SEO, content creation, compliance
                review, FAQ generation, and competitive analysis. Each agent has a domain-specific
                knowledge base and a defined input/output contract - ready to use or chain together.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">2</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Custom Agents</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Build agents without writing a prompt template from scratch. Define the agent&apos;s
                goal in natural language, attach tools it can call, and add brand kit assets or
                customer data as context. The Opal Tools SDK lets developers expose any HTTP
                endpoint as a callable tool.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">3</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Workflow Orchestration</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Chain agents into multi-step workflows using a drag-and-drop builder. Combine
                sequential steps, parallel branches, conditional logic, and loops. Trigger
                workflows from a chat message, webhook, schedule, or inbound email - no
                engineering handoff required.
              </p>
            </div>
          </div>
        </section>

        {/* GEO & SEO Agents */}
        <section id="geo-seo-agents">
          <SectionHeading id="geo-seo-agents">GEO &amp; SEO Agents</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Traditional SEO optimizes content for search engine crawlers. GEO (Generative Engine
            Optimization) extends that to AI-powered search surfaces - ChatGPT, Perplexity, and
            Google AI Overviews. Opal ships agents for both layers, and the implementation agent
            at the end of the chain writes changes directly back to your CMS.
          </p>

          <h3 className="font-display font-semibold text-on-surface mb-4 text-lg">GEO Agents</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <AgentCard
              name="GEO Auditor Agent"
              description="Audits a page for AI search readiness end-to-end and delivers a prioritized action plan."
              steps={[
                "Check AI crawler accessibility (robots.txt, noindex, CDN rules)",
                "Measure Core Web Vitals against LLM citation thresholds",
                "Validate schema markup presence and correctness",
                "Assess content structure and citation readiness",
                "Evaluate E-E-A-T signals (Expertise, Authoritativeness, Trustworthiness)",
                "Output prioritized action plan with severity scores",
              ]}
            />
            <AgentCard
              name="GEO Recommendations Agent"
              description="Runs a full GEO audit and produces a branded report with ranked recommendations for LLM discoverability and retrievability."
              steps={[
                "Audit crawler access, vitals, and schema in parallel",
                "Score citation readiness against AI engine patterns",
                "Identify content gaps that prevent LLM citation",
                "Generate branded PDF/Markdown report with ranked recommendations",
              ]}
            />
            <AgentCard
              name="GEO Schema Optimization Agent"
              description="Analyzes page content and recommends JSON-LD schema markup to increase SEO richness and AI citation potential."
              steps={[
                "Parse page HTML for content type signals",
                "Match content to applicable Schema.org types",
                "Generate ready-to-paste JSON-LD markup snippets",
                "Flag missing or incomplete existing schema",
              ]}
            />
          </div>

          <h3 className="font-display font-semibold text-on-surface mb-4 text-lg">SEO Agents</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <AgentCard
              name="SEO Metadata Optimization Agent"
              description="Evaluates a URL for SEO metadata quality and surfaces specific opportunities for improvement."
              steps={[
                "Fetch live page and extract title, description, OG tags",
                "Score each field against length, keyword density, and click-through best practices",
                "Identify missing or duplicate metadata across the site",
                "Output ranked list of improvement recommendations",
              ]}
            />
            <AgentCard
              name="SEO Metadata Implementation Agent"
              description="Takes the Optimization Agent's recommendations and writes the improved metadata directly to your CMS content fields - no manual copy-paste."
              steps={[
                "Receive optimization report as input context",
                "Authenticate to CMS via Management API",
                "Patch the target content item's SEO fields",
                "Publish the updated version or submit for editorial review",
              ]}
            />
            <AgentCard
              name="Content Refresh Analysis Agent"
              description="Identifies stale and duplicate content across your site to improve SEO health and site credibility."
              steps={[
                "Query Graph for all published pages sorted by last-edit date",
                "Flag pages not updated within a configurable staleness window",
                "Detect duplicate or near-duplicate content using semantic similarity",
                "Output a prioritized refresh queue with CMS edit links",
              ]}
            />
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              How GEO + SEO agents chain together
            </p>
            <Pipeline
              steps={[
                { label: "Page URL", sub: "input to chain" },
                { label: "GEO Auditor", sub: "crawler + schema audit" },
                { label: "SEO Metadata Optimization", sub: "metadata gaps" },
                { label: "Implementation Agent", sub: "writes to CMS" },
                { label: "CMS Updated", sub: "published or in review", highlight: true },
              ]}
            />
          </div>

          <Callout variant="note">
            <strong>Propose then write.</strong>{" "}
            The Optimization and Implementation agents are designed to be paired. The Optimization
            Agent proposes changes with explanations; the Implementation Agent executes them via
            the Management API. You can insert a human approval step between them in the workflow
            builder before any write happens.
          </Callout>
        </section>

        {/* Content Creation & Review Agents */}
        <section id="content-agents">
          <SectionHeading id="content-agents">Content Creation &amp; Review Agents</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Opal includes agents for the full content lifecycle - from generating first drafts and
            optimizing existing copy to checking for legal/compliance issues before publish. All
            agents respect your brand kit assets and tone-of-voice guidelines.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <AgentCard
              name="Blog Content Creation Agent"
              description="Generates complete blog posts - headlines, introduction, body sections, and conclusion - while staying within your defined brand voice and tone."
              steps={[
                "Accept topic brief, target keywords, and tone-of-voice guidelines",
                "Research and outline sections using web context",
                "Draft headline variants optimized for click-through",
                "Write full article body maintaining brand voice throughout",
                "Output ready-to-publish CMS content item",
              ]}
            />
            <AgentCard
              name="Page Copy Optimization Agent"
              description="Analyzes the live copy on any URL and generates improved variants optimized for clarity, conversion rate, and target market fit."
              steps={[
                "Fetch live page and extract all copy blocks",
                "Score each block for clarity, action orientation, and audience fit",
                "Generate optimized variant for each block",
                "Produce side-by-side diff showing original vs improved copy",
              ]}
            />
            <AgentCard
              name="Legal / Compliance Review Agent"
              description="Checks copy for legal or regulatory issues before it goes live - flagging claims, disclaimers, and jurisdiction-specific requirements."
              steps={[
                "Parse all text content from draft page or CMS item",
                "Match claims against prohibited and regulated language patterns",
                "Flag missing required disclosures by jurisdiction",
                "Return annotated report with severity levels and suggested rewrites",
              ]}
            />
            <AgentCard
              name="Content Generation Agent"
              description="Creates product announcements, landing page copy, and marketing content directly inside the CMS from a brief or outline."
              steps={[
                "Accept a topic brief, product details, and target audience",
                "Generate structured content with headline, body, and CTA",
                "Apply brand kit assets (logo, color, tone references)",
                "Save draft directly to CMS via Management API",
              ]}
            />
            <AgentCard
              name="FAQ Creation Agent"
              description="Generates FAQ content from a topic, page URL, or product brief - ready to slot into a CMS FAQ block."
              steps={[
                "Extract intent and key themes from source material",
                "Generate question-answer pairs ranked by user need",
                "Format output as CMS-compatible FAQ block structure",
                "Optionally append schema.org FAQPage markup",
              ]}
            />
            <AgentCard
              name="AI Variation Development Agent"
              description="Creates new A/B test variations by modifying existing page elements and suggesting enhancement ideas while maintaining brand consistency."
              steps={[
                "Analyze current page composition and existing variations",
                "Propose element-level modifications (headline, CTA, layout)",
                "Generate variation copy and save it as a CMS variation",
                "Name the variation to match the FX variation key for automatic routing",
              ]}
            />
          </div>
        </section>

        {/* Workflow Orchestration */}
        <section id="workflows">
          <SectionHeading id="workflows">Workflow Agents &amp; Orchestration</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Individual agents answer one question or complete one task. Workflows chain them into
            autonomous pipelines that run without manual intervention - triggered by a schedule,
            an incoming webhook, a chat message, or an email.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-4">Triggers</h3>
              <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
                Every workflow starts with a trigger that defines when it runs. Triggers can be
                combined with filter conditions to scope them to specific content types, authors,
                or data fields.
              </p>
              <div className="space-y-3">
                {[
                  { name: "Chat Input", desc: "User sends a message in the Opal chat - on-demand automation, good for ad hoc analysis tasks" },
                  { name: "Webhook", desc: "HTTP request from an external system - content publish events, form submissions, CI pipeline hooks" },
                  { name: "Scheduler", desc: "Runs automatically at a fixed time or on a cron schedule - weekly audits, nightly refresh checks" },
                  { name: "Email", desc: "Sends to a dedicated address - lets non-technical stakeholders kick off a workflow from their inbox" },
                ].map(({ name, desc }) => (
                  <div key={name} className="flex gap-3">
                    <span className="shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-brand/10 text-brand">
                      {name}
                    </span>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-4">Logic Types</h3>
              <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
                Agents inside a workflow can be arranged with four composition patterns. These
                can be nested - a sequential chain can include a parallel block, which itself
                contains a conditional branch.
              </p>
              <div className="space-y-3">
                {[
                  { name: "Sequential", desc: "Each agent runs after the previous one completes - output is passed as context to the next step" },
                  { name: "Parallel", desc: "Multiple agents run simultaneously - results are merged before the next sequential step" },
                  { name: "Conditional", desc: "Branching based on a field value or agent output - route to different sub-workflows per condition" },
                  { name: "Loop", desc: "Repeat an agent or sub-workflow for each item in a list - process every page in a site audit iteratively" },
                ].map(({ name, desc }) => (
                  <div key={name} className="flex gap-3">
                    <span className="shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-surface-low text-on-surface border border-ghost-border">
                      {name}
                    </span>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">
              Example: weekly content quality workflow (6 steps, fully automated)
            </p>
            <p className="text-sm text-on-surface-variant mb-5">
              Runs every Monday at 07:00. No manual intervention required between trigger and CMS update.
            </p>
            <Pipeline
              steps={[
                { label: "Scheduler Trigger", sub: "Mon 07:00" },
                { label: "Content Refresh Analysis", sub: "find stale pages" },
                { label: "SEO Optimization", sub: "metadata gaps" },
                { label: "Legal Review", sub: "compliance check" },
                { label: "Implementation Agent", sub: "write to CMS" },
                { label: "Publish Webhook", sub: "ISR revalidation", highlight: true },
              ]}
            />
          </div>

          <Callout variant="note">
            <strong>Agents pass context forward.</strong>{" "}
            Each agent in a sequential workflow receives the full output of every preceding agent
            as context. The Legal Review Agent at step 4 above already has the SEO optimization
            suggestions from step 3 - it can check that the proposed rewrites don&apos;t introduce
            compliance issues before anything is written to the CMS.
          </Callout>
        </section>

        {/* Developer Tools */}
        <section id="developer-sdk">
          <SectionHeading id="developer-sdk">Developer Tools - Opal Tools SDK</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Opal&apos;s built-in agents can read from Graph and write via the Management API, but your
            internal systems - pricing databases, PIM, analytics APIs - are not reachable by default.
            The Opal Tools SDK lets you expose any HTTP endpoint as a callable tool that agents
            can discover and invoke at runtime. SDKs are available for TypeScript/Node, Python, and C#.
          </p>

          <div className="space-y-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">1</span>
                <h3 className="font-display font-semibold text-on-surface">Define a tool</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    A tool is an object with a name, description, typed parameters, and an
                    async execute function. The description is what Opal reads to decide whether
                    to call this tool - write it from the agent&apos;s perspective, not the
                    developer&apos;s.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    The execute function receives validated, typed parameters and can make any
                    async call - fetch, database query, third-party API - before returning a
                    result that becomes the agent&apos;s tool-call output.
                  </p>
                </div>
                <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-ghost-border bg-surface-low">
                    <span className="text-xs font-mono text-on-surface-variant">tools/productData.ts</span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                    <code>{`import { OpalTool, param } from "optimizely-opal/sdk";

export const productDataTool = new OpalTool({
  name: "fetch_product_data",
  description:
    "Fetches live product pricing and stock availability " +
    "from the internal PIM for a given SKU.",
  params: [
    param("productId", "string", "The product SKU to look up"),
  ],
  execute: async ({ productId }) => {
    const res = await fetch(\`/api/products/\${productId}\`);
    return res.json();
  },
});`}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">2</span>
                <h3 className="font-display font-semibold text-on-surface">Expose the discovery and execution endpoints</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Opal calls{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">/discovery</code>{" "}
                    when you register the tool server to learn what tools are available and what
                    parameters each one accepts. At runtime it calls{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">
                      /execute/:toolName
                    </code>{" "}
                    with the resolved parameters.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    The Express middleware handles JSON serialization, parameter validation, and
                    error formatting automatically. You only write the execute logic.
                  </p>
                </div>
                <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-ghost-border bg-surface-low">
                    <span className="text-xs font-mono text-on-surface-variant">server.ts</span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                    <code>{`import express from "express";
import { opalToolsMiddleware } from "optimizely-opal/sdk";
import { productDataTool } from "./tools/productData";

const app = express();
const tools = [productDataTool];

// GET /discovery - Opal reads this at registration time
// POST /execute/:toolName - Opal calls this at runtime
app.use(opalToolsMiddleware({ tools }));

app.listen(3001);`}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">3</span>
                <h3 className="font-display font-semibold text-on-surface">Register in Opal and attach to an agent</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-on-surface-variant leading-relaxed mb-4 max-w-2xl">
                  In the Opal UI, register the tool server URL under <strong>Tools</strong>. Opal
                  fetches{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">/discovery</code>{" "}
                  immediately to validate the schema. Then, when editing any agent, select the
                  tool from the agent&apos;s available tools list. The agent will call it whenever its
                  reasoning determines the tool is needed to complete the task.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["TypeScript SDK", "Python SDK", "C# SDK", "Express middleware", "Parameter validation", "Auth helpers"].map((f) => (
                    <Chip key={f}>{f}</Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How Opal Complements This Stack */}
        <section id="stack-integration">
          <SectionHeading id="stack-integration">How Opal Complements This Stack</SectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Opal does not replace any layer of the Optimizely stack - it orchestrates across all
            of them. Agents read content through Graph, write updates via the Management API,
            create experiment variations that FX can route to, and segment by ODP audiences.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              Opal&apos;s position in the stack
            </p>
            <Pipeline
              steps={[
                { label: "Opal Agent", sub: "orchestration layer" },
                { label: "Graph API", sub: "reads content + structure" },
                { label: "Management API", sub: "writes updates back" },
                { label: "Feature Experimentation", sub: "creates A/B variations" },
                { label: "Visitor sees variant", sub: "routed by FX + Graph", highlight: true },
              ]}
            />
          </div>

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
                How Opal&apos;s Implementation Agent authenticates and writes content back to the CMS programmatically
              </p>
            </Link>
            <Link
              href="/demo/feature-experimentation"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Related Demo</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Feature Experimentation →
              </p>
              <p className="text-xs text-on-surface-variant">
                How Opal&apos;s Variation Development Agent creates A/B test variants that FX routes to the right audience
              </p>
            </Link>
            <Link
              href="/demo/seo"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Related Demo</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                SEO &amp; Metadata →
              </p>
              <p className="text-xs text-on-surface-variant">
                How Next.js generates metadata fields that Opal&apos;s SEO agents audit and the Implementation Agent writes back
              </p>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
