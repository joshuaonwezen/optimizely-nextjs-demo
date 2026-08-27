/**
 * On-page-edit anchor for a sectionEnabled block that is placed directly as a
 * section (a bare root-level component node in the experience composition).
 *
 * The CMS overlay (communicationinjector.js) builds a tree of block boundaries
 * - elements matching `[data-epi-block-id], [data-epi-content-id]` - and nests
 * each under its nearest ancestor boundary. A property's owning block is the
 * nearest boundary (`data-epi-block-id` OR `data-epi-content-id`). A component
 * nested inside a section->row->column is a leaf in that tree and folds its
 * inputs open on click; a block placed as its own section has only the SDK's
 * single outer `data-epi-block-id`, so it is top-level in the tree and the
 * editor treats it as a section - it scrolls to the field but never opens it.
 *
 * Emitting the block's own content id as a SECOND, inner boundary on the
 * block's root element makes it nest under that outer section boundary, so the
 * editor resolves the property to an editable component and folds it open. The
 * SDK's pa() never emits `data-epi-content-id`, so this fills the gap.
 *
 * Returns `{}` outside edit mode - published HTML is unchanged.
 */
export function contentEditAnchor(
  data: { _metadata?: { key?: string | null } | null; __context?: { edit?: boolean } | null } | null | undefined
): Record<string, string> {
  if (!data?.__context?.edit) return {};
  const key = data._metadata?.key;
  return key ? { "data-epi-content-id": key } : {};
}
