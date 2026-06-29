/**
 * Places a native Optimizely Forms form onto the DynamicExperience contact page
 * (/en/help/contact) by referencing a pre-built shared Form Container block in the
 * page composition.
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
import { uid, sectionComponent, findPageKeyByUrl, getManagementToken, CONTENT_ENDPOINT, GRAPH_ENDPOINT, SINGLE_KEY, type CompNode } from "./_shared";

config({ path: ".env.local" });

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
      component: { reference: `cms://content/${formKey}` } as any,
    },
  ];
}

async function main() {
  console.log("=== Placing native form onto /en/help/contact ===\n");

  const formKey = await discoverFormKey();
  if (!formKey) {
    console.error(
      "  [error] No published OptiFormsContainerData block found in Graph. Create a shared Form Container block in the CMS UI and publish it, then re-run (or set OPTIMIZELY_CONTACT_FORM_KEY)."
    );
    process.exit(1);
  }
  console.log(`  form block key: ${formKey}`);

  const pageKey = await findPageKeyByUrl([
    "/en/help/contact",
    "/en/help/contact/",
    // Tolerate a regressed route segment (a draft created without routeSegment
    // re-derives "contact-us" from the display name); this run restores it.
    "/en/help/contact-us",
    "/en/help/contact-us/",
  ]);
  if (!pageKey) {
    console.error("  [error] contact page not found in Graph. Run seed-content first.");
    process.exit(1);
  }
  console.log(`  contact page key: ${pageKey}`);

  const token = await getManagementToken();

  // The published version can't be patched — create a fresh draft, patch it, publish.
  // routeSegment MUST be included: POST /versions without it makes the CMS re-derive
  // the segment from displayName ("Contact Us" -> "contact-us"), silently breaking the URL.
  await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "en", displayName: "Contact Us", routeSegment: "contact" }),
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
    displayName: "Contact Us",
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

  console.log("\nDone — form referenced on /en/help/contact. Allow ~30-60s for Graph reindex, then reload.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
