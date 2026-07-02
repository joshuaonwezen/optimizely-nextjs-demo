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
import { createContent, discoverGlobalRoot, discoverRootContainer, findPageKeyByUrl } from "./_shared";

config({ path: ".env.local" });

function noHyphens(): string {
  return randomUUID().replace(/-/g, "");
}

async function main() {
  await discoverRootContainer();
  // ContactFormBlock is a shared block — create it under the global root so it
  // appears in "Shared Blocks → For All Applications".
  const blocksContainer = await discoverGlobalRoot();

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

  // Step 2: create the TraditionalPage under /help, referencing the block via featuredBlock.
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
