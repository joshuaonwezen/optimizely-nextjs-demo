/**
 * Seeds a shared BranchFinderBlock and places it on both branch-locator pages -
 * "Find a Branch" (/en/help/branches) and "Locations" (/en/locations, which the
 * catch-all also serves at /locations) - via their mainContent content areas.
 * One shared block, bound into both, so editors only maintain a single copy.
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
import {
  noHyphens,
  createContent,
  ensureSubfolder,
  discoverRootContainer,
  findPageKeyByUrl,
  patchPublishedPageProperties,
  sweepMisplacedSharedBlocks,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
} from "./_shared";

config({ path: ".env.local" });

/**
 * Fetch the current mainContent references of a TraditionalPage, excluding any
 * BranchFinderBlock (a prior run's finder - it was just swept, so re-adding it
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
  // BranchFinderBlock is a shared block - it must live in the shared-blocks folder
  // ("Shared Blocks → For All Applications") to show up in that tab.
  const blocksContainer = await ensureSubfolder("formsTools");

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

  // Step 2: wire the block into every branch-locator page's mainContent. Both
  // pages get the SAME block key, so there is only ever one shared block to edit.
  const targets: Array<{ label: string; urls: string[] }> = [
    { label: "Find a Branch", urls: ["/en/help/branches", "/en/help/branches/"] },
    { label: "Locations", urls: ["/locations", "/locations/", "/en/locations", "/en/locations/"] },
  ];

  let placed = 0;
  for (const target of targets) {
    const pageKey = await findPageKeyByUrl(target.urls);
    if (!pageKey) {
      console.warn(
        `  [warn] ${target.label} page not found in Graph - run seed-content first, then re-run this script`
      );
      continue;
    }
    console.log(`  ${target.label} page key: ${pageKey}`);

    // Preserve any existing refs (the shared CTA), but drop a stale finder from a
    // prior run so re-seeds don't accumulate duplicates. Prepend the fresh finder.
    const existing = (await getMainContentKeys(pageKey)).filter((k) => k !== blockKey);
    const mainContent = [
      { reference: `cms://content/${blockKey}` },
      ...existing.map((k) => ({ reference: `cms://content/${k}` })),
    ];

    await patchPublishedPageProperties(pageKey, { mainContent });
    console.log(`  [patched] ${target.label} mainContent → BranchFinderBlock + ${existing.length} existing block(s)`);
    placed++;
  }

  if (placed === 0) {
    console.warn("  [warn] BranchFinderBlock created but placed on no page - re-run after Graph indexes the pages");
    return;
  }

  console.log(`\nDone - BranchFinderBlock seeded and placed on ${placed} page(s). Allow ~30-60s for Graph reindex, then reload /en/help/branches and /locations.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
