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
  if (resolved) items.push(resolved);
  if (node?.nodes) {
    for (const child of node.nodes) {
      items.push(...collectComponents(child));
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
