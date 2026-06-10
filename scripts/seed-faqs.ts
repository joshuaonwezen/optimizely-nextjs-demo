/**
 * Seeds standalone FaqItemBlock content items and a FaqContainerBlock that
 * references them via its content area, then wires the container to the FAQs
 * TraditionalPage via its featuredBlock property.
 *
 * Run: npx tsx scripts/seed-faqs.ts
 */

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

// ---------------------------------------------------------------------------
// Shared FAQ items — these exist as standalone content items in the CMS and
// can be referenced from any page with a content area.
// ---------------------------------------------------------------------------

const FAQ_ITEMS = [
  {
    key: noHyphens(),
    displayName: "FAQ: How do I open a current account?",
    question: "How do I open a current account?",
    answer:
      "You can open a Mosey current account online in around 10 minutes. All you need is a smartphone, a valid UK address, and proof of identity. We run a soft credit check that won't affect your credit score.",
  },
  {
    key: noHyphens(),
    displayName: "FAQ: What savings rates do you offer?",
    question: "What savings rates do you offer?",
    answer:
      "We currently offer an easy-access savings account at 4.6% AER and a 1-year fixed-rate account at 5.1% AER. Rates are variable on easy-access accounts and fixed for the term on fixed-rate accounts.",
  },
  {
    key: noHyphens(),
    displayName: "FAQ: How does the mortgage application work?",
    question: "How does the mortgage application work?",
    answer:
      "Start by getting a decision in principle online — it takes around 10 minutes and won't affect your credit score. One of our advisors will then call you to discuss your options and guide you through the full application.",
  },
  {
    key: noHyphens(),
    displayName: "FAQ: Is my money protected?",
    question: "Is my money protected?",
    answer:
      "Yes. Mosey Bank is authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority. Eligible deposits are protected by the FSCS up to £85,000 per person.",
  },
  {
    key: noHyphens(),
    displayName: "FAQ: How do I switch banks to Mosey?",
    question: "How do I switch banks to Mosey?",
    answer:
      "We use the Current Account Switch Service (CASS), which moves all your direct debits and standing orders automatically within 7 working days. Your old account closes on the switch date and any payments to or from your old account are forwarded for 3 years.",
  },
  {
    key: noHyphens(),
    displayName: "FAQ: What do I do if my card is lost or stolen?",
    question: "What do I do if my card is lost or stolen?",
    answer:
      "Open the Mosey app and go to Card Controls to freeze your card immediately. If you're sure it's lost or stolen, tap 'Cancel card' to order a replacement, which arrives within 3–5 working days. You can also call our 24/7 fraud line.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Part 1 — Create standalone FaqItemBlock content items
// ---------------------------------------------------------------------------

async function createFaqItems(): Promise<void> {
  console.log("--- Part 1: Creating standalone FaqItemBlock content items ---");

  for (const item of FAQ_ITEMS) {
    const { ok, status, text, json: result } = await apiFetch("", {
      method: "POST",
      body: JSON.stringify({
        key: item.key,
        contentType: "FaqItemBlock",
        container: CONTAINER,
        initialVersion: {
          locale: "en",
          displayName: item.displayName,
          properties: wrapProps({
            question: item.question,
            answer: item.answer,
          }),
        },
      }),
    });
    if (!ok) {
      console.error(`  [ERROR] ${item.displayName}: ${status} ${text.slice(0, 200)}`);
      throw new Error("Failed to create FaqItemBlock");
    }
    let version = ((result as Record<string, unknown>)?.initialVersion as Record<string, unknown> | undefined)?.version as string | undefined;
    if (!version) {
      const vRes = await apiFetch(`/${item.key}/versions?pageSize=1`);
      version = ((vRes.json as Record<string, unknown>)?.items as Array<{ version?: string }> | undefined)?.[0]?.version;
    }
    if (version) await apiFetch(`/${item.key}/versions/${version}:publish`, { method: "POST" });
    console.log(`  [created] ${item.displayName} → key=${item.key}`);
  }
}

// ---------------------------------------------------------------------------
// Part 2 — Create FaqContainerBlock referencing all FAQ items
// ---------------------------------------------------------------------------

const CONTAINER_KEY = noHyphens();

async function createFaqContainer(): Promise<void> {
  console.log("\n--- Part 2: Creating FaqContainerBlock with content area ---");

  const faqItemRefs = FAQ_ITEMS.map((item) => ({ reference: `cms://content/${item.key}` }));

  const { ok, status, text, json: result } = await apiFetch("", {
    method: "POST",
    body: JSON.stringify({
      key: CONTAINER_KEY,
      contentType: "FaqContainerBlock",
      container: CONTAINER,
      initialVersion: {
        locale: "en",
        displayName: "FAQs Container",
        properties: wrapProps({
          heading: "Frequently asked questions",
          subheading: "Quick answers to the things we hear most.",
          faqItems: faqItemRefs,
        }),
      },
    }),
  });

  if (!ok) {
    console.error(`  [ERROR] FaqContainerBlock: ${status} ${text.slice(0, 300)}`);
    throw new Error("Failed to create FaqContainerBlock");
  }
  let version = ((result as Record<string, unknown>)?.initialVersion as Record<string, unknown> | undefined)?.version as string | undefined;
  if (!version) {
    const vRes = await apiFetch(`/${CONTAINER_KEY}/versions?pageSize=1`);
    version = ((vRes.json as Record<string, unknown>)?.items as Array<{ version?: string }> | undefined)?.[0]?.version;
  }
  if (version) await apiFetch(`/${CONTAINER_KEY}/versions/${version}:publish`, { method: "POST" });
  console.log(`  [created] FaqContainerBlock → key=${CONTAINER_KEY}`);
  console.log(`  [linked] ${FAQ_ITEMS.length} FAQ items via content area`);
}

// ---------------------------------------------------------------------------
// Part 3 — Find the FAQs TraditionalPage and set featuredBlock
// ---------------------------------------------------------------------------

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

  // Find the latest version for this page, PATCH its properties, then republish.
  const { ok: vOk, json: vData } = await apiFetch(`/${faqsKey}/locales/en?pageSize=1`);
  const version = vOk
    ? ((vData as Record<string, unknown>)?.items as Array<{ version?: string }> | undefined)?.[0]?.version
    : undefined;

  if (!version) {
    console.error(`  [ERROR] Could not find a version for FAQs page key=${faqsKey}`);
    return;
  }

  const { ok, status, text, json: patched } = await apiFetch(`/${faqsKey}/versions/${version}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify({
      properties: wrapProps({
        featuredBlock: `cms://content/${CONTAINER_KEY}`,
      }),
    }),
  });

  if (!ok) {
    console.error(`  [ERROR] Could not patch FAQs page: ${status} ${text.slice(0, 200)}`);
    return;
  }

  // Republish if PATCH moved the version to draft
  const patchedStatus = (patched as Record<string, unknown>)?.status as string | undefined;
  if (patchedStatus && patchedStatus !== "published") {
    const newVersion = (patched as Record<string, unknown>)?.version as string | undefined;
    await apiFetch(`/${faqsKey}/versions/${newVersion ?? version}:publish`, { method: "POST" });
  }
  console.log(`  [patched] FAQs page featuredBlock → FaqContainerBlock`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== FAQ Content Area Seed Script ===\n");
  CONTAINER = await discoverRootContainer();
  console.log(`  container: ${CONTAINER}\n`);
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
