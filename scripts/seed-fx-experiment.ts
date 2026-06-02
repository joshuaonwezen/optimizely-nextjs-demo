/**
 * Creates a Feature Experimentation flag + A/B experiment for the homepage
 * audience switcher demo.
 *
 * Prerequisites:
 *   1. Create a Personal Access Token in the Optimizely app:
 *      app.optimizely.com → Profile → API Access → Generate Token
 *   2. Find your Project ID from the URL: app.optimizely.com/v2/projects/{PROJECT_ID}
 *
 * Add to .env.local:
 *   OPTIMIZELY_FX_API_TOKEN=<your token>
 *   OPTIMIZELY_FX_PROJECT_ID=<your project id>
 *
 * Run:
 *   OPTIMIZELY_FX_API_TOKEN=xxx OPTIMIZELY_FX_PROJECT_ID=yyy npx tsx scripts/seed-fx-experiment.ts
 *
 * After running, note the experiment ID in the output and add to .env.local:
 *   OPTIMIZELY_FX_EXPERIMENT_ID=<experiment id>
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const API_BASE = "https://api.optimizely.com/v2";
const TOKEN = process.env.OPTIMIZELY_FX_API_TOKEN;
const PROJECT_ID = Number(process.env.OPTIMIZELY_FX_PROJECT_ID);

if (!TOKEN || !PROJECT_ID) {
  console.error("Missing OPTIMIZELY_FX_API_TOKEN or OPTIMIZELY_FX_PROJECT_ID");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function apiFetch(path: string, method: string, body?: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

async function findExistingFlag(key: string): Promise<number | null> {
  const data = await apiFetch(`/flags?project_id=${PROJECT_ID}`, "GET");
  const flags: Array<{ id: number; key: string }> = data.items ?? data ?? [];
  return flags.find((f) => f.key === key)?.id ?? null;
}

async function main() {
  console.log("=== FX Experiment Seeding ===\n");

  // ── 1. Create (or find) the feature flag ──────────────────────────────────

  let flagId: number | null = await findExistingFlag("homepage_audience").catch(() => null);

  if (flagId) {
    console.log(`[flag] Already exists — id=${flagId}`);
  } else {
    console.log("[flag] Creating homepage_audience flag…");
    const flag = await apiFetch("/flags", "POST", {
      key: "homepage_audience",
      name: "Homepage Audience",
      description: "Controls which homepage variation is shown based on audience segment.",
      project_id: PROJECT_ID,
      variables: [],
    });
    flagId = flag.id;
    console.log(`[flag] Created — id=${flagId}`);
  }

  // ── 2. Create the A/B experiment ─────────────────────────────────────────

  console.log("\n[experiment] Creating homepage_audience_experiment…");

  const experiment = await apiFetch("/experiments", "POST", {
    project_id: PROJECT_ID,
    key: "homepage_audience_experiment",
    name: "Homepage Audience Experiment",
    description: "A/B test showing different homepage content to new visitors, personal, and business segments.",
    type: "a/b",
    status: "running",
    feature_flag_id: flagId,
    holdback: 0,
    audiences: [],  // empty = everyone
    variations: [
      { key: "off",          weight: 3400, actions: [] },
      { key: "new_visitor",  weight: 2200, actions: [] },
      { key: "personal",     weight: 2200, actions: [] },
      { key: "business",     weight: 2200, actions: [] },
    ],
    metrics: [],
    changes: [],
  });

  console.log(`[experiment] Created — id=${experiment.id}`);
  console.log(`\n=== Done ===`);
  console.log(`\nAdd to .env.local:`);
  console.log(`  OPTIMIZELY_FX_EXPERIMENT_ID=${experiment.id}`);
  console.log(`\nView in console:`);
  console.log(`  https://app.optimizely.com/v2/projects/${PROJECT_ID}/experiments/${experiment.id}`);
  console.log(`\nThe FX SDK datafile refreshes every 60s — wait before testing bucketing.`);
}

main().catch((err) => {
  console.error("\n[ERROR]", err.message);
  console.error("\nIf this failed, create the flag and experiment manually:");
  console.error("  1. app.optimizely.com → Feature Flags → New Flag → key: homepage_audience");
  console.error("  2. Create A/B experiment with variations: off (34%), new_visitor (22%), personal (22%), business (22%)");
  console.error("  3. Set status to Running");
  process.exit(1);
});
