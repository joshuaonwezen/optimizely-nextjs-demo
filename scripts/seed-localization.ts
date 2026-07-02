/**
 * Creates published Dutch (nl) versions of all seeded banking content.
 *
 * For every EN page, navigation block, and FAQ item, this script:
 *   1. Fetches the latest published EN version (properties + composition)
 *   2. Replaces every string that exactly matches a key in translations-nl.ts
 *      (dictionary misses are left untouched, so URLs / icons / type keys are safe)
 *   3. POSTs a new nl locale version and publishes it
 *
 * Idempotent: items that already have an nl version are skipped. Items with no
 * dictionary hits (e.g. demo scaffolding pages) are skipped too.
 *
 * Run after the main seed once Graph has indexed (~60s):
 *   npx tsx scripts/seed-localization.ts
 */

import {
  CONTENT_ENDPOINT,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  getManagementToken,
} from "./_shared";
import { NL } from "./translations-nl";

const TARGET_LOCALE = "nl";

// Keys whose string values are never visitor-facing prose. They are skipped
// entirely so they neither translate nor pollute the untranslated-string log.
const SKIP_KEYS = new Set([
  "contentType", "nodeType", "layoutType", "id", "key", "locale", "status",
  "routeSegment", "container", "url", "href", "reference", "version",
  "variation", "icon", "linkUrl", "ctaUrl", "ctaLink", "link", "suffix",
  "displayName", "featuredPage", "lastSync", "authorName",
]);

let hitCount = 0;
const misses = new Set<string>();

function looksLikeProse(s: string): boolean {
  return (
    s.includes(" ") &&
    s.length > 3 &&
    !s.startsWith("/") &&
    !s.startsWith("http") &&
    !s.startsWith("cms://") &&
    !s.startsWith("<")
  );
}

/** Deep-copy `node`, replacing every string that has a dictionary entry. */
function translate(node: unknown): unknown {
  if (typeof node === "string") {
    const direct = NL[node];
    if (direct) {
      hitCount++;
      return direct;
    }
    // Single-paragraph rich text ("<p>...</p>") - translate the inner text.
    const m = node.match(/^<p>([\s\S]*)<\/p>$/);
    if (m && NL[m[1]]) {
      hitCount++;
      return `<p>${NL[m[1]]}</p>`;
    }
    if (looksLikeProse(node)) misses.add(node);
    return node;
  }
  if (Array.isArray(node)) return node.map(translate);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = SKIP_KEYS.has(k) ? v : translate(v);
    }
    return out;
  }
  return node;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The Management API rate-limits bursts (429). Retry with backoff, honouring
// Retry-After when present.
async function api(path: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const token = await getManagementToken();
    const res = await fetch(`${CONTENT_ENDPOINT}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (res.status !== 429 || attempt >= 4) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1));
  }
}

// Discover everything to localize via Graph: all pages plus the shared
// navigation and FAQ blocks (which are standalone items, not composition nodes).
const DISCOVERY_QUERY = /* GraphQL */ `
  query DiscoverLocalizableContent {
    _Page(limit: 100) {
      items { _metadata { key displayName variation url { default } } }
    }
    Navigation(limit: 10) {
      items { _metadata { key displayName variation } }
    }
    NavigationItem(limit: 100) {
      items { _metadata { key displayName variation } }
    }
    FaqItemBlock(limit: 100) {
      items { _metadata { key displayName variation } }
    }
    FaqContainerBlock(limit: 10) {
      items { _metadata { key displayName variation } }
    }
  }
`;

interface DiscoveredItem {
  key: string;
  label: string;
  // The start page (site root) keeps a stable key across re-seeds, so its nl
  // version persists and goes stale when the EN composition changes (e.g. new
  // FAQ references). Force it to re-localize every run instead of skipping it.
  isHomepage: boolean;
}

// The start page is served at the site root, which Graph reports per-locale as
// "/", "/en/", "/nl/", etc. Match a bare root with an optional locale segment.
const HOMEPAGE_URL_RE = /^\/([a-z]{2}\/)?$/;

async function discover(): Promise<DiscoveredItem[]> {
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `epi-single ${SINGLE_KEY}`,
    },
    body: JSON.stringify({ query: DISCOVERY_QUERY }),
  });
  if (!res.ok) throw new Error(`Graph discovery failed: ${res.status} ${await res.text()}`);

  type Meta = { key?: string; displayName?: string; variation?: string | null; url?: { default?: string } };
  const { data } = (await res.json()) as {
    data?: Record<string, { items?: Array<{ _metadata?: Meta }> }>;
  };

  const seen = new Set<string>();
  const items: DiscoveredItem[] = [];
  for (const group of Object.values(data ?? {})) {
    for (const item of group?.items ?? []) {
      const meta = item._metadata;
      if (!meta?.key) continue;
      if (meta.variation) continue; // variation versions are localized via their base
      if (seen.has(meta.key)) continue;
      seen.add(meta.key);
      items.push({
        key: meta.key,
        label: meta.displayName ?? meta.key,
        isHomepage: HOMEPAGE_URL_RE.test(meta.url?.default ?? ""),
      });
    }
  }
  return items;
}

type Result = "created" | "exists" | "untranslated" | "failed";

async function localizeItem(item: DiscoveredItem): Promise<Result> {
  // Skip if a published nl version already exists (idempotency). A stranded
  // nl draft (e.g. publish failed on a previous run) is published instead.
  //
  // The homepage is the exception: its key is stable across re-seeds, so its nl
  // version persists and goes stale when the EN composition changes. Always
  // re-localize it from the current EN version below.
  if (!item.isHomepage) {
    const nlRes = await api(`/${item.key}/locales/${TARGET_LOCALE}?pageSize=10`);
    if (nlRes.ok) {
      const nlData = (await nlRes.json()) as {
        items?: Array<{ version?: string; status?: string }>;
      };
      const nlVersions = nlData.items ?? [];
      if (nlVersions.some((v) => v.status === "published")) return "exists";
      const draft = nlVersions[0];
      if (draft?.version) {
        const pubRes = await api(`/${item.key}/versions/${draft.version}:publish`, { method: "POST" });
        if (pubRes.ok) {
          console.log(`  [published] ${item.label} (existing nl draft)`);
          return "created";
        }
      }
    }
  }

  // Latest EN version, preferring published non-variation versions.
  const enRes = await api(`/${item.key}/locales/en?pageSize=20`);
  if (!enRes.ok) {
    console.warn(`  [warn] ${item.label}: GET locales/en ${enRes.status}`);
    return "failed";
  }
  const enData = (await enRes.json()) as {
    items?: Array<{ version?: string; status?: string; variation?: string | null }>;
  };
  const versions = enData.items ?? [];
  const base =
    versions.find((v) => !v.variation && v.status === "published") ??
    versions.find((v) => !v.variation) ??
    versions[0];
  if (!base?.version) {
    console.warn(`  [warn] ${item.label}: no EN version found`);
    return "failed";
  }

  // Full version body (displayName, routeSegment, properties, composition).
  const vRes = await api(`/${item.key}/versions/${base.version}`);
  if (!vRes.ok) {
    console.warn(`  [warn] ${item.label}: GET version ${base.version} ${vRes.status}`);
    return "failed";
  }
  const full = (await vRes.json()) as Record<string, unknown>;

  hitCount = 0;
  const properties = full.properties ? translate(full.properties) : undefined;
  const composition = full.composition ? translate(full.composition) : undefined;
  if (hitCount === 0) return "untranslated";

  const body: Record<string, unknown> = {
    locale: TARGET_LOCALE,
    displayName: full.displayName ?? item.label,
    ...(full.routeSegment ? { routeSegment: full.routeSegment } : {}),
    ...(properties ? { properties } : {}),
    ...(composition ? { composition } : {}),
  };

  const createRes = await api(`/${item.key}/versions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const text = await createRes.text();
  if (!createRes.ok) {
    if (text.includes("must be enabled")) {
      console.error(
        `\n  [ERROR] The '${TARGET_LOCALE}' locale is not enabled on this CMS instance.\n` +
        `  Enable it in the CMS UI (Settings > Languages > add Dutch and enable it),\n` +
        `  then re-run: npx tsx scripts/seed-localization.ts`
      );
      process.exit(1);
    }
    console.warn(`  [warn] ${item.label}: POST nl version ${createRes.status} ${text.slice(0, 200)}`);
    return "failed";
  }

  // Find the new version id (create may return an empty body) and publish it.
  let nlVersion: string | undefined;
  if (text.trim()) {
    nlVersion = (JSON.parse(text) as { version?: string }).version;
  }
  if (!nlVersion) {
    const lookupRes = await api(`/${item.key}/locales/${TARGET_LOCALE}?pageSize=1`);
    if (lookupRes.ok) {
      const lookup = (await lookupRes.json()) as { items?: Array<{ version?: string }> };
      nlVersion = lookup.items?.[0]?.version;
    }
  }
  if (!nlVersion) {
    console.warn(`  [warn] ${item.label}: created nl version but could not resolve its id for publishing`);
    return "failed";
  }

  const pubRes = await api(`/${item.key}/versions/${nlVersion}:publish`, { method: "POST" });
  if (!pubRes.ok) {
    console.warn(`  [warn] ${item.label}: publish nl version ${pubRes.status} ${(await pubRes.text()).slice(0, 200)}`);
    return "failed";
  }

  console.log(`  [localized] ${item.label} (${hitCount} strings)`);
  return "created";
}

async function main() {
  console.log("=== Dutch (nl) Localization Seeding ===\n");
  console.log("--- Discovering EN content via Graph ---");
  const items = await discover();
  // Localize the homepage last: its FaqContainerBlock references the shared FAQ
  // items, whose nl versions must be published before the nl homepage can
  // resolve them.
  items.sort((a, b) => Number(a.isHomepage) - Number(b.isHomepage));
  console.log(`  found ${items.length} items\n`);

  const tally: Record<Result, number> = { created: 0, exists: 0, untranslated: 0, failed: 0 };

  console.log("--- Creating nl versions ---");
  for (const item of items) {
    try {
      tally[await localizeItem(item)]++;
    } catch (err) {
      tally.failed++;
      console.warn(`  [warn] ${item.label}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(250); // stay under the Management API burst limit
  }

  console.log(
    `\n=== Done: ${tally.created} localized, ${tally.exists} already had nl, ` +
    `${tally.untranslated} skipped (no dictionary hits), ${tally.failed} failed ===`
  );

  if (misses.size > 0) {
    console.log(`\nUntranslated prose strings (add to scripts/translations-nl.ts):`);
    for (const s of [...misses].slice(0, 25)) console.log(`  - ${s.slice(0, 100)}`);
    if (misses.size > 25) console.log(`  ...and ${misses.size - 25} more`);
  }

  console.log("\nWait ~60s for Graph to index, then visit /nl/ to verify.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
