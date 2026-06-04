/**
 * PATCHes the "get_the_app" variation (v1796) of the business-banking page
 * with app-focused content and publishes it.
 *
 * Run:
 *   npx tsx scripts/seed-business-banking-app-variation.ts
 */

import {
  uid,
  sectionComponent,
  gridSection,
  elementComponent,
  rootComponent,
  getManagementToken,
  CONTENT_ENDPOINT,
} from "./_shared";

const PAGE_KEY = "2534b53b282b491287cc295ead7c736f";
const VARIATION_VERSION = "1796";

function buildGetTheAppComposition() {
  return {
    id: uid(),
    displayName: "Business Banking – Get the App",
    nodeType: "experience",
    layoutType: "outline",
    nodes: [
      sectionComponent("ProductHeroBlock", "App Hero", {
        badge: "Business App",
        title: "Run your business from your phone",
        description:
          "The Mosey Business app puts your accounts, payments, invoices, and team spend in one place. Rated 4.8 stars. Available on iOS and Android.",
        ctaText: "Download the App",
        ctaUrl: "/en/business/business-banking",
      }),
      sectionComponent("SectionHeadingBlock", "App Features Heading", {
        heading: "Everything you need, right in the app",
        subheading:
          "From approving payments to checking cash flow — your whole business in your pocket.",
      }),
      gridSection("App Feature Cards", [
        elementComponent("FeatureItemBlock", "Mobile Payments", {
          title: "Pay anyone, instantly",
          description:
            "Approve and send payments from your phone in seconds. Set spending limits per team member and get instant notifications for every transaction.",
        }),
        elementComponent("FeatureItemBlock", "Expense Tracking", {
          title: "Automatic expense tracking",
          description:
            "Every card spend is categorised automatically. Export to Xero, QuickBooks, or FreeAgent with one tap — your accountant will thank you.",
        }),
        elementComponent("FeatureItemBlock", "Invoicing on the Go", {
          title: "Send invoices from anywhere",
          description:
            "Create professional invoices in under a minute and get notified the moment they're paid. Chase late payers with a tap.",
        }),
        elementComponent("FeatureItemBlock", "Team Access", {
          title: "Multi-user access",
          description:
            "Invite your team with granular permissions. Directors, finance managers, and cardholders each see exactly what they need.",
        }),
      ]),
      gridSection("App Stats", [
        elementComponent("StatsCounterBlock", "App Rating", {
          value: "4.8",
          suffix: "★",
          label: "App Store & Google Play rating",
        }),
        elementComponent("StatsCounterBlock", "Businesses Stat", {
          value: "120",
          suffix: "K+",
          label: "Businesses using the app",
        }),
        elementComponent("StatsCounterBlock", "Uptime Stat", {
          value: "99.9",
          suffix: "%",
          label: "App uptime",
        }),
        elementComponent("StatsCounterBlock", "Support Stat", {
          value: "24",
          suffix: "/7",
          label: "In-app business support",
        }),
      ]),
      sectionComponent("TestimonialBlock", "App Testimonial", {
        quote:
          "I run three sites and the Mosey app is the only way I keep on top of cash flow. I can approve supplier payments from a job site and see exactly what every team member has spent — all from my phone.",
        authorName: "Priya Nair",
        authorRole: "Founder, Nair Facilities Group",
      }),
      sectionComponent("CallToAction", "App CTA", {
        label: "Download the Mosey Business App",
        link: "/en/business/business-banking",
      }),
    ],
  };
}

async function main() {
  console.log("=== Seeding get_the_app variation — Business Banking ===\n");
  const token = await getManagementToken();

  const res = await fetch(
    `${CONTENT_ENDPOINT}/${PAGE_KEY}/versions/${VARIATION_VERSION}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/merge-patch+json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        locale: "en",
        status: "published",
        composition: buildGetTheAppComposition(),
      }),
    }
  );

  const text = await res.text();
  if (res.ok) {
    console.log(`✓ Patched and published version ${VARIATION_VERSION}`);
    console.log("Wait 30-60s for Graph to index, then test at http://localhost:3000/en/business/business-banking");
  } else {
    console.error(`✗ ${res.status}: ${text.slice(0, 400)}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n[ERROR]", err.message);
  process.exit(1);
});
