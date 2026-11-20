import type { EventKey } from "./fx-project-data";

// Everything the site needs in its Web Experimentation project, built by
// scripts/seed-wx-project.ts. The project is "SaaS CMS ProServ - Web", in the same
// account as the FX project, which is what lets every experiment below use FX events
// as metrics (cross-project events): WX and FX share the optimizelyEndUserId cookie,
// so a conversion the site tracks in FX attributes to the WX visitor.
//
// Experiments are numbered "EXP-<n>: <what> (<arm> vs <arm>)", without the test type
// (the WX list shows it), and a control variation's name starts with "Control:".
//
// Changes only touch elements no FX flag controls (the hero, site banner, rates bar,
// trust section, sticky offer, footer strip, nav and product hero button are all FX),
// and only through data-component / data-track-event hooks.
//
// Every variation ships as ONE custom_code change built by variationCode(), never as
// custom_css: WX leaves a page's changes in place when a soft navigation deactivates
// it (the REST API cannot turn on undo-on-deactivation), so a plain style would leak
// onto every later page. The code adds its <style> only while the URL is one of the
// experiment's pages and removes it otherwise. A DOM edit (`apply`) touches only nodes
// React has hydrated (a node carries a __reactFiber$ key once it has): editing
// server-rendered markup before hydration is a mismatch that re-renders the page.

export const WX_SNIPPET_SETTINGS = {
  // The wx_ CMS bridge (src/lib/optimizely/wxVariation.ts) matches on the variation
  // NAME, which the snippet leaves out when this is true. New projects default to true.
  exclude_names: false,
  // ?optimizely_x=<variationId> QA links.
  enable_force_variation: true,
  // The snippet then holds only running experiments, which is how the daily seeder
  // (scripts/send-experiment-odp-events.mjs) tells which ones to send decisions for.
  exclude_disabled_experiments: true,
} as const;

// The WxProfileBridge attributes that scripts/maintenance/sync-attribute-docs.ts does
// not document (it owns persona, top_category, read_categories, odp_segment and
// fx_variation, whose descriptions come from the CMS taxonomy).
export const WX_ATTRIBUTES = [
  { key: "device", name: "Device", description: "mobile or desktop, from the User-Agent (pushed by WxProfileBridge)." },
  { key: "logged_in", name: "Logged in", description: "\"true\" when the visitor signed in via the demo Settings panel (pushed by WxProfileBridge)." },
] as const;

// A WX custom attribute condition names the attribute by its display NAME ("Logged in"),
// not its key - the API answers "Custom attribute 'logged_in' does not exist" otherwise.
// Visitors still send the key (WxProfileBridge pushes { logged_in: "true" }).
export const WX_AUDIENCES = {
  mobile: {
    name: "Mobile visitors",
    description: "Phones, by Optimizely's own device detection, so it applies on the first page view (WxProfileBridge's device attribute lands one activation late).",
    // device_type, not device: the snippet's "device" is the model when it knows it, so
    // an iPhone is "iphone" and never matches device = "mobile". device_type is "phone"
    // for every phone.
    conditions: ["and", ["or", ["or", { type: "device_type", value: "phone" }]]],
  },
  loggedIn: {
    name: "Logged-in visitors",
    description: "logged_in = \"true\" (Auth State in the demo Settings panel, pushed by WxProfileBridge).",
    conditions: ["and", ["or", ["or", { type: "custom_attribute", name: "Logged in", value: "true" }]]],
  },
  mortgages: {
    name: "Mortgage browsers",
    description: "persona = mortgages: the visitor has been browsing the mortgage section (pushed by WxProfileBridge, so it applies from the next page).",
    conditions: ["and", ["or", ["or", { type: "custom_attribute", name: "Browsing persona", value: "mortgages" }]]],
  },
} as const;

export type WxAudienceRef = keyof typeof WX_AUDIENCES;

// The live host and its preview deployments, plus local dev: the same scope as the FX
// "Main demo site" audience. A __v_ segment is allowed because the wx_ bridge
// soft-navigates through one before restoring the clean URL.
const HOST = String.raw`^https?://(optimizely-onboarding[a-z0-9-]*\.vercel\.app|localhost(:[0-9]+)?)`;
const TAIL = String.raw`(/__v_[^/?#]*)*/?([?#].*)?$`;
const urlRegex = (path: string) => `${HOST}${path}${TAIL}`;

export interface WxPage {
  key: string;
  name: string;
  /** Path regex after the host, e.g. "/en/help". */
  path: string;
  editPath: string;
  category: "home" | "landing_page" | "pricing" | "other";
  /**
   * "url_changed" also activates on a Next.js soft navigation, which WX does not
   * notice otherwise. "immediate" decides while <head> is parsed, which the wx_ CMS
   * bridge needs: its pre-paint script reads the decision synchronously.
   */
  activation: "url_changed" | "immediate";
}

export const WX_PAGES = {
  homepage: { key: "homepage", name: "Homepage", path: "(/en)?", editPath: "/en", category: "home", activation: "url_changed" },
  personal_banking: { key: "personal_banking", name: "Personal banking", path: "/en/personal-banking", editPath: "/en/personal-banking", category: "landing_page", activation: "url_changed" },
  business: { key: "business", name: "Business banking", path: "/en/business", editPath: "/en/business", category: "landing_page", activation: "url_changed" },
  business_pricing: { key: "business_pricing", name: "Business pricing", path: "/en/business/pricing", editPath: "/en/business/pricing", category: "pricing", activation: "url_changed" },
  investments: { key: "investments", name: "Investments", path: "/en/investments", editPath: "/en/investments", category: "landing_page", activation: "immediate" },
  help: { key: "help", name: "Help", path: "/en/help", editPath: "/en/help", category: "other", activation: "url_changed" },
  about: { key: "about", name: "About", path: "/en/about", editPath: "/en/about", category: "other", activation: "url_changed" },
} as const satisfies Record<string, WxPage>;

export type WxPageRef = keyof typeof WX_PAGES;

export function pageConditions(page: WxPage): string {
  return JSON.stringify(["and", ["or", { type: "url", match_type: "regex", value: urlRegex(page.path) }]]);
}

export interface WxVariation {
  key: string;
  /** For the wx_ CMS bridge this must equal the CMS variation name exactly. */
  name: string;
  /** Styles, present only while the visitor is on one of the experiment's pages. */
  css?: string;
  /**
   * Body of a function that edits the DOM, given `hydrated(el)`. Return true once done;
   * it is retried every 200ms (up to 15s) until then, and re-run after re-renders.
   */
  apply?: string;
  /** Body of a function that undoes `apply` when the visitor navigates off the pages. */
  cleanup?: string;
}

export interface WxMetric {
  event: EventKey;
  direction?: "increasing" | "decreasing";
}

export interface WxExperiment {
  key: string;
  name: string;
  description: string;
  type: "a/b" | "multiarmed_bandit";
  pages: WxPageRef[];
  audience?: WxAudienceRef;
  variations: WxVariation[];
  /** FX events (cross-project), primary first. */
  metrics: WxMetric[];
  /**
   * For the daily seeder: the share of its synthetic visitors who reach these pages,
   * by persona ("default" for the rest). Written into scripts/wx-project-ids.json.
   */
  exposure: Partial<Record<"personal" | "business" | "mortgages" | "investments" | "default", number>>;
}

export interface WxExperience extends WxVariation {
  audience: WxAudienceRef;
}

/** A personalization campaign: one experience per audience, first match wins. */
export interface WxPersonalization {
  key: string;
  name: string;
  description: string;
  pages: WxPageRef[];
  /** Share of matching visitors kept on the original page, in basis points. */
  holdback: number;
  /** In priority order. */
  experiences: WxExperience[];
  metrics: WxMetric[];
  exposure: WxExperiment["exposure"];
}

/** The experiment's pages as a pathname regex source (the __v_ segment allowed, as in pageConditions). */
function pathPattern(pages: WxPageRef[]): string {
  return `^(?:${pages.map((ref) => WX_PAGES[ref].path).join("|")})(/__v_[^/?#]*)*/?$`;
}

/** The single custom_code change for a variation, or null when it changes nothing. */
export function variationCode(exp: { key: string; pages: WxPageRef[] }, v: WxVariation): string | null {
  if (!v.css && !v.apply) return null;
  const id = `wx-${exp.key}-${v.key}`;
  return `(function () {
  var ID = ${JSON.stringify(id)};
  var PATHS = new RegExp(${JSON.stringify(pathPattern(exp.pages))});
  var CSS = ${JSON.stringify(v.css ?? "")};
  function hydrated(el) {
    return Object.keys(el).some(function (k) { return k.indexOf("__reactFiber$") === 0; });
  }
  function apply() {
${v.apply ?? "    return true;"}
  }
  function cleanup() {
${v.cleanup ?? ""}
  }
  function sync() {
    var on = PATHS.test(location.pathname);
    var style = document.getElementById(ID);
    if (CSS && on && !style) {
      style = document.createElement("style");
      style.id = ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    } else if (style && !on) {
      style.remove();
    }
    if (!on) {
      cleanup();
      return true;
    }
    return apply();
  }
  var tries = 0;
  (function poll() {
    if (!sync() && ++tries < 75) setTimeout(poll, 200);
  })();
  // url_changed re-runs this on every activation; one observer is enough. Not
  // window[ID]: an element with that id (the style above) is a named property of
  // window, so the guard would already be "set" on the first run.
  var GUARD = ID + ":observer";
  if (window[GUARD]) return;
  window[GUARD] = true;
  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; sync(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", sync);
})();`;
}

const CTA_COPY: Record<string, string> = {
  "Open an account today": "Open an account in 5 minutes",
  "Open a current account today": "Open a current account in 5 minutes",
  "Read about our saving rates": "See today's savings rates",
  "Join two million customers": "Join 2 million customers in 5 minutes",
};

const CTA_COPY_APPLY = `    var COPY = ${JSON.stringify(CTA_COPY)};
    var done = true;
    var links = document.querySelectorAll('[data-component="CallToActionBlock"] a[data-track-event="cta_click"]');
    for (var i = 0; i < links.length; i++) {
      var span = links[i].querySelector("span");
      // The savings_offer FX experiment owns the CTAs inside its Variation Container.
      if (!span || links[i].closest('[data-component="VariationContainerBlock"]')) continue;
      var next = COPY[span.textContent.trim()];
      if (!next) continue;
      if (!hydrated(span)) { done = false; continue; }
      span.textContent = next;
    }
    return done;`;

const FAQ_OPEN_APPLY = `    var d = document.querySelector('[data-component="FaqItemBlock"] details');
    if (!d || !hydrated(d)) return false;
    if (d.hasAttribute("data-wx-opened")) return true;
    d.setAttribute("data-wx-opened", "");
    // AutoTracker turns every toggle into faq_expand (a document capture listener).
    // This one was not the visitor's, so stop it on window, which sees it first.
    window.addEventListener("toggle", function swallow(e) {
      if (e.target !== d) return;
      e.stopImmediatePropagation();
      window.removeEventListener("toggle", swallow, true);
    }, true);
    d.open = true;
    return true;`;

const SAVINGS_CARD = 'a[data-component="ProductCardBlock"][href*="/savings"]';
const PRICING_INNER = '[data-component="PricingTierBlock"] > .relative';
const NOTE = "display:block;margin-top:1rem;font-size:.8125rem;line-height:1.4";
const CTA_BUTTON = '[data-component="CallToActionBlock"] a[data-component="Button"][data-track-event="cta_click"]';
const buttonColor = (hex: string) => `${CTA_BUTTON}{background-color:${hex} !important;border-color:${hex} !important;color:#fff !important}`;
const CARD_GRID = '[data-component="BlankSection"] > .grid:has(> div > a[data-component="ProductCardBlock"])';

export const WX_EXPERIMENTS: WxExperiment[] = [
  {
    key: "homepage_product_cards_ab_test",
    name: "EXP-2: Homepage product cards (as authored vs Most popular badge)",
    description: "Hypothesis: flagging Savings as the most popular product draws more product card clicks. Metrics are FX events (cross-project).",
    type: "a/b",
    pages: ["homepage"],
    variations: [
      { key: "control", name: "Control: as authored" },
      {
        key: "popular_badge",
        name: "Most popular badge on Savings",
        css:
          `${SAVINGS_CARD}{position:relative;box-shadow:0 0 0 2px var(--color-brand)}` +
          `${SAVINGS_CARD}::before{content:"Most popular";position:absolute;top:1rem;right:1rem;padding:.25rem .625rem;border-radius:9999px;` +
          `background:var(--color-brand-fill);color:var(--color-on-brand);font-size:.6875rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}`,
      },
    ],
    metrics: [{ event: "product_card_click" }, { event: "cta_click" }],
    exposure: { default: 0.7 },
  },
  {
    key: "business_pricing_abc_test",
    name: "EXP-7: Business pricing (as authored vs social proof vs annual billing note)",
    description: "Hypothesis: a social proof line on the recommended tier, or an annual-billing saving on every tier, lifts plan clicks. Metrics are FX events (cross-project).",
    type: "a/b",
    pages: ["business_pricing"],
    variations: [
      { key: "control", name: "Control: as authored" },
      {
        key: "social_proof",
        name: "Social proof on the recommended tier",
        css: `[data-component="PricingTierBlock"]:has([data-track-tags*='"highlighted":true']) > .relative::after{content:"Chosen by 7 in 10 new business customers";${NOTE};font-weight:600}`,
      },
      {
        key: "annual_note",
        name: "Annual billing note on every tier",
        css: `${PRICING_INNER}::after{content:"Pay annually and get 2 months free";${NOTE};opacity:.8}`,
      },
    ],
    metrics: [{ event: "pricing_tier_click" }, { event: "form_start" }],
    exposure: { business: 0.45, default: 0.04 },
  },
  {
    key: "cta_copy_multipage_ab_test",
    name: "EXP-5: CTA copy on three pages (as authored vs speed-led)",
    description: "Hypothesis: saying how quick it is to open an account lifts CTA clicks across the homepage, personal banking and about pages. Metrics are FX events (cross-project).",
    type: "a/b",
    pages: ["homepage", "personal_banking", "about"],
    variations: [
      { key: "control", name: "Control: as authored" },
      { key: "speed_led", name: "Speed-led labels (in 5 minutes)", apply: CTA_COPY_APPLY },
    ],
    metrics: [{ event: "cta_click" }, { event: "form_submit" }],
    exposure: { personal: 0.8, default: 0.7 },
  },
  {
    // A multi-armed bandit shifts traffic to the best arm instead of reporting a winner.
    key: "business_cta_color_mab",
    name: "EXP-11: Business landing CTA color (brand vs green vs amber)",
    description: "Multi-armed bandit: optimizes the color of the business landing page's call-to-action button. Metric is an FX event (cross-project).",
    type: "multiarmed_bandit",
    pages: ["business"],
    variations: [
      { key: "brand", name: "Control: brand blue" },
      { key: "green", name: "Green", css: buttonColor("#15803d") },
      { key: "amber", name: "Amber", css: buttonColor("#b45309") },
    ],
    metrics: [{ event: "cta_click" }],
    exposure: { business: 0.7, default: 0.06 },
  },
  {
    key: "help_faq_open_ab_test",
    name: "EXP-13: Help FAQs (all closed vs first answer open)",
    description: "Hypothesis: showing the first answer up front means fewer visitors need to contact us (Contact us is the CTA, so lower is better). Metrics are FX events (cross-project).",
    type: "a/b",
    pages: ["help"],
    variations: [
      { key: "control", name: "Control: all closed" },
      { key: "first_open", name: "First answer open", apply: FAQ_OPEN_APPLY },
    ],
    metrics: [{ event: "cta_click", direction: "decreasing" }, { event: "time_on_page" }],
    exposure: { default: 0.12 },
  },
  {
    key: "help_product_cards_mobile_ab_test",
    name: "EXP-16: Help cards on mobile (stacked vs swipeable row)",
    description: "Hypothesis: on a phone, a swipeable row keeps all four help options above the FAQs and gets more of them tapped. Mobile visitors only. Metrics are FX events (cross-project).",
    type: "a/b",
    pages: ["help"],
    audience: "mobile",
    variations: [
      { key: "control", name: "Control: stacked cards" },
      {
        key: "swipe_row",
        name: "Swipeable row",
        css:
          `@media (max-width:767px){${CARD_GRID}{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:1rem;padding-bottom:.75rem}` +
          `${CARD_GRID} > div{flex:0 0 78%;scroll-snap-align:start}}`,
      },
    ],
    metrics: [{ event: "product_card_click" }, { event: "scroll_depth" }],
    exposure: { default: 0.12 },
  },
  {
    // The wx_ CMS bridge: no changes here. The variation's name matches a CMS variation
    // of the Investments page, which the site serves to visitors bucketed into it
    // (src/lib/optimizely/wxVariation.ts). The CMS variation is created in Visual
    // Builder (the API cannot create one); until it exists this arm shows the base page.
    key: "investments_cms_variation_ab_test",
    name: "EXP-19: Investments page (base vs wx_goal_led CMS variation)",
    description: "Serves the Investments page's wx_goal_led CMS variation (made in Visual Builder) to half the visitors through the site's WX -> CMS bridge. Metrics are FX events (cross-project).",
    type: "a/b",
    pages: ["investments"],
    variations: [
      { key: "control", name: "Control: base page" },
      { key: "wx_goal_led", name: "wx_goal_led" },
    ],
    metrics: [{ event: "hero_cta_click" }, { event: "cta_click" }, { event: "product_card_click" }],
    exposure: { investments: 0.75, default: 0.06 },
  },
];

const WELCOME_CARD_ID = "wx-welcome-card";
const WELCOME_DISMISSED = "wx_welcome_card_dismissed";

const WELCOME_CARD_CSS =
  `#${WELCOME_CARD_ID}{position:fixed;top:5.5rem;right:1rem;z-index:60;max-width:min(22rem,calc(100% - 2rem));padding:1rem 2.75rem 1rem 1.25rem;` +
  `border-radius:1rem;background:var(--color-surface-lowest);color:var(--color-on-surface);border:1px solid var(--color-outline-variant);` +
  `box-shadow:0 12px 32px rgba(0,0,0,.14);font-size:.9375rem;line-height:1.45}` +
  `#${WELCOME_CARD_ID} strong{display:block;font-family:var(--font-display,inherit);font-size:1.0625rem;margin-bottom:.25rem}` +
  `#${WELCOME_CARD_ID} a{display:inline-block;margin-top:.625rem;font-weight:700;color:var(--color-brand)}` +
  `#${WELCOME_CARD_ID} button{position:absolute;top:.5rem;right:.75rem;padding:.25rem;font-size:1.25rem;line-height:1;background:none;border:0;cursor:pointer;color:var(--color-on-surface-variant)}`;

/**
 * A dismissible card added to <body> once React has hydrated <main>. Its link carries
 * data-track-event, so AutoTracker's delegated listener tracks the click as cta_click
 * (an FX event, which is the campaign's metric). Dismissal lasts for the session.
 */
function welcomeCard(heading: string, text: string, label: string, href: string): Pick<WxVariation, "css" | "apply" | "cleanup"> {
  const tags = JSON.stringify({ label, variant: "personalized" });
  const html =
    `<strong>${heading}</strong>${text}<br>` +
    `<a href="${href}" data-track-event="cta_click" data-track-tags='${tags}'>${label} &rarr;</a>` +
    `<button type="button" aria-label="Dismiss">&times;</button>`;
  return {
    css: WELCOME_CARD_CSS,
    apply: `    try { if (sessionStorage.getItem(${JSON.stringify(WELCOME_DISMISSED)})) return true; } catch (e) {}
    if (document.getElementById(${JSON.stringify(WELCOME_CARD_ID)})) return true;
    var main = document.querySelector("main");
    if (!main || !hydrated(main)) return false;
    var card = document.createElement("aside");
    card.id = ${JSON.stringify(WELCOME_CARD_ID)};
    card.setAttribute("data-component", "WxWelcomeCard");
    card.innerHTML = ${JSON.stringify(html)};
    card.querySelector("button").addEventListener("click", function () {
      card.remove();
      try { sessionStorage.setItem(${JSON.stringify(WELCOME_DISMISSED)}, "1"); } catch (e) {}
    });
    document.body.appendChild(card);
    return true;`,
    cleanup: `    var card = document.getElementById(${JSON.stringify(WELCOME_CARD_ID)});
    if (card) card.remove();`,
  };
}

export const WX_CAMPAIGNS: WxPersonalization[] = [
  {
    key: "homepage_welcome_personalization",
    name: "PERS-1: Homepage welcome card personalized by audience",
    description:
      "Personalization campaign: a welcome card on the homepage, worded for the first audience the visitor matches (logged in, then mortgage browser, then mobile). " +
      "A 5% holdback sees no card, which is what each experience's lift is measured against. Metrics are FX events (cross-project).",
    pages: ["homepage"],
    holdback: 500,
    experiences: [
      {
        key: "logged_in",
        name: "Logged in: welcome back, savings rate",
        audience: "loggedIn",
        ...welcomeCard("Welcome back", "Your Easy Saver now earns 5.10% AER.", "See your rate", "/en/personal-banking/savings"),
      },
      {
        key: "mortgages",
        name: "Mortgage browser: today's rates",
        audience: "mortgages",
        ...welcomeCard("Still looking at mortgages?", "Fixed rates from 3.9% this week.", "Compare mortgage rates", "/en/mortgage"),
      },
      {
        key: "mobile",
        name: "Mobile: get the app",
        audience: "mobile",
        ...welcomeCard("Bank on the go", "Pay, save and track spending in the Mosey app.", "Get the app", "/en/personal-banking/current-account/mobile-app/"),
      },
    ],
    metrics: [{ event: "cta_click" }, { event: "product_card_click" }],
    exposure: { default: 0.7 },
  },
];
