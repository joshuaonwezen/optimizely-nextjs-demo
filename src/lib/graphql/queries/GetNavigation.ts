import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

// Public tree type — used by NestedNavMenu and the demo page

export interface NavNode {
  key: string;
  label: string;
  href: string;
  description?: string;
  openInNewTab?: boolean;
  children: NavNode[];
}

// Raw GraphQL response types

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

// Query
//
// A named fragment captures the repeated scalar fields so the nesting levels
// stay readable. GraphQL does not allow recursive fragments, so each level is
// written out explicitly — this makes the depth limit clear and intentional.

/**
 * The @recursive directive tells Optimizely Graph to apply this fragment to
 * the items in the decorated content area field at each nesting level, up to
 * the given depth. No need to repeat inline fragments manually — the directive
 * handles arbitrary depth with a single fragment definition.
 *
 * depth: 5 → NavRoot → L1 → L2 → L3 → L4 → L5
 */
// Display name written by seed-nav.ts — how editors identify the Navigation
// block in the Shared Blocks tab. Not used for querying (Graph doesn't index
// the name property for filtering).
export const NAV_BLOCK_NAME = "Navigation Menu";

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

  query GetNavigation($locale: [Locales]) {
    # Newest first: deleted blocks can linger in the Graph index for a while
    # after a re-seed; ordering by lastModified guarantees the live block wins.
    Navigation(locale: $locale, orderBy: { _metadata: { lastModified: DESC } }, limit: 1) {
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

  query GetNavigationByKey($key: String!, $locale: [Locales]) {
    Navigation(
      where: { _metadata: { key: { eq: $key } } }
      locale: $locale
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

// Response mapper

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

// Fetch helper

/**
 * Fetch the Navigation shared block and map its navItems into a typed NavNode
 * tree.
 *
 * By default queries by the sentinel name written by seed-nav.ts ("Seeded
 * Navigation") so re-seeding with a new CMS key is transparent. Pass `key` to
 * query a specific Navigation block (e.g. for preview).
 *
 * Cached for 5 minutes with a "navigation" tag — call
 * revalidateTag("navigation") from a publish webhook to bust on demand.
 *
 * Falls back to DEMO_NAV_DATA when the block can't be reached.
 */
export async function getNavigation(options: {
  previewToken?: string;
  key?: string;
  /** Content locale to fetch (defaults to "en"). Localized nav versions are
   *  created by scripts/seed-localization.ts. */
  locale?: string;
} = {}): Promise<{ tree: NavNode[]; fromCms: boolean }> {
  const { previewToken, key, locale = "en" } = options;

  try {
    const result = await graphqlFetch<GetNavigationResult>(
      key ? GET_NAVIGATION_BY_KEY_QUERY : GET_NAVIGATION_QUERY,
      key ? { key, locale: [locale] } : { locale: [locale] },
      previewToken
        ? { previewToken, cache: "no-store" }
        : { next: { revalidate: CACHE_TTL, tags: ["navigation"] } }
    );

    const root = result.data?.Navigation?.items?.[0];
    if (!root) return { tree: DEMO_NAV_DATA, fromCms: false };

    const items = (root.navItems ?? [])
      .filter((c): c is RawNavItem => (c as RawNavItem).__typename === "NavigationItem")
      .map(toNavNode);

    if (items.length === 0) return { tree: DEMO_NAV_DATA, fromCms: false };
    return { tree: items, fromCms: true };
  } catch {
    return { tree: DEMO_NAV_DATA, fromCms: false };
  }
}

// Static fallback nav — mirrors the CMS nav seeded by seed-nav.ts.
// Hrefs match the nested page URLs created by seed-content.ts.

export const DEMO_NAV_DATA: NavNode[] = [
  {
    key: 'products',
    label: 'Products',
    href: '/en/products',
    description: 'Our full product suite',
    children: [
      {
        key: 'cms',
        label: 'Content Management',
        href: '/cms',
        children: [
          { key: 'visual-builder',   label: 'Visual Builder',   href: '/visual-builder',   children: [] },
          { key: 'content-modeling', label: 'Content Modeling', href: '/content-modeling', children: [] },
          { key: 'localization',     label: 'Localization',     href: '/localization',     children: [] },
        ],
      },
      {
        key: 'feature-experimentation',
        label: 'Feature Experimentation',
        href: '/feature-experimentation',
        children: [
          { key: 'feature-flags',        label: 'Feature Flags',        href: '/feature-flags',        children: [] },
          { key: 'progressive-rollouts', label: 'Progressive Rollouts', href: '/progressive-rollouts', children: [] },
        ],
      },
      {
        key: 'web-experimentation',
        label: 'Web Experimentation',
        href: '/web-experimentation',
        children: [
          { key: 'visual-editor', label: 'Visual Editor', href: '/visual-editor', children: [] },
          { key: 'stats-engine',  label: 'Stats Engine',  href: '/stats-engine',  children: [] },
        ],
      },
      {
        key: 'analytics',
        label: 'Analytics',
        href: '/analytics',
        children: [
          { key: 'analytics-reports',      label: 'Reports & Dashboards', href: '/reports',      children: [] },
          { key: 'analytics-integrations', label: 'Integrations',         href: '/integrations', children: [] },
        ],
      },
    ],
  },
  {
    key: 'solutions',
    label: 'Solutions',
    href: '/en/solutions',
    children: [
      { key: 'ecommerce',  label: 'E-Commerce',        href: '/en/ecommerce',        children: [] },
      { key: 'media',      label: 'Media & Publishing', href: '/en/media-publishing', children: [] },
      { key: 'enterprise', label: 'Enterprise',         href: '/en/enterprise',       children: [] },
    ],
  },
  {
    key: 'resources',
    label: 'Resources',
    href: '/en/resources',
    children: [
      { key: 'docs',         label: 'Documentation', href: '/en/docs',         children: [] },
      { key: 'blog',         label: 'Blog',          href: '/en/blog',         children: [] },
      { key: 'case-studies', label: 'Case Studies',  href: '/en/case-studies', children: [] },
    ],
  },
  {
    key: 'developers',
    label: 'Developers',
    href: '/en/developers',
    children: [
      { key: 'api-reference', label: 'API Reference', href: '/en/api-reference', children: [] },
      { key: 'sdks',          label: 'SDKs',          href: '/en/sdks',          children: [] },
      { key: 'github',        label: 'GitHub',        href: 'https://github.com/episerver', openInNewTab: true, children: [] },
    ],
  },
  {
    key: 'company',
    label: 'Company',
    href: '/en/company',
    children: [
      { key: 'about',   label: 'About',   href: '/en/about',   children: [] },
      { key: 'careers', label: 'Careers', href: '/en/careers', children: [] },
      { key: 'contact', label: 'Contact', href: '/contact',    children: [] },
    ],
  },
];