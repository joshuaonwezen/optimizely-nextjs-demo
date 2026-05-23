import type { ContentAreaItem, ContentAreaItemWithSettings, DisplaySetting } from "@/types/cms";
import type { CompositionRow } from "@/components/cms/ComponentSelector";

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

function resolveComponent(node: any, nodeKey?: string): ContentAreaItemWithSettings | null {
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
    // Prefer the caller-supplied key (column key) so the CMS maps the selection
    // outline to the column boundary rather than the leaf component node.
    nodeKey: nodeKey ?? node.key ?? undefined,
    displaySettings: parseSettings(node.displaySettings),
    displayTemplateKey: node.displayTemplateKey ?? undefined,
  };
}

function collectComponents(node: any, columnKey?: string): ContentAreaItemWithSettings[] {
  const items: ContentAreaItemWithSettings[] = [];
  const resolved = resolveComponent(node, columnKey);
  if (resolved) items.push(resolved);
  if (node?.nodes) {
    // Pass the column's key down to children so each leaf component uses its
    // parent column's UUID as data-epi-block-id — the CMS selects at column level.
    const childKey = node.nodeType === "column" ? (node.key ?? columnKey) : columnKey;
    for (const child of node.nodes) {
      items.push(...collectComponents(child, childKey));
    }
  }
  return items;
}

export function extractRowsFromComposition(page: any): CompositionRow[] {
  const composition = page?.composition;
  if (!composition?.grids) return [];

  const rows: CompositionRow[] = [];
  let rowIdx = 0;

  for (const gridNode of composition.grids) {
    const topLevel = resolveComponent(gridNode);
    if (topLevel) {
      rows.push({
        key: gridNode.key ?? `row-${rowIdx++}`,
        items: [topLevel],
        displaySettings: parseSettings(gridNode.displaySettings),
      });
      continue;
    }

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
