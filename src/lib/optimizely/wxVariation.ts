// Web Experimentation -> CMS variation, decided before first paint.
//
// The WX snippet is a blocking <script> in <head> (layout.tsx), so by the time any
// body markup is parsed the bucketing decision already exists in the browser, and
// window.optimizely.get("state") can be read synchronously with no network call.
// That is the whole mechanism: read the variation NAME, match it against the
// variations this page actually has in the CMS, and route the render to it.
//
// We read getExperimentStates({ isActive: true }) rather than the more obvious
// getVariationMap(). Verified against the live snippet, each entry is
//   { id, experimentName, variation, audiences, reason, visitorRedirected,
//     isActive, isInExperimentHoldback }
// and only this shape exposes the holdback flag. getVariationMap() reports a bucket
// for holdback visitors too, and a holdback visitor must see BASE content - they are
// the control that makes the experiment measurable. Reading the map would serve them
// the variation and quietly corrupt the result.
// (Note for anyone cross-checking against Optimizely's docs: the field is
// `isInExperimentHoldback`, built from `isInCampaignHoldback`. There is no
// `isInHoldback` in the snippet.)
//
// Dependency-free on purpose, same constraint as variationPath.ts: middleware, the
// catch-all page and a client component all import this, and none of them should
// pull the FX SDK or the Graph client in with it.

// Reserved flag-key namespace for the __v_ segment. A WX decision has no FX flag
// behind it, so it must not look like one: `servedFlagKey` feeds <FxBucketingEvent>,
// which calls FX decide() and fires a real impression. Tagging the segment `wx`
// keeps that guard to one comparison, and makes the segment's provenance obvious in
// a URL. It is also why a WX variation needs no phantom flag mirrored into the FX
// datafile just to pass validation.
export const WX_FLAG_KEY = "wx";

// Only CMS variations whose name starts with this participate in the WX bridge.
//
// The prefix is load-bearing, not cosmetic. It is simultaneously the allowlist, the
// per-page opt-in (a page with no wx_* variation emits no script and pays nothing),
// and the namespace partition from the FX path - CLAUDE.md already requires a CMS
// variation name to match an FX variation key exactly, so without a prefix a WX
// experiment with a variation named `personal` would hijack the FX/ODP persona
// variations on the homepage. An editor turns the feature on by creating a variation
// in Visual Builder; no deploy, no env var, and no phantom FX flag.
export const WX_VARIATION_PREFIX = "wx_";

export function isWxVariation(name: string | null | undefined): boolean {
  return typeof name === "string" && name.startsWith(WX_VARIATION_PREFIX);
}

/** The page's wx_* variation names: deduped and sorted so the winner is stable. */
export function selectWxVariations(names: Array<string | null | undefined>): string[] {
  return [...new Set(names.filter(isWxVariation) as string[])].sort();
}

// Set on <html> while the swap is in flight. A static rule in layout.tsx hides the
// held region; `visibility` rather than `display` so layout is reserved and the hold
// costs no CLS.
export const WX_PENDING_ATTR = "data-wx-pending";
export const WX_REGION_ATTR = "data-wx-region";

// Where the pre-paint script publishes its result for the client component.
export const WX_GLOBAL = "__optiWxCms";

// Fired when the decision resolves too late for the synchronous read (manual or
// callback activation, or an audience that needed async data). See below.
export const WX_EVENT = "opti-wx-cms";

// Failsafe ceiling on the hold. In the normal case the hold is released the moment
// the variation renders (WxVariationSwap's __v_ branch), so this only fires when the
// swap fails or never completes - including the case where React never hydrates,
// which is why the timer lives in the inline script rather than in a component.
//
// 600ms was measured to be too tight: against a COLD ISR entry for the variation
// route the swap landed at ~1800ms, so the failsafe fired first and the visitor got a
// flash of base content before the variation - the worst of both. A warm entry swaps
// in ~300ms. 1500ms covers the cold case, matches Optimizely's own anti-flicker
// guidance, and equals SETTLE_TIMEOUT_MS in lib/tracking/activeVariations.ts.
export const WX_HOLD_MS = 1500;

// Rendered once, statically, in the root layout's <head>.
export const WX_HOLD_STYLE = `html[${WX_PENDING_ATTR}] [${WX_REGION_ATTR}]{visibility:hidden}`;

// Two delivery mechanisms, switchable from the demo Settings panel so the two can be
// compared on a real page.
//
//   soft-nav (default) - hold the region, soft-navigate to /__v_wx--<name>, restore the
//                        clean URL. One extra cached request; the variation is NOT in the
//                        first paint.
//   pre-paint          - the server already sent base AND the variant; flip an attribute
//                        on <html> before first paint and CSS reveals the right one. No
//                        request, no hold, no URL change.
//
// The choice lives in localStorage, not a cookie, on purpose: a cookie cannot change a
// statically prerendered page (which is why FX routes its decisions through a middleware
// segment rewrite), so a server-side switch would cost the catch-all its prerender. The
// consequence, which the demo page states plainly: the server sends both subtrees in
// BOTH modes, so the demo shows the timing difference honestly but not the payload
// difference. In production you would pick one and render only that.
export const WX_MODE_KEY = "demo_wx_mode";
export const WX_MODE_SOFTNAV = "softnav";
export const WX_MODE_PREPAINT = "prepaint";
export type WxMode = typeof WX_MODE_SOFTNAV | typeof WX_MODE_PREPAINT;

/** Reads the mode in the browser. Soft-nav unless pre-paint was explicitly chosen. */
export function readWxMode(): WxMode {
  try {
    return window.localStorage.getItem(WX_MODE_KEY) === WX_MODE_PREPAINT
      ? WX_MODE_PREPAINT
      : WX_MODE_SOFTNAV;
  } catch {
    // Blocked storage (private mode, cleared site data): fall back to the default.
    return WX_MODE_SOFTNAV;
  }
}

// Marks each rendered subtree. The tokens are FIXED, not variation names, and the
// variant's real name rides along in WX_VARIANT_NAME_ATTR - that is what lets the reveal
// CSS be a static constant in the layout instead of a per-page <style> tag.
//
// Emitting that <style> next to the content was also a real bug: it added a node to the
// page's sibling list that the client tree did not have in the same place, which shifted
// alignment by one and produced a hydration mismatch (server `<a data-component=
// "ProductCardBlock">` against a client `Column` <div>). Keep the reveal CSS static.
export const WX_VARIANT_ATTR = "data-cms-variant";
export const WX_VARIANT_NAME_ATTR = "data-cms-variant-name";
export const WX_ACTIVE_ATTR = "data-cms-variation";
export const WX_BASE_VARIANT = "__base__";
export const WX_VARIANT_TOKEN = "__variant__";

/**
 * The reveal CSS. Static, because the tokens are fixed - it lives in the root layout's
 * <head> alongside WX_HOLD_STYLE and never varies per page.
 *
 * Default state is base-visible and the variant hidden, which is what makes JS-off,
 * WX-blocked and no-decision all render base correctly without a line of script running.
 * The pre-paint script flips it by setting WX_ACTIVE_ATTR on <html>.
 *
 * `display`, not `visibility`: AutoTracker's IntersectionObserver has no visibility
 * check, and a `visibility:hidden` element still intersects, so a hidden duplicate
 * would fire mb_feature_viewed a second time. `display:none` generates no boxes.
 */
export const WX_REVEAL_STYLE = [
  `[${WX_VARIANT_ATTR}="${WX_VARIANT_TOKEN}"]{display:none}`,
  `html[${WX_ACTIVE_ATTR}] [${WX_VARIANT_ATTR}="${WX_VARIANT_TOKEN}"]{display:revert}`,
  `html[${WX_ACTIVE_ATTR}] [${WX_VARIANT_ATTR}="${WX_BASE_VARIANT}"]{display:none}`,
].join("");

/**
 * True when `el` sits inside a variant subtree that is NOT the active one.
 *
 * Both subtrees hydrate, and effects run regardless of CSS, so any client component that
 * fires an analytics event or a fetch on mount must check this or it does its work twice.
 * Three call sites need it today: FxBucketingEvent (which fires a REAL FX impression, so
 * a duplicate permanently skews the experiment), AutoTracker, and
 * RecommendationBlockClient. Any new client component placed inside a variation needs it
 * too - see CLAUDE.md.
 */
export function isInactiveVariant(el: Element | null | undefined): boolean {
  if (!el) return false;
  const wrapper = el.closest(`[${WX_VARIANT_ATTR}]`);
  if (!wrapper) return false;
  const active = document.documentElement.hasAttribute(WX_ACTIVE_ATTR)
    ? WX_VARIANT_TOKEN
    : WX_BASE_VARIANT;
  return wrapper.getAttribute(WX_VARIANT_ATTR) !== active;
}

export interface WxCmsGlobal {
  /** The matched CMS variation name, or null when nothing matched (yet). */
  v: string | null;
  /** WX experiment name behind the match, for analytics attribution. */
  e: string | null;
  /** The page's wx_* allowlist, so a soft navigation can re-read without the script. */
  names: string[];
  /** Installed by wxReaderScript(); absent only if that never ran. */
  read?: () => { v: string; e: string | null } | null;
  /** Which mechanism the pre-paint script chose, for the Settings panel to display. */
  mode?: string;
  /**
   * The clean path whose swap has already been started, latched here rather than in
   * component state because WxVariationSwap may remount across the navigation. It is
   * also what lets the address bar be restored to the clean path without the
   * resulting pathname change starting the swap over again.
   */
  doneFor?: string | null;
}

// Serialize for embedding in an inline <script>. Variation names come from the CMS,
// so escaping `<` is what stops a name containing "</script>" from closing the tag.
function embed(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Source for the inline pre-paint script.
 *
 * `variationNames` is the allowlist: the variations this page actually has. The
 * intersection with WX's buckets does double duty - it validates the name, and it is
 * how we pick which experiment is the CMS-content one when a visitor sits in several
 * WX experiments at once. That means zero WX-side configuration: naming a WX
 * variation to match a CMS variation name is the entire setup.
 */
export function wxPrepaintScript(variationNames: string[], dualRendered: boolean): string {
  return [
    wxReaderScript(),
    "(function(){",
    `var NAMES=${embed(variationNames)},G=${embed(WX_GLOBAL)},A=${embed(WX_PENDING_ATTR)},E=${embed(WX_EVENT)},HOLD=${WX_HOLD_MS};`,
    `var ACTIVE=${embed(WX_ACTIVE_ATTR)},MODEKEY=${embed(WX_MODE_KEY)},PREPAINT=${embed(WX_MODE_PREPAINT)},DUAL=${dualRendered ? "1" : "0"};`,
    "var g=window[G];g.names=NAMES;",
    "var root=document.documentElement;",
    // localStorage can throw outright on a blocked-storage profile, and this script
    // must never be the reason a page fails to render.
    "var prepaint=false;try{prepaint=localStorage.getItem(MODEKEY)===PREPAINT;}catch(e){}",
    // Pre-paint can only reveal a variant the server actually sent. Without one, setting
    // the attribute would hide base and show nothing, so fall back to the soft-nav path.
    "if(!DUAL)prepaint=false;",
    "g.mode=prepaint?PREPAINT:'softnav';",
    // Never act twice. A __v_ path is already the variation render (a direct hit, or the
    // soft navigation that this script triggered on the previous view).
    `if(location.pathname.indexOf(${embed("/__v_")})!==-1)return;`,
    "var hit=g.read();",
    "if(hit){",
    "  g.v=hit.v;g.e=hit.e;",
    // Pre-paint mode: the variant is already in the document, so naming the active one
    // is the entire swap. No hold, no failsafe, no request - CSS does it before paint.
    "  if(prepaint){root.setAttribute(ACTIVE,hit.v);return;}",
    "  root.setAttribute(A,'');",
    "  setTimeout(function(){root.removeAttribute(A);},HOLD);",
    "  return;",
    "}",
    // Nothing decided synchronously. Do NOT hold - most visitors are in no
    // experiment at all and must not pay for it. Listen instead: if a decision lands
    // late (polling, callback or manual activation, or an audience that needed a
    // network call) the swap still happens, just as a visible change rather than a
    // held region. Registering the listener here is correct precisely because these
    // decisions have not happened yet: WX listeners are not retroactive, which is
    // also why the synchronous read above cannot be replaced by one.
    "try{",
    "  window.optimizely=window.optimizely||[];",
    "  window.optimizely.push({type:'addListener',filter:{type:'lifecycle',name:'campaignDecided'},handler:function(){",
    "    if(g.v)return;",
    "    var late=g.read();",
    "    if(!late)return;",
    "    g.v=late.v;g.e=late.e;",
    // In pre-paint mode a late decision still applies, just after first paint - the
    // reveal is a visible change rather than something the visitor never sees. The event
    // is dispatched either way so attribution is recorded in both modes.
    "    if(prepaint){root.setAttribute(ACTIVE,late.v);}",
    "    try{document.dispatchEvent(new Event(E));}catch(e){}",
    "  }});",
    "}catch(e){}",
    "})();",
  ].join("");
}

/**
 * The state read, as a string so it can be installed on the global by the inline
 * script AND reused verbatim by the client component after a soft navigation, where
 * React does not re-execute an inline script and so the reader would otherwise be
 * gone. Kept in one place because a drifted copy would be a silent wrong-variant bug.
 */
export function wxReaderScript(): string {
  return [
    `(function(){var G=${embed(WX_GLOBAL)};`,
    "var g=window[G]=window[G]||{v:null,e:null,names:[]};",
    "g.read=function(){",
    "  try{",
    "    var o=window.optimizely;",
    "    if(!o||typeof o.get!=='function')return null;",
    "    var states=o.get('state').getExperimentStates({isActive:true})||{};",
    "    var live={};",
    "    for(var k in states){",
    "      var s=states[k];",
    // A holdback visitor is the control. Serving them the variation would corrupt
    // the experiment, and this flag is the only reason we read states not the map.
    "      if(!s||s.isInExperimentHoldback)continue;",
    "      var n=s.variation&&s.variation.name;",
    "      if(n&&!live[n])live[n]={v:n,e:s.experimentName||null};",
    "    }",
    // Iterate the allowlist, not WX's output, so the winner is deterministic when a
    // visitor is bucketed into more than one matching variation.
    "    for(var i=0;i<g.names.length;i++){if(live[g.names[i]])return live[g.names[i]];}",
    "  }catch(e){}",
    "  return null;",
    "};})();",
  ].join("");
}

/** The `__v_wx--<name>` segment for a matched CMS variation name. */
export function wxVariationSegment(variationName: string): string {
  return `__v_${WX_FLAG_KEY}--${variationName}`;
}

/**
 * The path a matched variation should render at: the current path with the WX
 * segment appended, matching how middleware builds the FX segments.
 */
export function wxVariationPath(pathname: string, variationName: string): string {
  return `${pathname.replace(/\/$/, "")}/${wxVariationSegment(variationName)}`;
}
