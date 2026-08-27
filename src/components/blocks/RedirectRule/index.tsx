import { contentType } from "@optimizely/cms-sdk";

// One row in the RedirectConfig singleton. Data-only: never placed in a page
// composition, never rendered (the registry entry returns null, like the
// SiteSettings / GlobalBanner default exports). Middleware reads these via
// getRedirectRules() and issues the redirect before the page router runs.
export const RedirectRuleType = contentType({
  key: "RedirectRule",
  displayName: "Redirect Rule",
  baseType: "_component",
  // elementEnabled: a leaf row inside RedirectConfig.rules. It has no content
  // area, so this behavior is fine (a content area would require sectionEnabled).
  compositionBehaviors: ["elementEnabled"],
  properties: {
    fromPath: {
      type: "string",
      displayName: "From path (old URL)",
      description: "Incoming path to match, e.g. /savings-accounts. Leading slash, no domain.",
      indexingType: "queryable",
    },
    toPath: {
      type: "string",
      displayName: "To path (new URL)",
      description: "Where to send visitors: an internal path (/savings) or a full URL (https://...).",
      indexingType: "queryable",
    },
    permanent: {
      type: "boolean",
      displayName: "Permanent (308). Leave off for a temporary redirect (307).",
      indexingType: "queryable",
    },
    matchSubpaths: {
      type: "boolean",
      displayName: "Also redirect everything under this path",
      description: "On: /old also matches /old/a/b, and the extra part is added onto the destination.",
    },
    enabled: {
      type: "boolean",
      displayName: "Enabled",
      indexingType: "queryable",
    },
    note: {
      type: "string",
      displayName: "Internal note (why this redirect exists)",
    },
  },
});

// Data-only content type: renders nothing. The registry still needs an entry.
export default function RedirectRule() {
  return null;
}
