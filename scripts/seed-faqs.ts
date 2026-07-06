/**
 * Seeds standalone FaqItemBlock content items and a FaqContainerBlock that
 * references them via its content area, then wires the container to the FAQs
 * TraditionalPage via its featuredBlock property.
 *
 * Run: npx tsx scripts/seed-faqs.ts
 */

import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";
import {
  CONTENT_ENDPOINT,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  createContent,
  discoverGlobalRoot,
  discoverRootContainer,
  sweepMisplacedSharedBlocks,
  wrapProps,
  noHyphens,
} from "./_shared";
import { FAQ_ITEMS } from "./faq-data";

config({ path: ".env.local" });

let CONTAINER = process.env.OPTIMIZELY_ROOT_CONTAINER ?? "";
// Global content root — shared blocks (FAQ items + container) live here so they
// appear in the "Shared Blocks → For All Applications" picker. Set in main().
let BLOCKS_CONTAINER = "";

// FAQ item definitions live in ./faq-data and are shared with seed-content.ts
// (the homepage). Both reference the same standalone items via stable keys.

async function apiFetch(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<{ ok: boolean; status: number; text: string; json: unknown }> {
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
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, text, json };
}

// Part 1 — Create standalone FaqItemBlock content items

async function createFaqItems(): Promise<void> {
  console.log("--- Part 1: Creating standalone FaqItemBlock content items ---");

  // createContent 409-skips items that already exist (e.g. seed-content.ts
  // created them first when building the homepage), publishes, and wraps props.
  for (const item of FAQ_ITEMS) {
    await createContent({
      key: item.key,
      contentType: "FaqItemBlock",
      container: BLOCKS_CONTAINER,
      locale: "en",
      displayName: item.displayName,
      properties: { question: item.question, answer: item.answer },
    }, item.displayName);
    console.log(`  [ok] ${item.displayName} → key=${item.key}`);
  }
}

// Part 2 — Create FaqContainerBlock referencing all FAQ items

const CONTAINER_KEY = noHyphens();

async function createFaqContainer(): Promise<void> {
  console.log("\n--- Part 2: Creating FaqContainerBlock with content area ---");

  const faqItemRefs = FAQ_ITEMS.map((item) => ({ reference: `cms://content/${item.key}` }));

  await createContent({
    key: CONTAINER_KEY,
    contentType: "FaqContainerBlock",
    container: BLOCKS_CONTAINER,
    locale: "en",
    displayName: "FAQs Container",
    properties: {
      heading: "Frequently asked questions",
      subheading: "Quick answers to the things we hear most.",
      faqItems: faqItemRefs,
    },
  }, "FAQs Container");
  console.log(`  [created] FaqContainerBlock → key=${CONTAINER_KEY}`);
  console.log(`  [linked] ${FAQ_ITEMS.length} FAQ items via content area`);
}

// Part 3 — Find the FAQs TraditionalPage and set featuredBlock

async function wireFaqsPage(): Promise<void> {
  console.log("\n--- Part 3: Wiring FaqContainerBlock to FAQs page ---");

  // Find the FAQs page key from Graph
  const query = `{ _Page(where:{_metadata:{url:{default:{in:["/en/faqs/","/faqs/","/en/help/faqs/","/help/faqs/","/en/faqs","/faqs","/en/help/faqs","/help/faqs"]}}}},limit:1) { items { _metadata { key displayName } } } }`;
  const graphRes = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  const graphData = await graphRes.json() as { data?: { _Page?: { items?: Array<{ _metadata?: { key?: string; displayName?: string } }> } } };
  const faqsKey = graphData.data?._Page?.items?.[0]?._metadata?.key;
  const faqsName = graphData.data?._Page?.items?.[0]?._metadata?.displayName;

  if (!faqsKey) {
    console.warn("  [warn] FAQs page not found in Graph — run seed:nav first, then re-run this script.");
    return;
  }
  console.log(`  [found] FAQs page: "${faqsName}" (key=${faqsKey})`);

  // Create a fresh draft (copying the published page), patch featuredBlock onto
  // it, then publish. The page's latest version is usually already published,
  // and a published version cannot be patched directly — so we make a new draft.
  const { ok: newOk, status: newStatus, text: newText, json: newVer } = await apiFetch(
    `/${faqsKey}/versions?locale=en`,
    { method: "POST", body: JSON.stringify({ displayName: faqsName ?? "FAQs" }) }
  );
  if (!newOk) {
    console.error(`  [ERROR] Could not create draft for FAQs page: ${newStatus} ${newText.slice(0, 200)}`);
    return;
  }
  let version = (newVer as Record<string, unknown>)?.version as string | undefined;
  if (!version) {
    const vRes = await apiFetch(`/${faqsKey}/locales/en?pageSize=1`);
    version = ((vRes.json as Record<string, unknown>)?.items as Array<{ version?: string }> | undefined)?.[0]?.version;
  }
  if (!version) {
    console.error(`  [ERROR] Could not find the new draft version for FAQs page key=${faqsKey}`);
    return;
  }

  const { ok, status, text } = await apiFetch(`/${faqsKey}/versions/${version}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify({
      properties: wrapProps({
        // featuredBlock is type "content" - requires the reference object form,
        // a plain "cms://content/..." string 400s ("Expected object").
        featuredBlock: { reference: `cms://content/${CONTAINER_KEY}` },
      }),
    }),
  });

  if (!ok) {
    console.error(`  [ERROR] Could not patch FAQs page: ${status} ${text.slice(0, 200)}`);
    return;
  }

  await apiFetch(`/${faqsKey}/versions/${version}:publish`, { method: "POST" });
  console.log(`  [patched] FAQs page featuredBlock → FaqContainerBlock (version ${version})`);
}

async function main() {
  console.log("=== FAQ Content Area Seed Script ===\n");
  CONTAINER = await discoverRootContainer();
  BLOCKS_CONTAINER = await discoverGlobalRoot();
  console.log(`  container: ${CONTAINER}`);
  console.log(`  blocks container (For All Applications): ${BLOCKS_CONTAINER}\n`);

  // Relocate FAQ blocks stranded at the top-level root by earlier seed versions.
  // The items use stable keys (createContent 409-skips existing ones), so without
  // this sweep a misplaced item would never move into the shared-blocks folder.
  console.log("--- Sweeping misplaced/stale FAQ shared blocks ---");
  await sweepMisplacedSharedBlocks(["FaqItemBlock", "FaqContainerBlock"]);
  await new Promise((r) => setTimeout(r, 3000));

  await createFaqItems();
  await createFaqContainer();
  await wireFaqsPage();
  console.log("\n=== Done ===");
  console.log("Wait 30–60s for Graph to index, then visit /en/faqs to see shared FAQ blocks.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
