/**
 * Creates a dedicated DynamicExperience contact page ("Contact (Form)" at
 * /en/help/contact-form) that shows both kinds of form side by side:
 *   - the custom ContactFormBlock (a regular block, seeded by seed-contact-pages.ts)
 *   - a native Optimizely Forms form, by referencing a pre-built shared Form
 *     Container block in the page composition
 *
 * Native OptiForms can only render inside a DynamicExperience composition, never on
 * a TraditionalPage like /en/help/contact - hence a separate experience page here.
 *
 * Native forms must be authored in the CMS UI as a shared block (Visual Builder:
 * new shared block > Form Container) - they cannot be created or embedded inline
 * via the Management API. The CMS rejects an inline form section in an experience
 * ("A section with layout type 'form' cannot be embedded in an experience, it must
 * be referenced"). This script wires the reference, which IS supported:
 *   composition node = { nodeType: "section", component: { reference: "cms://content/<formKey>" } }
 *
 * Prereq: a published OptiFormsContainerData shared block must exist (Graph-indexed).
 * The form key is auto-discovered via Graph; override with OPTIMIZELY_CONTACT_FORM_KEY.
 *
 * Run: npx tsx scripts/seed-contact-form.ts
 */

import { config } from "dotenv";
import { uid, noHyphens, createContent, sectionComponent, findPageKeyByUrl, discoverRootContainer, publishComposition, GRAPH_ENDPOINT, SINGLE_KEY, type CompNode } from "./_shared";

config({ path: ".env.local" });

const PAGE_DISPLAY_NAME = "Contact (Form)";
const PAGE_ROUTE = "contact-form";

/** Newest published block of a type via Graph, or null when none is indexed. */
async function discoverBlockKey(typeName: string): Promise<string | null> {
  const query = `{ ${typeName}(limit: 5, orderBy: { _metadata: { lastModified: DESC } }) { items { _metadata { key displayName } } } }`;
  const res = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: Record<string, { items?: Array<{ _metadata?: { key?: string; displayName?: string } }> } | undefined>;
  };
  const items = data.data?.[typeName]?.items ?? [];
  if (items.length === 0) return null;
  console.log(`  found ${items.length} ${typeName} block(s); using "${items[0]._metadata?.displayName}"`);
  return items[0]._metadata?.key ?? null;
}

/** Find the published shared Form Container block via Graph. */
async function discoverFormKey(): Promise<string | null> {
  const envKey = (process.env.OPTIMIZELY_CONTACT_FORM_KEY ?? "").replace(/-/g, "");
  return envKey || discoverBlockKey("OptiFormsContainerData");
}

function buildNodes(formKey: string, customFormKey: string | null): CompNode[] {
  return [
    sectionComponent("SectionHeadingBlock", "Contact Heading", {
      heading: "Get in touch",
      subheading:
        "Have a question or need help with your account? Fill out the form and we'll get back to you within one business day.",
    }),
    // The custom block first, so the page compares a hand-built form with the native one.
    ...(customFormKey
      ? [
          // A sectionEnabled _component sits at the experience root as a "component"
          // node; only true _section types (like the form container) can be "section".
          {
            id: uid(),
            displayName: "Custom Contact Form",
            nodeType: "component",
            component: { reference: `cms://content/${customFormKey}` } as unknown as CompNode["component"],
          } as CompNode,
        ]
      : []),
    // Reference the shared Form Container block. A form is a _Section, so the node
    // is a section whose component is a content reference (not an inline component).
    {
      id: uid(),
      displayName: "Contact Form",
      nodeType: "section",
      layoutType: "form",
      component: { reference: `cms://content/${formKey}` } as unknown as CompNode["component"],
    },
  ];
}

/**
 * Resolve the Contact (Form) DynamicExperience page, creating it under /en/help
 * if it does not exist yet. Falls back to the root container if /en/help isn't
 * indexed or rejects a DynamicExperience child.
 */
async function ensureContactFormPage(): Promise<string> {
  const existing = await findPageKeyByUrl([`/en/help/${PAGE_ROUTE}`, `/en/help/${PAGE_ROUTE}/`, `/en/${PAGE_ROUTE}`, `/en/${PAGE_ROUTE}/`]);
  if (existing) {
    console.log(`  Contact (Form) page exists: ${existing}`);
    return existing;
  }

  const helpKey = await findPageKeyByUrl(["/en/help", "/en/help/"]);
  const container = helpKey ?? (await discoverRootContainer());
  if (!helpKey) {
    console.warn("  [warn] /en/help not found in Graph - creating Contact (Form) under the root container instead");
  }

  const key = noHyphens();
  // Composition is dropped on POST for DynamicExperience (patched below); create
  // the page published with an empty experience, then a fresh draft carries the form.
  const created = await createContent(
    {
      key,
      contentType: "DynamicExperience",
      container,
      locale: "en",
      displayName: PAGE_DISPLAY_NAME,
      routeSegment: PAGE_ROUTE,
    },
    "Contact (Form) page"
  );
  if (created === null) {
    // 409 / route-in-use: it already exists - re-resolve.
    const again = await findPageKeyByUrl([`/en/help/${PAGE_ROUTE}`, `/en/help/${PAGE_ROUTE}/`, `/en/${PAGE_ROUTE}`, `/en/${PAGE_ROUTE}/`]);
    if (again) return again;
  }
  console.log(`  created Contact (Form) page: ${key}`);
  return key;
}

async function main() {
  console.log("=== Creating DynamicExperience Contact (Form) page with native OptiForms ===\n");

  const formKey = await discoverFormKey();
  if (!formKey) {
    console.error(
      "  [error] No published OptiFormsContainerData block found in Graph. Create a shared Form Container block in the CMS UI and publish it, then re-run (or set OPTIMIZELY_CONTACT_FORM_KEY)."
    );
    process.exit(1);
  }
  console.log(`  form block key: ${formKey}`);

  const customFormKey = await discoverBlockKey("ContactFormBlock");
  if (!customFormKey) {
    console.warn("  [warn] No ContactFormBlock indexed yet (run seed-contact-pages.ts first) - page gets the native form only");
  }

  const pageKey = await ensureContactFormPage();

  // routeSegment MUST be carried: a new draft without it makes the CMS re-derive the
  // segment from displayName, silently breaking the URL.
  const version = await publishComposition(
    pageKey,
    {
      id: uid(),
      displayName: PAGE_DISPLAY_NAME,
      nodeType: "experience",
      layoutType: "outline",
      nodes: buildNodes(formKey, customFormKey),
    },
    { displayName: PAGE_DISPLAY_NAME, routeSegment: PAGE_ROUTE }
  );
  console.log(`  published version ${version} with ${customFormKey ? "custom + native" : "native"} form`);

  console.log(`\nDone - forms placed on the Contact (Form) page. Allow ~30-60s for Graph reindex, then reload.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
