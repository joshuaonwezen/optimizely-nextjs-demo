/**
 * Seeds a shared BranchFinderBlock and places it on the "Find a Branch"
 * TraditionalPage (/en/help/branches) via its mainContent content area.
 *
 * BranchFinderBlock is a geo location-search block: it wraps the same
 * /api/locations/nearby lookup used by the BranchFinder widget on /demo/search,
 * so a visitor can type a city/address and see nearby branches with distances.
 * It renders live only once BankLocation data exists (run seed-locations first).
 *
 * Depends on seed-content having been indexed by Graph (the page key is resolved
 * at runtime via findPageKeyByUrl). Run after the main seed completes (~30-60s
 * Graph lag). Run: npx tsx scripts/seed-branch-finder.ts
 */

import { config } from "dotenv";
import { randomUUID } from "crypto";
import {
  createContent,
  discoverGlobalRoot,
  discoverRootContainer,
  findPageKeyByUrl,
  patchPublishedPageProperties,
  sweepMisplacedSharedBlocks,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
} from "./_shared";

config({ path: ".env.local" });

function noHyphens(): string {
  return randomUUID().replace(/-/g, "");
}

/**
 * Fetch the current mainContent references of a TraditionalPage, excluding any
 * BranchFinderBlock (a prior run's finder — it was just swept, so re-adding it
 * would leave a dangling reference).
 */
async function getMainContentKeys(pageKey: string): Promise<string[]> {
  const query = `query MainContent($key: String!) {
    TraditionalPage(where: { _metadata: { key: { eq: $key } } }, limit: 1) {
      items { mainContent { __typename _metadata { key } } }
    }
  }`;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query, variables: { key: pageKey } }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: {
      TraditionalPage?: { items?: Array<{ mainContent?: Array<{ __typename?: string; _metadata?: { key?: string } }> }> };
    };
  };
  const items = data.data?.TraditionalPage?.items?.[0]?.mainContent ?? [];
  return items
    .filter((i) => i.__typename !== "BranchFinderBlock")
    .map((i) => i._metadata?.key)
    .filter((k): k is string => Boolean(k));
}

async function main() {
  console.log("=== Seeding BranchFinderBlock onto /en/help/branches ===\n");

  await discoverRootContainer();
  // BranchFinderBlock is a shared block — it must live in the shared-blocks folder
  // ("Shared Blocks → For All Applications") to show up in that tab.
  const blocksContainer = await discoverGlobalRoot();

  // Remove blocks stranded at the top-level root by earlier runs and stale copies
  // in the folder (keys are random per run). The page is re-pointed below.
  console.log("--- Sweeping misplaced/stale BranchFinderBlock shared blocks ---");
  await sweepMisplacedSharedBlocks(["BranchFinderBlock"]);

  // Step 1: create the shared BranchFinderBlock content item.
  const blockKey = noHyphens();
  await createContent(
    {
      key: blockKey,
      contentType: "BranchFinderBlock",
      container: blocksContainer,
      locale: "en",
      displayName: "Find a Branch",
      properties: {
        heading: "Find your nearest branch",
        intro:
          "Enter a city or address to see the closest Mosey branches, their opening services, and how far away they are.",
        placeholder: "City or address, e.g. Berlin",
        buttonLabel: "Search",
        defaultRadius: 500,
      },
    },
    "BranchFinderBlock"
  );

  // Step 2: wire the block into the Find a Branch page's mainContent.
  const pageKey = await findPageKeyByUrl(["/en/help/branches", "/en/help/branches/"]);
  if (!pageKey) {
    console.warn(
      "  [warn] Find a Branch page not found in Graph — run seed-content first, then re-run this script"
    );
    return;
  }
  console.log(`  branches page key: ${pageKey}`);

  // Preserve any existing refs (the shared CTA), but drop a stale finder from a
  // prior run so re-seeds don't accumulate duplicates. Prepend the fresh finder.
  const existing = (await getMainContentKeys(pageKey)).filter((k) => k !== blockKey);
  const mainContent = [
    { reference: `cms://content/${blockKey}` },
    ...existing.map((k) => ({ reference: `cms://content/${k}` })),
  ];

  await patchPublishedPageProperties(pageKey, { mainContent });
  console.log(`  [patched] Find a Branch mainContent → BranchFinderBlock + ${existing.length} existing block(s)`);

  console.log("\nDone — BranchFinderBlock seeded and placed. Allow ~30-60s for Graph reindex, then reload /en/help/branches.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
