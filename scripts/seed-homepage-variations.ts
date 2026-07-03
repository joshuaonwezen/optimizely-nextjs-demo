/**
 * Creates New Visitor, Personal, and Business homepage variations in Optimizely SaaS CMS.
 *
 * These variations are served by Graph when an FX variation key matches:
 *   - "new_visitor" → New Visitor homepage (default experience)
 *   - "personal"    → Personal Banking homepage
 *   - "business"    → Business Banking homepage
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
import { discoverRootContainer, wrapProps } from "./_shared";

config({ path: ".env.local" });

const API_BASE = "https://api.cms.optimizely.com";
const CONTENT_ENDPOINT = `${API_BASE}/v1/content`;
let CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";

const GRAPH_ENDPOINT = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

// Composition node builders (same as seed-content.ts)

interface CompNode {
  id: string;
  displayName: string;
  nodeType: string;
  component?: { contentType: string; properties: Record<string, unknown> };
  nodes?: CompNode[];
  layoutType?: string;
}

function uid(): string {
  return randomUUID();
}

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
  };
}

// Variation compositions

function buildPersonalVariation(): CompNode[] {
  return [
    rootComponent("Hero", "Personal Hero", {
      heading: "Banking built around you",
      summary:
        "A fee-free current account, savings rates up to 5.1% AER, and mortgages that move at your pace — all in one app.",
      theme: "dark",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Your personal banking",
      subheading:
        "Everything you need to manage your money, save for the future, and plan the moments that matter.",
    }),
    gridSection("Personal Product Cards", [
      elementComponent("ProductCardBlock", "Current Account Card", {
        icon: "account",
        title: "Current Account",
        description:
          "Fee-free everyday banking with instant notifications, smart spending insights, and no hidden charges.",
        linkUrl: "/en/current-account",
        linkText: "Open an account →",
      }),
      elementComponent("ProductCardBlock", "Savings Card", {
        icon: "savings",
        title: "Savings",
        description:
          "Easy-access at 4.6% AER or fix for 12 months at 5.1% AER. FSCS protected. Open in minutes.",
        linkUrl: "/en/savings",
        linkText: "View savings rates →",
      }),
      elementComponent("ProductCardBlock", "Mortgage Card", {
        icon: "mortgage",
        title: "Mortgage",
        description:
          "Get a decision in principle in 10 minutes. Our advisors guide you from application to key handover.",
        linkUrl: "/en/mortgage",
        linkText: "Get a mortgage →",
      }),
      elementComponent("ProductCardBlock", "Mobile App Card", {
        icon: "business",
        title: "Mobile App",
        description:
          "Rated 4.8 stars. Control your cards, track spending, move money, and chat with support — all from your phone.",
        linkUrl: "/en/mobile-app",
        linkText: "Download the app →",
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
      elementComponent("StatsCounterBlock", "App Stat", {
        value: "4.8",
        suffix: "★",
        label: "App Store rating",
      }),
      elementComponent("StatsCounterBlock", "Uptime Stat", {
        value: "99.9",
        suffix: "%",
        label: "App uptime",
      }),
    ]),
    sectionComponent("TestimonialBlock", "Personal Testimonial", {
      quote:
        "I moved my savings to Mosey after seeing the 5.1% fixed rate. The transfer took less than a day and the app makes it easy to watch my interest grow.",
      authorName: "Sarah Chen",
      authorRole: "Mosey customer",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "Trusted by 2 million personal banking customers",
      subheading:
        "From first current accounts to savings milestones — Mosey customers bank with confidence.",
      logos: [],
    }),
    sectionComponent("CallToAction", "Personal CTA", {
      label: "Open a personal account today",
      link: "/en/current-account",
    }),
  ];
}

function buildBusinessVariation(): CompNode[] {
  return [
    rootComponent("Hero", "Business Hero", {
      heading: "Banking built for business",
      summary:
        "Fee-free business current accounts, competitive lending rates, and payment solutions that scale with you.",
      theme: "dark",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Business banking products",
      subheading:
        "Everything your business needs to manage cash flow, accept payments, and grow with confidence.",
    }),
    gridSection("Business Product Cards", [
      elementComponent("ProductCardBlock", "Business Account Card", {
        icon: "business",
        title: "Business Account",
        description:
          "Fee-free for 12 months. Unlimited UK transactions, multi-user access, and accounting integrations built in.",
        linkUrl: "/en/business-banking",
        linkText: "Open a business account →",
      }),
      elementComponent("ProductCardBlock", "Business Lending Card", {
        icon: "savings",
        title: "Business Lending",
        description:
          "Flexible loans from £10,000 to £500,000 and overdraft facilities to smooth out cash flow. Decisions in 48 hours.",
        linkUrl: "/en/business-lending",
        linkText: "Apply for finance →",
      }),
      elementComponent("ProductCardBlock", "Merchant Services Card", {
        icon: "account",
        title: "Merchant Services",
        description:
          "Accept card payments in-store or online. Competitive rates, next-day settlement, and full reporting in the app.",
        linkUrl: "/en/business-banking",
        linkText: "Start accepting payments →",
      }),
      elementComponent("ProductCardBlock", "Payroll Card", {
        icon: "mortgage",
        title: "Business Payroll",
        description:
          "Run payroll directly from your business account. Automated PAYE, instant transfers, and full HMRC compliance.",
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
        value: "8",
        suffix: "B+",
        label: "Business lending approved",
      }),
      elementComponent("StatsCounterBlock", "Uptime Stat", {
        value: "99.9",
        suffix: "%",
        label: "Platform uptime",
      }),
      elementComponent("StatsCounterBlock", "Support Stat", {
        value: "24",
        suffix: "/7",
        label: "Business support",
      }),
    ]),
    sectionComponent("TestimonialBlock", "Business Testimonial", {
      quote:
        "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless — invoices reconcile automatically.",
      authorName: "Tom Hartley",
      authorRole: "Director, Hartley & Co.",
    }),
    rootComponent("LogoGridBlock", "Trusted By", {
      heading: "Trusted by 120,000 UK businesses",
      subheading:
        "From sole traders to growing SMEs — Mosey Business Banking is built around the way modern businesses work.",
      logos: [],
    }),
    sectionComponent("CallToAction", "Business CTA", {
      label: "Open a business account today",
      link: "/en/business-banking",
    }),
  ];
}

function buildNewVisitorVariation(): CompNode[] {
  return [
    rootComponent("Hero", "New Visitor Hero", {
      heading: "See what everyone's banking on",
      summary:
        "Join 2 million people who switched to Mosey for fee-free accounts, market-leading savings rates, and a mortgage experience that doesn't feel like hard work.",
      theme: "dark",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Everything you need in one place",
      subheading:
        "Whether you're opening your first account or switching from another bank — we make it straightforward.",
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
          "Decision in principle in 10 minutes. Our advisors handle the rest — from application to key handover.",
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
        "Personal, business, savings, mortgages — all in one app, all with the same straightforward approach.",
      logos: [],
    }),
    sectionComponent("CallToAction", "New Visitor CTA", {
      label: "Open a free account today",
      link: "/en/current-account",
    }),
  ];
}

// Graph — find homepage key

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

  // Attempt 2: Find the latest version for the homepage and PATCH with the variation composition.
  // This only works if the variation version already exists (created in Visual Builder) — use
  // GET /locales/en to find it, then PATCH the version and republish.
  const vRes = await fetch(`${CONTENT_ENDPOINT}/${homepageKey}/locales/en?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const versionId = vRes.ok
    ? ((await vRes.json() as { items?: Array<{ version?: string }> }).items?.[0]?.version)
    : undefined;

  if (!versionId) {
    console.warn(`  [attempt 2 skipped] could not find a version for homepage key=${homepageKey}`);
    return false;
  }

  const res2 = await fetch(`${CONTENT_ENDPOINT}/${homepageKey}/versions/${versionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ displayName: variation.displayName, composition }),
  });

  if (res2.ok) {
    const patched = await res2.json() as { version?: string; status?: string };
    if (patched.status && patched.status !== "published") {
      await fetch(`${CONTENT_ENDPOINT}/${homepageKey}/versions/${patched.version ?? versionId}:publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    console.log(`  [patched] ${variation.displayName} → applied composition to key=${homepageKey}`);
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

  const variations: VariationDef[] = [
    {
      variationKey: "personal",
      displayName: "Homepage – Personal",
      nodes: buildPersonalVariation(),
    },
    {
      variationKey: "business",
      displayName: "Homepage – Business",
      nodes: buildBusinessVariation(),
    },
    {
      variationKey: "new_visitor",
      displayName: "Homepage – New Visitor",
      nodes: buildNewVisitorVariation(),
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
    console.log("\n=== Some variations failed — see fallback instructions below ===\n");
    printFallbackInstructions();
  }
}

function printFallbackInstructions(): void {
  console.log("\n--- Manual Variation Setup (Visual Builder) ---");
  console.log("\nThe Management API does not support creating CMS variations — use the Visual Builder UI:\n");
  console.log("1. Open the CMS: https://app.cms.optimizely.com");
  console.log("2. Navigate to the Homepage → open in Visual Builder");
  console.log("3. Click the experience root → 'Add variation'");
  console.log("");
  console.log("Variation 1 — name exactly: new_visitor  ← default experience (no cookie)");
  console.log("   Hero: 'See what everyone\\'s banking on'");
  console.log("   Summary: 'Join 2 million people who switched to Mosey for fee-free accounts, market-leading savings rates, and a mortgage experience that doesn\\'t feel like hard work.'");
  console.log("   Products: Open an Account, Start Saving, Get a Mortgage, Business Banking");
  console.log("   Stats: 2M+ Customers, 10 min to open, 4.8★ App, £85K FSCS");
  console.log("   Testimonial: Priya Sharma — 'I opened my Mosey account on a lunch break...'");
  console.log("");
  console.log("Variation 2 — name exactly: personal");
  console.log("   Hero: 'Banking built around you'");
  console.log("   Summary: 'A fee-free current account, savings rates up to 5.1% AER, and mortgages that move at your pace — all in one app.'");
  console.log("   Products: Current Account, Savings, Mortgage, Mobile App");
  console.log("   Stats: 2M+ Customers, 5.1% AER, 4.8★ App, 99.9% Uptime");
  console.log("   Testimonial: Sarah Chen — 'I moved my savings to Mosey after seeing the 5.1% fixed rate...'");
  console.log("");
  console.log("Variation 3 — name exactly: business");
  console.log("   Hero: 'Banking built for business'");
  console.log("   Summary: 'Fee-free business current accounts, competitive lending rates, and payment solutions that scale with you.'");
  console.log("   Products: Business Account, Business Lending, Merchant Services, Business Payroll");
  console.log("   Stats: 120K+ Businesses, £8B+ Lending, 99.9% Uptime, 24/7 Support");
  console.log("   Testimonial: Tom Hartley — 'Opened a business current account in under 15 minutes...'");
  console.log("");
  console.log("Variation names are case-sensitive and must match FX variation keys exactly.");
  console.log("Publish each variation, wait 30-60s for Graph to index, then test the audience switcher.");
}

main().catch((err) => {
  console.error("\n[ERROR]", err.message);
  printFallbackInstructions();
  process.exit(1);
});
