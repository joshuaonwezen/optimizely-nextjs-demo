/**
 * Content Seeding Script for Optimizely SaaS CMS
 *
 * Creates DynamicExperience pages with inline composition trees.
 * All product/sub-pages use nested containers to produce clean URLs:
 *
 *   /en/personal/current-account/
 *   /en/personal/current-account/instant-payments/
 *   /en/business/business-banking/
 *   /en/mortgage/first-time-buyers/
 *
 * Requires: CMS content type settings must allow DynamicExperience children
 * under DynamicExperience (Visual Builder → content type → allowed child types).
 *
 * Run: npx tsx scripts/seed-content.ts
 */

import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";
import {
  CONTENT_ENDPOINT,
  createContent,
  discoverGlobalRoot,
  discoverTopLevelRoot,
  ensureExperienceStartPage,
  wrapProps,
  uid,
  noHyphens,
  sectionComponent,
  gridSection,
  elementComponent,
  rootComponent,
  type CompNode,
} from "./_shared";
import { FAQ_ITEMS, INVESTMENT_FAQ_ITEMS, HELP_FAQ_ITEMS } from "./faq-data";

config({ path: ".env.local" });

let CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";
// Global content root - where standalone/shared blocks live so they appear in
// the CMS "Shared Blocks → For All Applications" picker. Set in main().
let BLOCKS_CONTAINER = "";

// Standalone block types created across the seed scripts. cleanSharedBlocks()
// only ever deletes these types under the global root, so pages (DynamicExperience,
// TraditionalPage), folders, native forms, and any other content are never touched.
const MANAGED_BLOCK_TYPES = new Set([
  "FaqItemBlock", "FaqContainerBlock", "NavigationItem", "Navigation",
  "AuthorBlock", "OutcomeItemBlock", "TestimonialBlock",
  "TimelineMilestoneBlock", "TeamMemberBlock", "ContactFormBlock",
]);

// Reusable shared blocks bound onto every converted TraditionalPage: a CalloutBlock
// used as the featuredBlock highlight, and a CallToAction seeded as an example block
// in the free content area (mainContent). Stable keys + non-managed types (CalloutBlock
// and CallToAction are absent from MANAGED_BLOCK_TYPES) mean cleanSharedBlocks never
// deletes them, so re-seeds simply 409-skip the re-create - no delete/recreate race.
const SHARED_CALLOUT_KEY = "fbca0000000000000000000000000001";
const SHARED_CTA_KEY = "fbca0000000000000000000000000002";

// The Management API rate-limits bursts (429) - retry with backoff so a burst
// of page creates doesn't abort the whole seed.
async function fetchRetry(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= 4) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    await new Promise((r) => setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1)));
  }
}

/**
 * Ensure the latest version of a content item is published. createContent
 * publishes on creation, but that step can be silently skipped when the
 * post-POST version lookup lags (v1 sometimes returns 201 with an empty body).
 * A content reference to a still-draft item fails to resolve, so items that
 * other content references (e.g. shared FAQ items) must be reliably published.
 */
async function ensurePublished(key: string): Promise<void> {
  const token = await getManagementToken();
  // Publishing a version can 404 if the create hasn't committed yet, so retry
  // and verify the item actually reaches "published" before giving up.
  for (let attempt = 0; attempt < 6; attempt++) {
    const vRes = await fetchRetry(`${CONTENT_ENDPOINT}/${key}/versions?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (vRes.ok) {
      const vData = await vRes.json() as { items?: Array<{ version?: string; status?: string }> };
      const v = vData.items?.[0];
      if (v?.status === "published") return;
      if (v?.version) {
        const pubRes = await fetchRetry(`${CONTENT_ENDPOINT}/${key}/versions/${v.version}:publish`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pubRes.ok) return;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.warn(`  [warn] Could not publish ${key} after retries - homepage FAQ reference may not resolve.`);
}

// Composition node builders (uid, noHyphens, sectionComponent, gridSection,
// elementComponent, rootComponent, CompNode) come from ./_shared.

// Page compositions

/** A content-area reference to a shared block, as used in FaqContainerBlock.faqItems. */
function faqRefs(items: Array<{ key: string }>): Array<{ reference: string }> {
  return items.map((i) => ({ reference: `cms://content/${i.key}` }));
}

function buildPersonalPage(): CompNode[] {
  return [
    rootComponent("HeroBlock", "Personal Hero", {
      headline: "Personal banking that fits your life",
      subheadline:
        "Fee-free current accounts, market-leading savings, and mortgages that move at your pace - all from one app.",
      ctaText: "Open an account",
      ctaLink: "/en/personal/current-account",
    }),
    sectionComponent("SectionHeadingBlock", "Personal Products Heading", {
      heading: "Everyday banking, sorted",
      subheading:
        "Pick the account that suits you today and add more as your needs grow.",
    }),
    gridSection("Personal Product Cards", [
      elementComponent("ProductCardBlock", "Current Account Card", {
        icon: "account",
        title: "Current Account",
        description:
          "A fee-free everyday account with instant notifications, budgeting tools, and no hidden charges.",
        linkUrl: "/en/personal/current-account",
        linkText: "Open an account →",
      }),
      elementComponent("ProductCardBlock", "Savings Card", {
        icon: "savings",
        title: "Savings",
        description:
          "Easy-access and fixed-rate accounts with rates up to 5.1% AER. FSCS protected up to £85,000.",
        linkUrl: "/en/personal/savings",
        linkText: "View savings rates →",
      }),
      elementComponent("ProductCardBlock", "Mortgage Card", {
        icon: "mortgage",
        title: "Mortgage",
        description:
          "A decision in principle in 10 minutes and a dedicated advisor from first click to key handover.",
        linkUrl: "/en/mortgage",
        linkText: "Get a mortgage →",
      }),
      elementComponent("ProductCardBlock", "Compare Accounts Card", {
        icon: "account",
        title: "Compare accounts",
        description:
          "Not sure which account is right for you? See every feature side by side and choose with confidence.",
        linkUrl: "/en/personal/compare-accounts",
        linkText: "Compare accounts →",
      }),
    ]),
    gridSection("Personal Stats", [
      elementComponent("StatsCounterBlock", "Personal Customers Stat", { value: "2", suffix: "M+", label: "Personal customers" }),
      elementComponent("StatsCounterBlock", "Personal Rating Stat", { value: "4.8", suffix: "★", label: "App Store rating" }),
      elementComponent("StatsCounterBlock", "Personal Switch Stat", { value: "7", suffix: " days", label: "To switch banks" }),
      elementComponent("StatsCounterBlock", "Personal Branches Stat", { value: "140", suffix: "+", label: "UK branches" }),
    ]),
    sectionComponent("TestimonialBlock", "Personal Testimonial", {
      quote:
        "I moved everything to Mosey - current account, savings, and my mortgage. Having it all in one app that actually works has made managing money genuinely easy.",
      authorName: "Ellie Robinson",
      authorRole: "Personal customer, Manchester",
    }),
    sectionComponent("CallToAction", "Personal CTA", {
      label: "Open a current account today",
      link: "/en/personal/current-account",
    }),
  ];
}

function buildBusinessPage(): CompNode[] {
  return [
    rootComponent("HeroBlock", "Business Hero", {
      headline: "Business banking built for how you work",
      subheadline:
        "Current accounts, lending, and payment tools for UK businesses of every size. Free for your first 12 months.",
      ctaText: "Open a business account",
      ctaLink: "/en/business/business-banking",
    }),
    sectionComponent("SectionHeadingBlock", "Business Products Heading", {
      heading: "Everything your business needs",
      subheading: "Modern, mobile-first banking that connects to the tools you already use.",
    }),
    gridSection("Business Product Cards", [
      elementComponent("ProductCardBlock", "Business Banking Card", {
        icon: "business",
        title: "Business Banking",
        description:
          "Fee-free for 12 months, with accounting integrations, instant invoicing, and real-time notifications.",
        linkUrl: "/en/business/business-banking",
        linkText: "Explore business banking →",
      }),
      elementComponent("ProductCardBlock", "Business Lending Card", {
        icon: "business",
        title: "Business Lending",
        description:
          "Flexible loans from £10,000 to £500,000 and overdraft facilities. Decisions in 48 hours.",
        linkUrl: "/en/business/business-banking/business-lending",
        linkText: "See lending options →",
      }),
      elementComponent("ProductCardBlock", "Business Current Account Card", {
        icon: "account",
        title: "Business Current Account",
        description:
          "A full-featured account with multi-user access, audit trails, and one-click accounting sync.",
        linkUrl: "/en/business/business-banking/business-current-account",
        linkText: "Open an account →",
      }),
      elementComponent("ProductCardBlock", "Business Pricing Card", {
        icon: "savings",
        title: "Pricing",
        description:
          "Simple, transparent pricing with no surprises. See exactly what you pay as your business grows.",
        linkUrl: "/en/business/pricing",
        linkText: "View pricing →",
      }),
    ]),
    gridSection("Business Stats", [
      elementComponent("StatsCounterBlock", "Business Count Stat", { value: "180", suffix: "K+", label: "UK businesses" }),
      elementComponent("StatsCounterBlock", "Business Onboarding Stat", { value: "15", suffix: " min", label: "To open an account" }),
      elementComponent("StatsCounterBlock", "Business Decision Stat", { value: "48", suffix: " hrs", label: "Lending decisions" }),
      elementComponent("StatsCounterBlock", "Business Free Stat", { value: "12", suffix: " mo", label: "Free banking" }),
    ]),
    sectionComponent("TestimonialBlock", "Business Landing Testimonial", {
      quote:
        "Opened a business account in under 15 minutes and connected it to Xero the same afternoon. Invoices now reconcile themselves - it saves me a full day a month.",
      authorName: "Tom Hartley",
      authorRole: "Director, Hartley & Co.",
    }),
    sectionComponent("CallToAction", "Business CTA", {
      label: "Open a business account",
      link: "/en/business/business-banking",
    }),
  ];
}

function buildInvestmentsPage(): CompNode[] {
  return [
    rootComponent("HeroBlock", "Investments Hero", {
      headline: "Invest for the long term, the simple way",
      subheadline:
        "Stocks & Shares ISAs, pensions, and long-term savings products. Start investing from £25 a month.",
      ctaText: "Start investing",
      ctaLink: "/en/investments",
    }),
    sectionComponent("SectionHeadingBlock", "Investments Products Heading", {
      heading: "Ways to invest",
      subheading: "Tax-efficient accounts to help your money grow over time.",
    }),
    gridSection("Investment Product Cards", [
      elementComponent("ProductCardBlock", "ISA Card", {
        icon: "savings",
        title: "Stocks & Shares ISA",
        description:
          "Invest up to £20,000 a year with all growth free of UK income and capital gains tax.",
        linkUrl: "/en/investments",
        linkText: "Open an ISA →",
      }),
      elementComponent("ProductCardBlock", "Pension Card", {
        icon: "savings",
        title: "Personal Pension",
        description:
          "Save for retirement with tax relief on your contributions and a choice of ready-made portfolios.",
        linkUrl: "/en/investments",
        linkText: "Plan your pension →",
      }),
      elementComponent("ProductCardBlock", "GIA Card", {
        icon: "account",
        title: "General Investment Account",
        description:
          "No annual limit. Ideal once you have used your ISA allowance and want to keep investing.",
        linkUrl: "/en/investments",
        linkText: "Learn more →",
      }),
      elementComponent("ProductCardBlock", "Junior ISA Card", {
        icon: "savings",
        title: "Junior ISA",
        description:
          "Give a child a head start. Invest up to £9,000 a year, tax-free, until they turn 18.",
        linkUrl: "/en/investments",
        linkText: "Open a Junior ISA →",
      }),
    ]),
    sectionComponent("SectionHeadingBlock", "Investments Plans Heading", {
      heading: "Choose your plan",
      subheading: "Flat, transparent fees. No dealing charges, no exit fees.",
    }),
    gridSection("Investment Plans", [
      elementComponent("PricingTierBlock", "Starter Plan", {
        name: "Starter",
        price: "£0",
        period: "/month",
        highlighted: false,
        features: [
          "Start from £25 a month",
          "Ready-made portfolios",
          "0.25% annual platform fee",
          "In-app guidance",
        ],
        ctaText: "Get started",
        ctaLink: "/en/investments",
      }),
      elementComponent("PricingTierBlock", "Standard Plan", {
        name: "Standard",
        price: "£4",
        period: "/month",
        highlighted: true,
        features: [
          "Everything in Starter",
          "Full fund and share choice",
          "Automatic tax-year reminders",
          "Priority in-app support",
        ],
        ctaText: "Choose Standard",
        ctaLink: "/en/investments",
      }),
      elementComponent("PricingTierBlock", "Premium Plan", {
        name: "Premium",
        price: "£10",
        period: "/month",
        highlighted: false,
        features: [
          "Everything in Standard",
          "Dedicated investment coach",
          "Retirement planning tools",
          "Platform fee capped at £250/yr",
        ],
        ctaText: "Choose Premium",
        ctaLink: "/en/investments",
      }),
    ]),
    gridSection("Investment Stats", [
      elementComponent("StatsCounterBlock", "Investors Stat", { value: "350", suffix: "K+", label: "Mosey investors" }),
      elementComponent("StatsCounterBlock", "Min Invest Stat", { value: "25", suffix: "/mo", label: "Minimum to start" }),
      elementComponent("StatsCounterBlock", "ISA Allowance Stat", { value: "20", suffix: "K", label: "Annual ISA allowance" }),
      elementComponent("StatsCounterBlock", "Fee Cap Stat", { value: "0.25", suffix: "%", label: "Annual platform fee" }),
    ]),
    sectionComponent("CalloutBlock", "Investments Risk Warning", {
      variant: "warning",
      label: "Capital at risk",
      body: {
        html: "<p>The value of investments can go down as well as up and you may get back less than you invest. Tax treatment depends on your individual circumstances and may change in the future. Investing is intended for the long term.</p>",
      },
    }),
    rootComponent("FaqContainerBlock", "Investments FAQs", {
      heading: "Investing questions, answered",
      subheading: "The things new investors ask us most.",
      faqItems: faqRefs(INVESTMENT_FAQ_ITEMS),
    }),
    sectionComponent("CallToAction", "Investments CTA", {
      label: "Start investing from £25 a month",
      link: "/en/investments",
    }),
  ];
}

function buildHelpPage(): CompNode[] {
  return [
    rootComponent("HeroBlock", "Help Hero", {
      headline: "Help and support, whenever you need it",
      subheadline:
        "Speak to a real person seven days a week via in-app chat or phone, or find answers in seconds below.",
      ctaText: "Contact us",
      ctaLink: "/en/help/contact",
    }),
    sectionComponent("SectionHeadingBlock", "Help Channels Heading", {
      heading: "How can we help?",
      subheading: "Choose the option that suits you.",
    }),
    gridSection("Help Channel Cards", [
      elementComponent("ProductCardBlock", "Contact Card", {
        icon: "account",
        title: "Contact us",
        description:
          "Send us a message and we will get back to you within one business day, or start an in-app chat right now.",
        linkUrl: "/en/help/contact",
        linkText: "Get in touch →",
      }),
      elementComponent("ProductCardBlock", "Branch Finder Card", {
        icon: "business",
        title: "Branch finder",
        description:
          "Find your nearest branch, check opening hours, and book an appointment to speak to us in person.",
        linkUrl: "/locations",
        linkText: "Find a branch →",
      }),
      elementComponent("ProductCardBlock", "FAQs Card", {
        icon: "savings",
        title: "FAQs",
        description:
          "Browse answers to the questions we hear most about accounts, payments, security, and switching.",
        linkUrl: "/en/help",
        linkText: "Read FAQs →",
      }),
      elementComponent("ProductCardBlock", "App Support Card", {
        icon: "mortgage",
        title: "App support",
        description:
          "Trouble signing in or setting up your device? Step-by-step help to get the Mosey app working for you.",
        linkUrl: "/en/personal/mobile-app",
        linkText: "Get app help →",
      }),
    ]),
    rootComponent("FaqContainerBlock", "Help FAQs", {
      heading: "Frequently asked questions",
      subheading: "Quick answers to the things we hear most.",
      faqItems: faqRefs([...FAQ_ITEMS, ...HELP_FAQ_ITEMS]),
    }),
    sectionComponent("CallToAction", "Help CTA", {
      label: "Still need help? Contact us",
      link: "/en/help/contact",
    }),
  ];
}

function buildAboutPage(): CompNode[] {
  return [
    rootComponent("HeroBlock", "About Hero", {
      headline: "Banking built around people, not branches",
      subheadline:
        "We started Mosey to make banking feel simple, fair, and genuinely helpful. Two million customers later, that mission has not changed.",
      ctaText: "Read our story",
      ctaLink: "/en/about/our-story",
    }),
    sectionComponent("SectionHeadingBlock", "About Intro Heading", {
      heading: "Our story",
      subheading: "From a single idea to a bank two million people trust.",
    }),
    sectionComponent("TextBlock", "About Intro Body", {
      body: {
        html: "<p>Mosey Bank was founded in 2015 by a small team who believed banking should work the way the rest of your life does - on your phone, on your schedule, and without the jargon. We built our own technology from the ground up so that opening an account, moving money, and getting help all take minutes, not days. Today we are a fully licensed UK bank serving personal and business customers across the country, and we are still guided by the same simple idea: banking should be built around you.</p>",
      },
    }),
    gridSection("About Stats", [
      elementComponent("StatsCounterBlock", "About Founded Stat", { value: "2015", suffix: "", label: "Year founded" }),
      elementComponent("StatsCounterBlock", "About Customers Stat", { value: "2", suffix: "M+", label: "Customers" }),
      elementComponent("StatsCounterBlock", "About Branches Stat", { value: "140", suffix: "+", label: "UK branches" }),
      elementComponent("StatsCounterBlock", "About Employees Stat", { value: "1.8", suffix: "K", label: "Employees" }),
    ]),
    sectionComponent("SectionHeadingBlock", "About Explore Heading", {
      heading: "Get to know us",
      subheading: "Explore the people, values, and opportunities behind Mosey.",
    }),
    gridSection("About Explore Cards", [
      elementComponent("ProductCardBlock", "Our Story Card", {
        icon: "business",
        title: "Our story",
        description:
          "The milestones that took us from a founding idea in 2015 to a bank trusted by millions.",
        linkUrl: "/en/about/our-story",
        linkText: "Read our story →",
      }),
      elementComponent("ProductCardBlock", "Our Team Card", {
        icon: "account",
        title: "Our team",
        description:
          "Meet the leadership team building a bank around the people it serves.",
        linkUrl: "/en/about/team",
        linkText: "Meet the team →",
      }),
      elementComponent("ProductCardBlock", "Careers Card", {
        icon: "mortgage",
        title: "Careers",
        description:
          "We are always looking for people who want to change banking for the better. See open roles.",
        linkUrl: "/en/about",
        linkText: "View careers →",
      }),
      elementComponent("ProductCardBlock", "Press Card", {
        icon: "savings",
        title: "Press",
        description:
          "News, announcements, and media resources from the Mosey Bank press office.",
        linkUrl: "/en/about",
        linkText: "Visit press room →",
      }),
    ]),
    sectionComponent("TestimonialBlock", "About Testimonial", {
      quote:
        "Mosey is the first bank that has ever felt like it was actually on my side. Everything just works, and when I have needed help there has always been a real person there.",
      authorName: "Priya Shah",
      authorRole: "Customer since 2017",
    }),
    sectionComponent("CallToAction", "About CTA", {
      label: "Join two million customers",
      link: "/en/personal/current-account",
    }),
  ];
}

function buildHomepage(savingsKey: string | null): CompNode[] {
  return [
    rootComponent("HeroBlock", "Home Hero", {
      headline: "Banking built around you",
      subheadline:
        "Straightforward current accounts, competitive savings rates, and mortgages that move at your pace.",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Our products",
      subheading:
        "Everything you need to manage your money, save for the future, and plan for what's next.",
    }),
    gridSection("Product Cards", [
      elementComponent("ProductCardBlock", "Current Account Card", {
        icon: "account",
        title: "Current Account",
        description:
          "A fee-free everyday account with instant payment notifications and no hidden charges.",
        linkUrl: "/en/personal/current-account",
        linkText: "Open an account →",
      }),
      elementComponent("ProductCardBlock", "Savings Card", {
        icon: "savings",
        title: "Savings",
        description:
          "Easy-access and fixed-rate savings accounts with rates up to 5.1% AER. Your money working harder.",
        linkUrl: "/en/personal/savings",
        linkText: "View savings rates →",
      }),
      elementComponent("ProductCardBlock", "Mortgage Card", {
        icon: "mortgage",
        title: "Mortgage",
        description:
          "Find your rate in minutes. Our advisors guide you from application to completion.",
        linkUrl: "/en/mortgage",
        linkText: "Get a mortgage →",
      }),
      elementComponent("ProductCardBlock", "Business Banking Card", {
        icon: "business",
        title: "Business Banking",
        description:
          "Current accounts, lending, and card payment solutions for UK businesses of every size.",
        linkUrl: "/en/business/business-banking",
        linkText: "Open a business account →",
      }),
    ]),
    sectionComponent("TestimonialBlock", "Homepage Testimonial", {
      quote:
        "Mosey made getting my mortgage so simple. The whole process was online and I had an offer within 48 hours. I couldn't believe how painless it was.",
      authorName: "James Hartley",
      authorRole: "Homeowner, Leeds",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "Trusted by 2 million customers across the UK",
      subheading:
        "From first current accounts to business banking - Mosey customers bank with confidence.",
      logos: [],
    }),
    gridSection("Bank Stats", [
      elementComponent("StatsCounterBlock", "Customers Stat", {
        value: "2",
        suffix: "M+",
        label: "Customers",
      }),
      elementComponent("StatsCounterBlock", "Assets Stat", {
        value: "50",
        suffix: "B+",
        label: "Assets under management",
      }),
      elementComponent("StatsCounterBlock", "Uptime Stat", {
        value: "99.9",
        suffix: "%",
        label: "App uptime",
      }),
      elementComponent("StatsCounterBlock", "Branches Stat", {
        value: "140",
        suffix: "+",
        label: "UK branches",
      }),
    ]),
    ...(savingsKey ? [sectionComponent("FeaturedContentBlock", "Featured Savings", {
      featuredPage: `cms://content/${savingsKey}`,
    })] : []),
    rootComponent("FaqContainerBlock", "Homepage FAQs", {
      heading: "Frequently asked questions",
      subheading: "Quick answers to the things we hear most.",
      faqItems: FAQ_ITEMS.map((i) => ({ reference: `cms://content/${i.key}` })),
    }),
    sectionComponent("CallToAction", "Home CTA", {
      label: "Open an account today",
      link: "/en/personal/current-account",
    }),
  ];
}

interface TraditionalContent {
  heading: string;
  subheading: string;
  body: string; // rich HTML for the richText body property
}

/**
 * Build the content for a deeper "product" page as a TraditionalPage (classic
 * templated page) rather than a Visual Builder composition. The feature grid,
 * body copy, and any extras are folded into a single structured richText body so
 * no content is lost in the conversion from DynamicExperience. `extraHtml` carries
 * page-specific extras (testimonials as blockquotes, stats as a list, risk callouts
 * as a note) that some product pages had as composition blocks.
 */
function buildTraditionalProduct(
  _badge: string,
  title: string,
  description: string,
  _ctaText: string,
  _ctaUrl: string,
  features: Array<{ title: string; description: string }>,
  bodyText: string,
  _ctaLabel: string,
  extraHtml = ""
): TraditionalContent {
  // badge / ctaText / ctaUrl / ctaLabel are no longer rendered as blocks - every
  // converted page gets the shared CallToAction in its content area instead - but
  // they are kept in the signature so the existing per-page call sites need only be
  // renamed, not rewritten.
  //
  // Structure the body as real prose (rendered with `prose` styling): a lead intro
  // paragraph, then a "Key features" section where each feature is its own
  // sub-heading + paragraph (not a single crammed line), then any page-specific
  // extras (stats, testimonials, risk notes).
  const featureSections = features
    .map((f) => `<h3>${f.title}</h3>\n<p>${f.description}</p>`)
    .join("\n");
  const body =
    `<p>${bodyText}</p>\n` +
    `<h2>Key features</h2>\n${featureSections}\n` +
    extraHtml;
  return { heading: title, subheading: description, body };
}

// All pages

interface PageDef {
  key: string;
  displayName: string;
  routeSegment?: string;
  container?: string; // parent page key; defaults to root CONTAINER
  // A page is EITHER a DynamicExperience (composition `nodes`) OR a TraditionalPage
  // (`traditional` content). Landing/overarching pages use nodes; deeper content
  // pages use traditional.
  nodes?: CompNode[];
  traditional?: TraditionalContent;
  properties?: Record<string, unknown>; // page-level properties (e.g. SEO contract fields)
}

// Pre-declare keys so pages can cross-reference each other
const PAGE_KEYS = {
  // Homepage
  homepage:               noHyphens(),
  // Level-1 category pages (DynamicExperience, direct children of CONTAINER)
  personal:               noHyphens(),  // /en/personal/
  business:               noHyphens(),  // /en/business/
  investments:            noHyphens(),  // /en/investments/
  help:                   noHyphens(),  // /en/help/
  about:                  noHyphens(),  // /en/about/
  // Level-1 product pages (DynamicExperience, direct children of CONTAINER)
  mortgage:               noHyphens(),  // /en/mortgage/ - also URL prefix for mortgage sub-pages
  // Level-2 product pages (DynamicExperience, children of category pages)
  currentAccount:         noHyphens(),  // /en/personal/current-account/
  savings:                noHyphens(),  // /en/personal/savings/
  businessBanking:        noHyphens(),  // /en/business/business-banking/
  contact:                noHyphens(),  // /en/help/contact/
  // Level-2 mortgage sub-pages (DynamicExperience, children of mortgage)
  firstTimeBuyers:        noHyphens(),  // /en/mortgage/first-time-buyers/
  remortgaging:           noHyphens(),  // /en/mortgage/remortgaging/
  // Level-3 current account sub-pages
  instantPayments:        noHyphens(),  // /en/personal/current-account/instant-payments/
  mobileApp:              noHyphens(),  // /en/personal/current-account/mobile-app/
  travelMoney:            noHyphens(),  // /en/personal/current-account/travel-money/
  // Level-3 savings sub-pages
  easyAccessSavings:      noHyphens(),  // /en/personal/savings/easy-access-savings/
  fixedRateSavings:       noHyphens(),  // /en/personal/savings/fixed-rate-savings/
  // Level-3 business banking sub-pages
  businessCurrentAccount: noHyphens(),  // /en/business/business-banking/business-current-account/
  businessLending:        noHyphens(),  // /en/business/business-banking/business-lending/
};

// Additional nested TraditionalPages. These fill out the site (and give the nav in
// seed-nav.ts real targets - the 10 nav-referenced pages plus extra depth). They are
// created with random keys and cleaned by deleteExisting()'s cascade on re-seed;
// seed-nav resolves them by URL, so no shared keys are needed. Each gets the same
// rich structure as the converted product pages (rich body + shared featuredBlock +
// shared CTA in the free content area) via buildTraditionalProduct/createTraditionalPage.
interface ExtraPageDef {
  displayName: string;
  routeSegment: string;
  container: string; // a PAGE_KEYS.* landing key
  metaTitle: string;
  metaDescription: string;
  title: string;
  description: string;
  features: Array<{ title: string; description: string }>;
  bodyText: string;
}

const EXTRA_TRADITIONAL_PAGES: ExtraPageDef[] = [
  // ── Personal ────────────────────────────────────────────────────────────
  {
    displayName: "Personal Loans", routeSegment: "loans", container: PAGE_KEYS.personal,
    metaTitle: "Personal Loans | Mosey Bank",
    metaDescription: "Borrow from £1,000 to £25,000 with a fixed rate and no early repayment fees. Get a decision in minutes.",
    title: "Personal Loans",
    description: "Borrow from £1,000 to £25,000 with a fixed rate and no early repayment fees.",
    features: [
      { title: "Fixed monthly repayments", description: "Your rate and repayment are fixed for the life of the loan, so you always know exactly what you will pay." },
      { title: "No early repayment fees", description: "Pay off your loan early whenever you like and we will never charge you a penalty for doing so." },
      { title: "Decision in minutes", description: "Apply online in around five minutes and get an instant decision. Money can reach your account the same day." },
    ],
    bodyText: "Whether you are consolidating existing debt, spreading the cost of a big purchase, or covering an unexpected bill, a Mosey personal loan gives you a clear, fixed plan with no surprises.",
  },
  {
    displayName: "Credit Cards", routeSegment: "credit-cards", container: PAGE_KEYS.personal,
    metaTitle: "Credit Cards | Mosey Bank",
    metaDescription: "A credit card that works for you - no annual fee, real-time notifications, and rewards on everyday spending.",
    title: "Credit Cards",
    description: "A credit card that works for you, with no annual fee and rewards on everyday spending.",
    features: [
      { title: "No annual fee", description: "Keep your card in your pocket for as long as you like without paying a penny in annual charges." },
      { title: "Everyday rewards", description: "Earn cashback on your everyday spending and redeem it straight to your Mosey account." },
      { title: "Full app control", description: "Freeze your card, check your balance, and see every transaction in real time from the Mosey app." },
    ],
    bodyText: "Representative example and rates are shown before you apply. Borrow responsibly - a credit card is best for spreading short-term costs, not long-term borrowing.",
  },
  {
    displayName: "Arranged Overdrafts", routeSegment: "overdrafts", container: PAGE_KEYS.personal,
    metaTitle: "Arranged Overdrafts | Mosey Bank",
    metaDescription: "A flexible arranged overdraft for when you need a little extra. Only pay interest on what you use.",
    title: "Arranged Overdrafts",
    description: "A flexible safety net for when you need a little extra headroom in your account.",
    features: [
      { title: "Only pay for what you use", description: "Interest is charged only on the amount you are overdrawn, calculated daily and charged monthly." },
      { title: "Set your own limit", description: "Apply for the arranged limit that suits you and adjust it in the app as your needs change." },
      { title: "Fee-free buffer", description: "The first £50 of your arranged overdraft is interest-free, giving you a cushion for the odd tight month." },
    ],
    bodyText: "An arranged overdraft is there for short-term cash flow, not long-term borrowing. We will send you a notification before you dip into it so there are never any surprises.",
  },
  // ── Business ────────────────────────────────────────────────────────────
  {
    displayName: "Merchant Services", routeSegment: "merchant-services", container: PAGE_KEYS.business,
    metaTitle: "Merchant Services | Mosey Bank",
    metaDescription: "Accept card payments in-store and online. Competitive rates, next-day settlement, and 24/7 support.",
    title: "Merchant Services",
    description: "Accept card payments in-store and online with competitive rates and next-day settlement.",
    features: [
      { title: "In-store and online", description: "Take payments with a card reader, over the phone, or through your website with one integrated account." },
      { title: "Next-day settlement", description: "Money from your sales lands in your Mosey business account the next working day, keeping cash flow healthy." },
      { title: "24/7 support", description: "Our UK merchant team is on hand around the clock if a terminal goes down or a payment needs chasing." },
    ],
    bodyText: "From a market stall to a multi-site retailer, Mosey merchant services scale with your business, with clear pricing and no long tie-in contracts.",
  },
  {
    displayName: "International Payments", routeSegment: "international-payments", container: PAGE_KEYS.business,
    metaTitle: "International Payments | Mosey Bank",
    metaDescription: "Send and receive money across borders with real exchange rates and low, transparent fees.",
    title: "International Payments",
    description: "Send and receive money across borders with real exchange rates and low, transparent fees.",
    features: [
      { title: "Real exchange rates", description: "We use the mid-market rate with a small, clearly shown fee - no hidden markup buried in the exchange rate." },
      { title: "Payments to 120+ countries", description: "Pay suppliers and staff in over 120 countries and 40 currencies, all from your Mosey business account." },
      { title: "Track every transfer", description: "See exactly where your money is and when it will arrive, with notifications at every step." },
    ],
    bodyText: "Whether you are paying an overseas supplier or invoicing an international client, Mosey makes cross-border payments as simple as a domestic transfer.",
  },
  {
    displayName: "Business Credit Cards", routeSegment: "business-credit-cards", container: PAGE_KEYS.business,
    metaTitle: "Business Credit Cards | Mosey Bank",
    metaDescription: "Give your team spending power with individual cards, live controls, and automatic accounting sync.",
    title: "Business Credit Cards",
    description: "Give your team spending power with individual cards, live controls, and automatic accounting sync.",
    features: [
      { title: "Cards for your whole team", description: "Issue physical and virtual cards to staff in seconds and set individual spending limits for each one." },
      { title: "Live spend controls", description: "Freeze a card, change a limit, or block a category instantly from the app - no calls to the bank." },
      { title: "Automatic reconciliation", description: "Every transaction syncs to Xero, QuickBooks, or FreeAgent with receipts captured in the app." },
    ],
    bodyText: "Stay in control of company spending without slowing your team down. Set the rules once and let Mosey handle the admin.",
  },
  // ── Mortgage ────────────────────────────────────────────────────────────
  {
    displayName: "Buy-to-Let Mortgages", routeSegment: "buy-to-let", container: PAGE_KEYS.mortgage,
    metaTitle: "Buy-to-Let Mortgages | Mosey Bank",
    metaDescription: "Competitive buy-to-let rates for individual landlords and portfolio investors. Free valuation included.",
    title: "Buy-to-Let Mortgages",
    description: "Competitive buy-to-let rates for individual landlords and portfolio investors.",
    features: [
      { title: "For every kind of landlord", description: "From your first rental property to a portfolio of ten, we have buy-to-let products to suit your plans." },
      { title: "Free valuation", description: "We cover the cost of the standard property valuation on every buy-to-let application." },
      { title: "Interest-only options", description: "Choose interest-only or repayment, with 2 and 5 year fixed rates to suit your investment strategy." },
    ],
    bodyText: "Your property may be repossessed if you do not keep up repayments. Buy-to-let mortgages are assessed on expected rental income as well as your circumstances.",
  },
  {
    displayName: "Overpayments & Flexibility", routeSegment: "overpayments", container: PAGE_KEYS.mortgage,
    metaTitle: "Mortgage Overpayments | Mosey Bank",
    metaDescription: "Overpay your Mosey mortgage by up to 10% a year with no penalty and cut years off your term.",
    title: "Overpayments & Flexibility",
    description: "Overpay by up to 10% a year with no penalty and cut years off your mortgage term.",
    features: [
      { title: "10% penalty-free each year", description: "Pay off up to 10% of your outstanding balance every year without any early repayment charge." },
      { title: "One-off or regular", description: "Make a lump-sum overpayment or set up a small monthly boost - both reduce the interest you pay." },
      { title: "See the impact instantly", description: "The app shows how each overpayment shortens your term and cuts your total interest before you confirm." },
    ],
    bodyText: "Overpaying even a little can save thousands over the life of your mortgage. Manage it all yourself in the Mosey app, whenever suits you.",
  },
  // ── Investments ─────────────────────────────────────────────────────────
  {
    displayName: "Stocks & Shares ISA", routeSegment: "stocks-isa", container: PAGE_KEYS.investments,
    metaTitle: "Stocks & Shares ISA | Mosey Bank",
    metaDescription: "Invest up to £20,000 tax-free each year. Choose from thousands of funds, shares, and ETFs.",
    title: "Stocks & Shares ISA",
    description: "Invest up to £20,000 tax-free each year in thousands of funds, shares, and ETFs.",
    features: [
      { title: "£20,000 tax-free allowance", description: "All growth and income inside your ISA is free of UK income tax and capital gains tax." },
      { title: "Ready-made or build your own", description: "Pick a ready-made portfolio matched to your risk appetite, or choose your own funds and shares." },
      { title: "Low, flat platform fee", description: "A single 0.25% annual platform fee, capped at £250 a year, with no dealing charges." },
    ],
    bodyText: "The value of investments can go down as well as up and you may get back less than you invest. A Stocks & Shares ISA is designed for the long term.",
  },
  {
    displayName: "Pensions", routeSegment: "pensions", container: PAGE_KEYS.investments,
    metaTitle: "Personal Pension (SIPP) | Mosey Bank",
    metaDescription: "A self-invested personal pension that puts you in control. Start from as little as £50 a month.",
    title: "Pensions",
    description: "A self-invested personal pension (SIPP) that puts you in control, from £50 a month.",
    features: [
      { title: "Tax relief on contributions", description: "The government tops up your contributions with tax relief, giving your retirement savings an instant boost." },
      { title: "Bring your pensions together", description: "Combine old workplace pensions into one Mosey SIPP so you can see and manage everything in one place." },
      { title: "Invest your way", description: "Choose a ready-made retirement portfolio or pick your own funds, and adjust as your plans change." },
    ],
    bodyText: "A pension is a long-term investment. The value can go down as well as up, and you normally cannot access it until age 55 (57 from 2028). Tax treatment depends on your circumstances.",
  },
  {
    displayName: "Junior ISA", routeSegment: "junior-isa", container: PAGE_KEYS.investments,
    metaTitle: "Junior ISA | Mosey Bank",
    metaDescription: "Give a child a head start with a tax-free Junior ISA. Invest up to £9,000 a year until they turn 18.",
    title: "Junior ISA",
    description: "Give a child a head start with a tax-free Junior ISA, up to £9,000 a year.",
    features: [
      { title: "£9,000 tax-free each year", description: "All growth is free of UK tax, and the whole pot belongs to the child when they turn 18." },
      { title: "Anyone can contribute", description: "Parents, grandparents, and family friends can all pay in, up to the annual allowance." },
      { title: "Ready-made portfolios", description: "Choose a long-term portfolio designed to grow over the years until the child reaches adulthood." },
    ],
    bodyText: "A Junior ISA is a long-term investment for a child's future. The value can go down as well as up. Money is locked away until the child turns 18.",
  },
  {
    displayName: "General Investment Account", routeSegment: "general-investment", container: PAGE_KEYS.investments,
    metaTitle: "General Investment Account | Mosey Bank",
    metaDescription: "Keep investing once you have used your ISA allowance, with no limit on how much you can put in.",
    title: "General Investment Account",
    description: "Keep investing once you have used your ISA allowance, with no annual limit.",
    features: [
      { title: "No investment limit", description: "There is no cap on how much you can invest, making it ideal once your ISA allowance is used up." },
      { title: "Same wide choice", description: "Access the same thousands of funds, shares, and ETFs available in your Mosey ISA." },
      { title: "Move to your ISA each year", description: "Use our Bed and ISA tool to move investments into your ISA as new allowance becomes available." },
    ],
    bodyText: "A General Investment Account has no tax wrapper, so gains and income may be taxable. The value of investments can go down as well as up.",
  },
  // ── Help ────────────────────────────────────────────────────────────────
  {
    displayName: "FAQs", routeSegment: "faqs", container: PAGE_KEYS.help,
    metaTitle: "Frequently Asked Questions | Mosey Bank",
    metaDescription: "Quick answers to the questions we hear most - from opening an account to reporting a lost card.",
    title: "Frequently Asked Questions",
    description: "Quick answers to the questions we hear most, from opening an account to reporting a lost card.",
    features: [
      { title: "Accounts and switching", description: "How to open an account, switch to Mosey with the Current Account Switch Service, and manage joint accounts." },
      { title: "Cards and payments", description: "Freezing a lost card, setting up Apple Pay and Google Pay, and sending money at home and abroad." },
      { title: "Security and support", description: "How we protect your account, how to spot a scam, and the fastest ways to reach a real person." },
    ],
    bodyText: "Cannot find what you are looking for? Start an in-app chat seven days a week, or head to our contact page for every way to reach us.",
  },
  {
    displayName: "Find a Branch", routeSegment: "branches", container: PAGE_KEYS.help,
    metaTitle: "Find a Branch | Mosey Bank",
    metaDescription: "With over 140 branches across the UK, expert advice is never far away. Find your nearest location.",
    title: "Find a Branch",
    description: "With over 140 branches across the UK, expert advice is never far away.",
    features: [
      { title: "140+ UK branches", description: "From city centres to market towns, there is a Mosey branch near you with real people ready to help." },
      { title: "Book an appointment", description: "Reserve a slot with a mortgage or business specialist so you are seen at a time that suits you." },
      { title: "Check opening hours", description: "See live opening hours, accessibility information, and available services for every branch before you visit." },
    ],
    bodyText: "Prefer to do everything from your phone? Almost every task can be completed in the Mosey app, but our branches are here whenever you want to talk face to face.",
  },
  {
    displayName: "Security & Fraud", routeSegment: "security", container: PAGE_KEYS.help,
    metaTitle: "Security & Fraud | Mosey Bank",
    metaDescription: "How Mosey protects your money, how to spot a scam, and what to do if something looks wrong.",
    title: "Security & Fraud",
    description: "How we protect your money, how to spot a scam, and what to do if something looks wrong.",
    features: [
      { title: "Protected around the clock", description: "We monitor your account 24/7 for unusual activity and alert you the moment something looks off." },
      { title: "Freeze your card instantly", description: "Lost your card or spotted a payment you do not recognise? Freeze it in one tap and unfreeze it just as fast." },
      { title: "Spot and report scams", description: "Learn the warning signs of the most common scams and report anything suspicious straight from the app." },
    ],
    bodyText: "Mosey will never call, text, or email asking for your PIN, password, or one-time passcode. If in doubt, hang up and contact us using the number on the back of your card.",
  },
  {
    displayName: "Accessibility", routeSegment: "accessibility", container: PAGE_KEYS.help,
    metaTitle: "Accessibility | Mosey Bank",
    metaDescription: "Banking that works for everyone, with support for screen readers, larger text, and accessible branches.",
    title: "Accessibility",
    description: "Banking that works for everyone, however you choose to bank with us.",
    features: [
      { title: "Built for assistive tech", description: "The Mosey app and website are designed to work with screen readers, larger text, and high-contrast modes." },
      { title: "Support that suits you", description: "Communicate with us your way, including via in-app chat, phone, and the Relay UK service." },
      { title: "Accessible branches", description: "Our branches offer step-free access, hearing loops, and staff trained to give the support you need." },
    ],
    bodyText: "We are always working to make banking easier for everyone. If there is something we could do better, tell us through the app or in any branch.",
  },
  // ── About ───────────────────────────────────────────────────────────────
  {
    displayName: "About Us", routeSegment: "about-us", container: PAGE_KEYS.about,
    metaTitle: "About Us | Mosey Bank",
    metaDescription: "From a single branch to a bank serving two million customers, built around people not branches.",
    title: "About Us",
    description: "From a single branch to a bank serving two million customers across the UK.",
    features: [
      { title: "Founded on a simple idea", description: "That banking should work the way the rest of your life does - on your phone, on your schedule, without the jargon." },
      { title: "Two million customers", description: "Personal and business customers across the country trust Mosey with their everyday money and their big plans." },
      { title: "Our own technology", description: "We built our banking platform from the ground up, so opening an account or getting help takes minutes, not days." },
    ],
    bodyText: "We are a fully licensed UK bank, authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority, and we are still guided by the same simple idea we started with.",
  },
  {
    displayName: "Careers", routeSegment: "careers", container: PAGE_KEYS.about,
    metaTitle: "Careers | Mosey Bank",
    metaDescription: "Join a team that puts people first - customers and colleagues. See our open roles.",
    title: "Careers",
    description: "Join a team that puts people first, both customers and colleagues.",
    features: [
      { title: "Work that matters", description: "Help build a bank that genuinely makes people's financial lives simpler, fairer, and less stressful." },
      { title: "Flexible by default", description: "We trust our people to do their best work wherever they are, with hybrid and remote roles across the business." },
      { title: "Grow with us", description: "From engineering to customer support, we invest in learning and give people room to take on more." },
    ],
    bodyText: "We are always looking for exceptional, curious people. Explore our open roles and find where you could make a difference at Mosey.",
  },
  {
    displayName: "Press & Media", routeSegment: "press", container: PAGE_KEYS.about,
    metaTitle: "Press & Media | Mosey Bank",
    metaDescription: "Latest news, press releases, and media resources from Mosey Bank.",
    title: "Press & Media",
    description: "Latest news, press releases, and media resources from Mosey Bank.",
    features: [
      { title: "Newsroom", description: "Read our latest announcements, product launches, and company milestones as they happen." },
      { title: "Media resources", description: "Download logos, brand guidelines, and executive headshots for use in your coverage." },
      { title: "Press contacts", description: "Reach the Mosey press office directly for interviews, comment, and background briefings." },
    ],
    bodyText: "For all media enquiries, contact the press office and we will get back to you quickly. We aim to respond to journalists on deadline the same day.",
  },
  {
    displayName: "Sustainability", routeSegment: "sustainability", container: PAGE_KEYS.about,
    metaTitle: "Sustainability | Mosey Bank",
    metaDescription: "How Mosey is building a bank that is good for people and the planet, from net zero to responsible lending.",
    title: "Sustainability",
    description: "How we are building a bank that is good for people and the planet.",
    features: [
      { title: "On the path to net zero", description: "We are cutting our own emissions and helping customers understand and reduce the footprint of their spending." },
      { title: "Responsible lending", description: "We lend in a way that supports long-term financial health, not short-term profit at our customers' expense." },
      { title: "Giving back", description: "Colleagues get paid time off to volunteer, and we support community projects in the places we operate." },
    ],
    bodyText: "We publish our progress openly every year. There is a lot still to do, and we would rather be honest about the journey than overstate where we are.",
  },
];

const extraPages: PageDef[] = EXTRA_TRADITIONAL_PAGES.map((p) => ({
  key: noHyphens(),
  displayName: p.displayName,
  routeSegment: p.routeSegment,
  container: p.container,
  properties: { metaTitle: p.metaTitle, metaDescription: p.metaDescription },
  traditional: buildTraditionalProduct("", p.title, p.description, "", "", p.features, p.bodyText, ""),
}));

const pages: PageDef[] = [
  // ── Level-1: Category pages ───────────────────────────────────────────────

  {
    key: PAGE_KEYS.personal,
    displayName: "Personal Banking",
    routeSegment: "personal",
    properties: {
      metaTitle: "Personal Banking | Mosey Bank",
      metaDescription: "Current accounts, savings, and mortgages designed around your everyday needs. Open an account in minutes with Mosey Bank.",
    },
    nodes: buildPersonalPage(),
  },
  {
    key: PAGE_KEYS.business,
    displayName: "Business",
    routeSegment: "business",
    properties: {
      metaTitle: "Business Banking | Mosey Bank",
      metaDescription: "Current accounts, lending, and payment solutions for UK businesses of every size. Free for your first 12 months.",
    },
    nodes: buildBusinessPage(),
  },
  {
    key: PAGE_KEYS.investments,
    displayName: "Investments",
    routeSegment: "investments",
    properties: {
      metaTitle: "Investments & ISAs | Mosey Bank",
      metaDescription: "Stocks & Shares ISAs, pensions, and long-term savings products. Start investing from £25 a month.",
    },
    nodes: buildInvestmentsPage(),
  },
  {
    key: PAGE_KEYS.help,
    displayName: "Help & Support",
    routeSegment: "help",
    properties: {
      metaTitle: "Help & Support | Mosey Bank",
      metaDescription: "FAQs, contact options, and branch finder. Speak to a real person seven days a week via in-app chat or phone.",
    },
    nodes: buildHelpPage(),
  },
  {
    key: PAGE_KEYS.about,
    displayName: "About Mosey",
    routeSegment: "about",
    properties: {
      metaTitle: "About Us | Mosey Bank",
      metaDescription: "Our story, values, team, careers, and press. Mosey Bank is banking built around people, not branches.",
    },
    nodes: buildAboutPage(),
  },

  // ── Level-1: Mortgage (product + URL prefix for its sub-pages) ────────────

  {
    key: PAGE_KEYS.mortgage,
    displayName: "Mortgage",
    routeSegment: "mortgage",
    properties: {
      metaTitle: "Mortgages | Mosey Bank",
      metaDescription: "Find your mortgage rate in minutes. Decision in principle online in 10 minutes without affecting your credit score.",
    },
    traditional: buildTraditionalProduct(
      "Home Buying",
      "Mortgage",
      "Find your mortgage rate in minutes. Our advisors guide you from first click to key handover.",
      "Get a Mortgage",
      "/en/mortgage",
      [
        { title: "Decision in principle online", description: "Get a DIP in 10 minutes without affecting your credit score. Know your budget before you start house hunting." },
        { title: "Dedicated mortgage advisor", description: "A real person calls you after your DIP to talk through your options, answer questions, and guide you through the full application." },
        { title: "Fixed and tracker rates", description: "Choose the certainty of a 2 or 5 year fixed rate, or take advantage of falling rates with a tracker mortgage." },
        { title: "No arrangement fee options", description: "Pick a mortgage with no upfront arrangement fee - ideal if you want to keep costs down when buying." },
      ],
      "Buying a home is the biggest financial decision most people make. Mosey's mortgage team is here to make it as straightforward as possible - from the first online check to the day you get your keys.",
      "Get Started",
      "<h2>What our customers say</h2><blockquote><p>Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer - never felt rushed.</p></blockquote><p><strong>Marcus Webb</strong>, First-time buyer, Bristol</p>" +
        "<h2>Important</h2><p>Your home may be repossessed if you do not keep up repayments on your mortgage. Make sure you can afford the repayments before you apply.</p>"
    ),
  },

  // ── Level-2: Products (children of their category) ────────────────────────

  {
    key: PAGE_KEYS.currentAccount,
    displayName: "Current Account",
    routeSegment: "current-account",
    container: PAGE_KEYS.personal,
    properties: {
      metaTitle: "Fee-Free Current Account | Mosey Bank",
      metaDescription: "A fee-free everyday account with instant notifications, smart budgeting tools, and no hidden charges. Open in 10 minutes.",
    },
    traditional: buildTraditionalProduct(
      "Personal Banking",
      "Current Account",
      "A fee-free everyday account with instant notifications, smart budgeting tools, and no hidden charges.",
      "Open an Account",
      "/en/personal/current-account",
      [
        { title: "No monthly fees", description: "Keep more of your money. Our current account has no monthly maintenance fee, no minimum balance, and no charge for standard transfers." },
        { title: "Instant notifications", description: "Get a push notification the moment money moves in or out of your account. Know your balance in real time, always." },
        { title: "Contactless & Apple/Google Pay", description: "Pay with your card or phone anywhere in the world. Freeze and unfreeze your card instantly from the app if it goes missing." },
        { title: "Smart spending insights", description: "See exactly where your money goes each month, automatically categorised. Set spending limits and watch your savings grow." },
      ],
      "The Mosey current account is designed for modern life. Open in 10 minutes with just your phone and a valid ID - no branch visit required. Manage everything from the app: move money, set up direct debits, pay bills, and speak to a real person via in-app chat seven days a week.",
      "Open an Account"
    ),
  },

  {
    key: PAGE_KEYS.savings,
    displayName: "Savings",
    routeSegment: "savings",
    container: PAGE_KEYS.personal,
    properties: {
      metaTitle: "Savings Accounts up to 5.1% AER | Mosey Bank",
      metaDescription: "Easy-access and fixed-rate savings accounts with market-leading rates. FSCS protected up to £85,000.",
    },
    traditional: buildTraditionalProduct(
      "Save Smarter",
      "Savings",
      "Easy-access and fixed-rate savings accounts with market-leading rates. FSCS protected up to £85,000.",
      "View Savings Rates",
      "/en/personal/savings",
      [
        { title: "Easy-access at 4.6% AER", description: "Withdraw whenever you need to with no penalty. Your rate is competitive and reviewed monthly to stay near the top of the market." },
        { title: "1-year fixed rate at 5.1% AER", description: "Lock in our best rate for 12 months and know exactly what you'll earn. Minimum deposit £500, maximum £250,000." },
        { title: "FSCS protected", description: "Every penny you save with Mosey is protected by the Financial Services Compensation Scheme up to £85,000 per person." },
        { title: "Open in minutes", description: "Link any UK current account. Transfer funds instantly and start earning interest from the next business day." },
      ],
      "Whether you're building an emergency fund, saving for a home, or making idle cash work harder, Mosey savings accounts give you competitive rates without the complexity.",
      "Open a Savings Account",
      "<h2>Savings at a glance</h2><ul><li><strong>5.1% AER</strong> fixed rate</li><li><strong>4.6% AER</strong> easy access</li><li><strong>£85,000</strong> FSCS protection per person</li><li><strong>10 minutes</strong> to open an account</li></ul>" +
        "<h2>What our customers say</h2><blockquote><p>I moved my savings to Mosey after seeing the 5.1% fixed rate. The transfer took less than a day and the app makes it easy to watch my interest grow.</p></blockquote><p><strong>Sarah Chen</strong>, Mosey customer</p>"
    ),
  },

  {
    key: PAGE_KEYS.businessBanking,
    displayName: "Business Banking",
    routeSegment: "business-banking",
    container: PAGE_KEYS.business,
    traditional: buildTraditionalProduct(
      "Business",
      "Business Banking",
      "Current accounts, lending, and payment solutions built for UK businesses. Open in 15 minutes.",
      "Open a Business Account",
      "/en/business/business-banking",
      [
        { title: "Fee-free business current account", description: "No monthly fee for the first 12 months. After that, £7 per month with unlimited transactions included." },
        { title: "Accounting integrations", description: "Connect to Xero, QuickBooks, and FreeAgent in one click. Transactions sync automatically so your books are always up to date." },
        { title: "Instant invoicing", description: "Create and send professional invoices from the app and get notified the moment they're paid." },
        { title: "Business lending", description: "Flexible loans from £10,000 to £500,000 and overdraft facilities to smooth out cash flow. Decisions in 48 hours." },
      ],
      "Mosey Business Banking is designed for the way modern businesses actually work - online, mobile-first, and integrated with the tools you already use.",
      "Open a Business Account",
      "<h2>What our customers say</h2><blockquote><p>Opened a business current account in under 15 minutes. The integration with our accounting software was seamless - invoices reconcile automatically.</p></blockquote><p><strong>Tom Hartley</strong>, Director, Hartley &amp; Co.</p>"
    ),
  },

  {
    key: PAGE_KEYS.contact,
    displayName: "Contact Us",
    routeSegment: "contact",
    container: PAGE_KEYS.help,
    properties: {
      metaTitle: "Contact Us | Mosey Bank",
      metaDescription: "Get in touch with Mosey Bank via in-app chat, phone, or our online form. Real people, seven days a week.",
    },
    // A TraditionalPage. To add a NATIVE Optimizely form: go to Settings > Forms
    // Settings > Activate, create a form in the CMS form builder (Submit URL
    // /api/form-submit), then drop it into this page's Main Content area in the CMS -
    // native forms cannot be created via the Management API.
    traditional: {
      heading: "Get in touch",
      subheading: "Have a question or need help with your account? Here is how to reach a real person, fast.",
      body:
        "<h2>Ways to reach us</h2><ul>" +
        "<li><strong>In-app chat</strong> - open the Mosey app and tap the chat icon to message a real person seven days a week, 7am to 11pm.</li>" +
        "<li><strong>Call us</strong> - dial the number on the back of your card. Our UK team is here seven days a week.</li>" +
        "<li><strong>Email</strong> - prefer to write? Use the form your advisor shares and we will reply to your registered email within one business day.</li>" +
        "</ul><p>Whichever way you get in touch, you will always speak to a real Mosey person - no hold music, no call centres.</p>",
    },
  },

  // ── Level-2: Mortgage sub-pages (children of mortgage) ───────────────────

  {
    key: PAGE_KEYS.firstTimeBuyers,
    displayName: "First-Time Buyers",
    routeSegment: "first-time-buyers",
    container: PAGE_KEYS.mortgage,
    traditional: buildTraditionalProduct(
      "First Home",
      "First-Time Buyers",
      "Getting on the ladder is a big deal. We make the mortgage part as simple as possible.",
      "Get a Decision in Principle",
      "/en/mortgage",
      [
        { title: "5% deposit mortgages", description: "We offer mortgages with as little as a 5% deposit for first-time buyers purchasing their primary residence." },
        { title: "Government scheme support", description: "Our advisors are experts in Help to Buy, Shared Ownership, and the Lifetime ISA. We'll help you use every available scheme." },
        { title: "No arrangement fee", description: "Choose a mortgage with no upfront arrangement fee - keeping your costs down when every pound counts." },
        { title: "Step-by-step guidance", description: "From offer accepted to keys in hand, your dedicated advisor walks you through every stage of the process." },
      ],
      "Buying your first home is one of life's biggest milestones. Mosey's first-time buyer mortgages and specialist advisors are here to take the mystery out of the process.",
      "Get a Decision in Principle"
    ),
  },

  {
    key: PAGE_KEYS.remortgaging,
    displayName: "Remortgaging",
    routeSegment: "remortgaging",
    container: PAGE_KEYS.mortgage,
    traditional: buildTraditionalProduct(
      "Better Rate",
      "Remortgaging",
      "Switch to a better deal when your fixed term ends. We do the heavy lifting so you don't have to.",
      "Check My Remortgage Rate",
      "/en/mortgage",
      [
        { title: "Rate alert before your term ends", description: "We'll contact you 3 months before your fixed rate expires so you have plenty of time to find a better deal." },
        { title: "Free legal work for switchers", description: "Switch to Mosey and we cover the legal costs of the remortgage. No hidden charges." },
        { title: "Like-for-like switching", description: "Already with us? Switch to a new deal in minutes with no new affordability assessment required in most cases." },
        { title: "Borrow more if needed", description: "A remortgage is also a chance to release equity for home improvements or consolidate existing debt at a lower rate." },
      ],
      "When your current deal ends, your mortgage typically reverts to a standard variable rate. Remortgaging to a new fixed rate with Mosey can save hundreds of pounds a year.",
      "Check My Rate"
    ),
  },

  // ── Level-3: Current Account sub-pages ───────────────────────────────────

  {
    key: PAGE_KEYS.instantPayments,
    displayName: "Instant Payments",
    routeSegment: "instant-payments",
    container: PAGE_KEYS.currentAccount,
    traditional: buildTraditionalProduct(
      "Faster Payments",
      "Instant Payments",
      "Send and receive money in seconds, 24 hours a day, 365 days a year. No delays, no cut-off times.",
      "Open an Account",
      "/en/personal/current-account",
      [
        { title: "Faster Payments", description: "Send money to any UK bank account in seconds via the Faster Payments network. Available around the clock." },
        { title: "Standing orders", description: "Set up regular payments on any schedule - weekly, monthly, or on a custom date - and manage them entirely in the app." },
        { title: "Direct debits", description: "Authorise and cancel direct debits in the app. See what's due before it leaves your account." },
        { title: "International transfers", description: "Send money abroad with real exchange rates and low fees. Track your transfer every step of the way." },
      ],
      "Modern banking means money moves at your speed - not the bank's. Mosey uses the UK Faster Payments network so transfers reach their destination in seconds, not hours.",
      "Open an Account"
    ),
  },

  {
    key: PAGE_KEYS.mobileApp,
    displayName: "Mobile App",
    routeSegment: "mobile-app",
    container: PAGE_KEYS.currentAccount,
    traditional: buildTraditionalProduct(
      "Banking on the Go",
      "Mobile App",
      "Everything your bank account can do, from your pocket. Rated 4.8 stars on the App Store.",
      "Download the App",
      "/en/personal/current-account",
      [
        { title: "Instant balance & transactions", description: "See your real-time balance and every transaction the moment it happens. No delays, no end-of-day batch updates." },
        { title: "Card controls", description: "Freeze, unfreeze, or cancel your card in one tap. Set limits on contactless payments, online spending, and withdrawals." },
        { title: "Spending insights", description: "Transactions are automatically categorised so you can see where your money goes each month. Set budgets and track progress." },
        { title: "In-app chat support", description: "Talk to a real Mosey person via in-app chat seven days a week. No hold music, no call centres." },
      ],
      "The Mosey app is how most of our customers do their banking. It's fast, intuitive, and packed with features that used to require a branch visit. Rated 4.8 stars on the App Store and 4.7 on Google Play.",
      "Download the App"
    ),
  },

  {
    key: PAGE_KEYS.travelMoney,
    displayName: "Travel Money",
    routeSegment: "travel-money",
    container: PAGE_KEYS.currentAccount,
    traditional: buildTraditionalProduct(
      "Travel",
      "Travel Money",
      "Spend abroad with no foreign transaction fees and real exchange rates. Your card works in 200+ countries.",
      "Open an Account",
      "/en/personal/current-account",
      [
        { title: "No foreign transaction fees", description: "Use your Mosey card anywhere in the world and we'll never add a foreign transaction or currency conversion fee." },
        { title: "Real exchange rates", description: "We use the mid-market exchange rate - the same one you see on Google. No hidden markup." },
        { title: "Worldwide ATM withdrawals", description: "Withdraw up to £200 abroad per month for free. After that, a flat £1 fee per withdrawal - never a percentage." },
        { title: "Instant notifications abroad", description: "Get notified the moment your card is used abroad. Spot unauthorised transactions immediately and freeze your card in one tap." },
      ],
      "Mosey current account holders get excellent foreign exchange as standard - no add-on needed. Whether you're travelling for a weekend or living abroad, your card works the same way it does at home.",
      "Open an Account"
    ),
  },

  // ── Level-3: Savings sub-pages ────────────────────────────────────────────

  {
    key: PAGE_KEYS.easyAccessSavings,
    displayName: "Easy Access Savings",
    routeSegment: "easy-access-savings",
    container: PAGE_KEYS.savings,
    traditional: buildTraditionalProduct(
      "Flexible Savings",
      "Easy Access Savings",
      "Earn 4.6% AER with no notice period and no limit on withdrawals. Your money is always within reach.",
      "Open an Easy Access Account",
      "/en/personal/savings",
      [
        { title: "4.6% AER variable", description: "One of the highest easy-access rates available to UK savers. Rate is reviewed monthly and remains near the top of the market." },
        { title: "Unlimited withdrawals", description: "Withdraw any amount, any time, with no penalty and no notice period. Funds are in your current account the same working day." },
        { title: "No minimum balance", description: "Start saving from as little as £1. There's no minimum balance to earn interest." },
        { title: "FSCS protected", description: "Your savings are protected by the Financial Services Compensation Scheme up to £85,000 per person." },
      ],
      "The Mosey Easy Access Savings Account is for people who want their money to work harder without giving up flexibility. There's no fixed term, no notice period, and no limit on how many times you can dip into your savings.",
      "Open an Easy Access Account"
    ),
  },

  {
    key: PAGE_KEYS.fixedRateSavings,
    displayName: "Fixed Rate Savings",
    routeSegment: "fixed-rate-savings",
    container: PAGE_KEYS.savings,
    traditional: buildTraditionalProduct(
      "Fixed Rate",
      "Fixed Rate Savings",
      "Lock in 5.1% AER for 12 months and know exactly what you'll earn. Minimum deposit £500.",
      "Open a Fixed Rate Account",
      "/en/personal/savings",
      [
        { title: "5.1% AER fixed for 12 months", description: "Our best savings rate, guaranteed for the full 12-month term. You'll know exactly what you'll earn before you open the account." },
        { title: "Open from £500", description: "Start earning our top rate with a minimum deposit of £500. Maximum balance £250,000 per person." },
        { title: "Guaranteed return", description: "Unlike easy-access accounts, your rate won't change during your term. Plan your finances with certainty." },
        { title: "FSCS protected", description: "Your savings are protected by the Financial Services Compensation Scheme up to £85,000 per person." },
      ],
      "Our fixed-rate savings account is for people who don't need immediate access to their money and want to earn as much interest as possible. Lock in 5.1% AER for 12 months and watch a £10,000 deposit grow to £10,510 by maturity.",
      "Open a Fixed Rate Account"
    ),
  },

  // ── Level-3: Business Banking sub-pages ──────────────────────────────────

  {
    key: PAGE_KEYS.businessCurrentAccount,
    displayName: "Business Current Account",
    routeSegment: "business-current-account",
    container: PAGE_KEYS.businessBanking,
    traditional: buildTraditionalProduct(
      "Business Account",
      "Business Current Account",
      "A full-featured business current account with no monthly fee for your first year.",
      "Open a Business Account",
      "/en/business/business-banking",
      [
        { title: "Free for 12 months", description: "No monthly fee for the first 12 months. After that, £7 per month with unlimited UK transactions included." },
        { title: "Instant notifications", description: "See every payment in and out the moment it happens. Stay on top of cash flow without checking your balance manually." },
        { title: "Multi-user access", description: "Give team members read-only or payment-authorisation access. Full audit trail of every action." },
        { title: "Accounting integration", description: "Connect to Xero, QuickBooks, or FreeAgent. Transactions sync automatically every hour." },
      ],
      "The Mosey Business Current Account is built for businesses that want modern banking without the legacy bank experience. Open entirely online, manage everything in the app, and connect to the tools your business already uses.",
      "Open a Business Account"
    ),
  },

  {
    key: PAGE_KEYS.businessLending,
    displayName: "Business Lending",
    routeSegment: "business-lending",
    container: PAGE_KEYS.businessBanking,
    traditional: buildTraditionalProduct(
      "Business Finance",
      "Business Lending",
      "Flexible loans and overdrafts to help your business grow on your terms. Decisions in 48 hours.",
      "Apply for Business Finance",
      "/en/business/business-banking",
      [
        { title: "Business loans from £10,000", description: "Borrow from £10,000 to £500,000 over 1 to 7 years at a fixed rate. No early repayment charges." },
        { title: "Overdraft facilities", description: "A pre-agreed overdraft to smooth out seasonal cash flow. Only pay interest on what you use." },
        { title: "Invoice finance", description: "Release cash tied up in unpaid invoices. Get up to 90% of an invoice's value within 24 hours of raising it." },
        { title: "48-hour decisions", description: "Submit your application online and get a lending decision within two business days in most cases." },
      ],
      "Growing a business often means needing capital before revenue catches up. Mosey's business lending products are designed to give you the flexibility to invest, hire, and expand.",
      "Apply for Finance"
    ),
  },

  // Additional nested TraditionalPages (nav targets + extra depth).
  ...extraPages,
];

/** Keys of items that could not be deleted (e.g. homepage / start page). */
const undeletableKeys = new Map<string, string>(); // displayName → existing CMS key

const GRAPH_ENDPOINT = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

/**
 * Push a composition onto an existing start-page DynamicExperience.
 *
 * The start page is usually already published, and POSTing a composition inline
 * to /versions is rejected (400) on a published experience. So we create a fresh
 * draft version WITHOUT a composition, merge-PATCH the composition onto that draft
 * (the shape the CMS accepts for compositions - same as the variation workflow),
 * then publish. Returns true on success; false lets the caller fall back to a
 * sibling homepage. Any failed step logs the full response body.
 */
async function updateStartPageComposition(
  key: string,
  page: PageDef,
  composition: Record<string, unknown>,
  token: string,
): Promise<boolean | "not-an-experience"> {
  // 1. Create a new draft version (no composition - inline composition 400s here).
  const createRes = await fetchRetry(`${CONTENT_ENDPOINT}/${key}/versions?locale=en`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      displayName: page.displayName,
      ...(page.properties ? { properties: wrapProps(page.properties) } : {}),
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    console.warn(`  [warn] POST ${key}/versions: ${createRes.status} ${errText.slice(0, 600)}`);
    // A BlankExperience (folder) rejects the homepage's metaTitle/metaDescription and
    // cannot hold a composition - signal the caller to print actionable guidance.
    if (errText.includes("BlankExperience") || /is not defined on content type/.test(errText)) {
      return "not-an-experience";
    }
    return false;
  }

  const createBody = await createRes.text();
  let version: string | undefined = createBody.trim()
    ? (JSON.parse(createBody) as { version?: string }).version
    : undefined;
  if (!version) {
    const vRes = await fetchRetry(`${CONTENT_ENDPOINT}/${key}/versions?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (vRes.ok) {
      const vData = await vRes.json() as { items?: Array<{ version?: string }> };
      version = vData.items?.[0]?.version;
    }
  }
  if (!version) {
    console.warn(`  [warn] Could not resolve a new draft version for start page ${key}`);
    return false;
  }

  // 2. Merge-PATCH the composition onto the draft.
  const patchRes = await fetchRetry(`${CONTENT_ENDPOINT}/${key}/versions/${version}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ composition }),
  });
  if (!patchRes.ok) {
    console.warn(`  [warn] PATCH ${key}/versions/${version} composition: ${patchRes.status} ${(await patchRes.text()).slice(0, 600)}`);
    return false;
  }

  // 3. Publish the draft.
  const pubRes = await fetchRetry(`${CONTENT_ENDPOINT}/${key}/versions/${version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pubRes.ok) {
    console.warn(`  [warn] Publish ${key}/versions/${version}: ${pubRes.status} ${(await pubRes.text()).slice(0, 600)}`);
    return false;
  }

  return true;
}

/**
 * Create a deeper content page as a TraditionalPage (classic templated page, no
 * Visual Builder composition). Every converted page gets the shared CalloutBlock as
 * its featuredBlock highlight and the shared CallToAction seeded into its free
 * content area (mainContent) - editors can add or remove blocks there afterwards.
 */
async function createTraditionalPage(page: PageDef): Promise<void> {
  const t = page.traditional!;
  await createContent(
    {
      key: page.key,
      contentType: "TraditionalPage",
      container: page.container ?? CONTAINER,
      locale: "en",
      displayName: page.displayName,
      ...(page.routeSegment ? { routeSegment: page.routeSegment } : {}),
      properties: {
        heading: t.heading,
        subheading: t.subheading,
        body: { html: t.body },
        featuredBlock: { reference: `cms://content/${SHARED_CALLOUT_KEY}` },
        mainContent: [{ reference: `cms://content/${SHARED_CTA_KEY}` }],
        ...(page.properties ?? {}),
      },
    },
    page.displayName,
  );
  console.log(`  [created] ${page.displayName} → key=${page.key} route=${page.routeSegment ?? "/"} (TraditionalPage)`);
}

async function createPage(page: PageDef): Promise<void> {
  // Deeper content pages are TraditionalPages - a plain create, no composition.
  if (page.traditional) return createTraditionalPage(page);

  const token = await getManagementToken();

  const composition = {
    id: uid(),
    displayName: page.displayName,
    nodeType: "experience",
    layoutType: "outline",
    nodes: page.nodes,
  };

  // Homepage has no routeSegment - it updates the existing start page at / rather
  // than creating a duplicate at /en/homepage/. CONTAINER itself may be the start
  // page, so fall back to CONTAINER when Graph hasn't indexed the start page yet
  // (indexing lag of ~30-60s on fresh instances).
  if (!page.routeSegment) {
    // CONTAINER is guaranteed by ensureExperienceStartPage to be the site start page
    // (a DynamicExperience entry point), so put the homepage composition directly on it.
    // Do NOT resolve the homepage via Graph: after a start-page repoint, Graph can still
    // have a stale/old page indexed at "/", and we'd update that instead of the real root.
    if (CONTAINER) {
      const result = await updateStartPageComposition(CONTAINER, page, composition, token);
      if (result === true) {
        console.log(`  [updated] ${page.displayName} → key=${CONTAINER} route=/`);
        return;
      }
      console.warn(
        `  [warn] Could not set the homepage composition on start page ${CONTAINER} (see the [warn] response ` +
        `above) - creating a sibling homepage instead; the site root may still be empty.`,
      );
    }
  }

  // Build NewContent body for v1 API: all content data goes in initialVersion.
  const body: Record<string, unknown> = {
    key: page.key,
    contentType: "DynamicExperience",
    container: page.container ?? CONTAINER,
    initialVersion: {
      locale: "en",
      displayName: page.displayName,
      ...(page.routeSegment ? { routeSegment: page.routeSegment } : {}),
      ...(page.properties ? { properties: wrapProps(page.properties) } : {}),
      composition,
    },
  };

  const res = await fetchRetry(CONTENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 409) {
      console.log(`  [skipped] ${page.displayName} - key already exists (409)`);
      return;
    }
    if (res.status === 400 && text.includes("is already in use")) {
      console.log(`  [skipped] ${page.displayName} - routeSegment already in use (existing start page)`);
      return;
    }
    console.error(`  [ERROR] ${page.displayName}: ${res.status} ${text.slice(0, 400)}`);
    throw new Error(`Create page failed: ${res.status}`);
  }

  let contentKey: string = page.key;
  let versionId: string | undefined;

  if (!text.trim()) {
    // v1 API returns 201 with no body for some content types - look up the version separately.
    const vRes = await fetchRetry(`${CONTENT_ENDPOINT}/${page.key}/versions?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (vRes.ok) {
      const vData = await vRes.json() as { items?: Array<{ version?: string }> };
      versionId = vData.items?.[0]?.version;
    }
  } else {
    const result = JSON.parse(text) as Record<string, unknown>;
    contentKey = result.key as string ?? page.key;
    versionId = (result.initialVersion as Record<string, unknown> | undefined)?.version as string | undefined;
  }

  // Publish the newly-created draft version.
  if (versionId) {
    const pubRes = await fetchRetry(`${CONTENT_ENDPOINT}/${contentKey}/versions/${versionId}:publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!pubRes.ok) {
      const pubText = await pubRes.text();
      throw new Error(`Publish "${page.displayName}" failed: ${pubRes.status} ${pubText.slice(0, 300)}`);
    }
  }

  console.log(`  [created] ${page.displayName} → key=${contentKey} route=${page.routeSegment ?? "/"}`);
}

/** Permanently delete one content item, retrying on 429 rate-limit bursts. */
async function permanentDelete(key: string): Promise<boolean> {
  const token = await getManagementToken();
  // The Management API rate-limits delete bursts (429). A 429'd delete is NOT
  // deleted - its routeSegment stays taken and every dependent create fails -
  // so retry with backoff and pace the loop.
  let delRes: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    delRes = await fetch(`${CONTENT_ENDPOINT}/${key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "cms-permanent-delete": "true" },
    });
    if (delRes.status !== 429) break;
    const retryAfter = Number(delRes.headers.get("retry-after"));
    await new Promise((r) => setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1)));
  }
  if (!delRes || !delRes.ok) undeletableKeys.set(key, key);
  console.log(`  [deleted] ${key} (${delRes?.status})`);
  await new Promise((r) => setTimeout(r, 150));
  return !!delRes?.ok;
}

/** Delete every content item directly under the app entry point (pages + any
 *  leftover blocks from older runs). Shared blocks now live under the global
 *  root and are cleaned by cleanSharedBlocks(). */
async function deleteExisting(): Promise<void> {
  const token = await getManagementToken();
  const res = await fetch(`${CONTENT_ENDPOINT}/${CONTAINER}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;

  // Never delete the root container itself or the global root, even if a corrupted
  // hierarchy lists them as children here - permanent-deleting them cascades and
  // breaks the instance (discoverGlobalRoot then 404s).
  const norm = (k: string) => k.replace(/-/g, "");
  const protectedKeys = new Set([norm(CONTAINER), norm(BLOCKS_CONTAINER)]);

  const data = await res.json() as { items?: Array<{ key: string }> };
  for (const item of data.items ?? []) {
    if (protectedKeys.has(norm(item.key))) {
      console.log(`  [protected] ${item.key} - skipped (root/global container, not deleted)`);
      continue;
    }
    await permanentDelete(item.key);
  }
}

/** Delete stale standalone/shared blocks under the global root so re-seeds don't
 *  accumulate duplicates. Deletes ONLY managed block types (never pages, folders,
 *  native forms, or unknown content) and preserves the stable-key FAQ items to
 *  avoid the same-key recreate race. */
async function cleanSharedBlocks(globalRoot: string): Promise<void> {
  const token = await getManagementToken();
  const preserve = new Set(
    [...FAQ_ITEMS, ...INVESTMENT_FAQ_ITEMS, ...HELP_FAQ_ITEMS].map((i) => i.key)
  );

  let items: Array<{ key: string; contentType?: string }> = [];
  for (let pageIndex = 0; ; pageIndex++) {
    const res = await fetchRetry(`${CONTENT_ENDPOINT}/${globalRoot}/items?pageSize=100&pageIndex=${pageIndex}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json() as { items?: Array<{ key: string; contentType?: string }> };
    const batch = data.items ?? [];
    items = items.concat(batch);
    if (batch.length < 100) break;
  }

  for (const item of items) {
    if (!item.contentType || !MANAGED_BLOCK_TYPES.has(item.contentType)) continue; // never touch pages/folders/forms/unknown
    if (preserve.has(item.key)) {
      console.log(`  [kept] ${item.key} (shared FAQ item)`);
      continue;
    }
    await permanentDelete(item.key);
  }
}

/** Find the CMS key of the savings page already in Graph. */
async function findSavingsKey(): Promise<string | null> {
  const query = `{ _Page(where:{_metadata:{url:{default:{in:["/en/personal/savings/","/en/savings/","/savings/"]}}}},limit:1) { items { _metadata { key } } } }`;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const { data } = await res.json() as { data?: { _Page?: { items?: Array<{ _metadata?: { key?: string } }> } } };
  return data?._Page?.items?.[0]?._metadata?.key ?? null;
}

async function main() {
  console.log("=== Mosey Bank Content Seeding Script ===\n");

  console.log("--- Discovering root container ---");
  // Guarantees the site start page is a DynamicExperience (creates one and points
  // the app at it if the entry point is missing or a BlankExperience folder), so the
  // homepage can be seeded onto it and renders at /.
  CONTAINER = await ensureExperienceStartPage();
  BLOCKS_CONTAINER = await discoverGlobalRoot();
  console.log(`  container: ${CONTAINER}`);
  console.log(`  blocks container (For All Applications): ${BLOCKS_CONTAINER}`);

  console.log("\n--- Cleaning existing content ---");
  await deleteExisting();
  // Sweep stale shared blocks at the top-level root, where earlier seed
  // versions created them as plain content items (invisible to the Shared
  // Blocks tab). Type-based deletion is safe there - the UI never creates
  // blocks at the root. Inside the shared-blocks folder each seed script
  // cleans its own types (seed-nav/seed-faqs by type, seed-modeling by
  // sentinel), so manually created blocks of managed types survive.
  await cleanSharedBlocks(await discoverTopLevelRoot());

  // Wait for CMS to free up routeSegments from deleted pages before re-creating
  console.log("\n  Waiting 8s for routeSegments to be released...");
  await new Promise((r) => setTimeout(r, 8000));

  // Create shared standalone FAQ items BEFORE the pages that reference them -
  // the CMS validates composition references at creation time and 400s on an
  // unresolved reference, so the Investments/Help pages (and the homepage) need
  // their FaqItemBlocks to already exist and be published. seed-faqs.ts reuses
  // the general FAQ_ITEMS (same stable keys) for the FAQs page - editing one
  // updates both. INVESTMENT_FAQ_ITEMS and HELP_FAQ_ITEMS back the Investments
  // and Help category landing pages' own FaqContainerBlocks.
  const allFaqItems = [...FAQ_ITEMS, ...INVESTMENT_FAQ_ITEMS, ...HELP_FAQ_ITEMS];
  console.log(`\n--- Creating ${allFaqItems.length} shared FAQ items ---`);
  // Create as drafts (skipPublish), then publish in a second pass. Publishing a
  // version immediately after creating it can 404 if the write hasn't committed
  // yet; separating the passes lets each item settle before we publish it.
  for (const item of allFaqItems) {
    await createContent({
      key: item.key,
      contentType: "FaqItemBlock",
      container: BLOCKS_CONTAINER,
      locale: "en",
      displayName: item.displayName,
      properties: { question: item.question, answer: item.answer },
    }, item.displayName, { skipPublish: true });
  }
  // Guarantee every item is published before any page references it - an
  // unpublished item makes the referencing page's faqItems unresolvable.
  for (const item of allFaqItems) await ensurePublished(item.key);

  // Shared blocks bound onto every converted TraditionalPage: a CalloutBlock used as
  // the featuredBlock and a CallToAction seeded into the free content area. Created
  // (and published) before the pages so their references resolve at page-create time.
  console.log(`\n--- Creating 2 shared TraditionalPage blocks ---`);
  await createContent({
    key: SHARED_CALLOUT_KEY,
    contentType: "CalloutBlock",
    container: BLOCKS_CONTAINER,
    locale: "en",
    displayName: "Shared - Not sure which is right",
    properties: {
      variant: "note",
      label: "Not sure which option is right for you?",
      body: { html: "<p>Compare your options or chat to a real Mosey person in the app seven days a week - we will help you choose with confidence.</p>" },
    },
  }, "Shared Callout", { skipPublish: true });
  await createContent({
    key: SHARED_CTA_KEY,
    contentType: "CallToAction",
    container: BLOCKS_CONTAINER,
    locale: "en",
    displayName: "Shared - Open an account CTA",
    properties: {
      label: "Open an account today",
      link: "/en/personal/current-account",
    },
  }, "Shared CTA", { skipPublish: true });
  await ensurePublished(SHARED_CALLOUT_KEY);
  await ensurePublished(SHARED_CTA_KEY);

  // Creation order matters: parents before children.
  // Level-1 pages have no container (go under root CONTAINER).
  // Level-2 pages have container = a level-1 key.
  // Level-3 pages have container = a level-2 key.
  const level1Keys = new Set([
    PAGE_KEYS.personal, PAGE_KEYS.business, PAGE_KEYS.investments,
    PAGE_KEYS.help, PAGE_KEYS.about, PAGE_KEYS.mortgage,
  ]);
  const level2Keys = new Set([
    PAGE_KEYS.currentAccount, PAGE_KEYS.savings, PAGE_KEYS.businessBanking,
    PAGE_KEYS.contact, PAGE_KEYS.firstTimeBuyers, PAGE_KEYS.remortgaging,
  ]);

  const level1 = pages.filter((p) => level1Keys.has(p.key));
  const level2 = pages.filter((p) => level2Keys.has(p.key));
  const level3 = pages.filter((p) => !level1Keys.has(p.key) && !level2Keys.has(p.key) && p.key !== PAGE_KEYS.homepage);

  console.log(`\n--- Creating ${level1.length} level-1 pages ---`);
  for (const page of level1) await createPage(page);

  console.log(`\n--- Creating ${level2.length} level-2 pages ---`);
  for (const page of level2) await createPage(page);

  console.log(`\n--- Creating ${level3.length} level-3 pages ---`);
  for (const page of level3) await createPage(page);

  // Look up the actual savings key (might differ if savings was skipped)
  const savingsKey = await findSavingsKey() ?? PAGE_KEYS.savings;
  console.log(`\n  Savings key for homepage: ${savingsKey}`);

  // Build and create the homepage last so its featuredPage reference resolves
  const homepageDef: PageDef = {
    key: PAGE_KEYS.homepage,
    displayName: "Homepage",
    properties: {
      metaTitle: "Mosey Bank | Banking Built Around You",
      metaDescription: "Fee-free current accounts, savings up to 5.1% AER, and mortgages with a decision in principle in 10 minutes.",
    },
    nodes: buildHomepage(savingsKey),
  };

  console.log("\n--- Creating homepage ---");
  await createPage(homepageDef);

  console.log("\n=== Seeding Complete ===");
  console.log(`  Pages created: ${level1.length + level2.length + level3.length} content pages + 1 homepage`);
  console.log("\nWait 60 seconds for Optimizely Graph to index, then:");
  console.log("  npm run dev → http://localhost:3000");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
