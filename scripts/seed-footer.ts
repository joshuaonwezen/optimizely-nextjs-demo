/**
 * Footer seeding script — creates a single Footer shared block ("Site Footer")
 * with the tagline. The block's "Link Columns" content area is left empty:
 * editors add NavigationItem blocks there manually if they want footer links.
 *
 * Prerequisites:
 *   - `npm run opti:push` must have run (Footer type registered)
 *
 * Cleanup also removes any "Footer - ..." NavigationItems created by an older
 * version of this script that seeded link columns. seed-nav.ts cleans the
 * shared-blocks folder by its own "Navigation Item - " sentinel, so footer
 * items are never touched by nav re-seeds.
 *
 * Run: npx tsx scripts/seed-footer.ts
 */

import { config } from "dotenv";
import {
  createContent,
  deleteContentByKey,
  discoverGlobalRoot,
  findItemsInContainerByName,
  noHyphens,
  sweepMisplacedSharedBlocks,
} from "./_shared";

config({ path: ".env.local" });

let BLOCKS_CONTAINER = "";

// Display name for the seeded Footer block — what editors see in the Shared
// Blocks tab. The app's Graph query fetches by type (Footer, limit 1), not by
// name. Keep in sync with FOOTER_BLOCK_NAME in src/lib/graphql/queries/GetFooter.ts.
const FOOTER_BLOCK_NAME = "Site Footer";
// Sentinel used by the old column-seeding version of this script.
const ITEM_PREFIX = "Footer - ";

const TAGLINE = "Banking built around you · Mosey Bank";

async function cleanupFooterItems(): Promise<void> {
  console.log("--- Cleaning up existing Footer blocks and legacy footer NavigationItems ---");
  await sweepMisplacedSharedBlocks(["Footer"]);
  const stale = await findItemsInContainerByName(
    (name) => name.startsWith(ITEM_PREFIX),
    BLOCKS_CONTAINER
  );
  for (const item of stale) {
    await deleteContentByKey(item.key);
    console.log(`  [deleted] ${item.displayName} (${item.key})`);
  }
  if (stale.length > 0) await new Promise((r) => setTimeout(r, 3000));
}

async function main() {
  console.log("=== Footer Seeding Script ===\n");

  console.log("--- Discovering shared-blocks container ---");
  BLOCKS_CONTAINER = await discoverGlobalRoot();
  console.log(`  blocks container (For All Applications): ${BLOCKS_CONTAINER}`);

  await cleanupFooterItems();

  console.log("--- Creating Footer block ---");
  const key = noHyphens();
  await createContent({
    key,
    contentType: "Footer",
    container: BLOCKS_CONTAINER,
    locale: "en",
    displayName: FOOTER_BLOCK_NAME,
    properties: {
      tagline: TAGLINE,
      columns: [],
    },
  }, "Footer block");
  console.log(`  [footer-block] Created "${FOOTER_BLOCK_NAME}" (key ${key})`);

  console.log("\n=== Done ===");
  console.log("Wait 30-60 s for Graph to index, then reload any page and check the footer tagline.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
