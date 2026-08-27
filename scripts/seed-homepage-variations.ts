/**
 * Creates New Visitor, Personal, and Business homepage variations in Optimizely SaaS CMS.
 *
 * These variations are served by Graph when an FX variation key matches:
 *   - "new_visitor" → New Visitor homepage (default experience)
 *   - "personal"    → Personal Banking homepage
 *   - "business"    → Business Banking homepage
 *   - "mortgages"   → Mortgages homepage
 *   - "investments" → Investments homepage
 *
 * The active variation is chosen from the `persona` FX attribute, which is set
 * from the section the visitor last browsed (see src/lib/segment.ts).
 *
 * Prerequisites:
 *   1. Run seed-content.ts first so the homepage exists in the CMS.
 *   2. Set OPTIMIZELY_CMS_CLIENT_ID and OPTIMIZELY_CMS_CLIENT_SECRET in .env.local.
 *      Also set OPTIMIZELY_GRAPH_GATEWAY and OPTIMIZELY_GRAPH_SINGLE_KEY.
 *
 * Run:
 *   OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/seed-homepage-variations.ts
 *
 * If the Management API rejects the variation field, follow the fallback instructions
 * printed at the end of the run to create variations manually in the Visual Builder.
 */

import { config } from "dotenv";
import { randomUUID } from "crypto";
import { getManagementToken } from "../src/lib/optimizely/auth";
import { discoverRootContainer, wrapProps, pageRefForUrl } from "./_shared";

config({ path: ".env.local" });

const API_BASE = "https://api.cms.optimizely.com";
const CONTENT_ENDPOINT = `${API_BASE}/v1/content`;
let CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";

const GRAPH_ENDPOINT = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

// Composition node builders (same as seed-content.ts)

interface DisplaySettings {
  displayTemplate: string;
  settings: Record<string, string>;
}

interface CompNode {
  id: string;
  displayName: string;
  nodeType: string;
  component?: { contentType: string; properties: Record<string, unknown> };
  nodes?: CompNode[];
  layoutType?: string;
  displaySettings?: DisplaySettings;
}

function uid(): string {
  return randomUUID();
}

// Base-matching display settings. The base homepage's nodes carry NO display settings, so
// they render with the renderer's plain defaults (BlankSection.tsx GAP.default = gap-8;
// SectionHeadingBlock renders plain when background is "transparent"). Creating a variation
// in Visual Builder instead stamps each node with its default display template, whose defaults
// differ - the row gap comes out "compact" (gap-4) and the section heading "white" (a boxed
// card). No seed sets displaySettings, so variations inherit those VB defaults and look off.
// Setting these explicitly keeps a seeded variation visually consistent with the base homepage.
const ROW_DISPLAY_SETTINGS: DisplaySettings = {
  displayTemplate: "DefaultRowTemplate",
  settings: { gap: "default", verticalAlign: "top", maxWidth: "default", reverse: "False" },
};

// Per-block display settings that reproduce the base's plain look. Keyed by content type;
// only blocks that need an explicit override to match the base are listed.
const PLAIN_BLOCK_DISPLAY_SETTINGS: Record<string, DisplaySettings> = {
  SectionHeadingBlock: {
    displayTemplate: "SectionHeadingDefaultTemplate",
    settings: { background: "transparent", showAccent: "False", headingSize: "xl", textAlign: "left", fontStyle: "modern" },
  },
};

function elementComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "component",
    component: { contentType, properties: wrapProps(properties) },
    ...(PLAIN_BLOCK_DISPLAY_SETTINGS[contentType] && {
      displaySettings: PLAIN_BLOCK_DISPLAY_SETTINGS[contentType],
    }),
  };
}

function gridSection(displayName: string, items: CompNode[]): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "section",
    layoutType: "grid",
    component: { contentType: "BlankSection", properties: {} },
    nodes: [
      {
        id: uid(),
        displayName: "Row",
        nodeType: "row",
        displaySettings: ROW_DISPLAY_SETTINGS,
        nodes: items.map((item) => ({
          id: uid(),
          displayName: "Column",
          nodeType: "column",
          nodes: [item],
        })),
      },
    ],
  };
}

function sectionComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return gridSection(displayName, [
    elementComponent(contentType, displayName, properties),
  ]);
}

function rootComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "component",
    component: { contentType, properties: wrapProps(properties) },
    ...(PLAIN_BLOCK_DISPLAY_SETTINGS[contentType] && {
      displaySettings: PLAIN_BLOCK_DISPLAY_SETTINGS[contentType],
    }),
  };
}

// Which hero content type this instance has. Most instances carry the legacy `Hero`
// type (heading/summary/theme) whose "dark" theme drives the styled homepage hero; some
// instances (e.g. joshCMS) only have `HeroBlock` (headline/subheadline, no theme).
// Detected once in main() so the composition uses whichever the instance actually has.
let HERO_CONTENT_TYPE: "Hero" | "HeroBlock" = "Hero";

// Builds the hero node using whichever type the instance has. On `Hero` the theme drives
// the dark styling; `HeroBlock` has no theme (that instance's base homepage is plain too).
function heroComponent(
  displayName: string,
  { headline, subheadline }: { headline: string; subheadline: string }
): CompNode {
  const properties =
    HERO_CONTENT_TYPE === "Hero"
      ? { heading: headline, summary: subheadline, theme: "dark" }
      : { headline, subheadline };
  return rootComponent(HERO_CONTENT_TYPE, displayName, properties);
}

async function detectHeroType(token: string): Promise<"Hero" | "HeroBlock"> {
  const res = await fetch(`${API_BASE}/v1/contenttypes/Hero`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? "Hero" : "HeroBlock";
}

// Variation compositions

async function buildPersonalVariation(): Promise<CompNode[]> {
  const ctaRef = await pageRefForUrl("/en/personal/current-account");
  return [
    heroComponent("Personal Hero", {
      headline: "Banking built around you",
      subheadline:
        "Your salary, your savings goals, your mortgage - all in one app, with the rates and tools to make each one work harder for you.",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Your money, your milestones",
      subheading:
        "Whether you're saving for a house deposit, paying off your mortgage early, or building a nest egg - Mosey keeps up with you.",
    }),
    gridSection("Personal Product Cards", [
      elementComponent("ProductCardBlock", "Current Account Card", {
        icon: "account",
        title: "Current Account",
        description:
          "Fee-free with instant spending notifications, smart round-ups into savings, and no surprise charges - ever.",
        linkUrl: "/en/current-account",
        linkText: "Open an account →",
      }),
      elementComponent("ProductCardBlock", "Savings Card", {
        icon: "savings",
        title: "Savings",
        description:
          "Easy-access at 4.6% AER or a 12-month fix at 5.1% AER. FSCS protected. Set a goal and track it in the app.",
        linkUrl: "/en/savings",
        linkText: "View savings rates →",
      }),
      elementComponent("ProductCardBlock", "Mortgage Card", {
        icon: "mortgage",
        title: "Mortgage",
        description:
          "Decision in principle in 10 minutes. One advisor from application to key handover - no being passed around.",
        linkUrl: "/en/mortgage",
        linkText: "Check your rate →",
      }),
      elementComponent("ProductCardBlock", "Investments Card", {
        icon: "savings",
        title: "Stocks & Shares ISA",
        description:
          "Put up to £20,000 a year to work tax-free. Ready-made portfolios or self-select - start from £25 a month.",
        linkUrl: "/en/investments",
        linkText: "Start investing →",
      }),
    ]),
    gridSection("Personal Stats", [
      elementComponent("StatsCounterBlock", "Customers Stat", {
        value: "2",
        suffix: "M+",
        label: "Personal customers",
      }),
      elementComponent("StatsCounterBlock", "Savings Stat", {
        value: "5.1",
        suffix: "%",
        label: "AER fixed savings rate",
      }),
      elementComponent("StatsCounterBlock", "Mortgage Stat", {
        value: "10",
        suffix: " min",
        label: "Mortgage decision in principle",
      }),
      elementComponent("StatsCounterBlock", "App Stat", {
        value: "4.8",
        suffix: "★",
        label: "App Store rating",
      }),
    ]),
    sectionComponent("TestimonialBlock", "Personal Testimonial", {
      quote:
        "I got my mortgage decision in principle on a Saturday morning, then opened a fixed savings account the same afternoon. Both through the same app, no branch visits, no phone queues.",
      authorName: "Sarah Chen",
      authorRole: "Mosey personal customer",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "2 million people manage their whole financial life with Mosey",
      subheading:
        "Current accounts, savings, mortgages, and investments - one app, one login, one place to see it all.",
      logos: [],
    }),
    sectionComponent("CallToAction", "Personal CTA", {
      label: "Open a personal account today",
      link: ctaRef,
    }),
  ];
}

async function buildBusinessVariation(): Promise<CompNode[]> {
  const ctaRef = await pageRefForUrl("/en/business/business-banking");
  return [
    heroComponent("Business Hero", {
      headline: "Banking built for business",
      subheadline:
        "Multi-user access, instant reconciliation with Xero and QuickBooks, and lending decisions in 48 hours - built for businesses that can't afford friction.",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Every financial tool your business needs",
      subheading:
        "From day-one fee-free banking to £500K lending - Mosey Business scales with you without adding complexity.",
    }),
    gridSection("Business Product Cards", [
      elementComponent("ProductCardBlock", "Business Account Card", {
        icon: "business",
        title: "Business Current Account",
        description:
          "Fee-free for 12 months. Unlimited UK transactions, multi-user access with role permissions, and Xero/QuickBooks sync built in.",
        linkUrl: "/en/business-banking",
        linkText: "Open a business account →",
      }),
      elementComponent("ProductCardBlock", "Business Lending Card", {
        icon: "savings",
        title: "Business Lending",
        description:
          "Loans from £10,000 to £500,000 and flexible overdrafts to smooth out cash flow. Credit decisions in 48 hours, not 48 days.",
        linkUrl: "/en/business-lending",
        linkText: "Apply for finance →",
      }),
      elementComponent("ProductCardBlock", "Merchant Services Card", {
        icon: "account",
        title: "Merchant Services",
        description:
          "Accept card payments in-store or online at 0.35% per transaction. Next-day settlement with full reporting in the dashboard.",
        linkUrl: "/en/business-banking",
        linkText: "Start accepting payments →",
      }),
      elementComponent("ProductCardBlock", "Payroll Card", {
        icon: "mortgage",
        title: "Business Payroll",
        description:
          "Run payroll from your business account. Automated PAYE calculations, instant employee transfers, and HMRC submissions handled for you.",
        linkUrl: "/en/business-banking",
        linkText: "Set up payroll →",
      }),
    ]),
    gridSection("Business Stats", [
      elementComponent("StatsCounterBlock", "Businesses Stat", {
        value: "120",
        suffix: "K+",
        label: "Businesses banking with us",
      }),
      elementComponent("StatsCounterBlock", "Lending Stat", {
        value: "£8",
        suffix: "B+",
        label: "Business lending approved",
      }),
      elementComponent("StatsCounterBlock", "FX Stat", {
        value: "0.35",
        suffix: "%",
        label: "FX transaction fee",
      }),
      elementComponent("StatsCounterBlock", "Support Stat", {
        value: "24",
        suffix: "/7",
        label: "Dedicated business support",
      }),
    ]),
    sectionComponent("TestimonialBlock", "Business Testimonial", {
      quote:
        "Switching took 20 minutes. Our invoices now reconcile automatically with Xero and our accountant stopped chasing us for bank statements - that alone saved us hours a month.",
      authorName: "Tom Hartley",
      authorRole: "Director, Hartley & Co.",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "120,000 UK businesses run their finances through Mosey",
      subheading:
        "Sole traders, growing SMEs, and multi-location operations - Mosey Business adapts to how you work, not the other way around.",
      logos: [],
    }),
    sectionComponent("CallToAction", "Business CTA", {
      label: "Open a business account today",
      link: ctaRef,
    }),
  ];
}

async function buildNewVisitorVariation(): Promise<CompNode[]> {
  const ctaRef = await pageRefForUrl("/en/personal/current-account");
  return [
    heroComponent("New Visitor Hero", {
      headline: "See what everyone's banking on",
      subheadline:
        "Join 2 million people who switched to Mosey for fee-free accounts, market-leading savings rates, and a mortgage experience that doesn't feel like hard work.",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Everything you need in one place",
      subheading:
        "Whether you're opening your first account or switching from another bank - we make it straightforward.",
    }),
    gridSection("New Visitor Product Cards", [
      elementComponent("ProductCardBlock", "Get Started Card", {
        icon: "account",
        title: "Open an Account",
        description:
          "A fee-free current account in 10 minutes, from your phone. No paperwork, no branch visit, no monthly fees.",
        linkUrl: "/en/current-account",
        linkText: "Open an account →",
      }),
      elementComponent("ProductCardBlock", "Savings Card", {
        icon: "savings",
        title: "Start Saving",
        description:
          "Put your money to work from day one. Easy-access at 4.6% AER or fix for 12 months at 5.1% AER.",
        linkUrl: "/en/savings",
        linkText: "View savings rates →",
      }),
      elementComponent("ProductCardBlock", "Mortgage Card", {
        icon: "mortgage",
        title: "Get a Mortgage",
        description:
          "Decision in principle in 10 minutes. Our advisors handle the rest - from application to key handover.",
        linkUrl: "/en/mortgage",
        linkText: "Check your rate →",
      }),
      elementComponent("ProductCardBlock", "Business Card", {
        icon: "business",
        title: "Business Banking",
        description:
          "Running a business? Fee-free for 12 months, integrates with Xero and QuickBooks, and lending decisions in 48 hours.",
        linkUrl: "/en/business-banking",
        linkText: "Open a business account →",
      }),
    ]),
    gridSection("New Visitor Stats", [
      elementComponent("StatsCounterBlock", "Customers Stat", {
        value: "2",
        suffix: "M+",
        label: "Customers",
      }),
      elementComponent("StatsCounterBlock", "Open Stat", {
        value: "10",
        suffix: " min",
        label: "To open an account",
      }),
      elementComponent("StatsCounterBlock", "App Stat", {
        value: "4.8",
        suffix: "★",
        label: "App Store rating",
      }),
      elementComponent("StatsCounterBlock", "Protection Stat", {
        value: "85",
        suffix: "K",
        label: "FSCS protection",
      }),
    ]),
    sectionComponent("TestimonialBlock", "New Visitor Testimonial", {
      quote:
        "I opened my Mosey account on a lunch break. By the time I got back to my desk my card was ordered and my old bank's direct debits were already switched over.",
      authorName: "Priya Sharma",
      authorRole: "New Mosey customer",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "2 million people already made the switch",
      subheading:
        "Personal, business, savings, mortgages - all in one app, all with the same straightforward approach.",
      logos: [],
    }),
    sectionComponent("CallToAction", "New Visitor CTA", {
      label: "Open a free account today",
      link: ctaRef,
    }),
  ];
}

async function buildMortgagesVariation(): Promise<CompNode[]> {
  const ctaRef = await pageRefForUrl("/en/mortgage");
  return [
    heroComponent("Mortgages Hero", {
      headline: "A mortgage that moves at your pace",
      subheadline:
        "Decision in principle in 10 minutes, rates from 4.19% fixed, and an advisor by your side from application to key handover.",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Mortgages for every move",
      subheading:
        "Whether you're buying your first home, remortgaging, or building a portfolio - we make the numbers simple.",
    }),
    gridSection("Mortgages Product Cards", [
      elementComponent("ProductCardBlock", "First Time Buyer Card", {
        icon: "mortgage",
        title: "First-Time Buyers",
        description:
          "Deposits from 5%, first-time-buyer rates, and a step-by-step guide from offer to moving day.",
        linkUrl: "/en/mortgage",
        linkText: "Check your rate →",
      }),
      elementComponent("ProductCardBlock", "Remortgage Card", {
        icon: "savings",
        title: "Remortgaging",
        description:
          "Switch and save when your fixed rate ends. See what you could save in minutes with no obligation.",
        linkUrl: "/en/mortgage",
        linkText: "Compare deals →",
      }),
      elementComponent("ProductCardBlock", "Buy To Let Card", {
        icon: "business",
        title: "Buy-to-Let",
        description:
          "Competitive landlord rates and lending decisions built around rental yield, not just salary.",
        linkUrl: "/en/mortgage",
        linkText: "Explore buy-to-let →",
      }),
      elementComponent("ProductCardBlock", "Overpayments Card", {
        icon: "account",
        title: "Overpayments",
        description:
          "Overpay up to 10% a year with no penalty and watch your term - and your interest - shrink.",
        linkUrl: "/en/mortgage",
        linkText: "See how it works →",
      }),
    ]),
    gridSection("Mortgages Stats", [
      elementComponent("StatsCounterBlock", "Rate Stat", {
        value: "4.19",
        suffix: "%",
        label: "Fixed rate from",
      }),
      elementComponent("StatsCounterBlock", "Decision Stat", {
        value: "10",
        suffix: " min",
        label: "Decision in principle",
      }),
      elementComponent("StatsCounterBlock", "Deposit Stat", {
        value: "5",
        suffix: "%",
        label: "Minimum deposit",
      }),
      elementComponent("StatsCounterBlock", "Approved Stat", {
        value: "50",
        suffix: "K+",
        label: "Mortgages approved",
      }),
    ]),
    sectionComponent("TestimonialBlock", "Mortgages Testimonial", {
      quote:
        "We got our decision in principle before we'd finished our coffee. Our advisor handled the paperwork and we picked up the keys six weeks later.",
      authorName: "James & Amelia Okafor",
      authorRole: "First-time buyers",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "50,000 homes bought and remortgaged with Mosey",
      subheading:
        "From first homes to buy-to-let portfolios - straightforward mortgages with a real advisor behind them.",
      logos: [],
    }),
    sectionComponent("CallToAction", "Mortgages CTA", {
      label: "Get a decision in principle",
      link: ctaRef,
    }),
  ];
}

async function buildInvestmentsVariation(): Promise<CompNode[]> {
  const ctaRef = await pageRefForUrl("/en/investments");
  return [
    heroComponent("Investments Hero", {
      headline: "Investing, made straightforward",
      subheadline:
        "Stocks & Shares ISAs, pensions, and ready-made portfolios - low fees, tax-efficient, and built for the long term.",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Grow your money with confidence",
      subheading:
        "Whether you're opening your first ISA or consolidating pensions, put your money to work with clear, low fees.",
    }),
    gridSection("Investments Product Cards", [
      elementComponent("ProductCardBlock", "Stocks ISA Card", {
        icon: "savings",
        title: "Stocks & Shares ISA",
        description:
          "Invest up to £20,000 a year tax-free in ready-made or self-select portfolios. Start from £25 a month.",
        linkUrl: "/en/investments",
        linkText: "Open an ISA →",
      }),
      elementComponent("ProductCardBlock", "Pensions Card", {
        icon: "account",
        title: "Pensions",
        description:
          "Consolidate old pensions into one clear plan, claim tax relief, and track it all in the app.",
        linkUrl: "/en/investments",
        linkText: "Plan your pension →",
      }),
      elementComponent("ProductCardBlock", "Junior ISA Card", {
        icon: "mortgage",
        title: "Junior ISA",
        description:
          "Give your children a tax-free head start. Invest up to £9,000 a year that's theirs at 18.",
        linkUrl: "/en/investments",
        linkText: "Start a Junior ISA →",
      }),
      elementComponent("ProductCardBlock", "General Investment Card", {
        icon: "business",
        title: "General Investment",
        description:
          "No allowance limits and full flexibility for when you've used your ISA and pension allowances.",
        linkUrl: "/en/investments",
        linkText: "Explore investing →",
      }),
    ]),
    gridSection("Investments Stats", [
      elementComponent("StatsCounterBlock", "Fee Stat", {
        value: "0.25",
        suffix: "%",
        label: "Annual platform fee",
      }),
      elementComponent("StatsCounterBlock", "Allowance Stat", {
        value: "20",
        suffix: "K",
        label: "Tax-free ISA allowance",
      }),
      elementComponent("StatsCounterBlock", "Start Stat", {
        value: "25",
        suffix: "/mo",
        label: "Start investing from",
      }),
      elementComponent("StatsCounterBlock", "Investors Stat", {
        value: "300",
        suffix: "K+",
        label: "Investors on the platform",
      }),
    ]),
    sectionComponent("TestimonialBlock", "Investments Testimonial", {
      quote:
        "I moved three old pensions into one Mosey plan in an afternoon. Seeing everything in one place - and the low fees - completely changed how I think about retirement.",
      authorName: "Elena Rossi",
      authorRole: "Mosey investor",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "£4bn invested by 300,000 Mosey customers",
      subheading:
        "ISAs, pensions, and general investing - tax-efficient, low-fee, and simple to manage from your phone.",
      logos: [],
    }),
    sectionComponent("CallToAction", "Investments CTA", {
      label: "Start investing today",
      link: ctaRef,
    }),
  ];
}

// Graph - find homepage key

async function findHomepageKey(): Promise<string | null> {
  if (!SINGLE_KEY) return null;
  const query = `{
    _Page(
      where: { _metadata: { url: { default: { in: ["/", "/en/", "/en/homepage/"] } } } }
      limit: 3
    ) {
      items { _metadata { key } }
    }
  }`;
  try {
    const res = await fetch(GRAPH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const { data } = await res.json() as {
      data?: { _Page?: { items?: Array<{ _metadata?: { key?: string } }> } };
    };
    return data?._Page?.items?.[0]?._metadata?.key ?? null;
  } catch {
    return null;
  }
}

// Create variation

interface VariationDef {
  variationKey: string;
  displayName: string;
  nodes: CompNode[];
}

async function createVariation(
  homepageKey: string,
  token: string,
  variation: VariationDef
): Promise<boolean> {
  const composition = {
    id: uid(),
    displayName: variation.displayName,
    nodeType: "experience",
    layoutType: "outline",
    nodes: variation.nodes,
  };

  // Attempt 1: POST a new content item with variation field inside initialVersion.
  const res1 = await fetch(CONTENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      contentType: "DynamicExperience",
      container: CONTAINER,
      initialVersion: {
        locale: "en",
        displayName: variation.displayName,
        variation: variation.variationKey,
        composition,
      },
    }),
  });

  if (res1.ok) {
    const result = await res1.json() as Record<string, unknown>;
    const versionId = ((result.initialVersion as Record<string, unknown> | undefined)?.version) as string | undefined;
    if (versionId) {
      await fetch(`${CONTENT_ENDPOINT}/${result.key as string}/versions/${versionId}:publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    console.log(`  [created] ${variation.displayName} → key=${result.key as string} (variation field on POST)`);
    return true;
  }

  const err1 = await res1.text();
  console.warn(`  [attempt 1 failed] POST with variation field: ${res1.status} ${err1.slice(0, 150)}`);

  // Attempt 2: List all versions and find the one whose variation name matches.
  // This works when the variation was created in Visual Builder (each named variation
  // creates its own version). List up to 50 versions and match by the variation field.
  const vRes = await fetch(`${CONTENT_ENDPOINT}/${homepageKey}/locales/en?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  type VersionItem = { version?: string; variation?: string; status?: string };
  const versions: VersionItem[] = vRes.ok
    ? ((await vRes.json() as { items?: VersionItem[] }).items ?? [])
    : [];

  // Find a draft version whose variation field matches the target key.
  const matched = versions.find((v) => v.variation === variation.variationKey && v.status !== "published")
    ?? versions.find((v) => v.variation === variation.variationKey);

  const versionId = matched?.version;

  if (!versionId) {
    console.warn(`  [attempt 2 skipped] no version found with variation="${variation.variationKey}" for key=${homepageKey}`);
    console.warn(`  [hint] Create the variation in Visual Builder first, then re-run this script.`);
    return false;
  }
  console.log(`  [found] version ${versionId} (variation="${variation.variationKey}", status=${matched?.status})`);


  const res2 = await fetch(`${CONTENT_ENDPOINT}/${homepageKey}/versions/${versionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ displayName: variation.displayName, composition }),
  });

  if (res2.ok) {
    const patchText = await res2.text();
    const patched = patchText.trim() ? JSON.parse(patchText) as { version?: string; status?: string } : {};
    const publishVersion = (patched.version as string | undefined) ?? versionId;
    const patchedStatus = patched.status as string | undefined;
    if (!patchedStatus || patchedStatus !== "published") {
      const pubRes = await fetch(`${CONTENT_ENDPOINT}/${homepageKey}/versions/${publishVersion}:publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pubRes.ok) {
        const pubErr = await pubRes.text();
        console.warn(`  [warn] publish returned ${pubRes.status}: ${pubErr.slice(0, 150)}`);
      }
    }
    console.log(`  [patched] ${variation.displayName} → applied composition to key=${homepageKey}, version=${publishVersion}`);
    return true;
  }

  const err2 = await res2.text();
  console.warn(`  [attempt 2 failed] PATCH version: ${res2.status} ${err2.slice(0, 150)}`);

  return false;
}

async function main() {
  console.log("=== Homepage Variation Seeding ===\n");

  CONTAINER = await discoverRootContainer();
  console.log(`  container: ${CONTAINER}\n`);

  console.log("[graph] Looking up homepage key…");
  const homepageKey = await findHomepageKey();
  if (!homepageKey) {
    console.warn("[warn] Could not find homepage key from Graph. Make sure seed-content.ts has run and Graph has indexed it.");
    console.warn("[warn] Set OPTIMIZELY_GRAPH_SINGLE_KEY in .env.local if missing.");
    printFallbackInstructions();
    process.exit(1);
  }
  console.log(`[graph] Homepage key: ${homepageKey}\n`);

  const token = await getManagementToken();

  HERO_CONTENT_TYPE = await detectHeroType(token);
  console.log(`[schema] hero content type on this instance: ${HERO_CONTENT_TYPE}\n`);

  const variations: VariationDef[] = [
    {
      variationKey: "personal",
      displayName: "Homepage – Personal",
      nodes: await buildPersonalVariation(),
    },
    {
      variationKey: "business",
      displayName: "Homepage – Business",
      nodes: await buildBusinessVariation(),
    },
    {
      variationKey: "mortgages",
      displayName: "Homepage – Mortgages",
      nodes: await buildMortgagesVariation(),
    },
    {
      variationKey: "investments",
      displayName: "Homepage – Investments",
      nodes: await buildInvestmentsVariation(),
    },
  ];

  let allSucceeded = true;
  for (const variation of variations) {
    console.log(`[variation] Creating "${variation.displayName}" (key: ${variation.variationKey})…`);
    const ok = await createVariation(homepageKey, token, variation);
    if (!ok) {
      allSucceeded = false;
      console.error(`  [ERROR] Could not create variation "${variation.variationKey}" via Management API.`);
    }
    console.log();
  }

  if (allSucceeded) {
    console.log("=== Done ===");
    console.log("\nVerify in Graph (wait 30-60s for indexing):");
    console.log('  { _Page(where:{_metadata:{url:{default:{eq:"/en/"}}}},variation:{include:SOME,value:["personal"],includeOriginal:true}) { items { __typename _metadata { key } } } }');
    console.log("\nThen test the audience switcher at http://localhost:3000");
  } else {
    console.log("\n=== Some variations failed - see fallback instructions below ===\n");
    printFallbackInstructions();
  }
}

function printFallbackInstructions(): void {
  console.log("\n--- Manual Variation Setup (Visual Builder) ---");
  console.log("\nThe Management API does not support creating CMS variations - use the Visual Builder UI:\n");
  console.log("1. Open the CMS: https://app.cms.optimizely.com");
  console.log("2. Navigate to the Homepage → open in Visual Builder");
  console.log("3. Click the experience root → 'Add variation'");
  console.log("");
  console.log("Variation 1 - name exactly: new_visitor  ← default experience (no cookie)");
  console.log("   Hero: 'See what everyone\\'s banking on'");
  console.log("   Summary: 'Join 2 million people who switched to Mosey for fee-free accounts, market-leading savings rates, and a mortgage experience that doesn\\'t feel like hard work.'");
  console.log("   Products: Open an Account, Start Saving, Get a Mortgage, Business Banking");
  console.log("   Stats: 2M+ Customers, 10 min to open, 4.8★ App, £85K FSCS");
  console.log("   Testimonial: Priya Sharma - 'I opened my Mosey account on a lunch break...'");
  console.log("");
  console.log("Variation 2 - name exactly: personal");
  console.log("   Hero: 'Banking built around you'");
  console.log("   Summary: 'A fee-free current account, savings rates up to 5.1% AER, and mortgages that move at your pace - all in one app.'");
  console.log("   Products: Current Account, Savings, Mortgage, Mobile App");
  console.log("   Stats: 2M+ Customers, 5.1% AER, 4.8★ App, 99.9% Uptime");
  console.log("   Testimonial: Sarah Chen - 'I moved my savings to Mosey after seeing the 5.1% fixed rate...'");
  console.log("");
  console.log("Variation 3 - name exactly: business");
  console.log("   Hero: 'Banking built for business'");
  console.log("   Summary: 'Fee-free business current accounts, competitive lending rates, and payment solutions that scale with you.'");
  console.log("   Products: Business Account, Business Lending, Merchant Services, Business Payroll");
  console.log("   Stats: 120K+ Businesses, £8B+ Lending, 99.9% Uptime, 24/7 Support");
  console.log("   Testimonial: Tom Hartley - 'Opened a business current account in under 15 minutes...'");
  console.log("");
  console.log("Variation 4 - name exactly: mortgages");
  console.log("   Hero: 'A mortgage that moves at your pace'");
  console.log("   Summary: 'Decision in principle in 10 minutes, rates from 4.19% fixed, and an advisor by your side from application to key handover.'");
  console.log("   Products: First-Time Buyers, Remortgaging, Buy-to-Let, Overpayments");
  console.log("   Stats: 4.19% Fixed rate from, 10 min Decision, 5% Min deposit, 50K+ Approved");
  console.log("   Testimonial: James & Amelia Okafor - 'We got our decision in principle before we'd finished our coffee...'");
  console.log("");
  console.log("Variation 5 - name exactly: investments");
  console.log("   Hero: 'Investing, made straightforward'");
  console.log("   Summary: 'Stocks & Shares ISAs, pensions, and ready-made portfolios - low fees, tax-efficient, and built for the long term.'");
  console.log("   Products: Stocks & Shares ISA, Pensions, Junior ISA, General Investment");
  console.log("   Stats: 0.25% Fee, 20K ISA allowance, £25/mo start, 300K+ Investors");
  console.log("   Testimonial: Elena Rossi - 'I moved three old pensions into one Mosey plan in an afternoon...'");
  console.log("");
  console.log("Variation names are case-sensitive and must match FX variation keys exactly.");
  console.log("Publish each variation, wait 30-60s for Graph to index, then test the audience switcher.");
}

main().catch((err) => {
  console.error("\n[ERROR]", err.message);
  printFallbackInstructions();
  process.exit(1);
});
