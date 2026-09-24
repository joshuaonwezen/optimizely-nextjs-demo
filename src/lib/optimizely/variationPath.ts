// The `__v_<flagKey>--<variationKey>` URL segments middleware appends so every FX
// bucket gets its own ISR cache key. Dependency-free: imported by middleware and
// by the catch-all page, so the page doesn't pull the middleware module (and the
// FX SDK it imports) into its bundle.

export const VARIATION_MARKER = "__v_";
export const FLAG_VAR_SEP = "--";

export interface FlagVariation {
  flagKey: string;
  variationKey: string;
}

export function isVariationSegment(segment: string): boolean {
  return segment.startsWith(VARIATION_MARKER);
}

/** Parses one path segment; null when it isn't a well-formed variation segment. */
export function parseVariationSegment(segment: string): FlagVariation | null {
  if (!isVariationSegment(segment)) return null;
  const [flagKey, variationKey, ...rest] = segment.slice(VARIATION_MARKER.length).split(FLAG_VAR_SEP);
  return flagKey && variationKey && rest.length === 0 ? { flagKey, variationKey } : null;
}

export function formatVariationSegment({ flagKey, variationKey }: FlagVariation): string {
  return `${VARIATION_MARKER}${flagKey}${FLAG_VAR_SEP}${variationKey}`;
}

interface DatafileVariations {
  featureFlags?: Array<{ key: string; experimentIds?: string[]; rolloutId?: string }>;
  experiments?: Array<{ id: string; variations?: Array<{ key: string }> }>;
  groups?: Array<{ experiments?: Array<{ id: string; variations?: Array<{ key: string }> }> }>;
  rollouts?: Array<{ id: string; experiments?: Array<{ variations?: Array<{ key: string }> }> }>;
}

let indexedDatafile: string | null = null;
let variationIndex = new Map<string, Set<string>>();

// flagKey -> every variation key the flag can serve (experiments, mutex groups and
// the rollout). Memoized on the datafile text, which only changes on a new revision.
function flagVariationIndex(datafile: string): Map<string, Set<string>> {
  if (datafile === indexedDatafile) return variationIndex;

  const index = new Map<string, Set<string>>();
  try {
    const df = JSON.parse(datafile) as DatafileVariations;
    const experiments = new Map(
      [...(df.experiments ?? []), ...(df.groups ?? []).flatMap((g) => g.experiments ?? [])].map((e) => [e.id, e])
    );
    const rollouts = new Map((df.rollouts ?? []).map((r) => [r.id, r]));

    for (const flag of df.featureFlags ?? []) {
      const keys = new Set<string>();
      for (const id of flag.experimentIds ?? []) {
        experiments.get(id)?.variations?.forEach((v) => keys.add(v.key));
      }
      const rollout = flag.rolloutId ? rollouts.get(flag.rolloutId) : undefined;
      rollout?.experiments?.forEach((e) => e.variations?.forEach((v) => keys.add(v.key)));
      index.set(flag.key, keys);
    }
  } catch {
    // Unparseable datafile: an empty index rejects every segment.
  }

  indexedDatafile = datafile;
  variationIndex = index;
  return index;
}

/**
 * True when the datafile defines this flag and the flag can serve this variation.
 *
 * Validates against the FX DATAFILE ONLY, so it is not usable for a Web
 * Experimentation variation - WX experiments do not appear in the FX datafile. Using
 * it for one is how the old cookie bridge came to require a phantom FX flag mirrored
 * for every WX experiment, with no warning when someone forgot: the segment was just
 * silently dropped. WX names are validated against the CMS's own variation names
 * instead; see lib/optimizely/wxVariation.ts and lib/cmsVariations.ts.
 */
export function isKnownVariation(datafile: string, { flagKey, variationKey }: FlagVariation): boolean {
  return flagVariationIndex(datafile).get(flagKey)?.has(variationKey) ?? false;
}
