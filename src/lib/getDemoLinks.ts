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
      label: "Performance",
      links: [
        { href: "/demo/caching", label: "Caching", description: "ISR, revalidation tags, and publish webhooks" },
        { href: "/demo/graph-queries", label: "Graph Queries", description: "Efficient querying patterns, @recursive, and avoiding N+1" },
      ],
    },
    {
      label: "Architecture",
      links: [
        { href: "/demo/architecture", label: "System Overview", description: "How SaaS CMS, Graph, Next.js, and Feature Experimentation fit together" },
      ],
    },
  ];
}

export function getDemoLinks(): { href: string; label: string }[] {
  return getDemoCategories().flatMap((c) => c.links);
}
