/**
 * Creates a dedicated DynamicExperience contact page ("Contact (Form)" at
 * /en/help/contact-form) and places a native Optimizely Forms form on it by
 * referencing a pre-built shared Form Container block in the page composition.
 *
 * This is the native-forms counterpart to the main /en/help/contact TraditionalPage
 * (which carries the custom ContactFormBlock, seeded by seed-contact-pages.ts).
 * Native OptiForms can only render inside a DynamicExperience composition, never on
 * a TraditionalPage — hence a separate experience page here.
 *
 * Native forms must be authored in the CMS UI as a shared block (Visual Builder:
 * new shared block > Form Container) — they cannot be created or embedded inline
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
import { uid, noHyphens, createContent, sectionComponent, findPageKeyByUrl, discoverRootContainer, getManagementToken, CONTENT_ENDPOINT, GRAPH_ENDPOINT, SINGLE_KEY, type CompNode } from "./_shared";

config({ path: ".env.local" });

const PAGE_DISPLAY_NAME = "Contact (Form)";
const PAGE_ROUTE = "contact-form";

/** Find the published shared Form Container block via Graph. */
async function discoverFormKey(): Promise<string | null> {
  const envKey = (process.env.OPTIMIZELY_CONTACT_FORM_KEY ?? "").replace(/-/g, "");
  if (envKey) return envKey;
  const query = `{ OptiFormsContainerData(limit: 5) { items { _metadata { key displayName } } } }`;
  const res = await fetch(GRAPH_ENDPOINT, {
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
  console.log(`  found ${items.length} form block(s); using "${items[0]._metadata?.displayName}"`);
  return items[0]._metadata?.key ?? null;
}

function buildNodes(formKey: string): CompNode[] {
  return [
    sectionComponent("SectionHeadingBlock", "Contact Heading", {
      heading: "Get in touch",
      subheading:
        "Have a question or need help with your account? Fill out the form and we'll get back to you within one business day.",
    }),
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
    console.warn("  [warn] /en/help not found in Graph — creating Contact (Form) under the root container instead");
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
    // 409 / route-in-use: it already exists — re-resolve.
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

  const pageKey = await ensureContactFormPage();

  const token = await getManagementToken();

  // The published version can't be patched — create a fresh draft, patch it, publish.
  // routeSegment MUST be included: POST /versions without it makes the CMS re-derive
  // the segment from displayName, silently breaking the URL.
  await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "en", displayName: PAGE_DISPLAY_NAME, routeSegment: PAGE_ROUTE }),
  }).then((r) => r.text());

  const vd = (await (
    await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions?pageSize=30`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { items?: Array<{ version?: string; status?: string }> };
  const version = (vd.items ?? [])
    .filter((i) => i.status === "draft" && i.version)
    .sort((a, b) => Number(b.version) - Number(a.version))[0]?.version;
  if (!version) throw new Error(`Could not find a draft version for ${pageKey}`);
  console.log(`  draft version: ${version}`);

  const composition = {
    id: uid(),
    displayName: PAGE_DISPLAY_NAME,
    nodeType: "experience",
    layoutType: "outline",
    nodes: buildNodes(formKey),
  };

  const patchRes = await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions/${version}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify({ composition }),
  });
  if (!patchRes.ok) {
    throw new Error(`PATCH composition: ${patchRes.status} ${(await patchRes.text()).slice(0, 400)}`);
  }
  console.log("  patched composition with form reference");

  const pubRes = await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions/${version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pubRes.ok) throw new Error(`Publish: ${pubRes.status} ${(await pubRes.text()).slice(0, 300)}`);
  console.log(`  published version ${version}`);

  console.log(`\nDone — native form referenced on /en/help/${PAGE_ROUTE}. Allow ~30-60s for Graph reindex, then reload.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
