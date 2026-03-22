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

config({ path: ".env.local" });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = "https://api.cms.optimizely.com";
const TOKEN_ENDPOINT = `${API_BASE}/oauth/token`;
const CONTENT_ENDPOINT = `${API_BASE}/preview3/experimental/content`;
const CONTAINER = "43f936c99b234ea397b261c538ad07c9";

const CLIENT_ID = process.env.OPTIMIZELY_CMS_CLIENT_ID!;
const CLIENT_SECRET = process.env.OPTIMIZELY_CMS_CLIENT_SECRET!;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing OPTIMIZELY_CMS_CLIENT_ID or OPTIMIZELY_CMS_CLIENT_SECRET");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`Token error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  console.log("  [auth] Token obtained");
  return cachedToken.token;
}

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

function buildHomepage(): CompNode[] {
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
  nodes: CompNode[];
}

const pages: PageDef[] = [
  {
    key: noHyphens(),
    displayName: "Homepage",
    nodes: buildHomepage(),
  },
  {
    key: noHyphens(),
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
    key: noHyphens(),
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
    key: noHyphens(),
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
    key: noHyphens(),
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
];

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function createPage(page: PageDef): Promise<void> {
  const token = await getToken();

  const body: Record<string, unknown> = {
    key: page.key,
    contentType: "DynamicExperience",
    locale: "en",
    container: CONTAINER,
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
  const token = await getToken();

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

  console.log(`\n--- Creating ${pages.length} experience pages ---`);
  for (const page of pages) {
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
