export type DemoLink = { href: string; label: string; description: string };
export type DemoCategory = { label: string; links: DemoLink[] };

export function getDemoCategories(): DemoCategory[] {
  return [
    {
      label: "CMS",
      links: [
        { href: "/demo/visual-builder",    label: "Visual Builder",       description: "Page composition, blocks, and display templates" },
        { href: "/demo/content-modelling", label: "Content Modelling",    description: "Structuring content types and properties" },
        { href: "/demo/preview",           label: "Draft Mode & Preview", description: "In-context editing and draft content" },
        { href: "/demo/forms",             label: "Forms",                description: "CMS-managed form blocks and submissions" },
        { href: "/demo/navigation",        label: "Navigation",           description: "Recursive nav trees from the CMS" },
        { href: "/demo/localization",      label: "Localization",         description: "Multi-language content, Graph locale filter, and Next.js routing" },
        { href: "/demo/seo",               label: "SEO & Metadata",       description: "generateMetadata, sitemaps, JSON-LD, and image optimization" },
        { href: "/demo/management-api",    label: "Management API",       description: "Programmatic content creation, seeding, and migrations" },
        { href: "/demo/rich-text",         label: "Rich Text",            description: "richText property type, JSON vs HTML rendering, and embedded blocks" },
        { href: "/demo/media",             label: "Media & DAM Assets",    description: "Image property modelling, DAM rendition patterns, Graph response shapes, and next/image" },
        { href: "/demo/content-reuse",     label: "Content Reuse",        description: "Referenced vs embedded content - when one update should propagate everywhere" },
        { href: "/demo/global-settings",   label: "Global Settings",      description: "Singleton content items for site-wide config, ISR cache strategy" },
        { href: "/demo/content-lifecycle", label: "Content Lifecycle",    description: "Editorial states, scheduled publishing, and webhook events" },
      ],
    },
    {
      label: "Integrations",
      links: [
        { href: "/demo/feature-experimentation", label: "Feature Experimentation", description: "A/B tests, flags, and SDK bucketing" },
        { href: "/demo/personalization",          label: "Personalization",         description: "Audiences, personas, and Graph variation filter" },
        { href: "/demo/external-content",         label: "External Content",        description: "Syncing third-party data via Content Source API" },
      ],
    },
    {
      label: "Graph & Queries",
      links: [
        { href: "/demo/caching",      label: "Caching",         description: "ISR, revalidation tags, and publish webhooks" },
        { href: "/demo/graph-queries", label: "Graph Queries",  description: "Efficient querying patterns, @recursive, and avoiding N+1" },
        { href: "/demo/search",        label: "Search",          description: "Full-text and semantic search with Graph filtering and pagination" },
        { href: "/demo/listing",       label: "Content Listing", description: "Paginated list pages with cursor pagination and sorting" },
      ],
    },
    {
      label: "Architecture",
      links: [
        { href: "/demo/architecture",    label: "System Overview",  description: "How SaaS CMS, Graph, Next.js, and Feature Experimentation fit together" },
        { href: "/demo/error-handling",  label: "Error Handling",   description: "Graceful degradation, notFound vs 500, error boundaries, and fallback data" },
      ],
    },
    {
      label: "AI",
      links: [
        { href: "/demo/opal", label: "Opal AI Agents", description: "GEO, SEO, content review agents, workflow orchestration, and developer SDK" },
        { href: "/demo/mcp-server", label: "CMS MCP Server", description: "Connect any MCP-compatible AI assistant to the CMS for natural language content authoring and querying" },
      ],
    },
  ];
}

export function getDemoLinks(): { href: string; label: string }[] {
  return getDemoCategories().flatMap((c) => c.links);
}
