// Cookie names shared by middleware, server components, route handlers and the
// browser. No imports, so any runtime can use it.

/**
 * FX/ODP visitor id. The literal name is load-bearing - the Optimizely Web snippet,
 * ODP stitching and existing visitors' cookies all use "optimizelyEndUserId".
 * Never rename it.
 */
export const VISITOR_ID_COOKIE = "optimizelyEndUserId";
/** Demo audience switcher: persona attribute for FX audiences. */
export const DEMO_PERSONA_COOKIE = "demo_persona";
/** Demo "signed in" state: a stable bucketing id, also sent as logged_in. */
export const DEMO_BUCKETING_ID_COOKIE = "demo_bucketing_id";
/** Demo "frequent customer" state: page_views attribute. */
export const DEMO_PAGE_VIEWS_COOKIE = "demo_page_views";
