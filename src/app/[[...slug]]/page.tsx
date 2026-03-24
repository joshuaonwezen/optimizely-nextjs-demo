import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import type { Metadata } from "next";
import { graphqlFetch } from "@/lib/optimizely/client";
import {
  ComponentSelector,
  type CompositionRow,
} from "@/components/cms/ComponentSelector";
import { GET_PAGE_BY_URL_QUERY } from "@/lib/graphql/queries/GetPageByUrl";
import { GET_ALL_PAGE_PATHS_QUERY } from "@/lib/graphql/queries/GetAllPagePaths";
import type { ContentAreaItem, ContentAreaItemWithSettings, DisplaySetting } from "@/types/cms";

interface PageParams {
  slug?: string[];
}

/**
 * Build candidate Optimizely Graph URLs for a given slug.
 * Graph URLs may include a locale prefix (e.g. `/en/cms/`) depending on
 * the CMS site configuration, so we try multiple patterns.
 */
function buildUrlCandidates(slug?: string[]): string[] {
  if (!slug || slug.length === 0) {
    // Homepage — could be at `/`, `/en/`, or `/en/homepage/`
    return ["/", "/en/", "/en/homepage/"];
  }
  const path = slug.join("/");
  return [`/en/${path}/`, `/${path}/`];
}

/**
 * Recursively collect component items from composition nodes.
 * Returns items grouped into rows for grid rendering.
 *
 * The composition tree has this shape:
 * - Top-level component (sectionEnabled) → single-item row
 * - Section → Row → Column → Component (elementEnabled) → multi-item row
 */
function extractRowsFromComposition(page: any): CompositionRow[] {
  const composition = page?.composition;
  if (!composition?.grids) return [];

  const rows: CompositionRow[] = [];
  let rowIdx = 0;

  /** Parse displaySettings array into a key/value map */
  function parseSettings(
    settings?: DisplaySetting[] | null
  ): Record<string, string | boolean> | undefined {
    if (!settings || settings.length === 0) return undefined;
    const result: Record<string, string | boolean> = {};
    for (const { key, value } of settings) {
      result[key] = value === "true" ? true : value === "false" ? false : value;
    }
    return result;
  }

  /** Resolve a composition component node into a ContentAreaItemWithSettings.
   *  For types unknown to Graph (e.g. FeatureItemBlock), the data lives
   *  in component._json — we merge it and use the node's `type` field. */
  function resolveComponent(node: any): ContentAreaItemWithSettings | null {
    const comp = node?.component;
    if (!comp) return null;

    let item: ContentAreaItem | null = null;
    if (comp.__typename && comp.__typename !== "_Component") {
      item = comp as ContentAreaItem;
    } else if (comp._json && node.type) {
      const { _metadata, _itemMetadata, ...props } = comp._json;
      item = { __typename: node.type, ...props } as ContentAreaItem;
    }

    if (!item) return null;

    return {
      item,
      displaySettings: parseSettings(node.displaySettings),
      displayTemplateKey: node.displayTemplateKey ?? undefined,
    };
  }

  function collectComponents(node: any): ContentAreaItemWithSettings[] {
    const items: ContentAreaItemWithSettings[] = [];
    const resolved = resolveComponent(node);
    if (resolved) {
      items.push(resolved);
    }
    if (node?.nodes) {
      for (const child of node.nodes) {
        items.push(...collectComponents(child));
      }
    }
    return items;
  }

  for (const gridNode of composition.grids) {
    // Top-level component (sectionEnabled)
    const topLevel = resolveComponent(gridNode);
    if (topLevel) {
      rows.push({
        key: gridNode.key ?? `row-${rowIdx++}`,
        items: [topLevel],
        displaySettings: parseSettings(gridNode.displaySettings),
      });
      continue;
    }

    // Section node — collect all components inside it as one row
    if (gridNode?.nodes) {
      const items = collectComponents(gridNode);
      if (items.length > 0) {
        rows.push({
          key: gridNode.key ?? `row-${rowIdx++}`,
          items,
          displaySettings: parseSettings(gridNode.displaySettings),
        });
      }
    }
  }

  return rows;
}

export default async function CmsPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { isEnabled: isDraftMode } = await draftMode();

  const urls = buildUrlCandidates(slug);

  const previewToken =
    typeof sp.preview_token === "string" ? sp.preview_token : undefined;
  const ctx = typeof sp.ctx === "string" ? sp.ctx : undefined;
  const inEditMode = ctx === "edit" && isDraftMode;

  const result = await graphqlFetch<any>(
    GET_PAGE_BY_URL_QUERY,
    { urls, locale: ["en"] },
    {
      previewToken: isDraftMode ? previewToken : undefined,
      ...(isDraftMode
        ? { cache: "no-store" as RequestCache }
        : { next: { revalidate: 60 } }),
    }
  );

  // When multiple pages match (e.g. root URL), pick the one with the most
  // composition nodes — our seeded pages have richer compositions.
  const items = result.data?._Page?.items ?? [];
  const page = items.length > 1
    ? items.reduce((best: any, cur: any) => {
        const bestLen = best?.composition?.grids?.length ?? 0;
        const curLen = cur?.composition?.grids?.length ?? 0;
        return curLen > bestLen ? cur : best;
      })
    : items[0];

  if (!page) {
    return notFound();
  }

  const rows = extractRowsFromComposition(page);

  return <ComponentSelector rows={rows} inEditMode={inEditMode} />;
}

/** Pre-render all known CMS page paths at build time */
export async function generateStaticParams(): Promise<PageParams[]> {
  let result;
  try {
    result = await graphqlFetch<any>(
      GET_ALL_PAGE_PATHS_QUERY,
      undefined,
      { next: { revalidate: 3600 } }
    );
  } catch {
    // Graph may return 400 if content types aren't created yet
    return [];
  }

  const pages = result.data?._Page?.items ?? [];

  return pages
    .map((page: any) => {
      const url: string = page?._metadata?.url?.default ?? "";
      if (!url || url === "/") return { slug: undefined };
      // Strip locale prefix (e.g. `/en/cms/` → `cms`)
      const stripped = url.replace(/^\/en\//, "/");
      if (stripped === "/" || stripped === "/homepage/") return { slug: undefined };
      const segments = stripped
        .replace(/^\/|\/$/g, "")
        .split("/")
        .filter(Boolean);
      if (segments.length === 0) return { slug: undefined };
      return { slug: segments };
    })
    .filter(Boolean);
}

/** Pull page title from CMS for Next.js <head> */
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const urls = buildUrlCandidates(slug);

  const META_QUERY = /* GraphQL */ `
    query GetPageMeta($urls: [String]) {
      _Page(
        where: { _metadata: { url: { default: { in: $urls } } } }
        limit: 1
      ) {
        items {
          _metadata {
            displayName
          }
        }
      }
    }
  `;

  const result = await graphqlFetch<any>(META_QUERY, { urls }, { next: { revalidate: 300 } });
  const page = result.data?._Page?.items?.[0];

  return {
    title: page?._metadata?.displayName ?? "Page",
  };
}
