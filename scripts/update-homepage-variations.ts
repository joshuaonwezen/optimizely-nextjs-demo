/**
 * PATCHes the base (v1305), personal (v1306), and business (v1307) homepage
 * variation versions with the correct compositions and publishes them.
 *
 * Run:
 *   npx tsx scripts/update-homepage-variations.ts
 */

import { config } from "dotenv";
import { randomUUID } from "crypto";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

const CONTENT_ENDPOINT = "https://api.cms.optimizely.com/preview3/experimental/content";
const HOMEPAGE_KEY = "3525e1552b6f46158be2850ff6e6fb74";

// ---------------------------------------------------------------------------
// Composition node builders (identical to seed-content.ts)
// ---------------------------------------------------------------------------

interface CompNode {
  id: string;
  displayName: string;
  nodeType: string;
  component?: { contentType: string; properties: Record<string, unknown> };
  nodes?: CompNode[];
  layoutType?: string;
}

function uid() { return randomUUID(); }

function elementComponent(contentType: string, displayName: string, properties: Record<string, unknown>): CompNode {
  return { id: uid(), displayName, nodeType: "component", component: { contentType, properties } };
}

function gridSection(displayName: string, items: CompNode[]): CompNode {
  return {
    id: uid(), displayName, nodeType: "section", layoutType: "grid",
    component: { contentType: "BlankSection", properties: {} },
    nodes: [{
      id: uid(), displayName: "Row", nodeType: "row",
      nodes: items.map(item => ({ id: uid(), displayName: "Column", nodeType: "column", nodes: [item] })),
    }],
  };
}

function sectionComponent(contentType: string, displayName: string, properties: Record<string, unknown>): CompNode {
  return gridSection(displayName, [elementComponent(contentType, displayName, properties)]);
}

function rootComponent(contentType: string, displayName: string, properties: Record<string, unknown>): CompNode {
  return { id: uid(), displayName, nodeType: "component", component: { contentType, properties } };
}

// ---------------------------------------------------------------------------
// Compositions
// ---------------------------------------------------------------------------

// Savings page key created by seed-content.ts (current run)
const SAVINGS_KEY = "fd5e6e1627714936b50e450c9972c90b";

function buildBaseComposition() {
  return {
    id: uid(), displayName: "Homepage", nodeType: "experience", layoutType: "outline",
    nodes: [
      rootComponent("Hero", "Home Hero", {
        heading: "Banking built around you",
        summary: "Straightforward current accounts, competitive savings rates, and mortgages that move at your pace.",
        theme: "dark",
      }),
      sectionComponent("SectionHeadingBlock", "Products Heading", {
        heading: "Our products",
        subheading: "Everything you need to manage your money, save for the future, and plan for what's next.",
      }),
      gridSection("Product Cards", [
        elementComponent("ProductCardBlock", "Current Account Card", {
          icon: "account", title: "Current Account",
          description: "A fee-free everyday account with instant payment notifications and no hidden charges.",
          linkUrl: "/en/personal/current-account", linkText: "Open an account →",
        }),
        elementComponent("ProductCardBlock", "Savings Card", {
          icon: "savings", title: "Savings",
          description: "Easy-access and fixed-rate savings accounts with rates up to 5.1% AER. Your money working harder.",
          linkUrl: "/en/personal/savings", linkText: "View savings rates →",
        }),
        elementComponent("ProductCardBlock", "Mortgage Card", {
          icon: "mortgage", title: "Mortgage",
          description: "Find your rate in minutes. Our advisors guide you from application to completion.",
          linkUrl: "/en/mortgage", linkText: "Get a mortgage →",
        }),
        elementComponent("ProductCardBlock", "Business Banking Card", {
          icon: "business", title: "Business Banking",
          description: "Current accounts, lending, and card payment solutions for UK businesses of every size.",
          linkUrl: "/en/business/business-banking", linkText: "Open a business account →",
        }),
      ]),
      gridSection("Bank Stats", [
        elementComponent("StatsCounterBlock", "Customers Stat", { value: "2",    suffix: "M+",  label: "Customers" }),
        elementComponent("StatsCounterBlock", "Assets Stat",    { value: "50",   suffix: "B+",  label: "Assets under management" }),
        elementComponent("StatsCounterBlock", "Uptime Stat",    { value: "99.9", suffix: "%",   label: "App uptime" }),
        elementComponent("StatsCounterBlock", "Branches Stat",  { value: "140",  suffix: "+",   label: "UK branches" }),
      ]),
      sectionComponent("TestimonialBlock", "Homepage Testimonial", {
        quote: "Mosey made getting my mortgage so simple. The whole process was online and I had an offer within 48 hours. I couldn't believe how painless it was.",
        authorName: "James Hartley", authorRole: "Homeowner, Leeds",
      }),
      rootComponent("LogoGridBlock", "Trusted By", {
        heading: "Trusted by 2 million customers across the UK",
        subheading: "From first current accounts to business banking — Mosey customers bank with confidence.",
        logos: [],
      }),
      sectionComponent("FeaturedContentBlock", "Featured Savings", {
        label: "Our best rate",
        featuredPage: `cms://content/${SAVINGS_KEY}`,
        description: "Our fixed-rate savings account now offers 5.1% AER. Lock in your rate today and watch your money grow — FSCS protected up to £85,000.",
        ctaText: "See savings rates",
      }),
      sectionComponent("SectionHeadingBlock", "FAQ Heading", {
        heading: "Frequently asked questions",
        subheading: "Quick answers to the things we hear most.",
      }),
      sectionComponent("FaqItemBlock", "FAQ 1", {
        question: "How do I open a current account?",
        answer: "You can open a Mosey current account online in around 10 minutes. All you need is a smartphone, a valid UK address, and proof of identity. We run a soft credit check that won't affect your credit score.",
      }),
      sectionComponent("FaqItemBlock", "FAQ 2", {
        question: "What savings rates do you offer?",
        answer: "We currently offer an easy-access savings account at 4.6% AER and a 1-year fixed-rate account at 5.1% AER. Rates are variable on easy-access accounts and fixed for the term on fixed-rate accounts.",
      }),
      sectionComponent("FaqItemBlock", "FAQ 3", {
        question: "How does the mortgage application work?",
        answer: "Start by getting a decision in principle online — it takes around 10 minutes and won't affect your credit score. One of our advisors will then call you to discuss your options and guide you through the full application.",
      }),
      sectionComponent("FaqItemBlock", "FAQ 4", {
        question: "Is my money protected?",
        answer: "Yes. Mosey Bank is authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority. Eligible deposits are protected by the FSCS up to £85,000 per person.",
      }),
      sectionComponent("CallToAction", "Home CTA", {
        label: "Open an account today", link: "/en/personal/current-account",
      }),
    ],
  };
}

function buildPersonalComposition() {
  return {
    id: uid(), displayName: "Homepage – Personal", nodeType: "experience", layoutType: "outline",
    nodes: [
      rootComponent("Hero", "Personal Hero", {
        heading: "Banking built around you",
        summary: "A fee-free current account, savings rates up to 5.1% AER, and mortgages that move at your pace — all in one app.",
        theme: "dark",
      }),
      sectionComponent("SectionHeadingBlock", "Products Heading", {
        heading: "Your personal banking",
        subheading: "Everything you need to manage your money, save for the future, and plan the moments that matter.",
      }),
      gridSection("Personal Product Cards", [
        elementComponent("ProductCardBlock", "Current Account Card", {
          icon: "account", title: "Current Account",
          description: "Fee-free everyday banking with instant notifications, smart spending insights, and no hidden charges.",
          linkUrl: "/en/personal/current-account", linkText: "Open an account →",
        }),
        elementComponent("ProductCardBlock", "Savings Card", {
          icon: "savings", title: "Savings",
          description: "Easy-access at 4.6% AER or fix for 12 months at 5.1% AER. FSCS protected. Open in minutes.",
          linkUrl: "/en/personal/savings", linkText: "View savings rates →",
        }),
        elementComponent("ProductCardBlock", "Mortgage Card", {
          icon: "mortgage", title: "Mortgage",
          description: "Get a decision in principle in 10 minutes. Our advisors guide you from application to key handover.",
          linkUrl: "/en/mortgage", linkText: "Get a mortgage →",
        }),
        elementComponent("ProductCardBlock", "Mobile App Card", {
          icon: "account", title: "Mobile App",
          description: "Rated 4.8 stars. Control your cards, track spending, move money, and chat with support — all from your phone.",
          linkUrl: "/en/personal/current-account/mobile-app", linkText: "Download the app →",
        }),
      ]),
      gridSection("Personal Stats", [
        elementComponent("StatsCounterBlock", "Customers Stat", { value: "2",    suffix: "M+", label: "Personal customers" }),
        elementComponent("StatsCounterBlock", "Savings Stat",   { value: "5.1",  suffix: "%",  label: "AER fixed savings rate" }),
        elementComponent("StatsCounterBlock", "App Stat",       { value: "4.8",  suffix: "★",  label: "App Store rating" }),
        elementComponent("StatsCounterBlock", "Uptime Stat",    { value: "99.9", suffix: "%",  label: "App uptime" }),
      ]),
      sectionComponent("TestimonialBlock", "Personal Testimonial", {
        quote: "I moved my savings to Mosey after seeing the 5.1% fixed rate. The transfer took less than a day and the app makes it easy to watch my interest grow.",
        authorName: "Sarah Chen", authorRole: "Mosey customer",
      }),
      rootComponent("LogoGridBlock", "Trusted By", {
        heading: "Trusted by 2 million personal banking customers",
        subheading: "From first current accounts to savings milestones — Mosey customers bank with confidence.",
        logos: [],
      }),
      sectionComponent("CallToAction", "Personal CTA", {
        label: "Open a personal account today", link: "/en/personal/current-account",
      }),
    ],
  };
}

function buildBusinessComposition() {
  return {
    id: uid(), displayName: "Homepage – Business", nodeType: "experience", layoutType: "outline",
    nodes: [
      rootComponent("Hero", "Business Hero", {
        heading: "Banking built for business",
        summary: "Fee-free business current accounts, competitive lending rates, and payment solutions that scale with you.",
        theme: "dark",
      }),
      sectionComponent("SectionHeadingBlock", "Products Heading", {
        heading: "Business banking products",
        subheading: "Everything your business needs to manage cash flow, accept payments, and grow with confidence.",
      }),
      gridSection("Business Product Cards", [
        elementComponent("ProductCardBlock", "Business Account Card", {
          icon: "business", title: "Business Account",
          description: "Fee-free for 12 months. Unlimited UK transactions, multi-user access, and accounting integrations built in.",
          linkUrl: "/en/business/business-banking", linkText: "Open a business account →",
        }),
        elementComponent("ProductCardBlock", "Business Lending Card", {
          icon: "savings", title: "Business Lending",
          description: "Flexible loans from £10,000 to £500,000 and overdraft facilities to smooth out cash flow. Decisions in 48 hours.",
          linkUrl: "/en/business/business-banking/business-lending", linkText: "Apply for finance →",
        }),
        elementComponent("ProductCardBlock", "Merchant Services Card", {
          icon: "account", title: "Merchant Services",
          description: "Accept card payments in-store or online. Competitive rates, next-day settlement, and full reporting in the app.",
          linkUrl: "/en/business/merchant-services", linkText: "Start accepting payments →",
        }),
        elementComponent("ProductCardBlock", "Payroll Card", {
          icon: "business", title: "Business Payroll",
          description: "Run payroll directly from your business account. Automated PAYE, instant transfers, and full HMRC compliance.",
          linkUrl: "/en/business/business-banking", linkText: "Set up payroll →",
        }),
      ]),
      gridSection("Business Stats", [
        elementComponent("StatsCounterBlock", "Businesses Stat", { value: "120",  suffix: "K+", label: "Businesses banking with us" }),
        elementComponent("StatsCounterBlock", "Lending Stat",    { value: "8",    suffix: "B+", label: "Business lending approved" }),
        elementComponent("StatsCounterBlock", "Uptime Stat",     { value: "99.9", suffix: "%",  label: "Platform uptime" }),
        elementComponent("StatsCounterBlock", "Support Stat",    { value: "24",   suffix: "/7", label: "Business support" }),
      ]),
      sectionComponent("TestimonialBlock", "Business Testimonial", {
        quote: "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless — invoices reconcile automatically.",
        authorName: "Tom Hartley", authorRole: "Director, Hartley & Co.",
      }),
      rootComponent("LogoGridBlock", "Trusted By", {
        heading: "Trusted by 120,000 UK businesses",
        subheading: "From sole traders to growing SMEs — Mosey Business Banking is built around the way modern businesses work.",
        logos: [],
      }),
      sectionComponent("CallToAction", "Business CTA", {
        label: "Open a business account today", link: "/en/business/business-banking",
      }),
    ],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function patchVersion(token: string, version: string, variationLabel: string, composition: object) {
  const res = await fetch(`${CONTENT_ENDPOINT}/${HOMEPAGE_KEY}/versions/${version}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ locale: "en", status: "published", composition }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`[${variationLabel}] ✓ Patched and published (version ${version})`);
  } else {
    console.error(`[${variationLabel}] ✗ ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function deleteVersion(token: string, version: string) {
  const res = await fetch(`${CONTENT_ENDPOINT}/${HOMEPAGE_KEY}/versions/${version}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const label = res.ok ? `✓ deleted (${res.status})` : `✗ ${res.status}`;
  console.log(`[v${version} cleanup] ${label}`);
}

async function main() {
  console.log("=== Updating Homepage Variations ===\n");
  const token = await getManagementToken();

  // Patch base version (1305) with updated composition + correct locale
  await patchVersion(token, "1305", "base", buildBaseComposition());

  // Delete stale nl-locale version 1308 created by PATCH /content/{key} without locale
  await deleteVersion(token, "1308");

  // Patch persona variations
  await patchVersion(token, "1306", "personal", buildPersonalComposition());
  await patchVersion(token, "1307", "business", buildBusinessComposition());

  console.log("\n=== Done ===");
  console.log("Wait 30-60s for Graph to index, then test the audience switcher at http://localhost:3000");
}

main().catch(err => { console.error("\n[ERROR]", err.message); process.exit(1); });
