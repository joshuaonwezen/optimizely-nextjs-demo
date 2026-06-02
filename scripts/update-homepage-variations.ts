/**
 * PATCHes the personal (v1306) and business (v1307) homepage variation versions
 * with the correct compositions and publishes them.
 *
 * Run:
 *   OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/update-homepage-variations.ts
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
          linkUrl: "/en/current-account", linkText: "Open an account →",
        }),
        elementComponent("ProductCardBlock", "Savings Card", {
          icon: "savings", title: "Savings",
          description: "Easy-access at 4.6% AER or fix for 12 months at 5.1% AER. FSCS protected. Open in minutes.",
          linkUrl: "/en/savings", linkText: "View savings rates →",
        }),
        elementComponent("ProductCardBlock", "Mortgage Card", {
          icon: "mortgage", title: "Mortgage",
          description: "Get a decision in principle in 10 minutes. Our advisors guide you from application to key handover.",
          linkUrl: "/en/mortgage", linkText: "Get a mortgage →",
        }),
        elementComponent("ProductCardBlock", "Mobile App Card", {
          icon: "account", title: "Mobile App",
          description: "Rated 4.8 stars. Control your cards, track spending, move money, and chat with support — all from your phone.",
          linkUrl: "/en/mobile-app", linkText: "Download the app →",
        }),
      ]),
      gridSection("Personal Stats", [
        elementComponent("StatsCounterBlock", "Customers Stat", { value: "2", suffix: "M+", label: "Personal customers" }),
        elementComponent("StatsCounterBlock", "Savings Stat",   { value: "5.1", suffix: "%", label: "AER fixed savings rate" }),
        elementComponent("StatsCounterBlock", "App Stat",       { value: "4.8", suffix: "★", label: "App Store rating" }),
        elementComponent("StatsCounterBlock", "Uptime Stat",    { value: "99.9", suffix: "%", label: "App uptime" }),
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
        label: "Open a personal account today", link: "/en/current-account",
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
          linkUrl: "/en/business-banking", linkText: "Open a business account →",
        }),
        elementComponent("ProductCardBlock", "Business Lending Card", {
          icon: "savings", title: "Business Lending",
          description: "Flexible loans from £10,000 to £500,000 and overdraft facilities to smooth out cash flow. Decisions in 48 hours.",
          linkUrl: "/en/business-lending", linkText: "Apply for finance →",
        }),
        elementComponent("ProductCardBlock", "Merchant Services Card", {
          icon: "account", title: "Merchant Services",
          description: "Accept card payments in-store or online. Competitive rates, next-day settlement, and full reporting in the app.",
          linkUrl: "/en/business-banking", linkText: "Start accepting payments →",
        }),
        elementComponent("ProductCardBlock", "Payroll Card", {
          icon: "business", title: "Business Payroll",
          description: "Run payroll directly from your business account. Automated PAYE, instant transfers, and full HMRC compliance.",
          linkUrl: "/en/business-banking", linkText: "Set up payroll →",
        }),
      ]),
      gridSection("Business Stats", [
        elementComponent("StatsCounterBlock", "Businesses Stat", { value: "120", suffix: "K+", label: "Businesses banking with us" }),
        elementComponent("StatsCounterBlock", "Lending Stat",    { value: "8",   suffix: "B+", label: "Business lending approved" }),
        elementComponent("StatsCounterBlock", "Uptime Stat",     { value: "99.9", suffix: "%", label: "Platform uptime" }),
        elementComponent("StatsCounterBlock", "Support Stat",    { value: "24",  suffix: "/7", label: "Business support" }),
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
        label: "Open a business account today", link: "/en/business-banking",
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

async function main() {
  console.log("=== Updating Homepage Variations ===\n");
  const token = await getManagementToken();

  await patchVersion(token, "1306", "personal", buildPersonalComposition());
  await patchVersion(token, "1307", "business", buildBusinessComposition());

  console.log("\n=== Done ===");
  console.log("Wait 30-60s for Graph to index, then test the audience switcher at http://localhost:3000");
}

main().catch(err => { console.error("\n[ERROR]", err.message); process.exit(1); });
