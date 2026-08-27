import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

/**
 * Re-anchors on-page-edit clicks for a sectionEnabled block that is used AS a
 * section.
 *
 * When such a block backs a section node, the SDK's outer wrapper carries the
 * *section* node's `data-epi-block-id`. The CMS resolves a clicked
 * `data-epi-edit` to the nearest ancestor block-id, so the property maps to the
 * section rather than the block that owns it - the editor scrolls to the field
 * but never folds the inputs open. Spreading this onto the block's own outer
 * element restores a block-instance `data-epi-block-id` between the section
 * wrapper and the property, so fold-open resolves to the block.
 *
 * Returns `{}` outside edit mode (published HTML is unchanged).
 */
export function sectionBlockId(
  data: { _metadata?: { key?: string | null } | null; __context?: { edit?: boolean } | null } | null | undefined
): Record<string, string> {
  const key = data?._metadata?.key;
  if (!key) return {};
  // pa() itself gates on __context.edit, so this is a no-op in published mode.
  return getPreviewUtils(data as never).pa({ key }) as Record<string, string>;
}
