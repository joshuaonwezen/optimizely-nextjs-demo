/**
 * Switches the Contact (Classic) TraditionalPage from the custom ContactFormBlock
 * to the native shared Form Container block, by repointing its featuredBlock
 * reference at the OptiFormsContainerData block.
 *
 * featuredBlock allows "_component" and OptiFormsContainerData is a _Component, so
 * the reference is accepted. TraditionalPage resolves the single reference by key
 * and dispatches it through OptimizelyComponent -> OptiFormsContainer.
 *
 * Run: npx tsx scripts/seed-contact-classic-native.ts
 */

import { config } from "dotenv";
import { getManagementToken, findPageKeyByUrl, CONTENT_ENDPOINT, GRAPH_ENDPOINT, SINGLE_KEY, wrapProps } from "./_shared";

config({ path: ".env.local" });

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
  const data = (await res.json()) as { data?: { OptiFormsContainerData?: { items?: Array<{ _metadata?: { key?: string; displayName?: string } }> } } };
  const items = data.data?.OptiFormsContainerData?.items ?? [];
  if (items.length === 0) return null;
  console.log(`  using form block "${items[0]._metadata?.displayName}"`);
  return items[0]._metadata?.key ?? null;
}

async function main() {
  console.log("=== Repointing Contact (Classic) to the native form block ===\n");

  const formKey = await discoverFormKey();
  if (!formKey) {
    console.error("  [error] No published OptiFormsContainerData block found. Create + publish a Form Container shared block first.");
    process.exit(1);
  }
  console.log(`  form block key: ${formKey}`);

  const pageKey = await findPageKeyByUrl(["/en/help/contact-classic", "/en/help/contact-classic/"]);
  if (!pageKey) {
    console.error("  [error] /en/help/contact-classic not found in Graph. Run seed-contact-pages.ts first.");
    process.exit(1);
  }
  console.log(`  contact-classic page key: ${pageKey}`);

  const token = await getManagementToken();

  // Create a fresh draft (published versions can't be patched). Include routeSegment
  // so the CMS does not re-derive it from displayName and break the URL.
  await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "en", displayName: "Contact (Classic)", routeSegment: "contact-classic" }),
  }).then((r) => r.text());

  const vd = (await (
    await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions?pageSize=30`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { items?: Array<{ version?: string; status?: string }> };
  const version = (vd.items ?? [])
    .filter((i) => i.status === "draft" && i.version)
    .sort((a, b) => Number(b.version) - Number(a.version))[0]?.version;
  if (!version) throw new Error(`Could not find a draft version for ${pageKey}`);
  console.log(`  draft version: ${version}`);

  const patchRes = await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions/${version}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify({
      properties: wrapProps({ featuredBlock: { reference: `cms://content/${formKey}` } }),
    }),
  });
  if (!patchRes.ok) {
    throw new Error(`PATCH featuredBlock: ${patchRes.status} ${(await patchRes.text()).slice(0, 400)}`);
  }
  console.log("  patched featuredBlock -> native form block");

  const pubRes = await fetch(`${CONTENT_ENDPOINT}/${pageKey}/versions/${version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pubRes.ok) throw new Error(`Publish: ${pubRes.status} ${(await pubRes.text()).slice(0, 300)}`);
  console.log(`  published version ${version}`);

  console.log("\nDone — Contact (Classic) now references the native form. Allow ~30-60s for Graph reindex, then reload /en/help/contact-classic.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
