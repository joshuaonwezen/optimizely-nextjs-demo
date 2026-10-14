// Blocks excluded from open page content areas (featuredBlock, mainContent, and the
// content area inside a VariationItemBlock). Kept alongside the "_component" wildcard
// so new section blocks still auto-appear, but these never make sense as top-level
// page content.
//
// .mjs, not .ts: optimizely.config.mjs imports it, and the CLI loads that config with
// a plain import() (only the src/components/**/*.tsx glob goes through esbuild).
// Plain string keys are fine: the SDK's buildSkipSet resolves entries via
// getKeyName(), which accepts concrete key strings, and PermittedTypes accepts any
// string in TS.
export const CONTENT_AREA_EXCLUDES = [
  // Site chrome - never page content
  "Navigation", "NavigationItem", "Footer", "SiteSettings", "SiteBanner",
  // Redirect config - data-only, managed from the Shared Blocks tab
  "RedirectConfig", "RedirectRule",
  // Native form elements - only valid inside a form container
  "OptiFormsTextboxElement", "OptiFormsTextareaElement",
  "OptiFormsSelectionElement", "OptiFormsSubmitElement",
  // Child-only items - belong inside their container/parent block, not standalone
  "FaqItemBlock", "TimelineMilestoneBlock", "OutcomeItemBlock",
  "TeamMemberBlock", "ProductCardBlock", "FeatureItemBlock",
  "QuoteBlock", "PricingTierBlock", "AuthorBlock", "VariationItemBlock",
];
