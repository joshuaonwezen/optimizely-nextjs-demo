/**
 * Pushes the Product Landing content types and seeds the Product Landing page on
 * every CMS instance in src/lib/optimizely/seedInstances.ts, skipping any instance
 * whose CMS does not support `type: "composition"` properties (the push script
 * detects that itself) and any instance without credentials in .env.local.
 *
 * Each instance's suffixed vars are injected under the base names, the same
 * contract seed-all-instances.ts uses.
 *
 * Run: npx tsx scripts/product-landing-instances.ts [--only=id,id] [--dry-run]
 *
 * Note: the deployed app only renders these types for hosts listed in
 * PRODUCT_LANDING_CMS_HOSTS (src/lib/optimizely/productLandingInstances.ts). Add a
 * host there only after its push is done and Graph's schema sync has caught up
 * (~10 min), otherwise every page on that instance breaks.
 */

import { config as loadEnv } from "dotenv";
import { spawn } from "child_process";
import { SEED_INSTANCES } from "../src/lib/optimizely/seedInstances";

loadEnv({ path: ".env.local" });

const FIELDS = [
  "OPTIMIZELY_CMS_URL",
  "OPTIMIZELY_CMS_CLIENT_ID",
  "OPTIMIZELY_CMS_CLIENT_SECRET",
  "OPTIMIZELY_GRAPH_SINGLE_KEY",
  "OPTIMIZELY_GRAPH_GATEWAY",
  "OPTIMIZELY_ROOT_CONTAINER",
] as const;

const REQUIRED = ["OPTIMIZELY_CMS_URL", "OPTIMIZELY_CMS_CLIENT_ID", "OPTIMIZELY_CMS_CLIENT_SECRET"];

const STEPS: Array<[string, string]> = [
  ["push types", "scripts/push-product-landing-types.ts"],
  ["seed page", "scripts/seed-product-landing.ts"],
];

function resolveEnv(suffix: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of FIELDS) {
    const shared = name === "OPTIMIZELY_GRAPH_GATEWAY";
    const value = process.env[`${name}${suffix}`] || (shared ? process.env[name] : undefined);
    if (value) env[name] = value;
    else delete env[name];
  }
  return env;
}

function run(script: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", script], { env, stdio: "inherit", shell: false });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim())) : null;
  const instances = only ? SEED_INSTANCES.filter((i) => only.has(i.id)) : SEED_INSTANCES;

  const results: string[] = [];
  for (const instance of instances) {
    const env = resolveEnv(instance.suffix);
    const missing = REQUIRED.filter((name) => !env[name]);
    console.log(`\n=== ${instance.label} (${instance.id}) ===`);
    if (missing.length > 0) {
      console.warn(`  [skip] missing ${missing.join(", ")}`);
      results.push(`${instance.id}: skipped (no credentials)`);
      continue;
    }
    if (dryRun) {
      console.log(`  [dry-run] would push types + seed against ${env.OPTIMIZELY_CMS_URL}`);
      results.push(`${instance.id}: dry-run`);
      continue;
    }
    let outcome = "done";
    for (const [label, script] of STEPS) {
      const code = await run(script, env);
      if (code !== 0) {
        outcome = `failed at ${label}`;
        break;
      }
    }
    results.push(`${instance.id}: ${outcome}`);
  }

  console.log("\n=== Summary ===");
  for (const line of results) console.log(`  ${line}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
