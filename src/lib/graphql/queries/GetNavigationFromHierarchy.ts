// Demo reference implementation for /demo/navigation - production nav uses GetNavigation.ts
import { graphqlFetch } from "@/lib/optimizely/client";

export interface HierarchyNavItem {
  label: string;
  href: string;
}

export interface HierarchyNavResult {
  parentLabel: string;
  parentHref: string;
  items: HierarchyNavItem[];
  fromCms: boolean;
}

const GET_PARENT_KEY_QUERY = /* GraphQL */ `
  query GetPersonalBankingKey {
    _Page(
      where: { _metadata: { url: { default: { eq: "/en/personal/" } } } }
      limit: 1
    ) {
      items {
        _metadata { key displayName }
      }
    }
  }
`;

export const GET_CHILDREN_BY_ANCESTOR_QUERY = /* GraphQL */ `
  query GetChildrenByAncestor($parentKey: String!) {
    _Page(
      where: { _ancestors: { eq: $parentKey } }
      orderBy: { _metadata: { sortOrder: ASC } }
      limit: 20
    ) {
      items {
        _metadata { displayName url { default } }
      }
    }
  }
`;

const FALLBACK_RESULT: HierarchyNavResult = {
  parentLabel: "Personal Banking",
  parentHref: "/en/personal/",
  items: [
    { label: "Current Account",  href: "/en/personal/current-account/" },
    { label: "Savings",          href: "/en/personal/savings/" },
  ],
  fromCms: false,
};

export async function getNavigationFromHierarchy(): Promise<HierarchyNavResult> {
  try {
    const parentResult = await graphqlFetch<{
      _Page?: { items?: Array<{ _metadata?: { key?: string; displayName?: string } }> };
    }>(GET_PARENT_KEY_QUERY, {}, { next: { revalidate: 300, tags: ["navigation"] } });

    const parent = parentResult.data?._Page?.items?.[0];
    const parentKey = parent?._metadata?.key;
    const parentLabel = parent?._metadata?.displayName ?? "Personal Banking";

    if (!parentKey) return FALLBACK_RESULT;

    const childResult = await graphqlFetch<{
      _Page?: { items?: Array<{ _metadata?: { displayName?: string; url?: { default?: string } } }> };
    }>(
      GET_CHILDREN_BY_ANCESTOR_QUERY,
      { parentKey },
      { next: { revalidate: 300, tags: ["navigation"] } }
    );

    const raw = childResult.data?._Page?.items ?? [];
    const items: HierarchyNavItem[] = raw
      .filter((i) => i._metadata?.url?.default)
      .map((i) => ({
        label: i._metadata?.displayName ?? i._metadata?.url?.default ?? "",
        href: i._metadata!.url!.default!,
      }));

    if (items.length === 0) return FALLBACK_RESULT;

    return {
      parentLabel,
      parentHref: "/en/personal/",
      items,
      fromCms: true,
    };
  } catch {
    return FALLBACK_RESULT;
  }
}
