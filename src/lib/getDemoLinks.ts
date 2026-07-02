export type DemoLink = { href: string; label: string; description: string };
export type DemoCategory = { label: string; links: DemoLink[] };

export function getDemoCategories(): DemoCategory[] {
  return [
    {
      label: "CMS",
      links: [
        { href: "/demo/visual-builder",    label: "Visual Builder",       description: "Blocks, compositions, and display templates" },
        { href: "/demo/display-templates", label: "Display Templates",    description: "Every template variant and setting rendered side by side" },
        { href: "/demo/content-modelling", label: "Content Modelling",    description: "Content types and properties" },
        { href: "/demo/contracts",         label: "Contracts, Mappings & Bindings", description: "Shared contracts, mappings, and bindings" },
        { href: "/demo/preview",           label: "Draft Mode & Preview", description: "In-context editing and draft content" },
        { href: "/demo/forms",             label: "Forms",                description: "Form blocks and submissions" },
        { href: "/demo/navigation",        label: "Navigation",           description: "Recursive nav trees" },
        { href: "/demo/localization",      label: "Localization",         description: "Multi-language content and routing" },
        { href: "/demo/seo",               label: "SEO & Metadata",       description: "Metadata, sitemaps, and JSON-LD" },
        { href: "/demo/redirects",         label: "URL Redirects",        description: "CMS-managed redirect rules and middleware" },
        { href: "/demo/management-api",    label: "Management API",       description: "Content creation, seeding, and migrations" },
        { href: "/demo/rich-text",         label: "Rich Text",            description: "JSON vs HTML rendering and embedded blocks" },
        { href: "/demo/media",             label: "Media & DAM Assets",    description: "DAM assets, renditions, and next/image" },
        { href: "/demo/content-reuse",     label: "Content Reuse",        description: "Referenced vs embedded content" },
        { href: "/demo/global-settings",   label: "Global Settings",      description: "Singleton items for site-wide config" },
        { href: "/demo/content-lifecycle", label: "Content Lifecycle",    description: "Editorial states and scheduled publishing" },
      ],
    },
    {
      label: "Integrations",
      links: [
        { href: "/demo/feature-experimentation", label: "Feature Experimentation", description: "A/B tests, flags, and bucketing" },
        { href: "/demo/personalization",          label: "Personalization",         description: "Audiences, personas, and variation filter" },
        { href: "/demo/odp",                      label: "Data Platform (ODP)",     description: "Visitor profiles, segments, and event tracking" },
        { href: "/demo/external-content",         label: "External Content",        description: "Third-party data via Content Source API" },
        { href: "/demo/webhooks",                 label: "Webhooks",                description: "Graph webhooks and on-demand revalidation" },
      ],
    },
    {
      label: "Graph & Queries",
      links: [
        { href: "/demo/caching",      label: "Caching",         description: "ISR, revalidation tags, and webhooks" },
        { href: "/demo/graph-queries", label: "Graph Queries",  description: "Querying patterns and @recursive" },
        { href: "/demo/search",        label: "Search",          description: "Full-text search with Graph filtering" },
        { href: "/demo/listing",       label: "Content Listing", description: "Paginated lists with cursor pagination" },
      ],
    },
    {
      label: "Architecture",
      links: [
        { href: "/demo/architecture",    label: "System Overview",  description: "How CMS, Graph, and Next.js fit together" },
        { href: "/demo/error-handling",  label: "Error Handling",   description: "notFound vs 500, error boundaries, fallbacks" },
      ],
    },
    {
      label: "AI",
      links: [
        { href: "/demo/opal", label: "Opal AI Agents", description: "GEO, SEO, and content review agents" },
        { href: "/demo/mcp-server", label: "CMS MCP Server", description: "Natural language content authoring via MCP" },
      ],
    },
  ];
}

export function getDemoLinks(): { href: string; label: string }[] {
  return getDemoCategories().flatMap((c) => c.links);
}
