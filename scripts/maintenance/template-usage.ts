import { GRAPH_ENDPOINT, apiFetch } from "../_shared";
import { SEED_INSTANCES } from "../../src/lib/optimizely/seedInstances";

// Read-only. Counts which display templates published experiences actually use on
// every instance in seedInstances.ts, and flags nodes that still point at a template
// key that no longer exists in code (pass the keys with --removed=KeyA,KeyB).
// Run it before deleting display templates from an instance.
//
// Only published content is visible to the single key, so drafts are not counted.
//
//   npx tsx scripts/maintenance/template-usage.ts [--only=id,id] [--removed=KeyA,KeyB] [--settings]

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const ONLY = arg("only")?.split(",");
const REMOVED = new Set(arg("removed")?.split(",") ?? []);
const SHOW_SETTINGS = process.argv.includes("--settings");

// Deep enough for a form container: section > step > row > column > element. The root
// composition is always a structure node, so it gets no component fragment.
const BASE_FIELDS = "key nodeType displayTemplateKey displaySettings { key value }";
const NODE_FIELDS = `${BASE_FIELDS} ...on CompositionComponentNode { component { __typename } }`;
const nested = (depth: number): string =>
  depth === 0 ? NODE_FIELDS : `${NODE_FIELDS} ...on CompositionStructureNode { nodes { ${nested(depth - 1)} } }`;

const QUERY = `query TemplateUsage($cursor: String) {
  _Experience(limit: 50, cursor: $cursor, locale: [ALL]) {
    cursor
    items {
      _metadata { key locale url { default } }
      composition { ${BASE_FIELDS} nodes { ${nested(5)} } }
    }
  }
}`;

interface Node {
  nodeType?: string;
  displayTemplateKey?: string | null;
  displaySettings?: Array<{ key: string; value: string }> | null;
  component?: { __typename?: string } | null;
  nodes?: Node[] | null;
}

interface Item {
  _metadata: { key: string; locale: string; url?: { default?: string | null } | null };
  composition?: Node | null;
}

async function fetchExperiences(singleKey: string): Promise<Item[]> {
  const items: Item[] = [];
  let cursor: string | undefined;
  for (;;) {
    const res = await apiFetch(`${GRAPH_ENDPOINT}?auth=${singleKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { cursor } }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message ?? "Graph error");
    const page = json.data._Experience;
    items.push(...page.items);
    if (!page.cursor || page.items.length === 0) return items;
    cursor = page.cursor;
  }
}

async function main() {
  for (const instance of SEED_INSTANCES) {
    if (ONLY && !ONLY.includes(instance.id)) continue;
    const singleKey = process.env[`OPTIMIZELY_GRAPH_SINGLE_KEY${instance.suffix}`];
    if (!singleKey) {
      console.log(`\n## ${instance.label}: no OPTIMIZELY_GRAPH_SINGLE_KEY${instance.suffix}, skipped`);
      continue;
    }

    let items: Item[];
    try {
      items = await fetchExperiences(singleKey);
    } catch (error) {
      console.log(`\n## ${instance.label}: ${(error as Error).message}`);
      continue;
    }

    const templates = new Map<string, number>();
    const settings = new Map<string, Map<string, number>>();
    const stale: string[] = [];

    const walk = (node: Node, item: Item) => {
      const type = node.component?.__typename ?? node.nodeType ?? "?";
      const template = node.displayTemplateKey ?? "(none)";
      templates.set(template, (templates.get(template) ?? 0) + 1);
      if (REMOVED.has(template)) {
        stale.push(`${template} on ${type} in ${item._metadata.url?.default ?? item._metadata.key} (${item._metadata.locale})`);
      }
      for (const { key, value } of node.displaySettings ?? []) {
        const name = `${template}.${key}`;
        const values = settings.get(name) ?? new Map<string, number>();
        values.set(value, (values.get(value) ?? 0) + 1);
        settings.set(name, values);
      }
      for (const child of node.nodes ?? []) walk(child, item);
    };
    for (const item of items) if (item.composition) walk(item.composition, item);

    console.log(`\n## ${instance.label}: ${items.length} published experiences`);
    for (const [template, count] of [...templates].sort()) console.log(`  ${String(count).padStart(4)}  ${template}`);
    if (SHOW_SETTINGS) {
      console.log("  settings:");
      for (const [name, values] of [...settings].sort()) {
        console.log(`    ${name}: ${[...values].map(([v, n]) => `${v}=${n}`).join(", ")}`);
      }
    }
    if (REMOVED.size > 0) {
      console.log(stale.length ? `  STILL USING REMOVED TEMPLATES:\n    ${stale.join("\n    ")}` : "  no removed templates in use");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
