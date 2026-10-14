import { cache } from "react";
import type { FlagVariation } from "./variationPath";

// The FX decisions middleware encoded into this request's path (`__v_flag--variation`),
// made readable to blocks. Blocks render through <OptimizelyComponent>, which passes
// them nothing from the page, and server components have no React context - so the
// catch-all route records the segments here and VariationContainerBlock reads them.
//
// cache() makes this a per-request singleton: every server component in one render
// sees the same object, and nothing leaks between requests. ISR stays correct because
// each __v_ path is its own render and its own cache entry. The SDK's own
// setContext() can't carry this - its ContextData is a closed interface.
const store = cache((): { flagVariations: FlagVariation[] } => ({ flagVariations: [] }));

/** Called by the catch-all route before it renders the page tree. */
export function setRequestFlagVariations(flagVariations: FlagVariation[]): void {
  store().flagVariations = flagVariations;
}

/** The variation middleware decided for this flag on this request, or null. */
export function edgeVariationFor(flagKey: string): string | null {
  return store().flagVariations.find((fv) => fv.flagKey === flagKey)?.variationKey ?? null;
}
