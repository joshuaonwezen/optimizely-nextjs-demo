// Web Experimentation -> CMS variation, without a cookie and on the first pageview.
//
// The WX snippet is a blocking <script> in <head> (layout.tsx), so by the time any
// body markup is parsed the bucketing decision already exists in the browser, and
// window.optimizely.get("state") can be read synchronously with no network call.
// That is the whole mechanism: read the variation NAME, match it against the
// variations this page actually has in the CMS, and route the render to it. The
// previous design wrote a cookie from a WX Custom JS action and could therefore only
// act on the NEXT request.
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
// a URL. It is also why WX variations no longer need a phantom flag mirrored into
// the FX datafile just to pass validation.
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

// Ceiling on the hold. Long enough for an ISR/CDN-cached RSC payload, short enough
// that the worst case is a brief hold rather than a page that looks broken. The
// timer lives in the inline script rather than in React so a page that never
// hydrates still reveals itself.
export const WX_HOLD_MS = 600;

// Rendered once, statically, in the root layout's <head>.
export const WX_HOLD_STYLE = `html[${WX_PENDING_ATTR}] [${WX_REGION_ATTR}]{visibility:hidden}`;

export interface WxCmsGlobal {
  /** The matched CMS variation name, or null when nothing matched (yet). */
  v: string | null;
  /** WX experiment name behind the match, for analytics attribution. */
  e: string | null;
  /** The page's wx_* allowlist, so a soft navigation can re-read without the script. */
  names: string[];
  /** Installed by wxReaderScript(); absent only if that never ran. */
  read?: () => { v: string; e: string | null } | null;
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
export function wxPrepaintScript(variationNames: string[]): string {
  return [
    wxReaderScript(),
    "(function(){",
    `var NAMES=${embed(variationNames)},G=${embed(WX_GLOBAL)},A=${embed(WX_PENDING_ATTR)},E=${embed(WX_EVENT)},HOLD=${WX_HOLD_MS};`,
    "var g=window[G];g.names=NAMES;",
    "var root=document.documentElement;",
    // Never hold twice. A __v_ path is already the variation render (a direct hit,
    // or the soft navigation that this script triggered on the previous view).
    `if(location.pathname.indexOf(${embed("/__v_")})!==-1)return;`,
    "var hit=g.read();",
    "if(hit){",
    "  g.v=hit.v;g.e=hit.e;",
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
