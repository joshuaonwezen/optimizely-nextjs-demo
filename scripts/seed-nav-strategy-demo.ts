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

function noHyphens(): string {
  return randomUUID().replace(/-/g, "");
}

async function findKeyByUrl(url: string): Promise<string | null> {
  const query = `{ _Page(where:{_metadata:{url:{default:{eq:"${url}"}}}},limit:1) { items { _metadata { key } } } }`;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const { data } = await res.json() as { data?: { _Page?: { items?: Array<{ _metadata?: { key?: string } }> } } };
  return data?._Page?.items?.[0]?._metadata?.key ?? null;
}

async function softDelete(key: string, token: string): Promise<void> {
  const res = await fetch(`${CONTENT_ENDPOINT}/${key}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "cms-permanent-delete": "true" },
  });
  console.log(`  [delete] ${key} → ${res.status}`);
}

async function createItem(body: Record<string, unknown>, token: string, label: string): Promise<string | null> {
  const { key, contentType, container, locale, displayName, routeSegment, status: _status, properties, composition } = body;

  const initialVersion: Record<string, unknown> = {};
  if (locale !== undefined)       initialVersion.locale       = locale;
  if (displayName !== undefined)  initialVersion.displayName  = displayName;
  if (routeSegment !== undefined) initialVersion.routeSegment = routeSegment;
  if (properties !== undefined)   initialVersion.properties   = wrapProps(properties as Record<string, unknown>);
  if (composition !== undefined)  initialVersion.composition  = composition;

  const reqBody: Record<string, unknown> = { contentType, initialVersion };
  if (key !== undefined)       reqBody.key       = key;
  if (container !== undefined) reqBody.container = container;

  const res = await fetch(CONTENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(reqBody),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`  [ERROR] ${label}: ${res.status} ${text.slice(0, 200)}`);
    return null;
  }
  const inferredKey = reqBody.key as string | undefined;
  let contentKey: string;
  let versionId: string | undefined;

  if (!text.trim()) {
    // v1 API returns 201 with no body — look up the version separately
    if (!inferredKey) return null;
    contentKey = inferredKey;
    const vRes = await fetch(`${CONTENT_ENDPOINT}/${contentKey}/versions?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (vRes.ok) {
      const vData = await vRes.json() as { items?: Array<{ version?: string }> };
      versionId = vData.items?.[0]?.version;
    }
  } else {
    const result = JSON.parse(text) as Record<string, unknown>;
    contentKey = result.key as string ?? inferredKey ?? "";
    versionId = ((result.initialVersion as Record<string, unknown> | undefined)?.version) as string | undefined;
  }

  if (versionId) {
    await fetch(`${CONTENT_ENDPOINT}/${contentKey}/versions/${versionId}:publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  console.log(`  [created] ${label} → key=${contentKey}`);
  return contentKey;
}

async function main() {
  console.log("=== Nav Strategy Demo Seed ===\n");

  CONTAINER = await discoverRootContainer();
  console.log(`  container: ${CONTAINER}\n`);

  const token = await getManagementToken();

  const S2_URLS = [
    "/en/nav-flag-home/",
    "/en/nav-flag-personal/",
    "/en/nav-flag-personal/current-account/",
    "/en/nav-flag-personal/savings/",
    "/en/nav-flag-business/",
    "/en/nav-flag-business/business-banking/",
    "/en/nav-flag-mortgages/",
    "/en/nav-flag-about/",
  ];
  const S4_URLS = [
    "/en/articles-demo/",
    "/en/articles-demo/guide-to-isas/",
    "/en/articles-demo/business-banking-basics/",
    "/en/articles-demo/savings-tips-2025/",
  ];

  console.log("--- Looking up and removing existing demo items ---");
  const allUrls = [...S2_URLS, ...S4_URLS];
  let deletedCount = 0;
  for (const url of allUrls) {
    const key = await findKeyByUrl(url);
    if (key) {
      await softDelete(key, token);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`\n  Waiting 8s for routeSegments to be released...`);
    await new Promise((r) => setTimeout(r, 8000));
  }

  console.log("\n--- Strategy 2: include-in-navigation pages ---");

  const s2TopLevel = [
    { label: "Home",             routeSegment: "nav-flag-home",     order: 1 },
    { label: "Personal Banking", routeSegment: "nav-flag-personal",  order: 2 },
    { label: "Business",         routeSegment: "nav-flag-business",  order: 3 },
    { label: "Mortgages",        routeSegment: "nav-flag-mortgages", order: 4 },
    { label: "About",            routeSegment: "nav-flag-about",     order: 5 },
  ];

  const createdKeys: Record<string, string> = {};
  for (const p of s2TopLevel) {
    const key = await createItem({
      key: noHyphens(),
      contentType: "TraditionalPage",
      locale: "en",
      container: CONTAINER,
      routeSegment: p.routeSegment,
      status: "published",
      displayName: p.label,
      properties: {
        heading: p.label,
        includeInNavigation: true,
        navLabel: p.label,
        navOrder: p.order,
      },
    }, token, p.label);
    if (key) createdKeys[p.routeSegment] = key;
  }

  // Child pages — nested under Personal Banking and Business.
  // Both have includeInNavigation: true so the tree builder will nest them.
  const s2Children = [
    { label: "Current Account",  routeSegment: "current-account",   order: 1, parent: "nav-flag-personal" },
    { label: "Savings",          routeSegment: "savings",            order: 2, parent: "nav-flag-personal" },
    { label: "Business Banking", routeSegment: "business-banking",   order: 1, parent: "nav-flag-business" },
  ];

  for (const c of s2Children) {
    const parentKey = createdKeys[c.parent];
    if (!parentKey) { console.warn(`  [skip] no parent key for ${c.label}`); continue; }
    await createItem({
      key: noHyphens(),
      contentType: "TraditionalPage",
      locale: "en",
      container: parentKey,
      routeSegment: c.routeSegment,
      status: "published",
      displayName: c.label,
      properties: {
        heading: c.label,
        includeInNavigation: true,
        navLabel: c.label,
        navOrder: c.order,
      },
    }, token, `  ${c.label} (child)`);
  }

  console.log("\n--- Strategy 4: ArticlePage content-type nav ---");
  console.log("  Creating Insights parent page...");

  const insightsKey = noHyphens();
  const insightsCreated = await createItem({
    key: insightsKey,
    contentType: "DynamicExperience",
    locale: "en",
    container: CONTAINER,
    routeSegment: "articles-demo",
    status: "published",
    displayName: "Insights",
    composition: {
      id: noHyphens(),
      displayName: "Insights",
      nodeType: "experience",
      layoutType: "outline",
      nodes: [],
    },
  }, token, "Insights (parent)");

  if (insightsCreated) {
    console.log("  Waiting 3s for parent to register...");
    await new Promise((r) => setTimeout(r, 3000));

    const articles = [
      {
        title: "Guide to ISAs",
        summary: "Everything you need to know about Individual Savings Accounts — from annual limits to tax-free growth.",
        category: "personal-finance",
        routeSegment: "guide-to-isas",
        publishDate: "2025-03-15T09:00:00Z",
      },
      {
        title: "Business Banking Basics",
        summary: "How to choose the right current account, manage cash flow, and integrate banking with your accounting tools.",
        category: "business-banking",
        routeSegment: "business-banking-basics",
        publishDate: "2025-04-02T09:00:00Z",
      },
      {
        title: "5 Savings Tips for 2025",
        summary: "From emergency funds to high-interest accounts, five habits that will make your money work harder this year.",
        category: "personal-finance",
        routeSegment: "savings-tips-2025",
        publishDate: "2025-05-10T09:00:00Z",
      },
    ];

    for (const a of articles) {
      await createItem({
        key: noHyphens(),
        contentType: "ArticlePage",
        locale: "en",
        container: insightsCreated,
        routeSegment: a.routeSegment,
        status: "published",
        displayName: a.title,
        properties: {
          title: a.title,
          summary: a.summary,
          category: a.category,
          publishDate: a.publishDate,
        },
      }, token, a.title);
    }
  }

  console.log("\n=== Done ===");
  console.log("Wait ~60 s for Graph to index, then reload /demo/navigation.");
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
