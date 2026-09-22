/**
 * Documents the app's custom visitor attributes inside Optimizely, generating the
 * value vocabulary from the LIVE CMS taxonomy so it cannot drift from the terms
 * editors actually use.
 *
 * Why this exists: a marketer building an audience on `top_category` has no way to
 * know the allowed values. Optimizely has no native mechanism for enumerating a
 * custom attribute's values - List Attributes only accept cookies, query params, ZIP
 * codes or JS variables - so the attribute's `description` is the only slot for it.
 * Descriptions are NOT serialised into the datafile (verified: attributes ship as
 * just {id, key}), so this is authoring metadata with zero delivery cost.
 *
 * It also CREATES any attribute that does not exist yet. That matters beyond
 * documentation: `top_category`, `odp_segment` and `fx_variation` are pushed by the
 * app but were never registered, so they do not appear in the audience builder at
 * all. FX tolerates unregistered attributes at decision time; the UI does not offer
 * them.
 *
 * Attributes live per PROJECT, and Web Experimentation is a different project from
 * Feature Experimentation. Run it once per project you build audiences in:
 *   FX  23385830076   (OPTIMIZELY_FX_SDK_KEY's project)
 *   WX  23338860169   (NEXT_PUBLIC_OPTIMIZELY_WEB_SNIPPET_ID's project)
 *
 * Dry run by default - it prints the diff and writes nothing. Pass --apply to write.
 *
 * Run:
 *   OPTIMIZELY_FX_API_TOKEN=<pat> npx tsx scripts/maintenance/sync-attribute-docs.ts --project=23385830076
 *   OPTIMIZELY_FX_API_TOKEN=<pat> npx tsx scripts/maintenance/sync-attribute-docs.ts --project=23385830076 --apply
 */

import { config } from "dotenv";
import { listAllTerms, type TaxonomyTerm } from "../_taxonomy";
import { INTERNAL_ROOT_KEYS } from "../../src/lib/taxonomy";

config({ path: ".env.local" });

const BASE = "https://api.optimizely.com/v2";
const TOKEN = process.env.OPTIMIZELY_FX_API_TOKEN;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
// --print skips Optimizely entirely and just shows what would be written. Useful for
// reviewing the generated vocabulary without holding an API token.
const PRINT_ONLY = args.includes("--print");
const projectArg = args.find((a) => a.startsWith("--project="));
const PROJECT_ID = projectArg?.slice("--project=".length) || process.env.OPTIMIZELY_FX_PROJECT_ID;

if (!TOKEN && !PRINT_ONLY) {
  console.error(
    "Missing OPTIMIZELY_FX_API_TOKEN.\n" +
      "  By convention (.env.example) it is passed inline rather than committed:\n" +
      "  OPTIMIZELY_FX_API_TOKEN=<pat> npx tsx scripts/maintenance/sync-attribute-docs.ts --project=<id>"
  );
  process.exit(1);
}
if (!PROJECT_ID && !PRINT_ONLY) {
  console.error("Missing --project=<id> (or OPTIMIZELY_FX_PROJECT_ID).");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

type Attribute = {
  id: number;
  key: string;
  name?: string;
  description?: string;
  archived?: boolean;
};

async function req<T>(path: string, method = "GET", body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

/**
 * Public, visitor-facing term keys. A term is internal when ANY ancestor is an
 * internal root, so this walks the whole parent chain rather than checking the
 * immediate parent - mirroring isPublicTerm() in src/lib/taxonomy.ts. (The app's
 * helpers cannot be reused directly here: GetTaxonomyTerms.ts is a "use cache"
 * function and throws outside the Next runtime.)
 */
function publicTermKeys(terms: TaxonomyTerm[]): string[] {
  const byKey = new Map(terms.map((t) => [t.key, t]));
  const internalRoots = new Set(INTERNAL_ROOT_KEYS);

  const rootOf = (key: string): string => {
    let current = byKey.get(key);
    const seen = new Set<string>();
    while (current?.parent && !seen.has(current.key)) {
      seen.add(current.key);
      const parent = byKey.get(current.parent);
      if (!parent) break;
      current = parent;
    }
    return current?.key ?? key;
  };

  return terms
    .map((t) => t.key)
    .filter((key) => !internalRoots.has(rootOf(key)))
    .sort();
}

// Descriptions are regenerated wholesale, so an edit made in the Optimizely UI is
// overwritten on the next run. That is the point: the CMS taxonomy is the source of
// truth for what these values can be.
function buildSpecs(termKeys: string[]) {
  const vocabulary = termKeys.join(", ");
  const count = termKeys.length;

  return [
    {
      key: "top_category",
      name: "Top content category",
      description:
        `The CMS category term this visitor reads most, set by the app from their reading history. ` +
        `One value, a taxonomy term key. Written to ODP as a customer attribute too. ` +
        `Allowed values (${count}): ${vocabulary}`,
    },
    {
      key: "read_categories",
      name: "Read content categories",
      description:
        `Up to three CMS category terms this visitor reads most, comma separated, most-read first. ` +
        `Use top_category for single-value targeting. ` +
        `Allowed values (${count}): ${vocabulary}`,
    },
    {
      key: "odp_segment",
      name: "ODP audience",
      description:
        "An Optimizely Data Platform audience this visitor currently qualifies for, as the ODP " +
        "audience identifier. Prefer a native ODP_SEGMENT audience condition where available; " +
        "this attribute exists so Web Experimentation, which has no native ODP conditions, can " +
        "target the same data.",
    },
    {
      key: "fx_variation",
      name: "Served FX variation",
      description:
        "The Feature Experimentation variation this visitor was served, as ruleKey-variationKey " +
        "(e.g. hero_layout_experiment-centered). Note this is the RULE key, not the flag key, " +
        "matching the exp_variant_string convention used in GA4.",
    },
    {
      key: "persona",
      name: "Browsing persona",
      description:
        "Derived from the site section the visitor is browsing, not from anything they declared. " +
        "Values: personal, business, mortgages, investments, new_visitor.",
    },
  ];
}

async function main() {
  console.log(`=== Attribute documentation sync - project ${PROJECT_ID} ===`);
  console.log(APPLY ? "  MODE: apply (writes)\n" : "  MODE: dry run (pass --apply to write)\n");

  const terms = await listAllTerms();
  if (terms.length === 0) {
    console.error("No taxonomy terms returned - refusing to write an empty vocabulary.");
    process.exit(1);
  }
  const termKeys = publicTermKeys(terms);
  console.log(`  taxonomy: ${terms.length} terms, ${termKeys.length} public\n`);

  if (PRINT_ONLY) {
    for (const spec of buildSpecs(termKeys)) {
      console.log(`--- ${spec.key} (${spec.name})`);
      console.log(`${spec.description}\n`);
    }
    console.log("Preview only - nothing contacted Optimizely.");
    return;
  }

  const existing = await req<Attribute[]>(`/attributes?project_id=${PROJECT_ID}&per_page=100`);
  const byKey = new Map(existing.map((a) => [a.key, a]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const spec of buildSpecs(termKeys)) {
    const current = byKey.get(spec.key);

    if (!current) {
      console.log(`  [create] ${spec.key}`);
      console.log(`           ${spec.description.slice(0, 140)}${spec.description.length > 140 ? "..." : ""}`);
      if (APPLY) {
        await req("/attributes", "POST", { ...spec, project_id: Number(PROJECT_ID) });
      }
      created++;
      continue;
    }

    if (current.description === spec.description && current.name === spec.name) {
      console.log(`  [ok]     ${spec.key}`);
      unchanged++;
      continue;
    }

    console.log(`  [update] ${spec.key} (id ${current.id})`);
    if (current.description !== spec.description) {
      console.log(`           was: ${(current.description ?? "(none)").slice(0, 100)}`);
      console.log(`           now: ${spec.description.slice(0, 100)}...`);
    }
    if (APPLY) {
      await req(`/attributes/${current.id}`, "PATCH", { name: spec.name, description: spec.description });
    }
    updated++;
  }

  console.log(
    `\n  ${created} to create, ${updated} to update, ${unchanged} already current.` +
      (APPLY ? " Written." : " Nothing written - re-run with --apply.")
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
