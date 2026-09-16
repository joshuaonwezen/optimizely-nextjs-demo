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
  | { url?: { default?: string | null } | null; _metadata?: { url?: { default?: string | null } | null } | null }
  | null;

/** The renderable URL of an image reference, or null when it has none. */
export function resolveImageUrl(ref: ImageRef | undefined): string | null {
  if (!ref) return null;
  return ref.url?.default ?? ref._metadata?.url?.default ?? null;
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
