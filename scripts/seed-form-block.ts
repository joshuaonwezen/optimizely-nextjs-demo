/**
 * Builds out the native shared Form Container block with a full set of native form
 * elements (text, email, topic select, message textarea, submit) by PATCHing the
 * block's own composition.
 *
 * The native form container itself must already exist as a published shared block
 * (Visual Builder > new shared block > Form Container) — the Management API cannot
 * create OptiFormsContainerData. But once it exists, its composition (the form's
 * steps/rows/columns/elements) CAN be authored via the API: the elements are inline
 * component nodes (contentType + properties) inside a section with layoutType "form".
 *
 * Structure (mirrors what Visual Builder produces):
 *   section(OptiFormsContainerData, layoutType:"form")
 *     step
 *       row > column > OptiForms*Element   (one row per field)
 *
 * Run: npx tsx scripts/seed-form-block.ts
 */

import { config } from "dotenv";
import { uid, wrapProps, getManagementToken, CONTENT_ENDPOINT, GRAPH_ENDPOINT, SINGLE_KEY } from "./_shared";

config({ path: ".env.local" });

const REQUIRED = [{ Type: "RequiredValidator", ErrorMessage: "This field is required." }];
const EMAIL_VALIDATORS = [
  { Type: "RequiredValidator", ErrorMessage: "This field is required." },
  { Type: "EmailValidator", ErrorMessage: "Please enter a valid email address." },
];
const TOPIC_OPTIONS = [
  { label: "General enquiry", value: "general" },
  { label: "Account help", value: "account" },
  { label: "Mortgages", value: "mortgages" },
  { label: "Business banking", value: "business" },
];

function element(contentType: string, displayName: string, props: Record<string, unknown>) {
  return {
    id: uid(),
    displayName,
    nodeType: "component",
    component: { contentType, properties: wrapProps(props) },
  };
}

/** A form row containing one element in a single column. */
function row(el: ReturnType<typeof element>) {
  return {
    id: uid(),
    displayName: "Row",
    nodeType: "row",
    nodes: [{ id: uid(), displayName: "Column", nodeType: "column", nodes: [el] }],
  };
}

function buildComposition() {
  return {
    id: uid(),
    displayName: "Shared Form Container",
    nodeType: "section",
    layoutType: "form",
    component: {
      contentType: "OptiFormsContainerData",
      properties: wrapProps({
        Title: "Send us a message",
        Description: "Have a question or need help with your account? We'll reply within one business day.",
        SubmitUrl: "/api/form-submit",
        SubmitConfirmationMessage: "Thank you! We'll be in touch within one business day.",
      }),
    },
    nodes: [
      {
        id: uid(),
        displayName: "Form Step",
        nodeType: "step",
        nodes: [
          row(element("OptiFormsTextboxElement", "Full Name", { Label: "Full Name", Placeholder: "Jane Doe", AutoComplete: "name", Validators: REQUIRED })),
          row(element("OptiFormsTextboxElement", "Email", { Label: "Email", Placeholder: "jane@example.com", AutoComplete: "email", Validators: EMAIL_VALIDATORS })),
          row(element("OptiFormsSelectionElement", "Topic", { Label: "Topic", AllowMultiSelect: false, Options: TOPIC_OPTIONS })),
          row(element("OptiFormsTextareaElement", "Message", { Label: "Message", Placeholder: "How can we help?", Validators: REQUIRED })),
          row(element("OptiFormsSubmitElement", "Submit", { Label: "Send message" })),
        ],
      },
    ],
  };
}

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
  console.log("=== Building out native shared Form Container ===\n");

  const key = await discoverFormKey();
  if (!key) {
    console.error(
      "  [error] No published OptiFormsContainerData block found. Create one in the CMS UI (shared block > Form Container) and publish it, then re-run (or set OPTIMIZELY_CONTACT_FORM_KEY)."
    );
    process.exit(1);
  }
  console.log(`  form block key: ${key}`);

  const token = await getManagementToken();

  // Create a fresh draft of the form block (published versions can't be patched).
  await fetch(`${CONTENT_ENDPOINT}/${key}/versions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "en", displayName: "Shared Form Container" }),
  }).then((r) => r.text());

  const vd = (await (
    await fetch(`${CONTENT_ENDPOINT}/${key}/versions?pageSize=30`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { items?: Array<{ version?: string; status?: string }> };
  const version = (vd.items ?? [])
    .filter((i) => i.status === "draft" && i.version)
    .sort((a, b) => Number(b.version) - Number(a.version))[0]?.version;
  if (!version) throw new Error(`Could not find a draft version for ${key}`);
  console.log(`  draft version: ${version}`);

  const patchRes = await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify({
      properties: wrapProps({
        Title: "Send us a message",
        Description: "Have a question or need help with your account? We'll reply within one business day.",
        SubmitUrl: "/api/form-submit",
        SubmitConfirmationMessage: "Thank you! We'll be in touch within one business day.",
      }),
      composition: buildComposition(),
    }),
  });
  if (!patchRes.ok) {
    throw new Error(`PATCH form block composition: ${patchRes.status} ${(await patchRes.text()).slice(0, 600)}`);
  }
  console.log("  patched composition with 5 native form elements");

  const pubRes = await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pubRes.ok) throw new Error(`Publish: ${pubRes.status} ${(await pubRes.text()).slice(0, 300)}`);
  console.log(`  published version ${version}`);

  console.log("\nDone — form block built out. The /en/help/contact reference picks it up after ~30-60s Graph reindex.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
