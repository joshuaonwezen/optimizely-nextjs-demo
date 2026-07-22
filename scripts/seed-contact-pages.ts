/**
 * Seeds a self-contained ContactFormBlock content item and a "Contact (Classic)"
 * TraditionalPage that references it via its single featuredBlock slot.
 *
 * Native OptiForms cannot be placed on a TraditionalPage (they only render inside
 * a DynamicExperience composition), so the traditional contact page uses the
 * custom ContactFormBlock instead.
 *
 * Depends on seed-content having been indexed by Graph — the new page nests under
 * the /help page, whose key is resolved at runtime via findPageKeyByUrl. Run after
 * the main seed completes (~30-60s Graph lag). Run: npx tsx scripts/seed-contact-pages.ts
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
 * ContactFormBlock (a prior run's form — it was just swept, so re-adding it would
 * leave a dangling reference).
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
    .filter((i) => i.__typename !== "ContactFormBlock")
    .map((i) => i._metadata?.key)
    .filter((k): k is string => Boolean(k));
}

/** Prepend the ContactFormBlock into the main Contact page's mainContent area. */
async function wireContactPage(blockKey: string): Promise<void> {
  const contactKey = await findPageKeyByUrl(["/en/help/contact", "/en/help/contact/"]);
  if (!contactKey) {
    console.warn("  [warn] Contact page (/en/help/contact) not found in Graph — re-run after seed-content indexes");
    return;
  }
  const existing = (await getMainContentKeys(contactKey)).filter((k) => k !== blockKey);
  const mainContent = [
    { reference: `cms://content/${blockKey}` },
    ...existing.map((k) => ({ reference: `cms://content/${k}` })),
  ];
  await patchPublishedPageProperties(contactKey, { mainContent });
  console.log(`  [patched] Contact page mainContent → ContactFormBlock + ${existing.length} existing block(s)`);
}

async function main() {
  await discoverRootContainer();
  // ContactFormBlock is a shared block — it must live inside the shared-blocks
  // folder ("Shared Blocks → For All Applications") to show up in that tab.
  const blocksContainer = await discoverGlobalRoot();

  // Remove blocks stranded at the top-level root by earlier seed versions and
  // stale copies in the folder (keys are random per run). The existing
  // Contact (Classic) page is re-pointed at the fresh block below.
  console.log("--- Sweeping misplaced/stale ContactFormBlock shared blocks ---");
  await sweepMisplacedSharedBlocks(["ContactFormBlock"]);

  // Step 1: create the shared ContactFormBlock content item.
  const blockKey = noHyphens();
  await createContent(
    {
      key: blockKey,
      contentType: "ContactFormBlock",
      container: blocksContainer,
      locale: "en",
      displayName: "Contact Form",
      properties: {
        heading: "Send us a message",
        intro:
          "Have a question or need help with your account? Fill out the form and we'll get back to you within one business day.",
        submitLabel: "Send message",
        successMessage: "Thank you! We'll be in touch within one business day.",
        submitUrl: "/api/form-submit",
      },
    },
    "ContactFormBlock"
  );

  // Step 2: place the custom form on the MAIN Contact page (/en/help/contact) via
  // its mainContent area. This is the traditional contact page the user actually
  // reaches; the native-forms variant lives on a separate DynamicExperience page.
  await wireContactPage(blockKey);

  // Step 3: create the TraditionalPage under /help, referencing the block via featuredBlock.
  // On re-runs the page already exists (routeSegment in use → create skips), but its
  // old block was just swept — re-point featuredBlock at the fresh block instead.
  const existingPageKey = await findPageKeyByUrl(["/en/help/contact-classic", "/en/help/contact-classic/"]);
  if (existingPageKey) {
    await patchPublishedPageProperties(existingPageKey, {
      featuredBlock: { reference: `cms://content/${blockKey}` },
    });
    console.log("  [patched] existing Contact (Classic) page → new ContactFormBlock");
    console.log("\nDone — ContactFormBlock reseeded and re-linked.");
    return;
  }

  const helpKey = await findPageKeyByUrl(["/en/help", "/en/help/"]);
  if (!helpKey) {
    console.warn(
      "  [warn] /help page not found in Graph — run seed-content + seed-nav first, then re-run this script"
    );
    return;
  }

  await createContent(
    {
      key: noHyphens(),
      contentType: "TraditionalPage",
      container: helpKey,
      locale: "en",
      displayName: "Contact (Classic)",
      routeSegment: "contact-classic",
      properties: {
        heading: "Contact (Classic)",
        subheading: "A traditional contact page with a seeded, self-contained form block.",
        body: { html: "<p>Reach the Mosey Bank team using the form below.</p>" },
        featuredBlock: { reference: `cms://content/${blockKey}` },
        includeInNavigation: true,
        navLabel: "Contact (Classic)",
        navOrder: 99,
      },
    },
    "Contact (Classic) page"
  );

  console.log("\nDone — ContactFormBlock + Contact (Classic) page seeded.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
