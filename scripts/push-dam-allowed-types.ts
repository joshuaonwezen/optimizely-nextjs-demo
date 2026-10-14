/**
 * Lets editors pick CMP DAM images in the reference fields below, on every instance
 * whose CMS has the DAM integration.
 *
 * The DAM asset type (graph:cmp_PublicImageAsset) cannot live in the code config:
 * a CMS without the DAM integration rejects it ("has a dependency on
 * 'graph:cmp_PublicImageAsset' that could not be resolved"), and that one error fails
 * the whole content-type import. So the config keeps "_image" only and this script
 * adds the DAM type where the CMS can resolve it, skipping the instances where it
 * cannot. The CMS's own answer is the capability check.
 *
 * A normal opti:push resets these fields to "_image" without flagging it as breaking,
 * so re-run this after one (the seed runner does). Instances with DAM as of
 * 2026-10-14: joshCMS, harryNewCMS, mostinNewCMS, toddCMS.
 *
 * Run: npx tsx scripts/push-dam-allowed-types.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getManagementToken } from "../src/lib/optimizely/auth";
import { API_BASE, apiFetch } from "./_shared";

const DAM_IMAGE_TYPE = "graph:cmp_PublicImageAsset";

// contentType key -> contentReference properties that should also accept DAM images.
const DAM_IMAGE_FIELDS: Record<string, string[]> = {
  HeroBlock: ["backgroundImage"],
};

async function call(method: string, path: string, body?: unknown, contentType = "application/json") {
  const token = await getManagementToken();
  const res = await apiFetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType, Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

async function main() {
  console.log("=== Allowing DAM images in reference fields ===\n");

  for (const [typeKey, fields] of Object.entries(DAM_IMAGE_FIELDS)) {
    const current = await call("GET", `/v1/contenttypes/${typeKey}`);
    if (current.status >= 300) throw new Error(`GET ${typeKey}: ${current.status} ${current.text.slice(0, 200)}`);
    const properties = (JSON.parse(current.text).properties ?? {}) as Record<string, { allowedTypes?: string[] }>;

    for (const field of fields) {
      const allowed = properties[field]?.allowedTypes ?? [];
      if (allowed.includes(DAM_IMAGE_TYPE)) {
        console.log(`  [ok] ${typeKey}.${field} already allows DAM images`);
        continue;
      }
      // Merge-patch through v1 (never preview3, which resets allowedTypes): only this
      // property's allowedTypes changes.
      const patch = await call(
        "PATCH",
        `/v1/contenttypes/${typeKey}`,
        { properties: { [field]: { allowedTypes: [...allowed, DAM_IMAGE_TYPE] } } },
        "application/merge-patch+json"
      );
      if (patch.status < 300) {
        console.log(`  [patched] ${typeKey}.${field} += ${DAM_IMAGE_TYPE}`);
      } else if (/could not be resolved|unable to find|invalid content type/i.test(patch.text)) {
        const reason = (patch.text.match(/"(?:detail|message)"\s*:\s*"([^"]+)"/) ?? [])[1] ?? patch.text.slice(0, 160);
        console.log(`  [skip] ${typeKey}.${field}: no DAM integration on this CMS - ${reason}`);
      } else {
        throw new Error(`PATCH ${typeKey}.${field}: ${patch.status} ${patch.text.slice(0, 400)}`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
