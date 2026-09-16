// Demo reference implementation for /demo/navigation - production nav uses GetNavigation.ts
import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

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

// Two cached functions rather than one, because the second query depends on the
// first: the children lookup needs the parent key. Each gets its own cache entry
// keyed on its own arguments - fetchChildren on parentKey, fetchParent on nothing.
// The boundary is the function because the SDK client does not forward
// next: { revalidate, tags } to its fetch.
async function fetchParent(): Promise<{
  _Page?: { items?: Array<{ _metadata?: { key?: string; displayName?: string } }> };
}> {
  "use cache";
  cacheTag(CACHE_TAGS.navigation);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_PARENT_KEY_QUERY, {});
  } catch (error) {
    return cachedQueryFailed("fetchParent", error);
  }
}

async function fetchChildren(parentKey: string): Promise<{
  _Page?: { items?: Array<{ _metadata?: { displayName?: string; url?: { default?: string } } }> };
}> {
  "use cache";
  cacheTag(CACHE_TAGS.navigation);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_CHILDREN_BY_ANCESTOR_QUERY, { parentKey });
  } catch (error) {
    return cachedQueryFailed("fetchChildren", error);
  }
}

export async function getNavigationFromHierarchy(): Promise<HierarchyNavResult> {
  try {
    const parentResult = await fetchParent();

    const parent = parentResult?._Page?.items?.[0];
    const parentKey = parent?._metadata?.key;
    const parentLabel = parent?._metadata?.displayName ?? "Personal Banking";

    if (!parentKey) return FALLBACK_RESULT;

    const childResult = await fetchChildren(parentKey);

    const raw = childResult?._Page?.items ?? [];
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
