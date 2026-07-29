import { config as loadEnv } from "dotenv";
import { spawn } from "child_process";
import { SEED_INSTANCES } from "../src/lib/optimizely/seedInstances";

loadEnv({ path: ".env.local" });

// Same resolution contract as the /demo/management-api seed route: FIELDS are the
// per-instance vars pulled from their suffixed .env.local names; REQUIRED are the
// subset that must be present for a run to proceed.
const FIELDS = [
  "OPTIMIZELY_CMS_URL",
  "OPTIMIZELY_CMS_CLIENT_ID",
  "OPTIMIZELY_CMS_CLIENT_SECRET",
  "OPTIMIZELY_GRAPH_SINGLE_KEY",
  "OPTIMIZELY_GRAPH_GATEWAY",
  "OPTIMIZELY_ROOT_CONTAINER",
  "OPTIMIZELY_APP_KEY",
  "OPTIMIZELY_APP_SECRET",
] as const;

const REQUIRED = [
  "OPTIMIZELY_CMS_URL",
  "OPTIMIZELY_CMS_CLIENT_ID",
  "OPTIMIZELY_CMS_CLIENT_SECRET",
  "OPTIMIZELY_GRAPH_SINGLE_KEY",
  "OPTIMIZELY_GRAPH_GATEWAY",
];

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: "inherit", shell: false });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`"${[cmd, ...args].join(" ")}" exited with code ${code}`));
    });
  });
}

// Resolve one instance's credentials into base env var names, mirroring the seed
// route: every field comes from its suffixed name, except the Graph gateway which
// is shared and may fall back to the base var. Missing fields are deleted so a
// stray base var never leaks another instance's value into this run.
function resolveEnv(suffix: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of FIELDS) {
    const shared = name === "OPTIMIZELY_GRAPH_GATEWAY";
    const value =
      process.env[`${name}${suffix}`] || (shared ? process.env[name] : undefined);
    if (value) env[name] = value;
    else delete env[name];
  }
  return env;
}

type Outcome = "seeded" | "failed" | "skipped";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const localize =
    process.argv.includes("--localize") || /^(1|true|yes)$/i.test(process.env.SEED_LOCALIZE ?? "");

  const results: { id: string; outcome: Outcome; detail: string }[] = [];

  for (const instance of SEED_INSTANCES) {
    console.log(`\n${"=".repeat(70)}\n${instance.label} (${instance.id})\n${"=".repeat(70)}`);

    const env = resolveEnv(instance.suffix);
    if (localize) env.SEED_LOCALIZE = "1";

    const missing = REQUIRED.filter((name) => !env[name]).map((name) =>
      name === "OPTIMIZELY_GRAPH_GATEWAY" ? name : `${name}${instance.suffix}`
    );
    if (missing.length > 0) {
      console.warn(`  [skip] ${instance.id} - missing required vars: ${missing.join(", ")}`);
      results.push({ id: instance.id, outcome: "skipped", detail: `missing ${missing.join(", ")}` });
      continue;
    }

    console.log(`  target: ${env.OPTIMIZELY_CMS_URL}`);
    if (dryRun) {
      console.log(`  [dry-run] would seed ${instance.id} (all required vars present)`);
      results.push({ id: instance.id, outcome: "seeded", detail: "dry-run" });
      continue;
    }

    try {
      await run("npx", ["tsx", "scripts/seed-runner.ts"], env);
      results.push({ id: instance.id, outcome: "seeded", detail: env.OPTIMIZELY_CMS_URL ?? "" });
    } catch (err) {
      console.warn(`  [warn] ${instance.id} failed: ${(err as Error).message} - continuing`);
      results.push({ id: instance.id, outcome: "failed", detail: (err as Error).message });
    }
  }

  console.log(`\n${"=".repeat(70)}\nSummary${dryRun ? " (dry-run)" : ""}\n${"=".repeat(70)}`);
  for (const r of results) {
    console.log(`  ${r.outcome.padEnd(8)} ${r.id.padEnd(14)} ${r.detail}`);
  }

  const anySeeded = results.some((r) => r.outcome === "seeded");
  if (!anySeeded) {
    console.error("\nNo instance was seeded (all failed or skipped).");
    process.exit(1);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
