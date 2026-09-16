/**
 * Seeds a ContactFormBlock shared block and builds a DynamicExperience contact
 * page at /en/help/contact with only form sections in the composition:
 *   - The custom ContactFormBlock (always present)
 *   - A native OptiFormsContainerData form (optional, if one is indexed in Graph)
 *
 * On re-runs the block is swept and recreated; the page composition is patched
 * each time so both form sections stay current.
 *
 * If the contact page key is already another type (seed-content creates it as a
 * TraditionalPage), it is left untouched: a permanently deleted key stays reserved,
 * so it cannot be recreated as an experience. seed-contact-form.ts builds the
 * experience page that shows both forms.
 *
 * Also creates/updates a "Contact (Classic)" TraditionalPage at
 * /en/help/contact-classic that carries the custom form via featuredBlock.
 *
 * Run: npx tsx scripts/seed-contact-pages.ts
 */

import { config } from "dotenv";
import {
  uid,
  noHyphens,
  stableKey,
  createContent,
  ensureSubfolder,
  discoverRootContainer,
  findPageKeyByUrl,
  patchPublishedPageProperties,
  sweepMisplacedSharedBlocks,
  getManagementToken,
  CONTENT_ENDPOINT,
  publishComposition,
  wrapProps,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  apiFetch,
} from "./_shared";

config({ path: ".env.local" });

const CONTACT_KEY = stableKey("mb-page", "help/contact");
const HELP_KEY    = stableKey("mb-page", "help");

/** Query Graph for a published native Form Container block key. */
async function findNativeFormKey(): Promise<string | null> {
  const envKey = (process.env.OPTIMIZELY_CONTACT_FORM_KEY ?? "").replace(/-/g, "");
  if (envKey) return envKey;
  const query = `{ OptiFormsContainerData(limit: 5) { items { _metadata { key displayName } } } }`;
  const res = await apiFetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { OptiFormsContainerData?: { items?: Array<{ _metadata?: { key?: string; displayName?: string } }> } };
  };
  const items = data.data?.OptiFormsContainerData?.items ?? [];
  if (items.length === 0) return null;
  console.log(`  [found] native form: "${items[0]._metadata?.displayName}" (key=${items[0]._metadata?.key})`);
  return items[0]._metadata?.key ?? null;
}

const CONTACT_META = {
  metaTitle: "Contact Us | Mosey Bank",
  metaDescription:
    "Get in touch with Mosey Bank via in-app chat, phone, or our online form. Real people, seven days a week.",
};

/**
 * Ensure the contact page exists as a DynamicExperience. Returns false (and leaves
 * the page alone) when another type already owns the key - seed-content creates
 * /help/contact as a TraditionalPage, and a permanently deleted key stays reserved
 * in the CMS, so deleting it to recreate an experience at the same key cannot work
 * and would lose the page. The combined custom + native form page is
 * seed-contact-form.ts's "Contact (Form)" experience instead.
 */
async function ensureContactExperience(): Promise<boolean> {
  const token = await getManagementToken();

  // Check what type the existing page is (if it exists).
  const checkRes = await apiFetch(`${CONTENT_ENDPOINT}/${CONTACT_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (checkRes.ok) {
    const data = (await checkRes.json()) as { contentType?: string };
    if (data.contentType === "DynamicExperience") {
      console.log(`  [exists] Contact page is already a DynamicExperience - skipping recreation`);
      return true;
    }
    console.warn(
      `  [skip] Contact page key=${CONTACT_KEY} is a ${data.contentType ?? "different type"}, not a DynamicExperience - ` +
        "leaving it as is (see seed-contact-form.ts for the page with both forms)"
    );
    return false;
  }

  // Create the DynamicExperience (empty composition — patched below).
  await createContent(
    {
      key: CONTACT_KEY,
      contentType: "DynamicExperience",
      container: HELP_KEY,
      locale: "en",
      displayName: "Contact Us",
      routeSegment: "contact",
      properties: CONTACT_META,
    },
    "Contact Us page"
  );
  console.log(`  [created] Contact Us DynamicExperience → key=${CONTACT_KEY}`);
  return true;
}

/** Patch the contact DynamicExperience composition with form sections and publish. */
async function patchContactComposition(blockKey: string, nativeFormKey: string | null): Promise<void> {
  // Custom form first, native form second (if available). A sectionEnabled
  // _component sits at the experience root as a "component" node; only true
  // _section types (the native form container) can be "section" nodes.
  const nodes = [
    {
      id: uid(),
      displayName: "Contact Form",
      nodeType: "component",
      component: { reference: `cms://content/${blockKey}` },
    },
    ...(nativeFormKey
      ? [
          {
            id: uid(),
            displayName: "Online Form",
            nodeType: "section",
            layoutType: "form",
            component: { reference: `cms://content/${nativeFormKey}` },
          },
        ]
      : []),
  ];

  const version = await publishComposition(
    CONTACT_KEY,
    { id: uid(), displayName: "Contact Us", nodeType: "experience", layoutType: "outline", nodes },
    // A new draft starts without properties; carry the SEO fields so publishing
    // doesn't wipe them.
    { displayName: "Contact Us", routeSegment: "contact", properties: wrapProps(CONTACT_META) }
  );
  console.log(`  [patched] Contact page composition - ${nodes.length} form section(s), published version ${version}`);
}

async function main() {
  await discoverRootContainer();

  const blocksContainer = await ensureSubfolder("formsTools");

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

  // Step 2: ensure the contact page is a DynamicExperience and patch its composition.
  console.log("\n--- Building Contact Us DynamicExperience ---");
  const nativeFormKey = await findNativeFormKey();
  if (!nativeFormKey) {
    console.log("  [info] No native OptiFormsContainerData found in Graph - contact page will have 1 form section (custom only)");
  }
  if (await ensureContactExperience()) {
    await patchContactComposition(blockKey, nativeFormKey);
  }

  // Step 3: create/update the Contact (Classic) TraditionalPage at /en/help/contact-classic.
  const existingPageKey = await findPageKeyByUrl(["/en/help/contact-classic", "/en/help/contact-classic/"]);
  if (existingPageKey) {
    await patchPublishedPageProperties(existingPageKey, {
      featuredBlock: { reference: `cms://content/${blockKey}` },
    });
    console.log("\n  [patched] existing Contact (Classic) page → new ContactFormBlock");
    console.log("\nDone - ContactFormBlock reseeded and re-linked.");
    return;
  }

  const helpKey = await findPageKeyByUrl(["/en/help", "/en/help/"]);
  if (!helpKey) {
    console.warn(
      "  [warn] /help page not found in Graph - run seed-content + seed-nav first, then re-run this script"
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

  console.log("\nDone - ContactFormBlock + Contact (Classic) page seeded.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
