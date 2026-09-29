export type DemoLink = { href: string; label: string; description: string; group?: string };
export type DemoCategory = { label: string; links: DemoLink[] };

/**
 * Links bucketed by `group`, in declaration order. Ungrouped links bucket under "".
 * Group order comes from the data, so there is no second list to keep in sync.
 */
export function byGroup(links: DemoLink[]): [string, DemoLink[]][] {
  const groups = new Map<string, DemoLink[]>();
  for (const link of links) {
    const key = link.group ?? "";
    const bucket = groups.get(key);
    if (bucket) bucket.push(link);
    else groups.set(key, [link]);
  }
  return [...groups];
}

/**
 * True when a category uses sub-groups. Only CMS does today: it holds over half
 * of all demo pages, so it earns its own full-width band in the Developer menu
 * and sub-headings on the /demo index. Everything else renders as a flat list.
 */
export function hasGroups(category: DemoCategory): boolean {
  return category.links.some((link) => link.group);
}

export function getDemoCategories(): DemoCategory[] {
  return [
    {
      label: "CMS",
      links: [
        { group: "Modelling", href: "/demo/sdk-setup",         label: "SDK Reference",        description: "contentType options, SDK API surface, query debugging" },
        { group: "Modelling", href: "/demo/content-modelling", label: "Content Modelling",    description: "Content types and properties" },
        { group: "Modelling", href: "/demo/contracts",         label: "Contracts, Mappings & Bindings", description: "Shared contracts, mappings, and bindings" },
        { group: "Modelling", href: "/demo/categories",        label: "Categories & Taxonomy", description: "Hierarchical terms, cross-type filtering, and facets" },
        { group: "Modelling", href: "/demo/content-lifecycle", label: "Content Lifecycle",    description: "Editorial states and scheduled publishing" },
        { group: "Modelling", href: "/demo/global-settings",   label: "Global Settings",      description: "Singleton items for site-wide config" },

        { group: "Authoring", href: "/demo/visual-builder",    label: "Visual Builder",       description: "Blocks, compositions, and display templates" },
        { group: "Authoring", href: "/demo/display-templates", label: "Display Templates",    description: "Every template variant and setting rendered side by side" },
        { group: "Authoring", href: "/demo/rich-text",         label: "Rich Text",            description: "JSON vs HTML rendering and embedded blocks" },
        { group: "Authoring", href: "/demo/media",             label: "Media & DAM Assets",   description: "DAM assets, renditions, and next/image" },
        { group: "Authoring", href: "/demo/forms",             label: "Forms",                description: "Form blocks and submissions" },
        { group: "Authoring", href: "/demo/preview",           label: "Draft Mode & Preview", description: "In-context editing and draft content" },

        { group: "Delivery",  href: "/demo/navigation",        label: "Navigation",           description: "Recursive nav trees" },
        { group: "Delivery",  href: "/demo/localization",      label: "Localization",         description: "Multi-language content and routing" },
        { group: "Delivery",  href: "/demo/seo",               label: "SEO & Metadata",       description: "Metadata, sitemaps, and JSON-LD" },
        { group: "Delivery",  href: "/demo/redirects",         label: "URL Redirects",        description: "CMS-managed redirect rules and middleware" },
        { group: "Delivery",  href: "/demo/management-api",    label: "Management API",       description: "Content creation, seeding, and migrations" },
      ],
    },
    {
      label: "Integrations",
      links: [
        { href: "/demo/personalization",          label: "Personalization",         description: "Four paths compared: which product to reach for" },
        { href: "/demo/feature-experimentation", label: "Feature Experimentation", description: "Edge decisions, the variation URL segment, FX audiences" },
        { href: "/demo/web-experimentation",     label: "Web Experimentation",     description: "Client-side decisions driving CMS variations" },
        { href: "/demo/odp",                      label: "ODP",                     description: "Profiles, segments, and personalizing Graph directly" },
        { href: "/demo/event-tracking",           label: "Event Tracking",          description: "Global tracking layer and conversion events" },
        { href: "/demo/external-content",         label: "External Content",        description: "Third-party data via Content Source API" },
      ],
    },
    {
      label: "Graph & Queries",
      links: [
        { href: "/demo/caching",      label: "Caching",         description: "ISR, revalidation tags, and webhooks" },
        { href: "/demo/graph-queries", label: "Graph Queries",  description: "Querying patterns and @recursive" },
        { href: "/demo/search",        label: "Search",          description: "Full-text search with Graph filtering" },
        { href: "/demo/listing",       label: "Content Listing", description: "Lists, facets, autocomplete, and cursor pagination" },
      ],
    },
    {
      label: "Architecture",
      links: [
        { href: "/demo/optimizely-one",  label: "Optimizely One Platform",      description: "How Graph, ODP, FX, Web Exp, CMS, DAM, Recs and Mark AI compose in one app" },
        { href: "/demo/architecture",    label: "Architecture & CMS Editions",  description: "How CMS, Graph, and Next.js fit together - plus SaaS CMS vs CMS 13" },
        { href: "/demo/error-handling",  label: "Error Handling",   description: "notFound vs 500, error boundaries, fallbacks" },
      ],
    },
    {
      label: "AI",
      links: [
        { href: "/demo/mark-ai", label: "Mark AI Agents", description: "GEO, SEO, and content review agents" },
        { href: "/demo/mcp-server", label: "CMS MCP Server", description: "Natural language content authoring via MCP" },
      ],
    },
  ];
}

export function getDemoLinks(): { href: string; label: string }[] {
  return getDemoCategories().flatMap((c) => c.links);
}
