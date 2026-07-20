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
import { getManagementToken } from "../src/lib/optimizely/auth";
import {
  CONTENT_ENDPOINT,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  deleteContentByKey,
  discoverGlobalRoot,
  discoverRootContainer,
  findItemsInContainerByName,
  sweepMisplacedSharedBlocks,
  wrapProps,
  noHyphens,
} from "./_shared";

config({ path: ".env.local" });

let CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";
// Global content root — the Navigation block + NavigationItems are shared blocks
// and live here so they appear in "Shared Blocks → For All Applications". Set in main().
let BLOCKS_CONTAINER = "";
// Optional: when set, seed-nav will delete this specific Navigation block and
// recreate it in the same container with the correct navItems. If not set,
// the script searches CONTAINER for an existing Navigation block or creates a
// new one there.
const NAV_BLOCK_KEY = (process.env.OPTIMIZELY_NAV_BLOCK_KEY ?? "").replace(/-/g, "");
// Display name for the seeded Navigation block — what editors see in the
// Shared Blocks tab. The app's Graph query fetches by type (Navigation, limit 1),
// not by name, so re-runs can delete the old block and POST a fresh one with a
// new random key without conflicting with the Recycle Bin.
// NOTE: Optimizely Management API PATCH does not persist content-area properties;
//       the only reliable pattern is DELETE → wait → POST with the payload.
const NAV_BLOCK_NAME = "Navigation Menu";

const PAGE_CONTENT: Record<string, { heading: string; subheading: string; ctaLabel: string; ctaLink: string }> = {
  loans:               { heading: "Personal Loans",            subheading: "Borrow from £1,000 to £25,000 with a fixed rate and no early repayment fees. Get a decision in minutes.", ctaLabel: "Check My Rate",           ctaLink: "/en/personal/loans" },
  "merchant-services": { heading: "Merchant Services",         subheading: "Accept card payments in-store and online. Competitive rates, next-day settlement, and 24/7 support.",      ctaLabel: "Get Started",             ctaLink: "/en/business/merchant-services" },
  "stocks-isa":        { heading: "Stocks & Shares ISA",       subheading: "Invest up to £20,000 tax-free each year. Choose from thousands of funds, shares, and ETFs.",               ctaLabel: "Open an ISA",             ctaLink: "/en/investments/stocks-isa" },
  pensions:            { heading: "Pensions",                  subheading: "A self-invested personal pension (SIPP) that puts you in control. Start with as little as £50 a month.",   ctaLabel: "Plan My Retirement",      ctaLink: "/en/investments/pensions" },
  faqs:                { heading: "Frequently Asked Questions", subheading: "Quick answers to the questions we hear most — from opening an account to reporting a lost card.",           ctaLabel: "Browse FAQs",             ctaLink: "/en/help/faqs" },
  branches:            { heading: "Find a Branch",             subheading: "With over 140 branches across the UK, expert advice is never far away. Find your nearest location.",        ctaLabel: "Find a Branch",           ctaLink: "/en/help/branches" },
  "buy-to-let":        { heading: "Buy-to-Let Mortgages",      subheading: "Competitive buy-to-let rates for individual landlords and portfolio investors. Free valuation included.",    ctaLabel: "See BTL Rates",           ctaLink: "/en/mortgage/buy-to-let" },
  "about-us":          { heading: "About Us",                  subheading: "Founded in 1998, Mosey Bank has grown from a single branch in Leeds to a national bank serving 2 million customers.", ctaLabel: "Meet the Team", ctaLink: "/en/about/about-us" },
  careers:             { heading: "Careers",                   subheading: "Join a team that puts people first — customers and colleagues. We're always looking for exceptional people.", ctaLabel: "See Open Roles",         ctaLink: "/en/about/careers" },
  press:               { heading: "Press & Media",             subheading: "Latest news, press releases, and media resources from Mosey Bank.",                                         ctaLabel: "View Press Releases",     ctaLink: "/en/about/press" },
};

// Nav tree definition

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

function collectExistingUrls(nodes: NavDef[]): string[] {
  const urls: string[] = [];
  for (const node of nodes) {
    if (node.existing) urls.push(node.href);
    urls.push(...collectExistingUrls(node.children));
  }
  return urls;
}

const NAV_TREE: NavDef[] = [
  {
    key: noHyphens(), label: "Personal", href: "/en/personal",
    existing: true,
    children: [
      {
        key: noHyphens(), label: "Current Account", href: "/en/personal/current-account",
        existing: true,
        children: [
          { key: noHyphens(), label: "Instant Payments", href: "/en/personal/current-account/instant-payments", existing: true, children: [] },
          { key: noHyphens(), label: "Mobile App",       href: "/en/personal/current-account/mobile-app",       existing: true, children: [] },
          { key: noHyphens(), label: "Travel Money",     href: "/en/personal/current-account/travel-money",     existing: true, children: [] },
        ],
      },
      {
        key: noHyphens(), label: "Savings", href: "/en/personal/savings",
        existing: true,
        children: [
          { key: noHyphens(), label: "Easy Access", href: "/en/personal/savings/easy-access-savings", existing: true, children: [] },
          { key: noHyphens(), label: "Fixed Rate",  href: "/en/personal/savings/fixed-rate-savings",  existing: true, children: [] },
        ],
      },
      { key: noHyphens(), label: "Personal Loans", href: "/en/personal/loans", existing: true, children: [] },
      { key: noHyphens(), label: "Credit Cards",   href: "/en/personal/credit-cards", existing: true, children: [] },
      { key: noHyphens(), label: "Overdrafts",     href: "/en/personal/overdrafts",   existing: true, children: [] },
    ],
  },
  {
    key: noHyphens(), label: "Business", href: "/en/business",
    existing: true,
    children: [
      {
        key: noHyphens(), label: "Business Banking", href: "/en/business/business-banking",
        existing: true,
        children: [
          { key: noHyphens(), label: "Business Current Account", href: "/en/business/business-banking/business-current-account", existing: true, children: [] },
          { key: noHyphens(), label: "Business Lending",         href: "/en/business/business-banking/business-lending",         existing: true, children: [] },
        ],
      },
      { key: noHyphens(), label: "Merchant Services",     href: "/en/business/merchant-services",      existing: true, children: [] },
      { key: noHyphens(), label: "International Payments", href: "/en/business/international-payments", existing: true, children: [] },
      { key: noHyphens(), label: "Business Credit Cards",  href: "/en/business/business-credit-cards", existing: true, children: [] },
    ],
  },
  {
    key: noHyphens(), label: "Mortgages", href: "/en/mortgage", description: "Find your mortgage",
    existing: true,
    children: [
      { key: noHyphens(), label: "First-Time Buyers", href: "/en/mortgage/first-time-buyers", existing: true, children: [] },
      { key: noHyphens(), label: "Remortgaging",      href: "/en/mortgage/remortgaging",      existing: true, children: [] },
      { key: noHyphens(), label: "Buy-to-Let",        href: "/en/mortgage/buy-to-let",        existing: true, children: [] },
      { key: noHyphens(), label: "Overpayments",      href: "/en/mortgage/overpayments",      existing: true, children: [] },
    ],
  },
  {
    key: noHyphens(), label: "Investments", href: "/en/investments",
    existing: true,
    children: [
      { key: noHyphens(), label: "Stocks & Shares ISA",        href: "/en/investments/stocks-isa",         existing: true, children: [] },
      { key: noHyphens(), label: "Pensions",                   href: "/en/investments/pensions",           existing: true, children: [] },
      { key: noHyphens(), label: "Junior ISA",                 href: "/en/investments/junior-isa",         existing: true, children: [] },
      { key: noHyphens(), label: "General Investment Account", href: "/en/investments/general-investment", existing: true, children: [] },
    ],
  },
  {
    key: noHyphens(), label: "Help", href: "/en/help",
    existing: true,
    children: [
      { key: noHyphens(), label: "FAQs",          href: "/en/help/faqs",          existing: true, children: [] },
      { key: noHyphens(), label: "Contact Us",    href: "/en/help/contact",       existing: true, children: [] },
      { key: noHyphens(), label: "Find a Branch", href: "/en/help/branches",      existing: true, children: [] },
      { key: noHyphens(), label: "Security & Fraud", href: "/en/help/security",   existing: true, children: [] },
      { key: noHyphens(), label: "Accessibility", href: "/en/help/accessibility", existing: true, children: [] },
    ],
  },
  {
    key: noHyphens(), label: "About", href: "/en/about",
    existing: true,
    children: [
      { key: noHyphens(), label: "About Mosey",    href: "/en/about/about-us",       existing: true, children: [] },
      { key: noHyphens(), label: "Careers",        href: "/en/about/careers",        existing: true, children: [] },
      { key: noHyphens(), label: "Press",          href: "/en/about/press",          existing: true, children: [] },
      { key: noHyphens(), label: "Sustainability", href: "/en/about/sustainability", existing: true, children: [] },
    ],
  },
];

// Graph query: build url → CMS key map for all pages/experiences

/** One Graph read: url → CMS key map (with /en cross-prefix aliases). */
async function fetchPageKeyMap(): Promise<Map<string, string>> {
  const query = `
    query GetAllPages {
      _Page(limit: 100) {
        items { _metadata { key url { default } } }
      }
    }
  `;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  const json = await res.json() as { data?: { _Page?: { items?: Array<{ _metadata?: { key?: string; url?: { default?: string } } }> } }; errors?: unknown };
  if (json.errors) console.warn("  [graph warn]", JSON.stringify(json.errors).slice(0, 200));
  const map = new Map<string, string>();
  for (const item of (json.data?._Page?.items ?? [])) {
    const url = item._metadata?.url?.default;
    const key = item._metadata?.key;
    if (!url || !key) continue;
    const bare = url.replace(/\/$/, "");
    map.set(bare, key);
    // Register cross-prefix aliases so lookups succeed regardless of whether Graph
    // indexed the page with or without the /en/ locale prefix.
    if (bare.startsWith("/en/")) {
      map.set(bare.replace(/^\/en/, ""), key);   // /en/personal/savings → /personal/savings
    } else if (bare !== "/" && !bare.match(/^\/[a-z]{2}(-[a-z]{2})?\//) ) {
      map.set("/en" + bare, key);                // /current-account → /en/current-account
    }
  }
  return map;
}

/** True if a nav target URL (e.g. "/en/personal/loans") resolves in the map,
 *  accounting for the with/without /en aliases the map registers. */
function urlResolves(map: Map<string, string>, url: string): boolean {
  const bare = url.replace(/\/$/, "");
  return map.has(bare) || map.has(bare.replace(/^\/en/, ""));
}

/**
 * Build the url → CMS key map, polling Graph until it has indexed EVERY page the
 * nav needs (`requiredUrls`), not just "enough" pages. This matters because the
 * runner calls seed-nav immediately after seed-content with no wait, and Graph
 * indexing lags ~30-60s and finishes different pages at different times - so a high
 * total count does NOT mean a given nav target is indexed yet. Polling on the exact
 * required set is what guarantees every nav link resolves. Never hard-exits: if some
 * pages are still missing after the ceiling we warn and proceed (those few nav items
 * are created without an href), so the runner completes as a whole - re-run
 * seed-nav.ts to backfill.
 */
async function buildPageKeyMap(requiredUrls: string[] = []): Promise<Map<string, string>> {
  const MAX_ATTEMPTS = 16;  // ~16 * 15s ≈ 4 min ceiling
  let map = new Map<string, string>();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    map = await fetchPageKeyMap();
    const missing = requiredUrls.filter((u) => !urlResolves(map, u));
    if (map.size > 0 && missing.length === 0) {
      console.log(`  [graph] All ${requiredUrls.length} required nav page URLs indexed (${map.size} entries incl. aliases)`);
      return map;
    }
    console.log(`  [graph] ${map.size} entries; ${missing.length}/${requiredUrls.length} required nav URLs not yet indexed (attempt ${attempt}/${MAX_ATTEMPTS}) - waiting...`);
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 15000));
  }
  const stillMissing = requiredUrls.filter((u) => !urlResolves(map, u));
  console.warn(
    `  [warn] ${stillMissing.length} nav page URL(s) still not indexed after ${MAX_ATTEMPTS} attempts - ` +
    `those nav items will be created without an href. Re-run 'npx tsx scripts/seed-nav.ts' once Graph catches up.`
  );
  return map;
}

// Management API helpers

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

// Cleanup: delete existing NavigationItem / Navigation / stub page items

async function cleanupNavItems(): Promise<void> {
  console.log("--- Cleaning up existing Navigation / NavigationItem items ---");
  const { ok, body } = await apiFetch(`/${CONTAINER}/items`);
  if (!ok) { console.log("  [skip] Could not list container items"); return; }
  // v1 GET /items returns ContentNode — has contentType directly (no locales wrapper)
  const items = (body as { items?: Array<{ key: string; contentType?: string }> }).items ?? [];
  for (const item of items) {
    const ct = item.contentType ?? "";
    // Only clean up stray Navigation blocks stranded at the root - NEVER content
    // pages. seed-nav no longer creates any pages (every nav node references a page
    // seed-content owns), and content pages like the root-level /mortgage
    // TraditionalPage live here legitimately; deleting them here removed the whole
    // mortgage subtree (cascade) on every run.
    if (ct === "NavigationItem" || ct === "Navigation") {
      const del = await apiFetch(`/${item.key}`, { method: "DELETE", headers: { "cms-permanent-delete": "true" } });
      console.log(`  [deleted] ${item.key} (${del.status})`);
    }
  }
}

// Create a LandingPage — returns its CMS key

async function createNavPage(node: NavDef, pageKeyMap: Map<string, string>, parentKey = CONTAINER): Promise<string | undefined> {
  // Page already in Graph → reuse its key
  const existing = pageKeyMap.get(node.href);
  if (existing) {
    console.log(`  [page (exists)] ${node.label} → ${node.href}`);
    return existing;
  }

  const content = PAGE_CONTENT[node.routeSegment!] ?? {
    heading: node.label,
    subheading: `Learn more about ${node.label} and how Mosey Bank can help you.`,
    ctaLabel: "Learn More",
    ctaLink: "#",
  };

  const key = noHyphens();
  const { ok, status, body: resp } = await apiFetch("", {
    method: "POST",
    body: JSON.stringify({
      key,
      contentType: "TraditionalPage",
      container: parentKey,
      initialVersion: {
        locale: "en",
        displayName: node.label,
        routeSegment: node.routeSegment,
        properties: wrapProps({
          heading:    content.heading,
          subheading: content.subheading,
          body:       { html: `<p>${content.subheading}</p>` },
        }),
      },
    }),
  });
  const respStr = JSON.stringify(resp);
  if (!ok) {
    if (status === 400 && respStr.includes("is already in use")) {
      console.log(`  [page (skip)] ${node.label} → routeSegment already in use`);
      return undefined;
    }
    if (status === 409) {
      console.log(`  [page (skip)] ${node.label} → key already exists`);
      return undefined;
    }
    console.error(`  [ERROR] Page "${node.label}": ${status} ${respStr.slice(0, 200)}`);
    return undefined;
  }
  // Publish the newly-created draft (v1 API may return 201 with empty body)
  let version = ((resp as Record<string, unknown>)?.initialVersion as Record<string, unknown> | undefined)?.version as string | undefined;
  if (!version) {
    const vRes = await apiFetch(`/${key}/versions?pageSize=1`);
    version = ((vRes.body as Record<string, unknown>)?.items as Array<{ version?: string }> | undefined)?.[0]?.version;
  }
  if (version) {
    await apiFetch(`/${key}/versions/${version}:publish`, { method: "POST" });
  }
  console.log(`  [page] ${node.label} → ${node.href}`);
  return key;
}

// Walk tree: resolve page keys for all nodes

async function resolvePageKeys(nodes: NavDef[], pageKeyMap: Map<string, string>, parentKey = CONTAINER): Promise<void> {
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
      node.pageKey = await createNavPage(node, pageKeyMap, parentKey);
    }
    if (node.children.length > 0) {
      // Pass this node's resolved CMS key as the parent so children get the correct URL nesting.
      // Fall back to the incoming parentKey if this node has no resolved key (e.g. lookup failed).
      await resolvePageKeys(node.children, pageKeyMap, node.pageKey ?? parentKey);
    }
  }
}

// Create NavigationItem (leaf-first)

async function createNavItem(node: NavDef, ancestors: string[]): Promise<void> {
  const childRefs = node.children.map((c) => ({ reference: `cms://content/${c.key}` }));
  const hrefRef = node.pageKey ? `cms://content/${node.pageKey}` : null;
  // Shared Blocks is a flat list — encode the type and the tree position in the
  // display name so editors can tell "Navigation Item - Personal / Savings"
  // from a page or another item with the same label.
  const displayName = `Navigation Item - ${[...ancestors, node.label].join(" / ")}`;

  const makeBody = (includeHref: boolean): Record<string, unknown> => ({
    key: node.key,
    contentType: "NavigationItem",
    container: BLOCKS_CONTAINER,
    initialVersion: {
      locale: "en",
      displayName,
      properties: wrapProps({
        label: node.label,
        ...(includeHref && hrefRef ? { href: hrefRef } : {}),
        description: node.description ?? null,
        openInNewTab: node.openInNewTab ?? false,
        children: childRefs,
      }),
    },
  });

  let { ok, status, body: resp } = await apiFetch("", { method: "POST", body: JSON.stringify(makeBody(true)) });

  // If the href reference isn't committed yet, retry once without it
  if (!ok && hrefRef && JSON.stringify(resp).includes("does not exist")) {
    console.warn(`  [retry] ${node.label} — href not committed yet, creating without href`);
    ({ ok, status, body: resp } = await apiFetch("", { method: "POST", body: JSON.stringify(makeBody(false)) }));
  }

  if (!ok) {
    console.error(`  [ERROR] NavItem "${node.label}": ${status} ${JSON.stringify(resp).slice(0, 400)}`);
    throw new Error(`NavItem creation failed for ${node.label}`);
  }

  // Publish the draft (v1 API may return 201 with empty body)
  let version = ((resp as Record<string, unknown>)?.initialVersion as Record<string, unknown> | undefined)?.version as string | undefined;
  if (!version) {
    const vRes = await apiFetch(`/${node.key}/versions?pageSize=1`);
    version = ((vRes.body as Record<string, unknown>)?.items as Array<{ version?: string }> | undefined)?.[0]?.version;
  }
  if (version) {
    await apiFetch(`/${node.key}/versions/${version}:publish`, { method: "POST" });
  }

  const childCount = node.children.length;
  const hrefInfo = node.pageKey ? `→ cms://content/${node.pageKey.slice(0, 8)}…` : node.external ? "(external, no ref)" : "(no page)";
  console.log(`  [nav-item] ${node.label} ${hrefInfo} (${childCount} children)`);
}

async function createNavTree(nodes: NavDef[], ancestors: string[] = []): Promise<void> {
  for (const node of nodes) {
    if (node.children.length > 0) await createNavTree(node.children, [...ancestors, node.label]);
    await createNavItem(node, ancestors);
  }
}

// Create Navigation block

async function updateNavBlock(topLevelNodes: NavDef[]): Promise<void> {
  const navItemRefs = topLevelNodes.map((n) => ({ reference: `cms://content/${n.key}` }));
  let targetKey = noHyphens();
  let targetContainer = BLOCKS_CONTAINER;

  if (NAV_BLOCK_KEY) {
    // Explicit override: look up this block's container, then delete it.
    const { ok, body: existing } = await apiFetch(`/${NAV_BLOCK_KEY}`);
    if (ok) {
      const container = (existing as { container?: string }).container;
      if (container) targetContainer = container;
    }
    await apiFetch(`/${NAV_BLOCK_KEY}`, { method: "DELETE", headers: { "cms-permanent-delete": "true" } });
    console.log(`  [deleted] existing nav block ${NAV_BLOCK_KEY}`);
    targetKey = NAV_BLOCK_KEY;
    await new Promise((r) => setTimeout(r, 3000));
  } else {
    // Auto-discover: look for an existing Navigation block in the blocks container.
    const { ok, body: listBody } = await apiFetch(`/${BLOCKS_CONTAINER}/items?contentTypes=Navigation`);
    if (ok) {
      const navItems = (listBody as { items?: Array<{ key: string; container?: string }> }).items ?? [];
      if (navItems.length > 0) {
        const found = navItems[0];
        targetKey = found.key;
        if (found.container) targetContainer = found.container;
        await apiFetch(`/${found.key}`, { method: "DELETE", headers: { "cms-permanent-delete": "true" } });
        console.log(`  [deleted] existing nav block ${found.key} (auto-discovered)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  // PATCH silently ignores content-area property updates — DELETE + POST is the reliable pattern.
  const { ok, status, body: resp } = await apiFetch("", {
    method: "POST",
    body: JSON.stringify({
      key: targetKey,
      contentType: "Navigation",
      container: targetContainer,
      initialVersion: {
        locale: "en",
        displayName: NAV_BLOCK_NAME,
        properties: wrapProps({
          name: NAV_BLOCK_NAME,
          navItems: navItemRefs,
        }),
      },
    }),
  });
  if (!ok) {
    console.error(`  [ERROR] Navigation block POST: ${status} ${JSON.stringify(resp).slice(0, 400)}`);
    throw new Error("Navigation block creation failed");
  }

  // Publish (v1 API may return 201 with empty body)
  let navBlockVersion = ((resp as Record<string, unknown>)?.initialVersion as Record<string, unknown> | undefined)?.version as string | undefined;
  if (!navBlockVersion) {
    const vRes = await apiFetch(`/${targetKey}/versions?pageSize=1`);
    navBlockVersion = ((vRes.body as Record<string, unknown>)?.items as Array<{ version?: string }> | undefined)?.[0]?.version;
  }
  if (navBlockVersion) {
    await apiFetch(`/${targetKey}/versions/${navBlockVersion}:publish`, { method: "POST" });
  }

  console.log(`  [nav-block] Created "${NAV_BLOCK_NAME}" (key ${targetKey}) with ${topLevelNodes.length} top-level items`);
}

async function main() {
  console.log("=== Nav Seeding Script ===\n");

  console.log("--- Discovering root container ---");
  CONTAINER = await discoverRootContainer();
  BLOCKS_CONTAINER = await discoverGlobalRoot();
  console.log(`  container: ${CONTAINER}`);
  console.log(`  blocks container (For All Applications): ${BLOCKS_CONTAINER}`);

  await cleanupNavItems();

  // Remove nav blocks stranded at the top-level root by earlier seed versions
  // (they were plain content items there, invisible to the Shared Blocks tab).
  // The blocks folder is NOT swept by content type: seed-footer.ts also creates
  // NavigationItem blocks there ("Footer - ..."), which must survive nav
  // re-seeds. Folder leftovers are deleted by display-name sentinel instead.
  console.log("--- Sweeping misplaced/stale Navigation shared blocks ---");
  await sweepMisplacedSharedBlocks(["Navigation", "NavigationItem"], { includeBlocksFolder: false });
  const staleNavBlocks = await findItemsInContainerByName(
    (name) => name.startsWith("Navigation Item - ") || name === NAV_BLOCK_NAME,
    BLOCKS_CONTAINER
  );
  for (const item of staleNavBlocks) {
    await deleteContentByKey(item.key);
    console.log(`  [deleted] ${item.displayName} (${item.key})`);
  }

  console.log("\n--- Fetching existing page keys from Graph ---");
  // Poll until every existing-page URL the nav references is indexed, so no nav
  // link is left dangling when seed-nav runs right after seed-content in the runner.
  const pageKeyMap = await buildPageKeyMap(collectExistingUrls(NAV_TREE));

  const unresolved = collectExistingUrls(NAV_TREE).filter(
    (url) => !pageKeyMap.has(url) && !pageKeyMap.has(url.replace("/en", ""))
  );
  if (unresolved.length > 0) {
    console.warn(
      `\n  [warn] ${unresolved.length} expected page URL(s) not yet indexed in Graph:\n` +
      unresolved.map((u) => `    ${u}`).join("\n") +
      "\n  Nav items for these pages will be created without a page reference." +
      "\n  Re-run after 30-60s: npx tsx scripts/seed-nav.ts"
    );
  }

  console.log("\n--- Resolving / creating page content items ---");
  await resolvePageKeys(NAV_TREE, pageKeyMap);

  // Give the CMS a moment to propagate newly-created content before referencing it
  console.log("\n  Waiting 20 s for content to propagate...");
  await new Promise((r) => setTimeout(r, 20000));

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
