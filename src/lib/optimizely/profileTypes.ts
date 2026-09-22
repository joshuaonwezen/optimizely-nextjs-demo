import type { Persona } from "@/lib/segment";
import type { FxAttributes } from "./fxAttributes";

// The one object describing a visitor across every Optimizely product. Split out
// from profile.ts so client code can import the type without pulling in a module
// that reads next/headers.
//
// Type-only imports above are erased at compile time, so this file stays isomorphic
// even though segment.ts and fxAttributes.ts are browser-oriented.

export type ProfileResolution = "cookies" | "cookies+odp";

export type VisitorProfile = {
  /** optimizelyEndUserId, or "anonymous" before middleware has minted one. */
  visitorId: string;
  /** Present only when the demo "signed in" toggle is on. */
  bucketingId?: string;
  /** Verbatim buildFxAttributes() output, the same set FX decisions use. */
  attributes: FxAttributes;
  persona: Persona;
  loggedIn: boolean;
  device: "mobile" | "desktop";
  /** CMS category term keys this visitor reads most, most-read first. Empty until they read content. */
  readCategories: string[];
  /** ODP audiences the visitor qualifies for. Empty unless resolution is cookies+odp. */
  odpSegments: string[];
  /** CMS variation name resolved from odpSegments, or null when none maps. */
  odpVariation: string | null;
  /** Which sources were consulted, so callers can tell "no segments" from "not asked". */
  resolved: ProfileResolution;
};

export function emptyProfile(): VisitorProfile {
  return {
    visitorId: "anonymous",
    attributes: {},
    persona: "new_visitor",
    loggedIn: false,
    device: "desktop",
    readCategories: [],
    odpSegments: [],
    odpVariation: null,
    resolved: "cookies",
  };
}
