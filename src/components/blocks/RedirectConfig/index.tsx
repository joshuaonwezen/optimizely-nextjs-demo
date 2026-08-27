import { contentType } from "@optimizely/cms-sdk";
import { RedirectRuleType } from "@/components/blocks/RedirectRule";

// Singleton shared block holding every redirect rule on one screen (the
// SiteSettings pattern). Seeded with a fixed key, fetched by type in
// GetRedirectRules.ts, consumed by src/middleware.ts.
export const RedirectConfigType = contentType({
  key: "RedirectConfig",
  displayName: "Redirect Config",
  baseType: "_component",
  // sectionEnabled (not elementEnabled): it owns a content area (`rules`), and
  // an elementEnabled block with a type:"array" property is rejected at push.
  // It's never dropped into a grid column - editors open it from the Shared
  // Blocks tab like Site Settings.
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    rules: {
      type: "array",
      displayName: "Redirect rules",
      // type:"content" => Graph inline-expands every RedirectRule in one query.
      items: { type: "content", allowedTypes: [RedirectRuleType] },
    },
    notes: {
      type: "string",
      displayName: "Notes for editors",
    },
  },
});

// Data-only content type: renders nothing.
export default function RedirectConfig() {
  return null;
}
