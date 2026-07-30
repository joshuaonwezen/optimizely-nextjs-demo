/**
 * Configures Optimizely Graph search relevance for the instance: pinned results
 * and synonyms. Pinned targets are resolved by URL at runtime (findPageKeyByUrl)
 * so they always point at the freshly seeded pages after content is overwritten.
 *
 * Runs as the final optional step of the seed runner, so it applies to every
 * instance under `npm run seed:instances`. Cleans up any existing pinned
 * collections and slot-one synonyms first, then recreates them. Depends on
 * seed-content/seed-nav pages being indexed by Graph (~30-60s lag) - unresolved
 * pins are warned and skipped, never fatal.
 *
 * Run standalone: npx tsx scripts/seed-search-config.ts
 */

import { config } from "dotenv";
import { findPageKeyByUrl } from "./_shared";

config({ path: ".env.local" });

const GRAPH_BASE = "https://cg.optimizely.com";

const PIN_COLLECTION = { title: "Search Demo Pins", key: "search-demo", isActive: true };

// Phrases a visitor types -> the page that should pin to the top. Each phrase is
// stored as its own pin item because Graph matches a pin's `phrases` value as a
// single exact (case-insensitive) phrase - a comma list in one item never
// matches. Targets are resolved to the current content key by URL, so these
// survive a reseed.
//
// A collection holds at most 20 pinned items (Graph caps it; a 21st silently
// evicts the oldest), so keep the total phrase count <= 20.
const PIN_RULES: Array<{ phrases: string[]; url: string }> = [
  { phrases: ["pricing"], url: "/business/pricing/" },
  { phrases: ["mortgage", "mortgages"], url: "/mortgage/" },
  { phrases: ["savings"], url: "/personal/savings/" },
  { phrases: ["credit card", "credit cards"], url: "/personal/credit-cards/" },
  { phrases: ["pension", "pensions"], url: "/investments/pensions/" },
  { phrases: ["support", "help"], url: "/help/" },
  { phrases: ["contact"], url: "/help/contact/" },
  { phrases: ["security", "fraud"], url: "/help/security/" },
  { phrases: ["mobile app", "app"], url: "/personal/current-account/mobile-app/" },
  { phrases: ["overdraft"], url: "/personal/overdrafts/" },
  { phrases: ["loan", "loans"], url: "/personal/loans/" },
  { phrases: ["isa"], url: "/investments/stocks-isa/" },
  { phrases: ["current account"], url: "/personal/current-account/" },
];

// Bidirectional synonym groups, slot one (one rule per line). PUT replaces the
// whole slot, so this both clears stale entries and writes the new set.
const SYNONYMS = [
  "mosey,optimizely",
  "mortgage,home loan",
  "current account,checking account",
  "help,support,assistance",
  "fraud,scam",
  "pension,retirement",
  "isa,individual savings account",
];

function getBasicAuth(): string {
  const appKey = process.env.OPTIMIZELY_APP_KEY;
  const appSecret = process.env.OPTIMIZELY_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("Missing OPTIMIZELY_APP_KEY / OPTIMIZELY_APP_SECRET (Graph admin Basic auth)");
  }
  return `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function storedPhrases(auth: string, collectionId: string): Promise<Set<string>> {
  const res = await fetch(`${GRAPH_BASE}/api/pinned/collections/${collectionId}/items`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) return new Set();
  const items = (await res.json()) as Array<{ phrases: string }>;
  return new Set(items.map((i) => i.phrases));
}

// Clearing items (a prerequisite for deleting a collection) is eventually
// consistent: the DELETE returns before the items are actually gone, so adds
// fired immediately after get swept. Wait until the collection reads back empty
// before re-pinning.
async function clearAndWaitEmpty(auth: string, collectionId: string): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/api/pinned/collections/${collectionId}/items`, {
    method: "DELETE",
    headers: { Authorization: auth },
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`  [warn] could not clear items of ${collectionId}: ${res.status} - continuing`);
    return;
  }
  for (let i = 0; i < 20 && (await storedPhrases(auth, collectionId)).size > 0; i++) {
    await sleep(500);
  }
}

/**
 * Return the id of our `search-demo` collection, creating it if absent. Existing
 * items are cleared, and any other (stale) collections are emptied and deleted -
 * so every run leaves exactly one clean collection.
 */
async function ensureCollection(auth: string): Promise<string> {
  const res = await fetch(`${GRAPH_BASE}/api/pinned/collections`, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`List pinned collections failed: ${res.status} ${await res.text()}`);
  const collections = (await res.json()) as Array<{ id: string; key?: string }>;

  let targetId: string | null = null;
  for (const c of collections) {
    await clearAndWaitEmpty(auth, c.id);
    if (c.key === PIN_COLLECTION.key) {
      targetId = c.id;
    } else {
      const del = await fetch(`${GRAPH_BASE}/api/pinned/collections/${c.id}`, {
        method: "DELETE",
        headers: { Authorization: auth },
      });
      if (!del.ok) console.warn(`  [warn] could not delete stale collection ${c.id}: ${del.status} - continuing`);
    }
  }

  if (targetId) {
    console.log(`  reusing collection "${PIN_COLLECTION.title}" (${targetId}), items cleared`);
    return targetId;
  }

  const created = await fetch(`${GRAPH_BASE}/api/pinned/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(PIN_COLLECTION),
  });
  if (!created.ok) throw new Error(`Create collection failed: ${created.status} ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };
  console.log(`  created collection "${PIN_COLLECTION.title}" (${id})`);
  return id;
}

async function addPin(auth: string, collectionId: string, phrases: string, targetKey: string): Promise<boolean> {
  const res = await fetch(`${GRAPH_BASE}/api/pinned/collections/${collectionId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ phrases, targetKey, priority: 1000, isActive: true, language: null }),
  });
  if (!res.ok) {
    console.warn(`  [warn] pin "${phrases}" failed: ${res.status} ${await res.text()} - skipping`);
    return false;
  }
  return true;
}

async function setSynonyms(auth: string): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/resources/synonyms`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain", Authorization: auth },
    body: SYNONYMS.join("\n"),
  });
  if (!res.ok) throw new Error(`Set synonyms failed: ${res.status} ${await res.text()}`);
  console.log(`  set ${SYNONYMS.length} synonym rule(s)`);
}

async function main(): Promise<void> {
  const auth = getBasicAuth();
  console.log(`Configuring search for ${process.env.OPTIMIZELY_CMS_URL ?? "(unknown instance)"}`);

  const collectionId = await ensureCollection(auth);

  // Resolve every phrase to its current target key up front (URL -> key), so a
  // reseed always re-pins the fresh pages.
  const pins: Array<{ phrase: string; targetKey: string }> = [];
  const skipped: string[] = [];
  for (const rule of PIN_RULES) {
    // Pass trailing and non-trailing variants: findPageKeyByUrl expands /en
    // prefixes but not the trailing slash, and instances differ.
    const key = await findPageKeyByUrl([rule.url, rule.url.replace(/\/$/, "")]);
    if (!key) {
      console.warn(`  [warn] pin target not in Graph yet: ${rule.url} - skipping`);
      skipped.push(rule.url);
      continue;
    }
    for (const phrase of rule.phrases) pins.push({ phrase, targetKey: key });
  }

  for (const p of pins) await addPin(auth, collectionId, p.phrase, p.targetKey);

  // Reconcile: the clear/add path is eventually consistent, so re-add any phrase
  // that did not stick, up to a few attempts.
  let stored = await storedPhrases(auth, collectionId);
  for (let attempt = 0; attempt < 4 && pins.some((p) => !stored.has(p.phrase)); attempt++) {
    await sleep(1000);
    for (const p of pins) if (!stored.has(p.phrase)) await addPin(auth, collectionId, p.phrase, p.targetKey);
    stored = await storedPhrases(auth, collectionId);
  }

  await setSynonyms(auth);

  const missing = pins.filter((p) => !stored.has(p.phrase)).map((p) => p.phrase);
  console.log(`Done. ${pins.length - missing.length}/${pins.length} pins stored${skipped.length ? `, ${skipped.length} target(s) skipped` : ""}.`);
  if (missing.length) console.warn(`  [warn] pins not confirmed: ${missing.join(", ")}`);
  if (skipped.length) console.warn(`  Skipped (not indexed yet): ${skipped.join(", ")}. Re-run once Graph has indexed them.`);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
