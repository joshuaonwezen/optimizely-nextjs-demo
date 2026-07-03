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
  discoverRootContainer,
  wrapProps,
  uid,
  noHyphens,
  sectionComponent,
  gridSection,
  elementComponent,
  rootComponent,
  type CompNode,
} from "./_shared";
import { FAQ_ITEMS } from "./faq-data";

config({ path: ".env.local" });

let CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";
// Global content root — where standalone/shared blocks live so they appear in
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
  console.warn(`  [warn] Could not publish ${key} after retries — homepage FAQ reference may not resolve.`);
}

// Composition node builders (uid, noHyphens, sectionComponent, gridSection,
// elementComponent, rootComponent, CompNode) come from ./_shared.

// Page compositions

/** Minimal composition for a category landing page (personal, business, etc.) */
function buildCategoryPage(heading: string, subheading: string): CompNode[] {
  return [
    sectionComponent("SectionHeadingBlock", `${heading} Heading`, {
      heading,
      subheading,
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
        "From first current accounts to business banking — Mosey customers bank with confidence.",
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
      label: "Our best rate",
      featuredPage: `cms://content/${savingsKey}`,
      description:
        "Our fixed-rate savings account now offers 5.1% AER. Lock in your rate today and watch your money grow — FSCS protected up to £85,000.",
      ctaText: "See savings rates",
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

function buildProductPage(
  badge: string,
  title: string,
  description: string,
  ctaText: string,
  ctaUrl: string,
  features: Array<{ title: string; description: string }>,
  bodyText: string,
  ctaLabel: string,
  extras: CompNode[] = []
): CompNode[] {
  return [
    sectionComponent("ProductHeroBlock", `${title} Hero`, {
      badge,
      title,
      description,
      ctaText,
      ctaUrl,
    }),
    sectionComponent("SectionHeadingBlock", "Features Heading", {
      heading: "Key features",
      subheading: `What makes ${title} work for you.`,
    }),
    gridSection(
      "Features Grid",
      features.map((f) =>
        elementComponent("FeatureItemBlock", f.title, {
          title: f.title,
          description: f.description,
        })
      )
    ),
    sectionComponent("TextBlock", "Body Text", {
      body: { html: `<p>${bodyText}</p>` },
    }),
    ...extras,
    sectionComponent("CallToAction", "Page CTA", {
      label: ctaLabel,
      link: ctaUrl,
    }),
  ];
}

// All pages

interface PageDef {
  key: string;
  displayName: string;
  routeSegment?: string;
  container?: string; // parent page key; defaults to root CONTAINER
  nodes: CompNode[];
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
  mortgage:               noHyphens(),  // /en/mortgage/ — also URL prefix for mortgage sub-pages
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
    nodes: buildCategoryPage(
      "Personal Banking",
      "Current accounts, savings, and mortgages designed around your everyday needs."
    ),
  },
  {
    key: PAGE_KEYS.business,
    displayName: "Business",
    routeSegment: "business",
    properties: {
      metaTitle: "Business Banking | Mosey Bank",
      metaDescription: "Current accounts, lending, and payment solutions for UK businesses of every size. Free for your first 12 months.",
    },
    nodes: buildCategoryPage(
      "Business Banking",
      "Current accounts, lending, and payment solutions for UK businesses of every size."
    ),
  },
  {
    key: PAGE_KEYS.investments,
    displayName: "Investments",
    routeSegment: "investments",
    properties: {
      metaTitle: "Investments & ISAs | Mosey Bank",
      metaDescription: "Stocks & Shares ISAs, pensions, and long-term savings products. Start investing from £25 a month.",
    },
    nodes: buildCategoryPage(
      "Investments",
      "Stocks & Shares ISAs, pensions, and long-term savings products."
    ),
  },
  {
    key: PAGE_KEYS.help,
    displayName: "Help & Support",
    routeSegment: "help",
    properties: {
      metaTitle: "Help & Support | Mosey Bank",
      metaDescription: "FAQs, contact options, and branch finder. Speak to a real person seven days a week via in-app chat or phone.",
    },
    nodes: buildCategoryPage(
      "Help & Support",
      "FAQs, contact us, and branch finder — we're here when you need us."
    ),
  },
  {
    key: PAGE_KEYS.about,
    displayName: "About Mosey",
    routeSegment: "about",
    properties: {
      metaTitle: "About Us | Mosey Bank",
      metaDescription: "Our story, values, team, careers, and press. Mosey Bank is banking built around people, not branches.",
    },
    nodes: buildCategoryPage(
      "About Mosey Bank",
      "Our story, values, team, careers, and press."
    ),
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
    nodes: buildProductPage(
      "Home Buying",
      "Mortgage",
      "Find your mortgage rate in minutes. Our advisors guide you from first click to key handover.",
      "Get a Mortgage",
      "/en/mortgage",
      [
        { title: "Decision in principle online", description: "Get a DIP in 10 minutes without affecting your credit score. Know your budget before you start house hunting." },
        { title: "Dedicated mortgage advisor", description: "A real person calls you after your DIP to talk through your options, answer questions, and guide you through the full application." },
        { title: "Fixed and tracker rates", description: "Choose the certainty of a 2 or 5 year fixed rate, or take advantage of falling rates with a tracker mortgage." },
        { title: "No arrangement fee options", description: "Pick a mortgage with no upfront arrangement fee — ideal if you want to keep costs down when buying." },
      ],
      "Buying a home is the biggest financial decision most people make. Mosey's mortgage team is here to make it as straightforward as possible — from the first online check to the day you get your keys.",
      "Get Started",
      [
        sectionComponent("TestimonialBlock", "Mortgage Testimonial", {
          quote: "Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer — never felt rushed.",
          authorName: "Marcus Webb",
          authorRole: "First-time buyer, Bristol",
        }),
        sectionComponent("CalloutBlock", "Mortgage Risk Warning", {
          variant: "warning",
          label: "Important",
          body: { html: "<p>Your home may be repossessed if you do not keep up repayments on your mortgage. Make sure you can afford the repayments before you apply.</p>" },
        }),
      ]
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
    nodes: buildProductPage(
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
      "The Mosey current account is designed for modern life. Open in 10 minutes with just your phone and a valid ID — no branch visit required. Manage everything from the app: move money, set up direct debits, pay bills, and speak to a real person via in-app chat seven days a week.",
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
    nodes: buildProductPage(
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
      [
        gridSection("Savings Stats", [
          elementComponent("StatsCounterBlock", "AER Stat", { value: "5.1", suffix: "%", label: "AER fixed rate" }),
          elementComponent("StatsCounterBlock", "AER Easy Stat", { value: "4.6", suffix: "%", label: "AER easy access" }),
          elementComponent("StatsCounterBlock", "Protection Stat", { value: "85", suffix: "K", label: "FSCS protection per person" }),
          elementComponent("StatsCounterBlock", "Open Stat", { value: "10", suffix: " min", label: "To open an account" }),
        ]),
        sectionComponent("TestimonialBlock", "Savings Testimonial", {
          quote: "I moved my savings to Mosey after seeing the 5.1% fixed rate. The transfer took less than a day and the app makes it easy to watch my interest grow.",
          authorName: "Sarah Chen",
          authorRole: "Mosey customer",
        }),
      ]
    ),
  },

  {
    key: PAGE_KEYS.businessBanking,
    displayName: "Business Banking",
    routeSegment: "business-banking",
    container: PAGE_KEYS.business,
    nodes: buildProductPage(
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
      "Mosey Business Banking is designed for the way modern businesses actually work — online, mobile-first, and integrated with the tools you already use.",
      "Open a Business Account",
      [
        sectionComponent("TestimonialBlock", "Business Testimonial", {
          quote: "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless — invoices reconcile automatically.",
          authorName: "Tom Hartley",
          authorRole: "Director, Hartley & Co.",
        }),
      ]
    ),
  },

  {
    key: PAGE_KEYS.contact,
    displayName: "Contact Us",
    routeSegment: "contact",
    container: PAGE_KEYS.help,
    // Native Optimizely forms (OptiFormsContainerData + element types) must be created
    // and placed via Visual Builder — the Management API cannot create them.
    // After seeding: go to Settings > Forms Settings > Activate, create a form in the
    // CMS form builder (set Submit URL to /api/form-submit), then drag it onto this
    // page in Visual Builder.
    nodes: [
      sectionComponent("SectionHeadingBlock", "Contact Heading", {
        heading: "Get in touch",
        subheading: "Have a question or need help with your account? Fill out the form and we'll get back to you within one business day.",
      }),
    ],
  },

  // ── Level-2: Mortgage sub-pages (children of mortgage) ───────────────────

  {
    key: PAGE_KEYS.firstTimeBuyers,
    displayName: "First-Time Buyers",
    routeSegment: "first-time-buyers",
    container: PAGE_KEYS.mortgage,
    nodes: buildProductPage(
      "First Home",
      "First-Time Buyers",
      "Getting on the ladder is a big deal. We make the mortgage part as simple as possible.",
      "Get a Decision in Principle",
      "/en/mortgage",
      [
        { title: "5% deposit mortgages", description: "We offer mortgages with as little as a 5% deposit for first-time buyers purchasing their primary residence." },
        { title: "Government scheme support", description: "Our advisors are experts in Help to Buy, Shared Ownership, and the Lifetime ISA. We'll help you use every available scheme." },
        { title: "No arrangement fee", description: "Choose a mortgage with no upfront arrangement fee — keeping your costs down when every pound counts." },
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
    nodes: buildProductPage(
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
    nodes: buildProductPage(
      "Faster Payments",
      "Instant Payments",
      "Send and receive money in seconds, 24 hours a day, 365 days a year. No delays, no cut-off times.",
      "Open an Account",
      "/en/personal/current-account",
      [
        { title: "Faster Payments", description: "Send money to any UK bank account in seconds via the Faster Payments network. Available around the clock." },
        { title: "Standing orders", description: "Set up regular payments on any schedule — weekly, monthly, or on a custom date — and manage them entirely in the app." },
        { title: "Direct debits", description: "Authorise and cancel direct debits in the app. See what's due before it leaves your account." },
        { title: "International transfers", description: "Send money abroad with real exchange rates and low fees. Track your transfer every step of the way." },
      ],
      "Modern banking means money moves at your speed — not the bank's. Mosey uses the UK Faster Payments network so transfers reach their destination in seconds, not hours.",
      "Open an Account"
    ),
  },

  {
    key: PAGE_KEYS.mobileApp,
    displayName: "Mobile App",
    routeSegment: "mobile-app",
    container: PAGE_KEYS.currentAccount,
    nodes: buildProductPage(
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
    nodes: buildProductPage(
      "Travel",
      "Travel Money",
      "Spend abroad with no foreign transaction fees and real exchange rates. Your card works in 200+ countries.",
      "Open an Account",
      "/en/personal/current-account",
      [
        { title: "No foreign transaction fees", description: "Use your Mosey card anywhere in the world and we'll never add a foreign transaction or currency conversion fee." },
        { title: "Real exchange rates", description: "We use the mid-market exchange rate — the same one you see on Google. No hidden markup." },
        { title: "Worldwide ATM withdrawals", description: "Withdraw up to £200 abroad per month for free. After that, a flat £1 fee per withdrawal — never a percentage." },
        { title: "Instant notifications abroad", description: "Get notified the moment your card is used abroad. Spot unauthorised transactions immediately and freeze your card in one tap." },
      ],
      "Mosey current account holders get excellent foreign exchange as standard — no add-on needed. Whether you're travelling for a weekend or living abroad, your card works the same way it does at home.",
      "Open an Account"
    ),
  },

  // ── Level-3: Savings sub-pages ────────────────────────────────────────────

  {
    key: PAGE_KEYS.easyAccessSavings,
    displayName: "Easy Access Savings",
    routeSegment: "easy-access-savings",
    container: PAGE_KEYS.savings,
    nodes: buildProductPage(
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
    nodes: buildProductPage(
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
    nodes: buildProductPage(
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
    nodes: buildProductPage(
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
];

/** Keys of items that could not be deleted (e.g. homepage / start page). */
const undeletableKeys = new Map<string, string>(); // displayName → existing CMS key

const GRAPH_ENDPOINT = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

/** Find the CMS key of whichever DynamicExperience is served at the root URL. */
async function findHomepageKey(): Promise<string | null> {
  const query = `{ _Page(where:{_metadata:{url:{default:{in:["/","/en/","/en/homepage/"]}}}},limit:3) { items { _metadata { key } } } }`;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const { data } = await res.json() as { data?: { _Page?: { items?: Array<{ _metadata?: { key?: string } }> } } };
  return data?._Page?.items?.[0]?._metadata?.key ?? null;
}

async function createPage(page: PageDef): Promise<void> {
  const token = await getManagementToken();

  const composition = {
    id: uid(),
    displayName: page.displayName,
    nodeType: "experience",
    layoutType: "outline",
    nodes: page.nodes,
  };

  // Homepage has no routeSegment — always update the existing start page at /
  // rather than creating a duplicate at /en/homepage/. CONTAINER itself may be the
  // start page (e.g. ONBOARDING), so fall back to CONTAINER when Graph hasn't indexed
  // the start page yet (Graph indexing lag of ~30-60s on fresh instances).
  //
  // We create a brand-new draft version carrying our composition, then publish it —
  // instead of PATCHing the latest version. The latest version is often already
  // published (which cannot be patched), and creating a draft by copying it fails
  // when that published composition references pages this run just deleted. Posting
  // a fresh version with our own composition sidesteps both problems.
  if (!page.routeSegment) {
    const graphKey = (await findHomepageKey()) ?? (CONTAINER || null);
    if (graphKey) {
      const createRes = await fetchRetry(`${CONTENT_ENDPOINT}/${graphKey}/versions?locale=en`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: page.displayName,
          composition,
          ...(page.properties ? { properties: wrapProps(page.properties) } : {}),
        }),
      });
      if (createRes.ok) {
        // v1 API may return an empty body — look up the version separately.
        const createBody = await createRes.text();
        let newVersion: string | undefined;
        if (createBody.trim()) {
          newVersion = (JSON.parse(createBody) as { version?: string }).version;
        }
        if (!newVersion) {
          const vRes = await fetchRetry(`${CONTENT_ENDPOINT}/${graphKey}/versions?pageSize=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (vRes.ok) {
            const vData = await vRes.json() as { items?: Array<{ version?: string }> };
            newVersion = vData.items?.[0]?.version;
          }
        }
        if (newVersion) {
          await fetchRetry(`${CONTENT_ENDPOINT}/${graphKey}/versions/${newVersion}:publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        console.log(`  [updated] ${page.displayName} → key=${graphKey} route=/ (new version ${newVersion ?? "?"})`);
        return;
      }
      const createText = await createRes.text();
      console.warn(`  [warn] Create homepage draft: ${createRes.status} ${createText.slice(0, 200)}`);
      console.warn(`  [warn] Could not update homepage at key=${graphKey} — update it manually in Visual Builder.`);
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
      console.log(`  [skipped] ${page.displayName} — key already exists (409)`);
      return;
    }
    if (res.status === 400 && text.includes("is already in use")) {
      console.log(`  [skipped] ${page.displayName} — routeSegment already in use (existing start page)`);
      return;
    }
    console.error(`  [ERROR] ${page.displayName}: ${res.status} ${text.slice(0, 400)}`);
    throw new Error(`Create page failed: ${res.status}`);
  }

  let contentKey: string = page.key;
  let versionId: string | undefined;

  if (!text.trim()) {
    // v1 API returns 201 with no body for some content types — look up the version separately.
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

  const data = await res.json() as { items?: Array<{ key: string }> };
  for (const item of data.items ?? []) await permanentDelete(item.key);
}

/** Delete stale standalone/shared blocks under the global root so re-seeds don't
 *  accumulate duplicates. Deletes ONLY managed block types (never pages, folders,
 *  native forms, or unknown content) and preserves the stable-key FAQ items to
 *  avoid the same-key recreate race. */
async function cleanSharedBlocks(globalRoot: string): Promise<void> {
  const token = await getManagementToken();
  const preserve = new Set(FAQ_ITEMS.map((i) => i.key));

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
  CONTAINER = await discoverRootContainer();
  BLOCKS_CONTAINER = await discoverGlobalRoot();
  console.log(`  container: ${CONTAINER}`);
  console.log(`  blocks container (For All Applications): ${BLOCKS_CONTAINER}`);

  console.log("\n--- Cleaning existing content ---");
  await deleteExisting();
  // Also sweep stale shared blocks under the global root (legacy duplicates +
  // prior-run blocks). Runs first so the other seeds recreate blocks cleanly.
  await cleanSharedBlocks(BLOCKS_CONTAINER);

  // Wait for CMS to free up routeSegments from deleted pages before re-creating
  console.log("\n  Waiting 8s for routeSegments to be released...");
  await new Promise((r) => setTimeout(r, 8000));

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

  // Create the shared standalone FAQ items before the homepage so its
  // FaqContainerBlock node can reference them. seed-faqs.ts reuses the same
  // items (same stable keys) for the FAQs page — editing one updates both.
  console.log(`\n--- Creating ${FAQ_ITEMS.length} shared FAQ items ---`);
  // Create as drafts (skipPublish), then publish in a second pass. Publishing a
  // version immediately after creating it can 404 if the write hasn't committed
  // yet; separating the passes lets each item settle before we publish it.
  for (const item of FAQ_ITEMS) {
    await createContent({
      key: item.key,
      contentType: "FaqItemBlock",
      container: BLOCKS_CONTAINER,
      locale: "en",
      displayName: item.displayName,
      properties: { question: item.question, answer: item.answer },
    }, item.displayName, { skipPublish: true });
  }
  // Guarantee every item is published before the homepage references them —
  // an unpublished item makes the homepage's faqItems reference unresolvable.
  for (const item of FAQ_ITEMS) await ensurePublished(item.key);

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
