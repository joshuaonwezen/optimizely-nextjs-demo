/**
 * Content Seeding Script for Optimizely SaaS CMS
 *
 * Creates DynamicExperience pages with inline composition trees.
 * Components are embedded directly in the composition — they are NOT
 * standalone content items (which is how Visual Builder works).
 *
 * Run: npx tsx scripts/seed-content.ts
 */

import { config } from "dotenv";
import { randomUUID } from "crypto";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = "https://api.cms.optimizely.com";
const CONTENT_ENDPOINT = `${API_BASE}/preview3/experimental/content`;
const CONTAINER = "43f936c99b234ea397b261c538ad07c9";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return randomUUID(); // keep hyphens — the composition API expects them
}

function noHyphens(): string {
  return randomUUID().replace(/-/g, "");
}

// Composition node builders

interface CompNode {
  id: string;
  displayName: string;
  nodeType: string;
  component?: { contentType: string; properties: Record<string, unknown> };
  nodes?: CompNode[];
  layoutType?: string;
}

/** A component node placed directly in the experience outline (needs sectionEnabled) */
function sectionComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "component",
    component: { contentType, properties },
  };
}

/** A section containing a row of element components in a grid layout */
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

/** An element component node (goes inside a section, needs elementEnabled) */
function elementComponent(
  contentType: string,
  displayName: string,
  properties: Record<string, unknown>
): CompNode {
  return {
    id: uid(),
    displayName,
    nodeType: "component",
    component: { contentType, properties },
  };
}

// ---------------------------------------------------------------------------
// Page compositions
// ---------------------------------------------------------------------------

function buildHomepage(featureExperimentationKey: string): CompNode[] {
  return [
    sectionComponent("Hero", "Home Hero", {
      heading: "Unlock Your Digital Potential",
      summary:
        "The leading digital experience platform for content management, experimentation, and commerce.",
      theme: "dark",
    }),
    sectionComponent("SectionHeadingBlock", "Products Heading", {
      heading: "Our Products",
      subheading:
        "Everything you need to create, test, and optimize digital experiences.",
    }),
    gridSection("Product Cards", [
      elementComponent("ProductCardBlock", "CMS Card", {
        icon: "server",
        title: "Content Management System",
        description:
          "Author, manage, and deliver content across channels with our headless CMS. Power personalized experiences at scale.",
        linkUrl: "/cms",
        linkText: "Explore CMS \u2192",
      }),
      elementComponent("ProductCardBlock", "Feature Experimentation Card", {
        icon: "beaker",
        title: "Feature Experimentation",
        description:
          "Deploy features safely with feature flags, A/B tests, and progressive rollouts. Ship with confidence.",
        linkUrl: "/feature-experimentation",
        linkText: "Explore Feature Experimentation \u2192",
      }),
      elementComponent("ProductCardBlock", "Web Experimentation Card", {
        icon: "cursor",
        title: "Web Experimentation",
        description:
          "Optimize conversion rates with A/B testing and multivariate experiments. Data-driven decisions, made easy.",
        linkUrl: "/web-experimentation",
        linkText: "Explore Web Experimentation \u2192",
      }),
      elementComponent("ProductCardBlock", "Analytics Card", {
        icon: "chart",
        title: "Analytics",
        description:
          "Gain real-time insights and make data-driven decisions across your entire digital stack.",
        linkUrl: "/analytics",
        linkText: "Explore Analytics \u2192",
      }),
    ]),
    sectionComponent("LogoGridBlock", "Trusted By", {
      heading: "Trusted by leading brands",
      subheading:
        "Thousands of companies use Optimizely to deliver exceptional digital experiences.",
      logos: [],
    }),
    sectionComponent("FeaturedContentBlock", "Featured Case Study", {
      label: "Customer Story",
      featuredPage: `cms://content/${featureExperimentationKey}`,
      description:
        "See how leading teams ship faster and safer with feature flags, progressive rollouts, and real-time targeting \u2014 all without a code deploy.",
      ctaText: "Read the story",
    }),
    sectionComponent("SectionHeadingBlock", "FAQ Heading", {
      heading: "Frequently Asked Questions",
      subheading: "Everything you need to know about the Optimizely platform.",
    }),
    sectionComponent("FaqItemBlock", "FAQ 1", {
      question: "What is Optimizely?",
      answer:
        "Optimizely is a digital experience platform that combines content management, feature experimentation, web experimentation, and analytics into a single composable suite. It helps teams create, test, and optimize digital experiences at scale.",
    }),
    sectionComponent("FaqItemBlock", "FAQ 2", {
      question: "Do I need a developer to use Optimizely CMS?",
      answer:
        "No. Optimizely's Visual Builder lets content authors create and edit pages using a drag-and-drop interface without writing code. Developers set up the component library once; editors take it from there.",
    }),
    sectionComponent("FaqItemBlock", "FAQ 3", {
      question: "How does Optimizely Graph work?",
      answer:
        "Optimizely Graph is a managed GraphQL API that indexes your CMS content automatically. Whenever you publish or update content, Graph re-indexes in seconds. Your frontend queries Graph for content \u2014 no database setup required.",
    }),
    sectionComponent("FaqItemBlock", "FAQ 4", {
      question: "Can I run A/B tests on CMS content?",
      answer:
        "Yes. Optimizely's experimentation products integrate natively with the CMS. You can test entire page variations, individual component swaps, or personalize content for specific audience segments \u2014 all from the same platform.",
    }),
    sectionComponent("CallToAction", "Home CTA", {
      label: "Start Your Free Trial",
      link: "https://www.optimizely.com",
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
  ctaLabel: string
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
      heading: "Key Capabilities",
      subheading: `What makes ${title} powerful.`,
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
      body: JSON.stringify({
        type: "richText",
        children: [
          {
            type: "paragraph",
            children: [{ text: bodyText }],
          },
        ],
      }),
    }),
    sectionComponent("CallToAction", "Page CTA", {
      label: ctaLabel,
      link: ctaUrl,
    }),
  ];
}

// ---------------------------------------------------------------------------
// All pages
// ---------------------------------------------------------------------------

interface PageDef {
  key: string;
  displayName: string;
  routeSegment?: string;
  container?: string; // parent page key for nested pages; defaults to root CONTAINER
  nodes: CompNode[];
}

// Pre-declare keys so pages can cross-reference each other
const PAGE_KEYS = {
  // Top-level pages
  homepage:               noHyphens(),
  cms:                    noHyphens(),
  featureExperimentation: noHyphens(),
  webExperimentation:     noHyphens(),
  analytics:              noHyphens(),
  contact:                noHyphens(),
  // CMS subpages
  visualBuilder:          noHyphens(),
  contentModeling:        noHyphens(),
  localization:           noHyphens(),
  // Feature Experimentation subpages
  featureFlags:           noHyphens(),
  progressiveRollouts:    noHyphens(),
  // Web Experimentation subpages
  visualEditor:           noHyphens(),
  statsEngine:            noHyphens(),
  // Analytics subpages
  analyticsReports:       noHyphens(),
  analyticsIntegrations:  noHyphens(),
};

const pages: PageDef[] = [
  {
    key: PAGE_KEYS.homepage,
    displayName: "Homepage",
    nodes: buildHomepage(PAGE_KEYS.featureExperimentation),
  },
  {
    key: PAGE_KEYS.cms,
    displayName: "Content Management System",
    routeSegment: "cms",
    nodes: buildProductPage(
      "Content Management",
      "Optimizely CMS",
      "Create, manage, and deliver personalized content at scale. The modern headless CMS built for the composable enterprise.",
      "Explore CMS",
      "https://www.optimizely.com/cms",
      [
        {
          title: "Visual Editor",
          description:
            "Edit content inline with a drag-and-drop visual editor. See changes in real-time before publishing.",
        },
        {
          title: "Content Scheduling",
          description:
            "Plan and schedule content publication across time zones. Automate your content workflow.",
        },
        {
          title: "Headless API",
          description:
            "Deliver content to any channel via GraphQL and REST APIs. Build with your preferred frontend framework.",
        },
        {
          title: "Localization",
          description:
            "Manage multi-language content natively. Translate and adapt experiences for global audiences.",
        },
      ],
      "Optimizely CMS empowers marketing and development teams to collaborate seamlessly. With our Visual Builder, content authors can create stunning pages without touching code, while developers maintain full control over the component architecture and front-end framework of their choice. Whether you're building a corporate website, e-commerce experience, or multi-brand digital platform, Optimizely CMS scales with your ambitions.",
      "Get Started with CMS"
    ),
  },
  {
    key: PAGE_KEYS.featureExperimentation,
    displayName: "Feature Experimentation",
    routeSegment: "feature-experimentation",
    nodes: buildProductPage(
      "Feature Management",
      "Feature Experimentation",
      "Deploy features with confidence using feature flags, A/B tests, and progressive rollouts. Reduce risk and accelerate innovation.",
      "Explore Feature Experimentation",
      "https://www.optimizely.com/products/feature-experimentation",
      [
        {
          title: "Feature Flags",
          description:
            "Toggle features on or off instantly without code deploys. Control feature access by user segment.",
        },
        {
          title: "Server-Side Testing",
          description:
            "Run experiments on any platform \u2014 server, mobile, OTT. Full-stack experimentation at scale.",
        },
        {
          title: "Progressive Rollouts",
          description:
            "Gradually roll out features to increasing percentages of users. Monitor and rollback instantly if needed.",
        },
        {
          title: "Real-Time Targeting",
          description:
            "Target features based on user attributes, behavior, and context. Personalize every interaction.",
        },
      ],
      "Optimizely Feature Experimentation gives engineering and product teams the tools to move fast without breaking things. Deploy features behind flags, test variations with real users, and roll out changes progressively \u2014 all while maintaining full control over who sees what.",
      "Start Experimenting"
    ),
  },
  {
    key: PAGE_KEYS.webExperimentation,
    displayName: "Web Experimentation",
    routeSegment: "web-experimentation",
    nodes: buildProductPage(
      "Conversion Optimization",
      "Web Experimentation",
      "Optimize every digital touchpoint with A/B testing, multivariate experiments, and personalization. Turn visitors into customers.",
      "Explore Web Experimentation",
      "https://www.optimizely.com/products/web-experimentation",
      [
        {
          title: "Visual Editor",
          description:
            "Create experiments without code using our point-and-click editor. Empower marketers to test independently.",
        },
        {
          title: "Multivariate Testing",
          description:
            "Test multiple variables simultaneously to find the optimal combination. Maximize your testing velocity.",
        },
        {
          title: "Audience Targeting",
          description:
            "Segment visitors by behavior, geography, device, and custom attributes. Deliver relevant experiences.",
        },
        {
          title: "Stats Accelerator",
          description:
            "Reach statistical significance faster with our adaptive traffic allocation engine.",
        },
      ],
      "Optimizely Web Experimentation is the world's leading experimentation platform, trusted by thousands of businesses to optimize their digital experiences. From simple A/B tests to complex multivariate experiments, our platform makes it easy to test, learn, and improve.",
      "Start Optimizing"
    ),
  },
  {
    key: PAGE_KEYS.analytics,
    displayName: "Analytics",
    routeSegment: "analytics",
    nodes: buildProductPage(
      "Data & Insights",
      "Optimizely Analytics",
      "Gain real-time insights into user behavior and experiment performance. Make confident, data-driven decisions across your digital stack.",
      "Explore Analytics",
      "https://www.optimizely.com/products/intelligence",
      [
        {
          title: "Unified Dashboard",
          description:
            "See all your experiment results and key metrics in one place. No more switching between tools.",
        },
        {
          title: "Real-Time Reporting",
          description:
            "Monitor experiment performance as it happens. Get instant alerts when significant results are detected.",
        },
        {
          title: "Funnel Analysis",
          description:
            "Visualize user journeys and identify drop-off points. Optimize conversion funnels with data-driven insights.",
        },
        {
          title: "Revenue Attribution",
          description:
            "Connect experiments to revenue impact. Understand the true ROI of every optimization effort.",
        },
      ],
      "Optimizely Analytics provides deep, actionable insights across all your experimentation and content optimization efforts. Our unified platform connects the dots between experiments, user behavior, and business outcomes \u2014 so you always know what's working and what to do next.",
      "Explore Analytics"
    ),
  },
  {
    key: PAGE_KEYS.contact,
    displayName: "Contact Us",
    routeSegment: "contact",
    nodes: [
      sectionComponent("SectionHeadingBlock", "Contact Heading", {
        heading: "Get in Touch",
        subheading:
          "Have a question or want to learn more? Fill out the form below and our team will get back to you within 24 hours.",
      }),
      sectionComponent("FormContainerBlock", "Contact Form Container", {
        heading: "Contact Us",
        description: "We'd love to hear from you. Please fill out the form below.",
        submitUrl: "/api/form-submit",
        successMessage: "Thank you for reaching out! We'll be in touch within 24 hours.",
      }),
      gridSection("Name Field Row", [
        elementComponent("FormTextInput", "Name Field", {
          label: "Full Name",
          placeholder: "John Doe",
          fieldName: "name",
          inputType: "text",
          required: true,
        }),
      ]),
      gridSection("Email Field Row", [
        elementComponent("FormTextInput", "Email Field", {
          label: "Email Address",
          placeholder: "john@company.com",
          fieldName: "email",
          inputType: "email",
          required: true,
        }),
      ]),
      gridSection("Company Field Row", [
        elementComponent("FormTextInput", "Company Field", {
          label: "Company",
          placeholder: "Acme Inc.",
          fieldName: "company",
          inputType: "text",
          required: false,
        }),
      ]),
      gridSection("Product Interest Row", [
        elementComponent("FormSelect", "Product Interest", {
          label: "Product Interest",
          fieldName: "product",
          options: "Content Management System,Feature Experimentation,Web Experimentation,Analytics,Full Platform",
          required: true,
        }),
      ]),
      gridSection("Message Row", [
        elementComponent("FormTextArea", "Message Field", {
          label: "Message",
          placeholder: "Tell us about your project or question...",
          fieldName: "message",
          required: true,
        }),
      ]),
      gridSection("Submit Row", [
        elementComponent("FormSubmitButton", "Submit Button", {
          label: "Send Message",
        }),
      ]),
    ],
  },

  // ── CMS subpages ──────────────────────────────────────────────────────────
  {
    key: PAGE_KEYS.visualBuilder,
    displayName: "Visual Builder",
    routeSegment: "visual-builder",
    nodes: buildProductPage(
      "Visual Editing",
      "Visual Builder",
      "Create stunning pages without writing code. Drag, drop, and publish — all in real time.",
      "Try Visual Builder",
      "https://www.optimizely.com/cms/visual-builder",
      [
        { title: "Drag & Drop", description: "Compose pages by dragging blocks into place. Reorder sections with a single click." },
        { title: "Component Library", description: "Pick from a curated palette of reusable, brand-approved blocks pre-built by your developers." },
        { title: "Real-Time Preview", description: "See your changes live before publishing. Switch between desktop and mobile instantly." },
        { title: "Responsive Design", description: "Every page looks great on any device. Preview across breakpoints before you publish." },
      ],
      "Optimizely Visual Builder bridges the gap between development and content creation. Developers define the component library once; editors assemble pages freely within those guardrails — no code changes, no deploys, no waiting.",
      "Get Started with Visual Builder"
    ),
  },
  {
    key: PAGE_KEYS.contentModeling,
    displayName: "Content Modeling",
    routeSegment: "content-modeling",
    nodes: buildProductPage(
      "Content Architecture",
      "Content Modeling",
      "Design the structure of your content once, reuse it everywhere. Custom types, validation, and rich relationships — built for scale.",
      "Explore Content Modeling",
      "https://www.optimizely.com/cms/content-types",
      [
        { title: "Custom Content Types", description: "Define exactly the fields your content needs. Strings, numbers, rich text, references, and arrays — all strongly typed." },
        { title: "Field Validation", description: "Set constraints at the schema level. Required fields, character limits, regex patterns — enforced in the editor and the API." },
        { title: "Content References", description: "Link content items to other pages, media, or structured data. Build a true content graph." },
        { title: "Versioning", description: "Full audit trail on every change. Roll back to any published version with one click." },
      ],
      "Great content architecture is invisible to editors but felt by everyone. Optimizely's content modeling tools let developers define a schema that guides authors, enforces consistency, and keeps the content graph clean — at any scale.",
      "Start Modeling"
    ),
  },
  {
    key: PAGE_KEYS.localization,
    displayName: "Localization",
    routeSegment: "localization",
    nodes: buildProductPage(
      "Global Publishing",
      "Localization",
      "Deliver the right content to the right audience, in their language. Multi-language content management built for global teams.",
      "Explore Localization",
      "https://www.optimizely.com/cms/localization",
      [
        { title: "Multi-Language Content", description: "Manage translations side-by-side. Publish in one locale without affecting others." },
        { title: "Translation Workflows", description: "Route content to translators automatically. Track status across all locales from one dashboard." },
        { title: "Regional Targeting", description: "Serve locale-specific assets, pricing, and calls-to-action based on visitor location." },
        { title: "Fallback Locales", description: "Configure fallback chains so visitors always see content, even when a translation isn't ready." },
      ],
      "Building global digital experiences shouldn't mean doubling your effort. Optimizely Localization gives content teams a single source of truth that branches cleanly into any number of languages and regions — with workflows that keep translation on schedule.",
      "Go Global"
    ),
  },

  // ── Feature Experimentation subpages ──────────────────────────────────────
  {
    key: PAGE_KEYS.featureFlags,
    displayName: "Feature Flags",
    routeSegment: "feature-flags",
    nodes: buildProductPage(
      "Controlled Rollouts",
      "Feature Flags",
      "Ship features to production without exposing them to users. Toggle, target, and roll back in seconds — no redeploy required.",
      "Explore Feature Flags",
      "https://www.optimizely.com/products/feature-experimentation",
      [
        { title: "Instant Toggles", description: "Enable or disable any feature in real time. No code change, no build, no deploy cycle." },
        { title: "Audience Targeting", description: "Show features to specific users, cohorts, or segments. Target by attribute, location, or custom rule." },
        { title: "Kill Switch", description: "If something goes wrong, kill the feature immediately. Reduce MTTR from hours to seconds." },
        { title: "SDK Support", description: "SDKs for JavaScript, Python, Go, Java, Ruby, and more. Works server-side, client-side, or on mobile." },
      ],
      "Feature flags decouple deployment from release. Your team ships to production continuously; business stakeholders decide when — and for whom — each feature goes live. Optimizely makes that separation simple and auditable.",
      "Start Using Feature Flags"
    ),
  },
  {
    key: PAGE_KEYS.progressiveRollouts,
    displayName: "Progressive Rollouts",
    routeSegment: "progressive-rollouts",
    nodes: buildProductPage(
      "Risk Reduction",
      "Progressive Rollouts",
      "Roll out features to a growing percentage of users. Monitor impact, catch issues early, and roll back instantly if needed.",
      "Explore Rollouts",
      "https://www.optimizely.com/products/feature-experimentation",
      [
        { title: "Percentage Rollouts", description: "Start at 1%, scale to 100%. Each step is measured before you proceed." },
        { title: "Canary Releases", description: "Route a small cohort of early adopters to your new version. Battle-test before full launch." },
        { title: "Auto-Rollback", description: "Set error-rate thresholds. If breached, the rollout pauses and alerts your team automatically." },
        { title: "Monitoring Integration", description: "Connect to Datadog, New Relic, or your observability stack. See feature impact on your metrics in real time." },
      ],
      "Progressive rollouts are the difference between a scary big-bang release and a controlled, confidence-building launch. Optimizely's rollout engine lets you move fast without risking everything.",
      "Start Rolling Out"
    ),
  },

  // ── Web Experimentation subpages ──────────────────────────────────────────
  {
    key: PAGE_KEYS.visualEditor,
    displayName: "Visual Editor",
    routeSegment: "visual-editor",
    nodes: buildProductPage(
      "No-Code Testing",
      "Visual Editor",
      "Run A/B tests without writing a line of code. Click any element on your page, change it, and launch an experiment in minutes.",
      "Try the Visual Editor",
      "https://www.optimizely.com/products/web-experimentation",
      [
        { title: "Point-and-Click", description: "Select any text, image, button, or section. Edit it directly — no developer required." },
        { title: "WYSIWYG Editing", description: "See exactly what your visitors will see. No staging environment, no lag." },
        { title: "Responsive Preview", description: "Check how your experiment looks on mobile, tablet, and desktop before launching." },
        { title: "Change History", description: "Full audit log of every experiment variant. Revert any change in one click." },
      ],
      "The Optimizely Visual Editor gives marketers superpowers. Create, test, and optimize page variations at the speed of thought — without filing a dev ticket. Developers stay focused on new features; marketers stay focused on conversion.",
      "Open the Visual Editor"
    ),
  },
  {
    key: PAGE_KEYS.statsEngine,
    displayName: "Stats Engine",
    routeSegment: "stats-engine",
    nodes: buildProductPage(
      "Statistical Rigor",
      "Stats Engine",
      "Get to confident results faster. Sequential testing lets you act on data without waiting for arbitrary run times.",
      "Explore the Stats Engine",
      "https://www.optimizely.com/products/web-experimentation",
      [
        { title: "Bayesian Engine", description: "Understand probability of winning, not just p-values. Make intuitive, business-friendly decisions." },
        { title: "Sequential Testing", description: "Peek at results at any time without inflating false positives. Stop experiments as soon as you're confident." },
        { title: "Sample Size Calculator", description: "Enter your baseline and target lift. Get a recommended experiment duration before you even start." },
        { title: "Significance Monitoring", description: "Get alerted the moment your experiment reaches significance. No more manual result-checking." },
      ],
      "Bad statistics cost companies real money — from false positives that ship broken features to long runtimes that slow the whole roadmap. Optimizely's stats engine is built by PhDs and battle-tested across millions of experiments.",
      "Learn About the Stats Engine"
    ),
  },

  // ── Analytics subpages ────────────────────────────────────────────────────
  {
    key: PAGE_KEYS.analyticsReports,
    displayName: "Reports & Dashboards",
    routeSegment: "reports",
    nodes: buildProductPage(
      "Actionable Insights",
      "Reports & Dashboards",
      "See everything in one place. Custom dashboards, funnel analysis, and revenue attribution — all connected to your experiments.",
      "Explore Reports",
      "https://www.optimizely.com/products/intelligence",
      [
        { title: "Custom Dashboards", description: "Pin the metrics that matter. Build dashboards by team, campaign, or product area." },
        { title: "Funnel Analysis", description: "Visualize the full user journey. Find exactly where visitors drop off and what experiments to run next." },
        { title: "Revenue Attribution", description: "Connect experiment wins to revenue impact. Show the ROI of your optimization program in dollars." },
        { title: "Data Exports", description: "Push raw experiment data to your data warehouse. Full control over how you analyze results." },
      ],
      "Decisions made without data are guesses. Optimizely Analytics closes the loop between running experiments and understanding outcomes — so every team has the evidence it needs to move confidently.",
      "See the Reports"
    ),
  },
  {
    key: PAGE_KEYS.analyticsIntegrations,
    displayName: "Integrations",
    routeSegment: "integrations",
    nodes: buildProductPage(
      "Connect Everything",
      "Integrations",
      "Optimizely works with the tools you already use. Connect your CDP, data warehouse, ad platforms, and analytics stack in minutes.",
      "Explore Integrations",
      "https://www.optimizely.com/integrations",
      [
        { title: "CDP Sync", description: "Push experiment assignments to Segment, mParticle, or Amplitude. Enrich your customer profiles with experiment data." },
        { title: "Data Warehouse", description: "Send events to Snowflake, BigQuery, or Redshift. Own your data, run your own analysis." },
        { title: "Ad Platforms", description: "Sync experiment audiences to Google Ads, Meta, and LinkedIn. Test messaging across paid channels." },
        { title: "Webhook Events", description: "Subscribe to experiment lifecycle events. Trigger automations in Zapier, Slack, or your own systems." },
      ],
      "The modern data stack is composable. Optimizely fits natively into your existing infrastructure — sending and receiving data through a rich set of native integrations and a powerful webhook system.",
      "Browse All Integrations"
    ),
  },
];

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function createPage(page: PageDef): Promise<void> {
  const token = await getManagementToken();

  const body: Record<string, unknown> = {
    key: page.key,
    contentType: "DynamicExperience",
    locale: "en",
    container: page.container ?? CONTAINER,
    status: "published",
    displayName: page.displayName,
    ...(page.routeSegment ? { routeSegment: page.routeSegment } : {}),
    composition: {
      id: uid(),
      displayName: page.displayName,
      nodeType: "experience",
      layoutType: "outline",
      nodes: page.nodes,
    },
  };

  const res = await fetch(CONTENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`  [ERROR] ${page.displayName}: ${res.status} ${text}`);
    throw new Error(`Create page failed: ${res.status}`);
  }

  const result = JSON.parse(text);
  console.log(
    `  [created] ${page.displayName} \u2192 key=${result.key} route=${result.routeSegment ?? "/"}`
  );
}

async function deleteExisting(): Promise<void> {
  const token = await getManagementToken();

  const res = await fetch(`${CONTENT_ENDPOINT}/${CONTAINER}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return;

  const data = await res.json();
  for (const item of data.items ?? []) {
    const delRes = await fetch(
      `${CONTENT_ENDPOINT}/${item.key}?permanent=true`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log(
      `  [deleted] ${item.locales?.en?.displayName ?? item.key} (${delRes.status})`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Optimizely Content Seeding Script ===\n");

  console.log("--- Cleaning existing content ---");
  await deleteExisting();

  // Creation order matters: parents before children, homepage last (it references other pages)
  const topLevel = pages.filter((p) => !p.container && p.key !== PAGE_KEYS.homepage);
  const subPages = pages.filter((p) => !!p.container);
  const home     = pages.filter((p) => p.key === PAGE_KEYS.homepage);
  const ordered  = [...topLevel, ...subPages, ...home];

  console.log(`\n--- Creating ${ordered.length} experience pages ---`);
  for (const page of ordered) {
    await createPage(page);
  }

  console.log("\n=== Seeding Complete ===");
  console.log(`  Pages created: ${pages.length}`);
  console.log("\nWait 30-60 seconds for Optimizely Graph to index, then:");
  console.log("  npm run dev \u2192 http://localhost:3000");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
