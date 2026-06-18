/**
 * Creates the FX flags for the new homepage experiments:
 *   - nav_cta            Nav bar CTA button A/B (buttonText, buttonUrl variables)
 *   - sticky_offer_bar   Bottom sticky bar (message, linkText, linkUrl, expiryLabel variables)
 *   - hero_copy          Hero headline A/B (headline, subheadline variables)
 *
 * Prerequisites — add to .env.local:
 *   OPTIMIZELY_FX_API_TOKEN=<personal access token>
 *   OPTIMIZELY_FX_PROJECT_ID=23385830076
 *
 * Run:
 *   npx tsx scripts/seed-fx-flags.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const BASE = "https://api.optimizely.com/flags/v1";
const TOKEN = process.env.OPTIMIZELY_FX_API_TOKEN;
const PROJECT_ID = process.env.OPTIMIZELY_FX_PROJECT_ID;

if (!TOKEN || !PROJECT_ID) {
  console.error("Missing OPTIMIZELY_FX_API_TOKEN or OPTIMIZELY_FX_PROJECT_ID in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function req(path: string, method: string, body?: object) {
  const url = `${BASE}/projects/${PROJECT_ID}${path}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

type VarType = "string" | "boolean" | "integer" | "double";

interface VarDef {
  key: string;
  type: VarType;
  default_value: string;
}

interface VariationSpec {
  key: string;
  name: string;
  variables: Record<string, string>;
}

interface FlagSpec {
  key: string;
  name: string;
  description: string;
  variable_definitions: VarDef[];
  variations: VariationSpec[];
  experiment: {
    key: string;
    name: string;
    weights: Record<string, number>;
  };
}

const FLAGS: FlagSpec[] = [
  {
    key: "nav_cta",
    name: "Nav CTA Button",
    description: "A/B test a prominent CTA button in the navigation bar.",
    variable_definitions: [
      { key: "buttonText", type: "string", default_value: "Open an Account" },
      { key: "buttonUrl",  type: "string", default_value: "/personal/checking" },
    ],
    variations: [
      {
        key: "on",
        name: "On",
        variables: {
          buttonText: "Open an Account",
          buttonUrl:  "/personal/checking",
        },
      },
    ],
    experiment: {
      key: "nav_cta_experiment",
      name: "Nav CTA Experiment",
      weights: { off: 5000, on: 5000 },
    },
  },
  {
    key: "sticky_offer_bar",
    name: "Sticky Offer Bar",
    description: "Fixed bottom promotional bar with dismissible limited-time offer copy.",
    variable_definitions: [
      { key: "message",     type: "string", default_value: "Limited offer: 0% APR for 12 months on balance transfers." },
      { key: "linkText",    type: "string", default_value: "Learn more" },
      { key: "linkUrl",     type: "string", default_value: "/personal/credit-cards" },
      { key: "expiryLabel", type: "string", default_value: "Ends Friday" },
    ],
    variations: [
      {
        key: "on",
        name: "On",
        variables: {
          message:     "Limited offer: 0% APR for 12 months on balance transfers.",
          linkText:    "Learn more",
          linkUrl:     "/personal/credit-cards",
          expiryLabel: "Ends Friday",
        },
      },
    ],
    experiment: {
      key: "sticky_offer_bar_experiment",
      name: "Sticky Offer Bar Experiment",
      weights: { off: 5000, on: 5000 },
    },
  },
  {
    key: "hero_copy",
    name: "Hero Copy A/B",
    description: "A/B test headline and subheadline copy in the homepage hero section.",
    variable_definitions: [
      { key: "headline",    type: "string", default_value: "" },
      { key: "subheadline", type: "string", default_value: "" },
    ],
    variations: [
      {
        key: "control",
        name: "Control",
        variables: {
          headline:    "Banking made simple",
          subheadline: "Everything you need to manage your money - personal accounts, business banking, and mortgages in one place.",
        },
      },
      {
        key: "challenger",
        name: "Challenger",
        variables: {
          headline:    "Earn more. Pay less. Bank smarter.",
          subheadline: "High-yield savings, zero-fee checking, and mortgage rates that beat the market. Switch in minutes.",
        },
      },
    ],
    experiment: {
      key: "hero_copy_experiment",
      name: "Hero Copy Experiment",
      weights: { off: 3400, control: 3300, challenger: 3300 },
    },
  },
];

async function flagExists(key: string): Promise<boolean> {
  const data = await req(`/flags?per_page=100`, "GET");
  const items: Array<{ key: string }> = data.items ?? [];
  return items.some((f) => f.key === key);
}

async function variationExists(flagKey: string, varKey: string): Promise<boolean> {
  const data = await req(`/flags/${flagKey}/variations?per_page=50`, "GET");
  const items: Array<{ key: string }> = data.items ?? [];
  return items.some((v) => v.key === varKey);
}

async function seedFlag(spec: FlagSpec) {
  console.log(`\n── ${spec.key} ──`);

  // 1. Create flag (auto-creates off + on variations)
  if (await flagExists(spec.key)) {
    console.log(`  [flag] Already exists`);
  } else {
    const varDefs: Record<string, object> = {};
    for (const v of spec.variable_definitions) {
      varDefs[v.key] = { key: v.key, type: v.type, default_value: v.default_value };
    }
    await req("/flags", "POST", {
      key: spec.key,
      name: spec.name,
      description: spec.description,
      variable_definitions: varDefs,
    });
    console.log(`  [flag] Created`);
  }

  // 2. Create any extra variations beyond the auto-created "off"/"on"
  //    (off and on are auto-created at flag creation time; their values
  //    come from variable_definitions default_value — no update needed)
  for (const v of spec.variations) {
    if (v.key === "off" || v.key === "on") continue;

    const vars: Record<string, { value: string }> = {};
    for (const [k, val] of Object.entries(v.variables)) {
      vars[k] = { value: val };
    }

    if (await variationExists(spec.key, v.key)) {
      console.log(`  [variation] "${v.key}" already exists`);
    } else {
      await req(`/flags/${spec.key}/variations`, "POST", {
        key: v.key,
        name: v.name,
        variables: vars,
      });
      console.log(`  [variation] Created "${v.key}"`);
    }
  }

  // 3. Add A/B experiment rule to the production ruleset (JSON Patch format)
  const currentRuleset = await req(
    `/flags/${spec.key}/environments/production/ruleset`,
    "GET"
  ).catch(() => ({ rules: {} }));

  const existingRules: Record<string, unknown> = currentRuleset.rules ?? {};

  if (existingRules[spec.experiment.key]) {
    console.log(`  [experiment] Rule "${spec.experiment.key}" already exists`);
  } else {
    const ruleVariations: Record<string, { key: string; name: string; percentage_included: number }> = {};
    for (const [k, w] of Object.entries(spec.experiment.weights)) {
      ruleVariations[k] = { key: k, name: k === "off" ? "Off" : k.charAt(0).toUpperCase() + k.slice(1), percentage_included: w };
    }

    // The ruleset PATCH uses JSON Patch (RFC 6902) format
    await req(`/flags/${spec.key}/environments/production/ruleset`, "PATCH", [
      {
        op: "add",
        path: `/rules/${spec.experiment.key}`,
        value: {
          key: spec.experiment.key,
          name: spec.experiment.name,
          type: "a/b",
          distribution_mode: "manual",
          percentage_included: 10000,
          audience_conditions: [],
          audience_ids: [],
          metrics: [],
          variations: ruleVariations,
        },
      },
    ] as unknown as object);
    console.log(`  [experiment] A/B rule "${spec.experiment.key}" created`);

    // Enable the ruleset so the experiment goes live
    await req(`/flags/${spec.key}/environments/production/ruleset/enabled`, "POST");
    console.log(`  [experiment] Ruleset enabled`);
  }
}

async function main() {
  console.log("=== Seeding FX flags ===");
  console.log(`Project: ${PROJECT_ID}\n`);

  for (const spec of FLAGS) {
    await seedFlag(spec);
  }

  console.log("\n=== Done ===");
  console.log("Datafile refreshes every 60s - wait before testing in the app.");
  console.log(`View flags: https://app.optimizely.com/v2/projects/${PROJECT_ID}/flags/list`);
}

main().catch((err) => {
  console.error("\n[ERROR]", err instanceof Error ? err.message : err);
  process.exit(1);
});
