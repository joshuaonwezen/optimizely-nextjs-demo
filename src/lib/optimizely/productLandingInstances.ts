// Product Landing (ProductLandingExperience + ArticleListBlock) is rolled out per
// CMS instance: the instance must support `type: "composition"` properties - apjCMS
// does not - and the types must have been pushed there
// (scripts/push-product-landing-types.ts) and picked up by Graph's schema sync.
//
// Registering the types against an instance whose Graph does not have them yet adds
// fragments for unknown types and breaks EVERY page there, so a host only joins this
// list once its push is done and verified.
export const PRODUCT_LANDING_CMS_HOSTS = new Set([
  "app-ocstjoshuac8je4ft002.cms.optimizely.com", // personal
  "app-opononboard15smbt002.cms.optimizely.com", // joshCMS
  "app-opon10saas39t5rt001.cms.optimizely.com", // harryNewCMS
  "app-opon10saas39t5rt002.cms.optimizely.com", // mostinNewCMS
  "app-opononboards2c23t002.cms.optimizely.com", // kastleNewCMS
  "app-opononboardyt09bt002.cms.optimizely.com", // toddCMS
  // apjCMS is absent on purpose: its CMS has no "Composition" property format.
]);

export function supportsProductLanding(
  url = process.env.OPTIMIZELY_CMS_URL ?? process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL
): boolean {
  if (!url) return false;
  try {
    return PRODUCT_LANDING_CMS_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
