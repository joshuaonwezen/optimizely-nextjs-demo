import { FLAG_KEY as SAVINGS_OFFER_FLAG, VARIATIONS as SAVINGS_OFFER_VARIATIONS } from "./variation-container-data";

// Everything the site needs in its Feature Experimentation project, built by
// scripts/seed-fx-project.ts. Event keys must match what the site fires (the
// data-track-event attributes and trackEvent() calls); flag, variable and variation
// keys must match what the components decide on.

export type EventCategory = "convert" | "sign_up" | "other";

export const FX_EVENTS = [
  // Conversions
  { key: "cta_click", name: "CTA Click", category: "convert", description: "Click on a Call To Action block button. Tags: label, variant." },
  { key: "hero_cta_click", name: "Hero CTA Click", category: "convert", description: "Click on a hero's primary or secondary button. Tags: label, placement." },
  { key: "product_card_click", name: "Product Card Click", category: "convert", description: "Click on a product card. Tags: title, featured." },
  { key: "product_spotlight_click", name: "Product Spotlight Click", category: "convert", description: "Click on a product spotlight. Tags: product." },
  { key: "product_hero_cta_click", name: "Product Hero CTA Click", category: "convert", description: "Click on a product hero's button (the add_to_cart flag styles it). Tags: label." },
  { key: "pricing_tier_click", name: "Pricing Tier Click", category: "convert", description: "Click on a pricing tier's button. Tags: tier, label, highlighted." },
  { key: "campaign_banner_click", name: "Campaign Banner Click", category: "convert", description: "Click on a campaign banner block. Tags: heading, color." },
  { key: "banner_click", name: "Site Banner Click", category: "convert", description: "Click on the site-wide banner served by the banner flag. Tags: variation." },
  { key: "form_submit", name: "Form Submitted", category: "sign_up", description: "A contact or native Optimizely form was submitted. Tags: form, fields, status." },
  { key: "customer_identified", name: "Customer Identified", category: "sign_up", description: "A form submission gave us the visitor's email. Tags: has_email." },
  // Engagement
  { key: "form_start", name: "Form Started", category: "other", description: "First focus on a form field. Tags: form." },
  { key: "form_abandon", name: "Form Abandoned", category: "other", description: "Left the page or tab after starting a form without submitting. Tags: form." },
  { key: "nav_click", name: "Navigation Click", category: "other", description: "Click in the header navigation or footer. Tags: source." },
  { key: "outbound_click", name: "Outbound Link Click", category: "other", description: "Click on a link to another site. Tags: href, label." },
  { key: "faq_expand", name: "FAQ Expanded", category: "other", description: "An FAQ question was opened. Tags: label." },
  { key: "scroll_depth", name: "Scroll Depth", category: "other", description: "Scrolled past 25, 50, 75 or 100% of a page. Tags: depth, path." },
  { key: "time_on_page", name: "Time on Page", category: "other", description: "Stayed 30, 60 or 180 seconds on a page. Tags: seconds, path." },
  { key: "feature_viewed", name: "Feature Viewed", category: "other", description: "A tracked block was 50% or 100% in view. Tags: component, label, depth." },
  { key: "content_viewed", name: "Content Viewed", category: "other", description: "Viewed a page with CMS categories. Tags: categories, primary_category." },
  { key: "segment_qualified", name: "Segment Qualified", category: "other", description: "Browsing moved the visitor into a different segment. Tags: segment." },
  // Demo pages and the demo Settings panel
  { key: "demo_page_view", name: "Demo Page View", category: "other", description: "Visited a /demo page. Tags: path." },
  { key: "demo_cta_click", name: "Demo CTA Click", category: "convert", description: "The button on /demo/event-tracking. Tags: source, clickNumber." },
  { key: "audience_switch", name: "Audience Switched", category: "other", description: "Changed audience in the demo Settings panel. Tags: from, to." },
  { key: "wx_mode_switch", name: "WX Mode Switched", category: "other", description: "Changed the Web Experimentation delivery mode in the demo Settings panel. Tags: mode." },
] as const satisfies ReadonlyArray<{ key: string; name: string; category: EventCategory; description: string }>;

export type EventKey = (typeof FX_EVENTS)[number]["key"];

// The attributes buildFxAttributes() sends, plus the personalization ones the app pushes.
// sync-attribute-docs.ts later rewrites the descriptions of the last four and persona.
export const FX_ATTRIBUTES = [
  { key: "hostname", name: "Hostname", description: "The site's hostname, without port. The Personal CMS site audience keys on it." },
  { key: "device", name: "Device", description: "mobile or desktop, from the User-Agent." },
  { key: "logged_in", name: "Logged in", description: "true when the visitor has a demo bucketing ID (signed in via the demo Settings panel)." },
  { key: "persona", name: "Persona", description: "personal, business, mortgages or investments, from the demo_persona cookie." },
  { key: "page_views", name: "Page views", description: "Pages viewed this session, from the demo page-view cookie." },
  { key: "top_category", name: "Top category", description: "Most-read CMS category." },
  { key: "read_categories", name: "Read categories", description: "CMS categories the visitor has read." },
  { key: "odp_segment", name: "ODP segment", description: "The visitor's ODP segment." },
  { key: "fx_variation", name: "FX variation", description: "Variations on screen." },
] as const;

type AttributeKey = (typeof FX_ATTRIBUTES)[number]["key"];
type Condition = { name: AttributeKey; type: "custom_attribute"; match_type: "exact" | "substring" | "ge"; value: string | number | boolean };

const attr = (name: AttributeKey, match_type: Condition["match_type"], value: Condition["value"]): Condition => ({
  name,
  type: "custom_attribute",
  match_type,
  value,
});

/** An audience that matches when ANY of the conditions holds (FX's nested condition format). */
const anyOf = (...conditions: Condition[]) => ["and", ["or", ["or", ...conditions]]];

// Audiences have no key in FX, so they are matched by name.
export const FX_AUDIENCES = {
  site: {
    name: "Personal CMS site",
    description: "Visitors to the personal CMS site (or localhost). Gates every experiment so other instances' traffic stays out.",
    conditions: anyOf(attr("hostname", "substring", "opti.joshuaonwezen.dev"), attr("hostname", "substring", "localhost")),
  },
  personal: { name: "Personal visitors", description: "persona = personal", conditions: anyOf(attr("persona", "exact", "personal")) },
  business: { name: "Business visitors", description: "persona = business", conditions: anyOf(attr("persona", "exact", "business")) },
  mortgages: { name: "Mortgage visitors", description: "persona = mortgages", conditions: anyOf(attr("persona", "exact", "mortgages")) },
  investments: { name: "Investment visitors", description: "persona = investments", conditions: anyOf(attr("persona", "exact", "investments")) },
  loggedIn: { name: "Logged-in visitors", description: "logged_in = true", conditions: anyOf(attr("logged_in", "exact", true)) },
  mobile: { name: "Mobile", description: "device = mobile", conditions: anyOf(attr("device", "exact", "mobile")) },
  desktop: { name: "Desktop", description: "device = desktop", conditions: anyOf(attr("device", "exact", "desktop")) },
  frequent: { name: "Frequent visitors", description: "Five or more page views this session.", conditions: anyOf(attr("page_views", "ge", 5)) },
} as const;

export type AudienceRef = keyof typeof FX_AUDIENCES;

export interface FxVariable {
  key: string;
  type: "string" | "boolean" | "integer" | "double";
  default_value: string;
}

export interface FxVariation {
  key: string;
  name: string;
  /** Values that differ from the defaults. The auto-created on/off use the defaults. */
  variables?: Record<string, string>;
}

export interface FxRule {
  key: string;
  name: string;
  type: "a/b" | "targeted_delivery" | "feature_rollout";
  /** All must match (combined with AND). Empty = everyone. */
  audiences: AudienceRef[];
  /** Variation key -> share of traffic in basis points (sums to 10000). */
  variations: Record<string, number>;
  /** Event keys, primary metric first. */
  metrics?: EventKey[];
}

export interface FxFlag {
  key: string;
  name: string;
  description: string;
  variables: FxVariable[];
  variations: FxVariation[];
  /** In priority order (the first matching rule wins). */
  rules: FxRule[];
  /** Production ruleset switched on. hero_copy stays off: its control overrides the CMS hero headline. */
  enabled?: boolean;
}

const SAVINGS_OFFER_ROUTE = "/savings-offer";
const HOMEPAGE_PERSONAS = ["business", "personal", "mortgages", "investments"] as const;

/** A 50/50 A/B test on the personal CMS site - the shape of most experiments here. */
function abTest(key: string, name: string, [a, b]: [string, string], metrics: EventKey[]): FxRule {
  return { key, name, type: "a/b", audiences: ["site"], variations: { [a]: 5000, [b]: 5000 }, metrics };
}

export const FX_FLAGS: FxFlag[] = [
  {
    key: "hero_copy",
    name: "Hero Copy",
    description: "A/B test different headline and subheadline copy in the homepage hero section.",
    variables: [
      { key: "headline", type: "string", default_value: "" },
      { key: "subheadline", type: "string", default_value: "" },
    ],
    variations: [
      { key: "control", name: "Control - Product-led", variables: { headline: "Banking made simple", subheadline: "Everything you need to manage your money - personal accounts, business banking, and mortgages in one place." } },
      { key: "challenger", name: "Challenger - Benefit-led", variables: { headline: "Earn more. Pay less. Bank smarter.", subheadline: "High-yield savings, zero-fee checking, and mortgage rates that beat the market. Switch in minutes." } },
    ],
    rules: [abTest("hero_copy_ab_test", "Hero copy: product-led vs benefit-led", ["control", "challenger"], ["hero_cta_click", "scroll_depth"])],
    enabled: false,
  },
  {
    key: "hero_layout",
    name: "Hero Layout",
    description: "A/B test split left-text/right-image layout vs. centered full-bleed hero with overlaid text.",
    variables: [{ key: "layout", type: "string", default_value: "split" }],
    variations: [
      { key: "split", name: "Split (control)", variables: { layout: "split" } },
      { key: "centered", name: "Centered Full-bleed", variables: { layout: "centered" } },
    ],
    rules: [abTest("hero_layout_experiment", "Hero layout: split vs centered", ["split", "centered"], ["hero_cta_click", "scroll_depth", "time_on_page"])],
  },
  {
    key: "hero_dual_cta",
    name: "Hero Dual CTA",
    description: "A/B test adding a secondary ghost CTA button next to the primary hero CTA.",
    variables: [
      { key: "secondaryLabel", type: "string", default_value: "" },
      { key: "secondaryUrl", type: "string", default_value: "" },
    ],
    variations: [
      { key: "control", name: "Single CTA (control)" },
      { key: "treatment", name: "Dual CTA", variables: { secondaryLabel: "See how it works", secondaryUrl: "/demo" } },
    ],
    rules: [abTest("hero_dual_cta_experiment", "Hero: single vs dual CTA", ["control", "treatment"], ["hero_cta_click", "scroll_depth"])],
  },
  {
    key: "hero_social_proof",
    name: "Hero Social Proof",
    description: "A/B test adding a trust strip below the hero CTA: Trusted by 2M+ customers - 4.9 star rated.",
    variables: [],
    variations: [
      { key: "control", name: "No Social Proof (control)" },
      { key: "treatment", name: "With Social Proof" },
    ],
    rules: [abTest("hero_social_proof_experiment", "Hero: with vs without social proof", ["control", "treatment"], ["hero_cta_click", "scroll_depth"])],
  },
  {
    key: "banner",
    name: "Site Banner",
    description: "Site-wide promotional banner: a rollout for frequent visitors plus targeted deliveries by login state and device.",
    variables: [
      { key: "title", type: "string", default_value: "" },
      { key: "description", type: "string", default_value: "" },
      { key: "image", type: "string", default_value: "" },
      { key: "imageText", type: "string", default_value: "" },
      { key: "linkText", type: "string", default_value: "" },
      { key: "banner_position", type: "integer", default_value: "0" },
      { key: "cache", type: "boolean", default_value: "true" },
    ],
    variations: [
      { key: "banner1", name: "High-yield savings", variables: { title: "Earn 4.50% APY with a Mosey high-yield savings account", description: "No fees, no minimum balance, and your money stays FDIC-insured.", image: "https://picsum.photos/800", imageText: "main image description", linkText: "Open an account" } },
      { key: "banner2", name: "0% balance transfer", variables: { title: "0% intro APR for 18 months on balance transfers", description: "Move your balances to a Mosey credit card and pay less interest.", image: "https://picsum.photos/800", imageText: "image description", linkText: "Check your rate", cache: "false" } },
      { key: "banner3", name: "Mosey Premier", variables: { title: "Introducing Mosey Premier - banking with a dedicated advisor", description: "Priority support, wealth planning, and exclusive rates for Premier members.", image: "https://picsum.photos/800", imageText: "Image text", linkText: "Explore Premier" } },
      { key: "banner4", name: "Mobile app", variables: { title: "Bank on the go with the new Mosey mobile app", description: "Deposit checks, send money, and track spending from anywhere.", linkText: "Get the app" } },
    ],
    rules: [
      { key: "banner_feature_rollout", name: "Premier banner for frequent visitors", type: "feature_rollout", audiences: ["site", "frequent"], variations: { banner3: 10000 }, metrics: ["banner_click"] },
      { key: "banner_logged_in", name: "Mobile app banner for logged-in visitors", type: "targeted_delivery", audiences: ["site", "loggedIn"], variations: { banner4: 10000 } },
      { key: "banner_mobile", name: "Savings banner on mobile", type: "targeted_delivery", audiences: ["site", "mobile"], variations: { banner1: 10000 } },
      { key: "banner_desktop", name: "Balance transfer banner on desktop", type: "targeted_delivery", audiences: ["site", "desktop"], variations: { banner2: 10000 } },
    ],
  },
  {
    key: "rates_bar",
    name: "Rates Bar",
    description: "A/B test injecting a full-width today's rate bar above product cards (e.g. 4.75% APY on savings).",
    variables: [
      { key: "apy", type: "string", default_value: "4.75%" },
      { key: "product", type: "string", default_value: "savings" },
    ],
    variations: [
      { key: "control", name: "No Rates Bar (control)", variables: { apy: "", product: "" } },
      { key: "treatment", name: "With Rates Bar" },
    ],
    rules: [abTest("rates_bar_experiment", "Rates bar above product cards", ["control", "treatment"], ["pricing_tier_click", "cta_click"])],
  },
  {
    key: "footer_cta",
    name: "Footer CTA",
    description: "A/B test app download banner vs. open account copy strip in the footer.",
    variables: [{ key: "style", type: "string", default_value: "app_download" }],
    variations: [
      { key: "app_download", name: "App Download (control)" },
      { key: "open_account", name: "Open Account Strip", variables: { style: "open_account" } },
    ],
    rules: [abTest("footer_cta_experiment", "Footer: app download vs open account", ["app_download", "open_account"], ["cta_click", "outbound_click"])],
  },
  {
    key: "trust_section_style",
    name: "Trust Section Style",
    description: "A/B test animated stats counter vs. customer quote cards in the homepage trust section.",
    variables: [{ key: "style", type: "string", default_value: "stats" }],
    variations: [
      { key: "stats", name: "Stats Counter (control)" },
      { key: "testimonials", name: "Testimonials", variables: { style: "testimonials" } },
    ],
    rules: [abTest("trust_section_style_experiment", "Trust section: stats vs testimonials", ["stats", "testimonials"], ["cta_click", "scroll_depth", "faq_expand"])],
  },
  {
    key: "sticky_offer_bar",
    name: "Sticky Offer Bar",
    description: "A/B test a fixed bottom promotional bar with a dismissible limited-time offer.",
    variables: [
      { key: "message", type: "string", default_value: "Limited offer: 0% APR for 12 months on balance transfers." },
      { key: "linkText", type: "string", default_value: "Learn more" },
      { key: "linkUrl", type: "string", default_value: "/personal/credit-cards" },
      { key: "expiryLabel", type: "string", default_value: "Ends Friday" },
    ],
    variations: [
      { key: "control", name: "No Offer Bar (control)", variables: { message: "", linkText: "", linkUrl: "", expiryLabel: "" } },
      { key: "treatment", name: "With Offer Bar" },
    ],
    rules: [abTest("sticky_offer_bar_experiment", "Sticky balance transfer offer bar", ["control", "treatment"], ["pricing_tier_click", "cta_click"])],
  },
  {
    key: "mobile_nav",
    name: "Mobile Nav",
    description: "A/B test replacing the hamburger menu with a persistent bottom tab bar on mobile.",
    variables: [],
    variations: [
      { key: "hamburger", name: "Hamburger (control)" },
      { key: "bottom_tabs", name: "Bottom Tab Bar" },
    ],
    rules: [abTest("mobile_nav_experiment", "Mobile nav: hamburger vs bottom tabs", ["hamburger", "bottom_tabs"], ["nav_click", "cta_click"])],
  },
  {
    key: "nav_search_style",
    name: "Nav Search Style",
    description: "A/B test icon-only search vs. expanded pill search input in the navigation bar.",
    variables: [{ key: "style", type: "string", default_value: "icon" }],
    variations: [
      { key: "icon", name: "Icon Only (control)" },
      { key: "expanded", name: "Expanded Pill", variables: { style: "expanded" } },
    ],
    rules: [abTest("nav_search_style_experiment", "Nav search: icon vs expanded", ["icon", "expanded"], ["nav_click", "cta_click"])],
  },
  {
    // ProductHeroCtaClient maps button_color/button_style through COLOR_CLASSES and
    // STYLE_MODIFIERS; an empty value falls back to the default button look.
    key: "add_to_cart",
    name: "Product Hero Button",
    description: "A/B test the color of the product hero's call-to-action button.",
    variables: [
      { key: "button_color", type: "string", default_value: "" },
      { key: "button_style", type: "string", default_value: "" },
    ],
    variations: [
      { key: "control", name: "Default button (control)" },
      { key: "solid_blue", name: "Solid blue", variables: { button_color: "blue", button_style: "filled" } },
    ],
    rules: [abTest("add_to_cart_experiment", "Product hero: default vs solid blue button", ["control", "solid_blue"], ["product_hero_cta_click"])],
  },
  {
    // Drives the VariationContainerBlock seeded by scripts/seed-variation-container.ts.
    // cms_flag + cms_route make middleware decide the flag on /savings-offer, so the
    // block picks its variation server-side there.
    key: SAVINGS_OFFER_FLAG,
    name: "Savings Offer (Variation Container)",
    description: "A/B/C test of the savings promotion built as a Variation Container block on /savings-offer.",
    variables: [
      { key: "cms_flag", type: "boolean", default_value: "false" },
      { key: "cms_route", type: "string", default_value: "" },
    ],
    variations: SAVINGS_OFFER_VARIATIONS.map((v) => ({
      key: v.key,
      name: v.key === "control" ? "Control" : v.key === "rate_led" ? "Rate-led" : "Bonus-led",
      variables: { cms_flag: "true", cms_route: SAVINGS_OFFER_ROUTE },
    })),
    rules: [
      {
        key: "savings_offer_experiment",
        name: "Savings offer: control vs rate-led vs bonus-led",
        type: "a/b",
        audiences: [],
        variations: { control: 3334, rate_led: 3333, bonus_led: 3333 },
        metrics: ["cta_click", "form_submit"],
      },
    ],
  },
  {
    // The persona variations of the homepage. Each variation key must match a CMS
    // variation name on the homepage exactly.
    key: "homepage",
    name: "Homepage Personalization",
    description: "Personalizes the homepage for each persona via targeted deliveries.",
    variables: [
      { key: "cms_flag", type: "boolean", default_value: "true" },
      { key: "cms_route", type: "string", default_value: "/, /en" },
    ],
    variations: HOMEPAGE_PERSONAS.map((p) => ({ key: p, name: p.charAt(0).toUpperCase() + p.slice(1) })),
    rules: HOMEPAGE_PERSONAS.map((p) => ({
      key: p,
      name: `${p.charAt(0).toUpperCase() + p.slice(1)} homepage`,
      type: "targeted_delivery" as const,
      audiences: [p, "site"] as AudienceRef[],
      variations: { [p]: 10000 },
    })),
  },
];
