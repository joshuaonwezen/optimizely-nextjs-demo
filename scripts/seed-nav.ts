/**
 * Nav seeding script — creates:
 *   1. LandingPage content items for each nav destination lacking a real page
 *   2. NavigationItem content items (leaf-first, href = cms://content/<page-key>)
 *   3. Navigation block pointing to the top-level NavigationItems
 *
 * Prerequisites:
 *   - `npm run opti:push` must have run (NavigationItem + Navigation types registered)
 *   - `npm run seed` should have run (existing DynamicExperience pages exist)
 *
 * Run: npx tsx scripts/seed-nav.ts
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
const GRAPH_ENDPOINT = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";
const CONTAINER = "43f936c99b234ea397b261c538ad07c9";
// The Navigation shared block the user created in the CMS (hyphens removed for API)
const USER_NAV_KEY = "a69d97d416ab475695caecbb83b69e1a";

function noHyphens(): string {
  return randomUUID().replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// Nav tree definition
// ---------------------------------------------------------------------------

interface NavDef {
  key: string;            // CMS key for the NavigationItem (no-hyphens UUID, pre-assigned)
  label: string;
  href: string;           // intended URL — used to look up the target page's CMS key
  description?: string;
  openInNewTab?: boolean;
  routeSegment?: string;  // defined → create a new LandingPage with this slug
  existing?: boolean;     // true → page already exists, just look it up
  external?: boolean;     // true → external URL, no content reference
  children: NavDef[];
  // filled by buildPageKeyMap / createLandingPage:
  pageKey?: string;
}

const NAV_TREE: NavDef[] = [
  {
    key: noHyphens(), label: "Products", href: "/en/products", description: "Our full product suite",
    routeSegment: "products",
    children: [
      {
        // DynamicExperience pages created by seed-content.ts
        key: noHyphens(), label: "Content Management", href: "/en/cms",
        existing: true,
        children: [
          { key: noHyphens(), label: "Visual Builder",   href: "/en/visual-builder",   existing: true, children: [] },
          { key: noHyphens(), label: "Content Modeling", href: "/en/content-modeling", existing: true, children: [] },
          { key: noHyphens(), label: "Localization",     href: "/en/localization",     existing: true, children: [] },
        ],
      },
      {
        key: noHyphens(), label: "Feature Experimentation", href: "/en/feature-experimentation",
        existing: true,
        children: [
          { key: noHyphens(), label: "Feature Flags",        href: "/en/feature-flags",        existing: true, children: [] },
          { key: noHyphens(), label: "Progressive Rollouts", href: "/en/progressive-rollouts", existing: true, children: [] },
        ],
      },
      {
        key: noHyphens(), label: "Web Experimentation", href: "/en/web-experimentation",
        existing: true,
        children: [
          { key: noHyphens(), label: "Visual Editor", href: "/en/visual-editor", existing: true, children: [] },
          { key: noHyphens(), label: "Stats Engine",  href: "/en/stats-engine",  existing: true, children: [] },
        ],
      },
      {
        key: noHyphens(), label: "Analytics", href: "/en/analytics",
        existing: true,
        children: [
          { key: noHyphens(), label: "Reports & Dashboards", href: "/en/reports",      existing: true, children: [] },
          { key: noHyphens(), label: "Integrations",         href: "/en/integrations", existing: true, children: [] },
        ],
      },
    ],
  },
  {
    key: noHyphens(), label: "Solutions", href: "/en/solutions", routeSegment: "solutions",
    children: [
      { key: noHyphens(), label: "E-Commerce",        href: "/en/ecommerce",       routeSegment: "ecommerce",       children: [] },
      { key: noHyphens(), label: "Media & Publishing", href: "/en/media-publishing", routeSegment: "media-publishing", children: [] },
      { key: noHyphens(), label: "Enterprise",         href: "/en/enterprise",       routeSegment: "enterprise",       children: [] },
    ],
  },
  {
    key: noHyphens(), label: "Resources", href: "/en/resources", routeSegment: "resources",
    children: [
      { key: noHyphens(), label: "Documentation",  href: "/en/docs",         routeSegment: "docs",         children: [] },
      { key: noHyphens(), label: "Blog",           href: "/en/blog",         routeSegment: "blog",         children: [] },
      { key: noHyphens(), label: "Case Studies",   href: "/en/case-studies", routeSegment: "case-studies", children: [] },
    ],
  },
  {
    key: noHyphens(), label: "Developers", href: "/en/developers", routeSegment: "developers",
    children: [
      { key: noHyphens(), label: "API Reference",  href: "/en/api-reference",  routeSegment: "api-reference",  children: [] },
      { key: noHyphens(), label: "SDKs",           href: "/en/sdks",           routeSegment: "sdks",           children: [] },
      { key: noHyphens(), label: "GitHub ↗",  href: "https://github.com/episerver", openInNewTab: true, external: true, children: [] },
    ],
  },
  {
    key: noHyphens(), label: "Company", href: "/en/company", routeSegment: "company",
    children: [
      { key: noHyphens(), label: "About",   href: "/en/about",   routeSegment: "about",   children: [] },
      { key: noHyphens(), label: "Careers", href: "/en/careers", routeSegment: "careers", children: [] },
      { key: noHyphens(), label: "Contact", href: "/en/contact", existing: true,           children: [] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Graph query: build url → CMS key map for all pages/experiences
// ---------------------------------------------------------------------------

async function buildPageKeyMap(): Promise<Map<string, string>> {
  const query = `
    query GetAllPages {
      LandingPage(limit: 100) {
        items { _metadata { key url { default } } }
      }
      DynamicExperience(limit: 50) {
        items { _metadata { key url { default } } }
      }
    }
  `;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  const { data } = await res.json() as { data?: Record<string, { items?: Array<{ _metadata?: { key?: string; url?: { default?: string } } }> }> };
  const map = new Map<string, string>();
  for (const typeName of ["LandingPage", "DynamicExperience"]) {
    for (const item of (data?.[typeName]?.items ?? [])) {
      const url = item._metadata?.url?.default;
      const key = item._metadata?.key;
      if (url && key) map.set(url.replace(/\/$/, ""), key);
    }
  }
  console.log(`  [graph] Found ${map.size} existing pages`);
  return map;
}

// ---------------------------------------------------------------------------
// Management API helpers
// ---------------------------------------------------------------------------

async function apiFetch(path: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const token = await getManagementToken();
  const url = path.startsWith("http") ? path : `${CONTENT_ENDPOINT}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

// ---------------------------------------------------------------------------
// Cleanup: delete existing NavigationItem / Navigation items
// ---------------------------------------------------------------------------

async function cleanupNavItems(): Promise<void> {
  console.log("--- Cleaning up existing Navigation / NavigationItem items ---");
  const { ok, body } = await apiFetch(`/${CONTAINER}/items`);
  if (!ok) { console.log("  [skip] Could not list container items"); return; }
  const items = (body as { items?: Array<{ key: string; contentType?: string; locales?: Record<string, { displayName?: string; contentType?: string }> }> }).items ?? [];
  for (const item of items) {
    if (item.key === USER_NAV_KEY) continue; // keep the user's Navigation block
    const ct = item.contentType ?? item.locales?.en?.contentType ?? "";
    if (ct === "NavigationItem" || ct === "Navigation") {
      const del = await apiFetch(`/${item.key}?permanent=true`, { method: "DELETE" });
      console.log(`  [deleted] ${item.locales?.en?.displayName ?? item.key} (${del.status})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Create a LandingPage — returns its CMS key
// ---------------------------------------------------------------------------

async function createLandingPage(node: NavDef, pageKeyMap: Map<string, string>): Promise<string | undefined> {
  // Page already in Graph → reuse its key
  const existing = pageKeyMap.get(node.href);
  if (existing) {
    console.log(`  [page (exists)] ${node.label} → ${node.href}`);
    return existing;
  }

  const key = noHyphens();
  const { ok, status, body: resp } = await apiFetch("", {
    method: "POST",
    body: JSON.stringify({
      key,
      contentType: "LandingPage",
      locale: "en",
      container: CONTAINER,
      status: "published",
      displayName: node.label,
      routeSegment: node.routeSegment,
    }),
  });
  const respStr = JSON.stringify(resp);
  if (!ok && !(status === 400 && respStr.includes("is already in use"))) {
    console.error(`  [ERROR] LandingPage "${node.label}": ${status} ${respStr.slice(0, 200)}`);
    return undefined;
  }
  console.log(`  [page] ${node.label} → /en/${node.routeSegment}`);
  return key;
}

// ---------------------------------------------------------------------------
// Walk tree: resolve page keys for all nodes
// ---------------------------------------------------------------------------

async function resolvePageKeys(nodes: NavDef[], pageKeyMap: Map<string, string>): Promise<void> {
  for (const node of nodes) {
    if (node.external) {
      // no content reference for external links
    } else if (node.existing) {
      // must already exist in Graph — look up only, never create
      const key = pageKeyMap.get(node.href);
      if (key) {
        node.pageKey = key;
        console.log(`  [page (existing)] ${node.label} → ${node.href}`);
      } else {
        console.warn(`  [warn] ${node.label}: not found in Graph at ${node.href} — href reference will be omitted`);
      }
    } else if (node.routeSegment) {
      node.pageKey = await createLandingPage(node, pageKeyMap);
    }
    if (node.children.length > 0) {
      await resolvePageKeys(node.children, pageKeyMap);
    }
  }
}

// ---------------------------------------------------------------------------
// Create NavigationItem (leaf-first)
// ---------------------------------------------------------------------------

async function createNavItem(node: NavDef): Promise<void> {
  const childRefs = node.children.map((c) => ({ reference: `cms://content/${c.key}` }));
  const hrefRef = node.pageKey ? `cms://content/${node.pageKey}` : null;

  const body: Record<string, unknown> = {
    key: node.key,
    contentType: "NavigationItem",
    locale: "en",
    container: CONTAINER,
    status: "published",
    displayName: node.label,
    properties: {
      label: node.label,
      ...(hrefRef ? { href: hrefRef } : {}),
      description: node.description ?? null,
      openInNewTab: node.openInNewTab ?? false,
      children: childRefs,
    },
  };

  const { ok, status, body: resp } = await apiFetch("", { method: "POST", body: JSON.stringify(body) });
  if (!ok) {
    console.error(`  [ERROR] NavItem "${node.label}": ${status} ${JSON.stringify(resp).slice(0, 400)}`);
    throw new Error(`NavItem creation failed for ${node.label}`);
  }
  const childCount = node.children.length;
  const hrefInfo = node.pageKey ? `→ cms://content/${node.pageKey.slice(0, 8)}…` : node.external ? "(external, no ref)" : "(no page)";
  console.log(`  [nav-item] ${node.label} ${hrefInfo} (${childCount} children)`);
}

async function createNavTree(nodes: NavDef[]): Promise<void> {
  for (const node of nodes) {
    if (node.children.length > 0) await createNavTree(node.children);
    await createNavItem(node);
  }
}

// ---------------------------------------------------------------------------
// Create Navigation block
// ---------------------------------------------------------------------------

async function updateNavBlock(topLevelNodes: NavDef[]): Promise<void> {
  const navItemRefs = topLevelNodes.map((n) => ({ reference: `cms://content/${n.key}` }));
  const { ok, status, body: resp } = await apiFetch(`/${USER_NAV_KEY}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify({
      locale: "en",
      status: "published",
      properties: {
        name: "Navigation",
        navItems: navItemRefs,
      },
    }),
  });
  if (!ok) {
    console.error(`  [ERROR] Navigation block PATCH: ${status} ${JSON.stringify(resp).slice(0, 400)}`);
    throw new Error("Navigation block update failed");
  }
  console.log(`  [nav-block] Updated user's Navigation block (${topLevelNodes.length} top-level items)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Nav Seeding Script ===\n");

  await cleanupNavItems();

  console.log("\n--- Fetching existing page keys from Graph ---");
  const pageKeyMap = await buildPageKeyMap();

  console.log("\n--- Resolving / creating page content items ---");
  await resolvePageKeys(NAV_TREE, pageKeyMap);

  // Give the CMS a moment to propagate newly-created content before referencing it
  console.log("\n  Waiting 5 s for content to propagate...");
  await new Promise((r) => setTimeout(r, 5000));

  console.log("\n--- Creating NavigationItem tree (leaf-first) ---");
  await createNavTree(NAV_TREE);

  console.log("\n--- Updating user's Navigation block ---");
  await updateNavBlock(NAV_TREE);

  console.log("\n=== Done ===");
  console.log("Wait 30–60 s for Graph to index, then check /demo/navigation for the 'Live from CMS' badge.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
