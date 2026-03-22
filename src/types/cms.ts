/**
 * Core TypeScript types for Optimizely SaaS CMS content.
 *
 * These map to the Optimizely Graph schema structures.
 * In SaaS, metadata lives under _metadata (not properties like CMS 12).
 */

/** Metadata attached to every content item in Optimizely Graph */
export interface OptimizelyMetadata {
  key?: string | null;
  version?: string | null;
  locale?: string | null;
  displayName?: string | null;
  url?: {
    default?: string | null;
    hierarchical?: string | null;
    base?: string | null;
  } | null;
  published?: string | null;
  lastModified?: string | null;
}

/** Base interface for all content items from Graph */
export interface IContent {
  __typename: string;
  _metadata?: OptimizelyMetadata | null;
}

/** Image/media reference from CMS DAM */
export interface CmsImage {
  url?: { default?: string | null } | null;
  altText?: string | null;
}

/** Link object from CMS */
export interface CmsLink {
  text?: string | null;
  url?: string | null;
  target?: string | null;
}

/** Content area item — the union type for ComponentSelector */
export interface ContentAreaItem extends IContent {
  [key: string]: unknown;
}
