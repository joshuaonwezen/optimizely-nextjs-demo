import { graphqlFetch } from "@/lib/optimizely/client";
import type { NavNode } from "./GetNavigation";

export interface FlagNavResult {
  tree: NavNode[];
  fromCms: boolean;
}

export const GET_NAVIGATION_FROM_FLAGS_QUERY = /* GraphQL */ `
  query GetNavigationFromFlags {
    TraditionalPage(
      where: { includeInNavigation: { eq: true } }
      orderBy: { navOrder: ASC }
      limit: 100
    ) {
      items {
        _metadata { key url { default } }
        navLabel
        navOrder
      }
    }
  }
`;

interface RawFlagItem {
  _metadata?: { key?: string; url?: { default?: string } };
  navLabel?: string;
  navOrder?: number;
}

function buildTree(items: RawFlagItem[]): NavNode[] {
  // Sort shortest URL first so parents are always processed before children.
  const sorted = [...items]
    .filter((i) => i.navLabel && i._metadata?.url?.default && i._metadata?.key)
    .sort((a, b) => {
      const lenDiff = (a._metadata!.url!.default!.length) - (b._metadata!.url!.default!.length);
      return lenDiff !== 0 ? lenDiff : (a.navOrder ?? 0) - (b.navOrder ?? 0);
    });

  const nodeMap = new Map<string, NavNode>();
  const roots: NavNode[] = [];

  for (const item of sorted) {
    const href = item._metadata!.url!.default!;
    const node: NavNode = {
      key: item._metadata!.key!,
      label: item.navLabel!,
      href,
      children: [],
    };
    nodeMap.set(href, node);

    // Direct parent = longest other URL that is a strict prefix of this URL.
    const parent = sorted
      .filter((p) => {
        const ph = p._metadata?.url?.default;
        return ph && ph !== href && href.startsWith(ph);
      })
      .sort((a, b) => b._metadata!.url!.default!.length - a._metadata!.url!.default!.length)[0];

    if (parent?._metadata?.url?.default && nodeMap.has(parent._metadata.url.default)) {
      nodeMap.get(parent._metadata.url.default)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const FALLBACK_TREE: NavNode[] = [
  {
    key: "fallback-home",
    label: "Home",
    href: "/",
    children: [],
  },
  {
    key: "fallback-personal",
    label: "Personal Banking",
    href: "/en/personal/",
    children: [
      { key: "fallback-ca",      label: "Current Account", href: "/en/personal/current-account/", children: [] },
      { key: "fallback-savings", label: "Savings",          href: "/en/personal/savings/",         children: [] },
    ],
  },
  {
    key: "fallback-business",
    label: "Business",
    href: "/en/business/",
    children: [
      { key: "fallback-bb", label: "Business Banking", href: "/en/business/business-banking/", children: [] },
    ],
  },
  { key: "fallback-mortgages", label: "Mortgages", href: "/en/mortgage/",  children: [] },
  { key: "fallback-about",     label: "About",     href: "/en/about/",     children: [] },
];

export async function getNavigationFromFlags(): Promise<FlagNavResult> {
  try {
    const result = await graphqlFetch<{
      TraditionalPage?: { items?: RawFlagItem[] };
    }>(GET_NAVIGATION_FROM_FLAGS_QUERY, {}, { next: { revalidate: 300, tags: ["navigation"] } });

    const raw = result.data?.TraditionalPage?.items ?? [];
    const tree = buildTree(raw);

    if (tree.length === 0) return { tree: FALLBACK_TREE, fromCms: false };
    return { tree, fromCms: true };
  } catch {
    return { tree: FALLBACK_TREE, fromCms: false };
  }
}
