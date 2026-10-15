// Helpers for reading Graph's reference shapes. These were copy-pasted
// identically across AuthorBlock, TeamMemberBlock, SpotlightBlock, TeamGridBlock
// and TimelineBlock; they live here so a change to how a reference is unwrapped
// lands in one place.

/**
 * An image arriving from Graph. `contentReference` image fields come back as
 * `{ key, url }`, but the url sits under `url.default` on some query paths and
 * `_metadata.url.default` on others, so both are optional.
 */
export type ImageRef =
  | {
      url?: { default?: string | null; graph?: string | null } | null;
      _metadata?: { url?: { default?: string | null; graph?: string | null } | null } | null;
    }
  | null;

const RENDITION_GRAPH_PREFIX = "graph://cmp/cmp_PublicImageAssetRendition/";

/**
 * The renderable URL of an image reference, or null when it has none.
 *
 * Pass `src` from getPreviewUtils(content) wherever it is available: it resolves a
 * DAM asset's URL (item.Url) and appends the preview token in edit mode. The
 * url.default / _metadata.url.default fallbacks cover CMS globalassets.
 */
export function resolveImageUrl(
  ref: ImageRef | undefined,
  // `never` accepts the SDK's src(), whose parameter type is narrower than ImageRef.
  // It only reads url.default / item.Url and tolerates anything else, so calling it
  // with any reference shape is safe.
  src?: (input: never) => string | undefined
): string | null {
  if (!ref) return null;
  const previewSrc = src as ((input: unknown) => string | undefined) | undefined;
  return previewSrc?.(ref) ?? ref.url?.default ?? ref._metadata?.url?.default ?? null;
}

/**
 * Whether the editor picked one of a DAM image's renditions in the picker rather
 * than the original asset. url.default is then the rendition file, which already
 * has a fixed size and crop. Serve it as-is: the CMP CDN upscales a rendition URL,
 * and a crop param would crop it again.
 *
 * url.graph is the only signal. cms-sdk 3.0.2's DAM fragments have no case for the
 * rendition type, so `item` arrives as a bare __typename, which Graph reports as
 * "cmp_Asset".
 */
export function isPickedRendition(ref: ImageRef | undefined): boolean {
  const graph = ref?.url?.graph ?? ref?._metadata?.url?.graph;
  return graph?.startsWith(RENDITION_GRAPH_PREFIX) ?? false;
}

/**
 * A `type: "url"` field value. Graph types these as ContentUrl objects, but demo
 * and seed payloads sometimes carry a plain string, so accept both.
 */
export function resolveUrl(value: string | { default?: string | null } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.default ?? null;
}

/**
 * An item in a `contentReference` array. Graph returns these in three shapes
 * depending on the query path:
 *   1. objects with a top-level `key` (inline composition reads)
 *   2. objects with `_metadata.key` (explicit Graph fragment reads)
 *   3. raw "cms://content/<key>" URI strings (some seed payloads)
 */
export type ContentRef =
  | string
  | { key?: string | null; _metadata?: { key?: string | null } | null };

/** The content key of a reference in any of the three shapes above. */
export function extractKey(ref: ContentRef | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") {
    const m = /cms:\/\/content\/([a-f0-9-]+)/i.exec(ref);
    return m?.[1] ?? null;
  }
  return ref.key ?? ref._metadata?.key ?? null;
}

/**
 * Items from a batched `where: { _metadata: { key: { in: keys } } }` query, put back
 * in the order of `keys` (the editor's order - the query guarantees none). Graph
 * returns one document per locale, so only the first item per key is kept; keys
 * with no item are dropped.
 */
export function orderByKeys<T extends { _metadata?: { key?: string | null } | null }>(
  items: ReadonlyArray<T | null | undefined>,
  keys: readonly string[]
): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const key = item?._metadata?.key;
    if (item && key && !byKey.has(key)) byKey.set(key, item);
  }
  return keys.map((key) => byKey.get(key)).filter((item): item is T => item !== undefined);
}
