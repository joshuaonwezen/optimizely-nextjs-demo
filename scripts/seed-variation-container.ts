/**
 * Seeds the Variation Container demo: a "Savings Offer" DynamicExperience at
 * /savings-offer whose composition holds one VariationContainerBlock bound to the FX
 * flag `savings_offer`, with three Variations of the savings promotion.
 *
 *   Savings Offer (DynamicExperience, /savings-offer)
 *   ├── SectionHeadingBlock          (inline)
 *   └── VariationContainerBlock      (inline, flagKey: savings_offer)
 *       └── variations → VariationItemBlock × 3   (shared, Experiments folder)
 *           └── blocks → SectionHeadingBlock + CallToAction   (shared, Experiments folder)
 *
 * The variation keys (variation-container-data.ts) must match the `savings_offer` flag's variation keys in
 * scripts/maintenance/seed-fx-flags.ts exactly. That flag sets cms_flag + cms_route
 * "/savings-offer", so middleware decides it there and the block renders the variation
 * server-side. /en/savings-offer is the same page outside cms_route: there the browser
 * decides instead - which is how the demo shows both paths on one page.
 *
 * Upsert: every item has a stable key. Existing shared blocks are re-patched in place
 * and the page composition is re-published on each run.
 *
 * Run: npx tsx scripts/seed-variation-container.ts
 */

import { config } from "dotenv";
import {
  createContent,
  discoverRootContainer,
  ensureSubfolder,
  pageRefForUrl,
  patchPublishedPageProperties,
  publishComposition,
  resolvePageKey,
  rootComponent,
  sectionComponent,
  stableKey,
  uid,
} from "./_shared";
import { FLAG_KEY, NAMESPACE, VARIATIONS, variationItemKey } from "./variation-container-data";

config({ path: ".env.local" });

const PAGE_ROUTE = "savings-offer";
const PAGE_DISPLAY_NAME = "Savings Offer";
const PAGE_KEY = stableKey(NAMESPACE, `/${PAGE_ROUTE}`);

/** Create a shared block, or re-patch it in place when its stable key already exists. */
async function upsertSharedBlock(
  key: string,
  contentType: string,
  displayName: string,
  container: string,
  properties: Record<string, unknown>
): Promise<void> {
  const created = await createContent(
    { key, contentType, container, locale: "en", displayName, properties },
    displayName
  );
  if (created === null) {
    await patchPublishedPageProperties(key, properties);
    console.log(`  [updated] ${displayName}`);
  } else {
    console.log(`  [created] ${displayName}`);
  }
}

async function main() {
  console.log("=== seed-variation-container.ts ===\n");

  const folder = await ensureSubfolder("experiments");
  // type:"url" fields need a cms://content ref, not a path (see pageRefForUrl).
  const savingsLink = await pageRefForUrl("/personal/savings");

  // Children before parents: a content-area reference must resolve at create time.
  const variationKeys: string[] = [];
  for (const v of VARIATIONS) {
    const headingKey = stableKey(NAMESPACE, `${FLAG_KEY}:${v.key}:heading`);
    const ctaKey = stableKey(NAMESPACE, `${FLAG_KEY}:${v.key}:cta`);
    const variationKey = variationItemKey(v.key);

    await upsertSharedBlock(headingKey, "SectionHeadingBlock", `Savings Offer (${v.key}) - Heading`, folder, {
      heading: v.heading,
      subheading: v.subheading,
    });
    await upsertSharedBlock(ctaKey, "CallToAction", `Savings Offer (${v.key}) - CTA`, folder, {
      label: v.cta,
      link: savingsLink,
    });
    await upsertSharedBlock(variationKey, "VariationItemBlock", `Savings Offer - Variation: ${v.key}`, folder, {
      variationKey: v.key,
      blocks: [headingKey, ctaKey].map((k) => ({ reference: `cms://content/${k}` })),
    });
    variationKeys.push(variationKey);
  }

  const { key: pageKey, existed } = await resolvePageKey(
    [`/${PAGE_ROUTE}/`, `/en/${PAGE_ROUTE}/`],
    PAGE_KEY
  );
  if (!existed) {
    // POST drops the composition on experiences - it is published separately below.
    await createContent(
      {
        key: pageKey,
        contentType: "DynamicExperience",
        container: await discoverRootContainer(),
        locale: "en",
        displayName: PAGE_DISPLAY_NAME,
        routeSegment: PAGE_ROUTE,
      },
      `${PAGE_DISPLAY_NAME} page`
    );
  }

  // routeSegment MUST be carried: a new draft without it makes the CMS re-derive the
  // segment from displayName.
  try {
    const version = await publishComposition(
      pageKey,
      {
        id: uid(),
        displayName: PAGE_DISPLAY_NAME,
        nodeType: "experience",
        layoutType: "outline",
        nodes: [
          sectionComponent("SectionHeadingBlock", "Savings Offer Intro", {
            heading: "Savings that work as hard as you do",
            subheading:
              "The offer below is a Feature Experimentation test: each visitor sees one of three variations, built by editors inside a Variation Container.",
          }),
          // A sectionEnabled _component sits at the experience root as a "component" node.
          rootComponent("VariationContainerBlock", "Savings Offer Experiment", {
            flagKey: FLAG_KEY,
            variations: variationKeys.map((k) => ({ reference: `cms://content/${k}` })),
          }),
        ],
      },
      { displayName: PAGE_DISPLAY_NAME, routeSegment: PAGE_ROUTE }
    );
    console.log(`  [published] ${PAGE_DISPLAY_NAME} (${pageKey}) version ${version}`);
  } catch (err) {
    // Approval-gated instance: the composition is saved on the draft, which waits for a
    // reviewer - the same outcome createContent reports as [skipped-publish].
    if (!(err instanceof Error) || !/requires approval/i.test(err.message)) throw err;
    console.warn(`  [skipped-publish] ${PAGE_DISPLAY_NAME} composition - approval workflow requires review; left as draft`);
  }

  console.log(`\n=== Done - allow ~30-60s for Graph, then visit /${PAGE_ROUTE} ===`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
