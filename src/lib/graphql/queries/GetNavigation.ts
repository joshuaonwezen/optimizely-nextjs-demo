import { graphqlFetch } from "@/lib/optimizely/client";

// ---------------------------------------------------------------------------
// Public tree type — used by NestedNavMenu and the demo page
// ---------------------------------------------------------------------------

export interface NavNode {
  key: string;
  label: string;
  href: string;
  description?: string;
  openInNewTab?: boolean;
  children: NavNode[];
}

// ---------------------------------------------------------------------------
// Raw GraphQL response types
// ---------------------------------------------------------------------------

export interface RawNavItem {
  __typename?: string;
  _metadata?: { key?: string | null } | null;
  label?: string | null;
  // href is a ContentReference in Graph — url.default holds the URL string
  href?: { url?: { default?: string | null } | null } | null;
  description?: string | null;
  openInNewTab?: boolean | null;
  // Recursively typed — children are the same shape (any depth)
  children?: Array<RawNavItem | { __typename?: string }> | null;
}

interface GetNavigationResult {
  Navigation?: {
    items?: Array<{
      name?: string | null;
      navItems?: Array<RawNavItem | { __typename?: string }> | null;
    } | null> | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Query
//
// A named fragment captures the repeated scalar fields so the nesting levels
// stay readable. GraphQL does not allow recursive fragments, so each level is
// written out explicitly — this makes the depth limit clear and intentional.
// ---------------------------------------------------------------------------

/**
 * The @recursive directive tells Optimizely Graph to apply this fragment to
 * the items in the decorated content area field at each nesting level, up to
 * the given depth. No need to repeat inline fragments manually — the directive
 * handles arbitrary depth with a single fragment definition.
 *
 * depth: 5 → NavRoot → L1 → L2 → L3 → L4 → L5
 */
export const GET_NAVIGATION_QUERY = /* GraphQL */ `
  fragment NavItemFields on _IContent {
    ... on NavigationItem {
      __typename
      _metadata { key }
      label
      href { url { default } }
      description
      openInNewTab
      children @recursive(depth: 5)
    }
  }

  query GetNavigation {
    Navigation(limit: 1) {
      items {
        name
        navItems {
          ...NavItemFields
        }
      }
    }
  }
`;

const GET_NAVIGATION_BY_KEY_QUERY = /* GraphQL */ `
  fragment NavItemFieldsByKey on _IContent {
    ... on NavigationItem {
      __typename
      _metadata { key }
      label
      href { url { default } }
      description
      openInNewTab
      children @recursive(depth: 5)
    }
  }

  query GetNavigationByKey($key: String!) {
    Navigation(
      where: { _metadata: { key: { eq: $key } } }
      limit: 1
    ) {
      items {
        name
        navItems {
          ...NavItemFieldsByKey
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Response mapper
// ---------------------------------------------------------------------------

export function toNavNode(raw: RawNavItem): NavNode {
  return {
    key: raw._metadata?.key ?? "",
    label: raw.label ?? "",
    href: raw.href?.url?.default ?? "#",
    description: raw.description ?? undefined,
    openInNewTab: raw.openInNewTab ?? false,
    children: (raw.children ?? [])
      .filter((c): c is RawNavItem => (c as RawNavItem).__typename === "NavigationItem")
      .map(toNavNode),
  };
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

/**
 * Fetch the "Navigation" shared block by its fixed content ID and map its
 * navItems content area into a typed NavNode tree.
 *
 * Cached for 5 minutes with a "navigation" tag — call
 * revalidateTag("navigation") from a publish webhook to bust on demand.
 *
 * Falls back to DEMO_NAV_DATA when the block can't be reached.
 */
export async function getNavigation(options: {
  previewToken?: string;
  key?: string;
} = {}): Promise<{ tree: NavNode[]; fromCms: boolean }> {
  const { previewToken, key } = options;

  try {
    const result = await graphqlFetch<GetNavigationResult>(
      key ? GET_NAVIGATION_BY_KEY_QUERY : GET_NAVIGATION_QUERY,
      key ? { key } : {},
      previewToken
        ? { previewToken, cache: "no-store" }
        : { next: { revalidate: 300, tags: ["navigation"] } }
    );

    const root = result.data?.Navigation?.items?.[0];
    if (!root) return key ? { tree: [], fromCms: false } : { tree: DEMO_NAV_DATA, fromCms: false };

    const items = (root.navItems ?? [])
      .filter((c): c is RawNavItem => (c as RawNavItem).__typename === "NavigationItem")
      .map(toNavNode);

    if (items.length === 0) return key ? { tree: [], fromCms: true } : { tree: DEMO_NAV_DATA, fromCms: false };
    return { tree: items, fromCms: true };
  } catch {
    return { tree: DEMO_NAV_DATA, fromCms: false };
  }
}

// ---------------------------------------------------------------------------
// Demo data — mirrors what a real NavigationRoot + NavigationItem tree
// would look like once populated in the CMS
// ---------------------------------------------------------------------------

export const DEMO_NAV_DATA: NavNode[] = [
  {
    key: "products",
    label: "Products",
    href: "/en/products",
    description: "Our full product suite",
    children: [
      {
        key: "cms",
        label: "Content Management",
        href: "/en/cms",
        children: [
          {
            key: "visual-builder",
            label: "Visual Builder",
            href: "/en/visual-builder",
            children: [
              {
                key: "page-templates",
                label: "Page Templates",
                href: "/en/page-templates",
                children: [
                  { key: "industry-templates", label: "Industry Templates", href: "/en/industry-templates", children: [] },
                  { key: "starter-templates", label: "Starter Templates", href: "/en/starter-templates", children: [] },
                ],
              },
              { key: "component-library", label: "Component Library", href: "/en/component-library", children: [] },
              { key: "preview-mode", label: "Preview Mode", href: "/en/preview-mode", children: [] },
            ],
          },
          {
            key: "content-modeling",
            label: "Content Modeling",
            href: "/en/content-modeling",
            children: [
              { key: "custom-types", label: "Custom Content Types", href: "/en/custom-content-types", children: [] },
              { key: "validation", label: "Validation Rules", href: "/en/validation-rules", children: [] },
            ],
          },
          { key: "localization", label: "Localization", href: "/en/localization", children: [] },
        ],
      },
      {
        key: "experimentation",
        label: "Experimentation",
        href: "/en/experimentation",
        children: [
          { key: "ab-testing", label: "A/B Testing", href: "/en/ab-testing", children: [] },
          { key: "feature-flags", label: "Feature Flags", href: "/en/feature-flags", children: [] },
        ],
      },
      {
        key: "analytics",
        label: "Analytics",
        href: "/en/analytics",
        children: [
          { key: "reports", label: "Reports", href: "/en/reports", children: [] },
          { key: "dashboards", label: "Dashboards", href: "/en/dashboards", children: [] },
        ],
      },
    ],
  },
  {
    key: "solutions",
    label: "Solutions",
    href: "/en/solutions",
    children: [
      { key: "ecommerce", label: "E-Commerce", href: "/en/ecommerce", children: [] },
      { key: "media", label: "Media & Publishing", href: "/en/media-publishing", children: [] },
      { key: "enterprise", label: "Enterprise", href: "/en/enterprise", children: [] },
    ],
  },
  {
    key: "resources",
    label: "Resources",
    href: "/en/resources",
    children: [
      {
        key: "docs",
        label: "Documentation",
        href: "/en/docs",
        children: [
          {
            key: "getting-started",
            label: "Getting Started",
            href: "/en/getting-started",
            children: [
              {
                key: "quick-start",
                label: "Quick Start",
                href: "/en/quick-start",
                children: [
                  { key: "installation", label: "Installation", href: "/en/installation", children: [] },
                  { key: "configuration", label: "Configuration", href: "/en/configuration", children: [] },
                ],
              },
            ],
          },
          { key: "api-reference", label: "API Reference", href: "/en/api-reference", children: [] },
        ],
      },
      { key: "blog", label: "Blog", href: "/en/blog", children: [] },
      { key: "case-studies", label: "Case Studies", href: "/en/case-studies", children: [] },
    ],
  },
  {
    key: "developers",
    label: "Developers",
    href: "/en/developers",
    children: [
      {
        key: "sdk",
        label: "SDK",
        href: "/en/sdk",
        children: [
          {
            key: "js-sdk",
            label: "JavaScript SDK",
            href: "/en/javascript-sdk",
            children: [
              {
                key: "react",
                label: "React",
                href: "/en/react-sdk",
                children: [
                  { key: "hooks", label: "Hooks", href: "/en/hooks", children: [] },
                  { key: "components", label: "Components Reference", href: "/en/components-reference", children: [] },
                ],
              },
              { key: "node", label: "Node.js", href: "/en/nodejs", children: [] },
            ],
          },
          { key: "rest-api", label: "REST API", href: "/en/rest-api", children: [] },
        ],
      },
      { key: "github", label: "GitHub ↗", href: "https://github.com/episerver", openInNewTab: true, children: [] },
    ],
  },
  {
    key: "company",
    label: "Company",
    href: "/en/company",
    children: [
      { key: "about", label: "About", href: "/en/about", children: [] },
      { key: "careers", label: "Careers", href: "/en/careers", children: [] },
    ],
  },
];
