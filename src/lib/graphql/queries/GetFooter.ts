import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";
import { toNavNode, type NavNode, type RawNavItem } from "@/lib/graphql/queries/GetNavigation";

export interface FooterData {
  tagline: string | null;
  /** Each column is a NavigationItem: label = column heading, children = links. */
  columns: NavNode[];
}

interface GetFooterResult {
  Footer?: {
    items?: Array<{
      tagline?: string | null;
      columns?: Array<RawNavItem | { __typename?: string }> | null;
    } | null> | null;
  } | null;
}

// Display name written by seed-footer.ts - how editors identify the Footer
// block in the Shared Blocks tab. Not used for querying (the query fetches
// by type).
export const FOOTER_BLOCK_NAME = "Site Footer";

const GET_FOOTER_QUERY = /* GraphQL */ `
  fragment FooterNavItemFields on _IContent {
    ... on NavigationItem {
      __typename
      _metadata { key }
      label
      href { url { default } }
      description
      openInNewTab
      children @recursive(depth: 3)
    }
  }

  query GetFooter($locale: [Locales]) {
    # Newest first: deleted blocks can linger in the Graph index after a
    # re-seed; ordering by lastModified guarantees the live block wins.
    Footer(locale: $locale, orderBy: { _metadata: { lastModified: DESC } }, limit: 1) {
      items {
        tagline
        columns {
          ...FooterNavItemFields
        }
      }
    }
  }
`;

/**
 * Fetch the Footer shared block and map its columns into typed NavNode trees
 * (reusing the Navigation mapper - footer columns are NavigationItems).
 *
 * Cached for 5 minutes with a "footer" tag - the publish webhook calls
 * revalidateTag("footer") to bust on demand.
 *
 * Returns null when the block doesn't exist or can't be reached, so the
 * Footer component falls back to its hardcoded output.
 */
export async function getFooter(options: { locale?: string } = {}): Promise<FooterData | null> {
  const { locale = "en" } = options;
  try {
    const result = await graphqlFetch<GetFooterResult>(
      GET_FOOTER_QUERY,
      { locale: [locale] },
      { next: { revalidate: CACHE_TTL, tags: ["footer"] } }
    );
    const root = result.data?.Footer?.items?.[0];
    if (!root) return null;

    const columns = (root.columns ?? [])
      .filter((c): c is RawNavItem => (c as RawNavItem).__typename === "NavigationItem")
      .map(toNavNode);

    if (columns.length === 0 && !root.tagline) return null;
    return { tagline: root.tagline ?? null, columns };
  } catch {
    return null;
  }
}
