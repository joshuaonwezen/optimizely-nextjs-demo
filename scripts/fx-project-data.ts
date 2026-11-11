import { FLAG_KEY as SAVINGS_OFFER_FLAG, VARIATIONS as SAVINGS_OFFER_VARIATIONS } from "./variation-container-data";

// Everything the site needs in its Feature Experimentation project, built by
// scripts/seed-fx-project.ts. Event keys must match what the site fires (the
// data-track-event attributes and trackEvent() calls); flag, variable and variation
// keys must match what the components decide on.
//
// Names are written for the FX dashboard: a flag is "<where>: <what>", and a rule's
// name and key start with its type (A/B test, A/B/C test, MAB, Targeted delivery,
// Rollout), so the experiment list explains itself.

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
  { key: "rates_bar_click", name: "Rates Bar Click", category: "convert", description: "Click on the rates bar's open-a-savings-account link. Tags: product, apy." },
  { key: "offer_bar_click", name: "Offer Bar Click", category: "convert", description: "Click on the sticky offer bar's button. Tags: offer, label." },
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

// Exactly the attributes buildFxAttributes() sends. top_category, odp_segment and
// fx_variation go to Web Experimentation only (WxProfileBridge), so they are not here.
export const FX_ATTRIBUTES = [
  { key: "hostname", name: "Hostname", description: "The site's hostname, without port. The Main demo site audience keys on it." },
  { key: "device", name: "Device", description: "mobile or desktop, from the User-Agent." },
  { key: "logged_in", name: "Logged in", description: "true when the visitor has a demo bucketing ID (signed in via the demo Settings panel)." },
  { key: "persona", name: "Persona", description: "personal, business, mortgages or investments: the site section the visitor is browsing (the demo_persona cookie)." },
  { key: "page_views", name: "Page views", description: "Set to 5 by the Frequent Customer switch in the demo Settings panel; unset otherwise." },
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
    name: "Main demo site",
    description: "opti.joshuaonwezen.dev or localhost. Gates every rule, so the other CMS instances' sites, which share this project, stay out.",
    conditions: anyOf(attr("hostname", "substring", "opti.joshuaonwezen.dev"), attr("hostname", "substring", "localhost")),
  },
  personal: { name: "Personal visitors", description: "persona = personal", conditions: anyOf(attr("persona", "exact", "personal")) },
  business: { name: "Business visitors", description: "persona = business", conditions: anyOf(attr("persona", "exact", "business")) },
  mortgages: { name: "Mortgage visitors", description: "persona = mortgages", conditions: anyOf(attr("persona", "exact", "mortgages")) },
  investments: { name: "Investment visitors", description: "persona = investments", conditions: anyOf(attr("persona", "exact", "investments")) },
  loggedIn: { name: "Logged-in visitors", description: "logged_in = true (Auth State in the demo Settings panel)", conditions: anyOf(attr("logged_in", "exact", true)) },
  mobile: { name: "Mobile visitors", description: "device = mobile", conditions: anyOf(attr("device", "exact", "mobile")) },
  desktop: { name: "Desktop visitors", description: "device = desktop", conditions: anyOf(attr("device", "exact", "desktop")) },
  frequent: { name: "Frequent customers", description: "page_views >= 5 (the Frequent Customer switch in the demo Settings panel).", conditions: anyOf(attr("page_views", "ge", 5)) },
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
  /** Values that differ from the defaults. */
  variables?: Record<string, string>;
}

export interface FxRule {
  key: string;
  name: string;
  type: "a/b" | "multi_armed_bandit" | "targeted_delivery" | "feature_rollout";
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
}

const SAVINGS_OFFER_ROUTE = "/savings-offer";
const HOMEPAGE_PERSONAS = ["business", "personal", "mortgages", "investments"] as const;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** An even traffic split in basis points; the first variation absorbs the rounding. */
function evenSplit(keys: string[]): Record<string, number> {
  const share = Math.floor(10000 / keys.length);
  return Object.fromEntries(keys.map((k, i) => [k, i === 0 ? 10000 - share * (keys.length - 1) : share]));
}

/** An even A/B(/C...) test on the main demo site - the shape of most experiments here. */
function experiment(key: string, name: string, variations: string[], metrics: EventKey[], audiences: AudienceRef[] = ["site"]): FxRule {
  return { key, name, type: "a/b", audiences, variations: evenSplit(variations), metrics };
}

export const FX_FLAGS: FxFlag[] = [
  {
    // An empty headline falls back to the CMS copy, so control is the page as authored.
    key: "hero_copy",
    name: "Hero: headline copy",
    description: "The hero headline and subheadline. Control shows the CMS copy; the variations replace it.",
    variables: [
      { key: "headline", type: "string", default_value: "" },
      { key: "subheadline", type: "string", default_value: "" },
    ],
    variations: [
      { key: "control", name: "Control: CMS headline" },
      { key: "benefit_led", name: "Benefit-led headline", variables: { headline: "Earn more. Pay less. Bank smarter.", subheadline: "High-yield savings, zero-fee checking, and mortgage rates that beat the market. Switch in minutes." } },
      { key: "rate_led", name: "Rate-led headline", variables: { headline: "4.75% APY. No fees. No catch.", subheadline: "Our best savings rate, fee-free checking and mortgages from 3.9% - open an account in five minutes." } },
    ],
    rules: [experiment("hero_copy_abc_test", "A/B/C test: hero headline (CMS vs benefit-led vs rate-led)", ["control", "benefit_led", "rate_led"], ["hero_cta_click", "scroll_depth"])],
  },
  {
    key: "hero_layout",
    name: "Hero: layout",
    description: "Split text-and-image hero vs a centered full-bleed hero with the text over the image.",
    variables: [{ key: "layout", type: "string", default_value: "split" }],
    variations: [
      { key: "split", name: "Control: split layout" },
      { key: "centered", name: "Centered full-bleed", variables: { layout: "centered" } },
    ],
    rules: [experiment("hero_layout_ab_test", "A/B test: hero layout (split vs centered)", ["split", "centered"], ["hero_cta_click", "scroll_depth", "time_on_page"])],
  },
  {
    key: "hero_dual_cta",
    name: "Hero: secondary button",
    description: "Adds a secondary ghost button next to the hero's primary button.",
    variables: [
      { key: "secondaryLabel", type: "string", default_value: "" },
      { key: "secondaryUrl", type: "string", default_value: "" },
    ],
    variations: [
      { key: "control", name: "Control: one button" },
      { key: "treatment", name: "Two buttons", variables: { secondaryLabel: "See how it works", secondaryUrl: "/demo" } },
    ],
    rules: [experiment("hero_dual_cta_ab_test", "A/B test: hero buttons (one vs two)", ["control", "treatment"], ["hero_cta_click", "scroll_depth"])],
  },
  {
    key: "hero_social_proof",
    name: "Hero: social proof strip",
    description: "Adds a trust strip under the hero button: Trusted by 2M+ customers - 4.9 star rated.",
    variables: [],
    variations: [
      { key: "control", name: "Control: no strip" },
      { key: "treatment", name: "With social proof strip" },
    ],
    rules: [experiment("hero_social_proof_ab_test", "A/B test: hero social proof (without vs with)", ["control", "treatment"], ["hero_cta_click", "scroll_depth"])],
  },
  {
    key: "banner",
    name: "Site banner",
    description: "The site-wide promotional banner, chosen per visitor by the rollout and targeted deliveries below.",
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
      { key: "banner1", name: "Savings banner", variables: { title: "Earn 4.50% APY with a Mosey high-yield savings account", description: "No fees, no minimum balance, and your money stays FDIC-insured.", image: "https://picsum.photos/800", imageText: "main image description", linkText: "Open an account" } },
      { key: "banner2", name: "Balance transfer banner", variables: { title: "0% intro APR for 18 months on balance transfers", description: "Move your balances to a Mosey credit card and pay less interest.", image: "https://picsum.photos/800", imageText: "image description", linkText: "Check your rate", cache: "false" } },
      { key: "banner3", name: "Premier banner", variables: { title: "Introducing Mosey Premier - banking with a dedicated advisor", description: "Priority support, wealth planning, and exclusive rates for Premier members.", image: "https://picsum.photos/800", imageText: "Image text", linkText: "Explore Premier" } },
      { key: "banner4", name: "Mobile app banner", variables: { title: "Bank on the go with the new Mosey mobile app", description: "Deposit checks, send money, and track spending from anywhere.", linkText: "Get the app" } },
    ],
    rules: [
      { key: "banner_frequent_customers_rollout", name: "Rollout: Premier banner for frequent customers", type: "feature_rollout", audiences: ["site", "frequent"], variations: { banner3: 10000 }, metrics: ["banner_click"] },
      { key: "banner_logged_in_delivery", name: "Targeted delivery: app banner for logged-in visitors", type: "targeted_delivery", audiences: ["site", "loggedIn"], variations: { banner4: 10000 } },
      { key: "banner_mobile_delivery", name: "Targeted delivery: savings banner on mobile", type: "targeted_delivery", audiences: ["site", "mobile"], variations: { banner1: 10000 } },
      { key: "banner_desktop_delivery", name: "Targeted delivery: balance transfer banner on desktop", type: "targeted_delivery", audiences: ["site", "desktop"], variations: { banner2: 10000 } },
    ],
  },
  {
    key: "rates_bar",
    name: "Rates bar",
    description: "A full-width bar above the product cards with today's savings rate.",
    variables: [
      { key: "apy", type: "string", default_value: "4.75%" },
      { key: "product", type: "string", default_value: "savings" },
    ],
    variations: [
      { key: "control", name: "Control: no rates bar", variables: { apy: "", product: "" } },
      { key: "treatment", name: "Rates bar shown" },
    ],
    rules: [experiment("rates_bar_ab_test", "A/B test: rates bar (hidden vs shown)", ["control", "treatment"], ["rates_bar_click", "product_card_click"])],
  },
  {
    key: "footer_cta",
    name: "Footer: call-to-action strip",
    description: "The strip at the top of the footer: an app download prompt or an open-an-account prompt.",
    variables: [{ key: "style", type: "string", default_value: "app_download" }],
    variations: [
      { key: "app_download", name: "Control: app download" },
      { key: "open_account", name: "Open an account", variables: { style: "open_account" } },
    ],
    rules: [experiment("footer_cta_ab_test", "A/B test: footer strip (app download vs open account)", ["app_download", "open_account"], ["cta_click", "outbound_click"])],
  },
  {
    key: "trust_section_style",
    name: "Trust section: style",
    description: "The homepage trust section as an animated stats counter or as customer quote cards.",
    variables: [{ key: "style", type: "string", default_value: "stats" }],
    variations: [
      { key: "stats", name: "Control: stats counter" },
      { key: "testimonials", name: "Customer testimonials", variables: { style: "testimonials" } },
    ],
    rules: [experiment("trust_section_ab_test", "A/B test: trust section (stats vs testimonials)", ["stats", "testimonials"], ["cta_click", "scroll_depth", "faq_expand"])],
  },
  {
    key: "sticky_offer_bar",
    name: "Sticky offer bar",
    description: "A dismissible limited-time offer fixed to the bottom of the screen.",
    variables: [
      { key: "message", type: "string", default_value: "" },
      { key: "linkText", type: "string", default_value: "" },
      { key: "linkUrl", type: "string", default_value: "" },
      { key: "expiryLabel", type: "string", default_value: "" },
    ],
    variations: [
      { key: "control", name: "Control: no offer bar" },
      { key: "balance_transfer", name: "Balance transfer offer", variables: { message: "Limited offer: 0% APR for 12 months on balance transfers.", linkText: "Learn more", linkUrl: "/personal/credit-cards", expiryLabel: "Ends Friday" } },
      { key: "savings_rate", name: "Savings rate offer", variables: { message: "New customers earn 5.10% AER on our Easy Saver for 12 months.", linkText: "Open an Easy Saver", linkUrl: "/personal/savings", expiryLabel: "This week only" } },
    ],
    rules: [experiment("sticky_offer_abc_test", "A/B/C test: sticky offer (none vs balance transfer vs savings rate)", ["control", "balance_transfer", "savings_rate"], ["offer_bar_click", "cta_click"])],
  },
  {
    // Only mobile visitors ever see the tab bar, so only they are in the test.
    key: "mobile_nav",
    name: "Mobile nav: bottom tab bar",
    description: "Replaces the mobile hamburger menu with a persistent bottom tab bar.",
    variables: [],
    variations: [
      { key: "hamburger", name: "Control: hamburger menu" },
      { key: "bottom_tabs", name: "Bottom tab bar" },
    ],
    rules: [experiment("mobile_nav_ab_test", "A/B test: mobile nav (hamburger vs bottom tabs)", ["hamburger", "bottom_tabs"], ["nav_click", "cta_click"], ["site", "mobile"])],
  },
  {
    key: "nav_search_style",
    name: "Nav: search field style",
    description: "The header search as an icon button or as an expanded search field.",
    variables: [{ key: "style", type: "string", default_value: "icon" }],
    variations: [
      { key: "icon", name: "Control: search icon" },
      { key: "expanded", name: "Expanded search field", variables: { style: "expanded" } },
    ],
    rules: [experiment("nav_search_ab_test", "A/B test: nav search (icon vs expanded field)", ["icon", "expanded"], ["nav_click", "cta_click"])],
  },
  {
    // A multi-armed bandit: FX shifts traffic toward the color that converts best, so it
    // optimizes rather than reports a winner. ProductHeroCtaClient maps button_color /
    // button_style through COLOR_CLASSES and STYLE_MODIFIERS; empty values keep the
    // default button.
    key: "add_to_cart",
    name: "Product hero: button color",
    description: "The color of the product hero's call-to-action button.",
    variables: [
      { key: "button_color", type: "string", default_value: "" },
      { key: "button_style", type: "string", default_value: "" },
    ],
    variations: [
      { key: "control", name: "Default button" },
      { key: "solid_blue", name: "Solid blue", variables: { button_color: "blue", button_style: "filled" } },
      { key: "solid_green", name: "Solid green", variables: { button_color: "green", button_style: "filled" } },
      { key: "amber_outline", name: "Amber outline", variables: { button_color: "amber", button_style: "outline" } },
    ],
    rules: [
      {
        key: "product_hero_button_mab",
        name: "MAB: product hero button color",
        type: "multi_armed_bandit",
        audiences: ["site"],
        variations: evenSplit(["control", "solid_blue", "solid_green", "amber_outline"]),
        metrics: ["product_hero_cta_click"],
      },
    ],
  },
  {
    // Drives the VariationContainerBlock seeded by scripts/seed-variation-container.ts.
    // cms_flag + cms_route make middleware decide the flag on /savings-offer, so the
    // block picks its variation server-side there.
    key: SAVINGS_OFFER_FLAG,
    name: "Savings offer page: promotion",
    description: "The savings promotion on /savings-offer, built as a Variation Container block in the CMS.",
    variables: [
      { key: "cms_flag", type: "boolean", default_value: "false" },
      { key: "cms_route", type: "string", default_value: "" },
    ],
    variations: SAVINGS_OFFER_VARIATIONS.map((v) => ({
      key: v.key,
      name: v.key === "control" ? "Control: standard offer" : v.key === "rate_led" ? "Rate-led offer" : "Bonus-led offer",
      variables: { cms_flag: "true", cms_route: SAVINGS_OFFER_ROUTE },
    })),
    rules: [
      {
        key: "savings_offer_abc_test",
        name: "A/B/C test: savings offer (standard vs rate-led vs bonus-led)",
        type: "a/b",
        audiences: [],
        variations: evenSplit(SAVINGS_OFFER_VARIATIONS.map((v) => v.key)),
        metrics: ["cta_click", "form_submit"],
      },
    ],
  },
  {
    // The persona variations of the homepage. Each variation key must match a CMS
    // variation name on the homepage exactly.
    key: "homepage",
    name: "Homepage: persona personalization",
    description: "Serves the homepage CMS variation for the visitor's persona, through one targeted delivery per persona.",
    variables: [
      { key: "cms_flag", type: "boolean", default_value: "true" },
      { key: "cms_route", type: "string", default_value: "/, /en" },
    ],
    variations: HOMEPAGE_PERSONAS.map((p) => ({ key: p, name: `${capitalize(p)} homepage` })),
    rules: HOMEPAGE_PERSONAS.map((p) => ({
      key: `homepage_${p}_delivery`,
      name: `Targeted delivery: ${p} homepage`,
      type: "targeted_delivery" as const,
      audiences: [p, "site"] as AudienceRef[],
      variations: { [p]: 10000 },
    })),
  },
];
