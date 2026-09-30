import { getContext } from "@optimizely/cms-sdk/react/server";
import { getPreviewClient } from "@/lib/optimizely/previewClient";
import { getAdminPreviewClient } from "@/lib/optimizely/adminPreviewClient";

// The content the preview route hands a component comes from the SDK's generated
// query, and that query cannot describe a NavigationItem tree: `children` allows
// `_self`, GraphQL forbids a fragment spreading itself, so since cms-sdk 3.0 the
// generator stops at `children { __typename }`. The first level of items arrives
// complete and everything below it arrives as empty shells - which the previews
// rendered as "(untitled) / no link".
//
// This re-reads the same draft with Graph's @recursive directive, the way the
// published header and footer queries already do. The where clause and variation
// argument mirror the SDK's own preview query so both resolve the same version.
const PREVIEW_NAV_TREE_QUERY = /* GraphQL */ `
  fragment PreviewNavItemFields on _IContent {
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

  query PreviewNavTree($key: String, $version: String, $locale: String) {
    _Content(
      where: { _metadata: { key: { eq: $key }, version: { eq: $version }, locale: { eq: $locale } } }
      variation: { include: ALL }
    ) {
      item {
        ... on Navigation { navItems { ...PreviewNavItemFields } }
        ... on NavigationItem { children { ...PreviewNavItemFields } }
        ... on Footer { columns { ...PreviewNavItemFields } }
      }
    }
  }
`;

type PreviewNavField = "navItems" | "children" | "columns";

export interface PreviewNavItem {
  label?: string | null;
  description?: string | null;
  openInNewTab?: boolean | null;
  href?: { url?: { default?: string | null } | null } | null;
  children?: Array<PreviewNavItem | null | undefined> | null;
}

interface PreviewNavTreeResult {
  _Content?: {
    item?: Partial<Record<PreviewNavField, Array<PreviewNavItem | null> | null>> | null;
  } | null;
}

/**
 * The fully expanded NavigationItem tree under `field` of the content item being
 * previewed, or null outside a preview request or when the query fails - callers
 * fall back to the (one level deep) content they were handed.
 */
export async function getPreviewNavTree(field: PreviewNavField): Promise<PreviewNavItem[] | null> {
  const ctx = getContext();
  // /preview carries the CMS preview token; /preview/share has none and reads the
  // draft as super-user instead. Both set the context through getPreviewContent().
  const shared = !ctx?.previewToken && ctx?.mode === "preview";
  if (!ctx?.key || !(ctx.previewToken || shared)) return null;

  try {
    const client = await (shared ? getAdminPreviewClient() : getPreviewClient());
    const data: PreviewNavTreeResult = await client.request(
      PREVIEW_NAV_TREE_QUERY,
      { key: ctx.key, version: ctx.version, locale: ctx.locale },
      ctx.previewToken,
      false
    );
    const items = data?._Content?.item?.[field];
    return Array.isArray(items) ? items.filter((n): n is PreviewNavItem => Boolean(n)) : null;
  } catch (error) {
    console.error("[getPreviewNavTree] Falling back to the unexpanded preview content:", error);
    return null;
  }
}
