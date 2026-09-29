import type { damAssets } from "@optimizely/cms-sdk";
import type {
  OptimizelyComponent,
  OptimizelyComposition,
  getPreviewUtils,
} from "@optimizely/cms-sdk/react/server";

// Components describe CMS data with their own interfaces (optional, nullable
// fields matching what Graph actually returns) instead of the SDK's inferred
// types, which don't match structurally. These casts are the one bridge between
// the two, so call sites don't reach for `as any`.

// The two contracts below were one type until cms-sdk 3.0.0. getPreviewUtils moved
// to its own module so client components could use it too, and its parameter
// widened to just the preview context plus an index signature - it no longer needs
// a __typename, which OptimizelyComponent still requires to dispatch on. Keep them
// separate: collapsing them again makes every OptimizelyComponent call a type error.

/** What getPreviewUtils and the other preview helpers accept. */
export type SdkContent = Parameters<typeof getPreviewUtils>[0];

/** What OptimizelyComponent accepts as `content` - SdkContent plus its type name. */
export type SdkComponentContent = Parameters<typeof OptimizelyComponent>[0]["content"];

/** One node of a Visual Builder composition (section, row, column or component). */
export type CompositionNode = Parameters<typeof OptimizelyComposition>[0]["nodes"][number];

/** A composition property value: the SDK-queried node tree. */
export type Composition = { nodes?: CompositionNode[] | null } | null | undefined;

/** An experience's content: SDK content plus its built-in composition. */
export type ExperienceContent = SdkContent & { composition?: Composition };

/** A contentReference value as the SDK's asset helpers (getSrcset, getAlt) accept it. */
export type SdkContentReference = Parameters<ReturnType<typeof damAssets>["getSrcset"]>[0];

export function asSdkContent(content: unknown): SdkContent {
  return content as SdkContent;
}

/** For a value handed straight to <OptimizelyComponent content={...} />. */
export function asSdkComponentContent(content: unknown): SdkComponentContent {
  return content as SdkComponentContent;
}

export function asSdkReference(reference: unknown): SdkContentReference {
  return reference as SdkContentReference;
}

/** damAssets() wants an indexable record; component data interfaces aren't. */
export function asDamContent(content: object): Record<string, unknown> {
  return content as Record<string, unknown>;
}
