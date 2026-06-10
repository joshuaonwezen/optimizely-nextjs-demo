import { config as loadEnv } from "dotenv";
import { createInterface } from "readline";
import { spawn } from "child_process";

loadEnv({ path: ".env.local" });

type InstanceName = "personal" | "onboarding";

function envForInstance(suffix: string): Record<string, string | undefined> {
  const s = suffix ? `_${suffix}` : "";
  return {
    OPTIMIZELY_CMS_CLIENT_ID:     process.env[`OPTIMIZELY_CMS_CLIENT_ID${s}`],
    OPTIMIZELY_CMS_CLIENT_SECRET: process.env[`OPTIMIZELY_CMS_CLIENT_SECRET${s}`],
    OPTIMIZELY_APP_KEY:           process.env[`OPTIMIZELY_APP_KEY${s}`],
    OPTIMIZELY_APP_SECRET:        process.env[`OPTIMIZELY_APP_SECRET${s}`],
    OPTIMIZELY_CMS_URL:           process.env[`OPTIMIZELY_CMS_URL${s}`],
    OPTIMIZELY_ROOT_CONTAINER:    process.env[`OPTIMIZELY_ROOT_CONTAINER${s}`],
    OPTIMIZELY_NAV_BLOCK_KEY:     process.env[`OPTIMIZELY_NAV_BLOCK_KEY${s}`],
    OPTIMIZELY_GRAPH_SINGLE_KEY:  process.env[`OPTIMIZELY_GRAPH_SINGLE_KEY${s}`],
    OPTIMIZELY_GRAPH_GATEWAY:     process.env[`OPTIMIZELY_GRAPH_GATEWAY${s}`]
                                  ?? process.env.OPTIMIZELY_GRAPH_GATEWAY,
  };
}

const INSTANCES: Record<InstanceName, Record<string, string | undefined>> = {
  personal:   envForInstance(""),
  onboarding: envForInstance("ONBOARDING"),
};

async function pickInstance(): Promise<InstanceName> {
  const flag = process.argv.slice(2).find((a) => a.startsWith("--instance"));
  if (flag) {
    const value = flag.includes("=") ? flag.split("=")[1] : process.argv[process.argv.indexOf(flag) + 1];
    if (value === "personal" || value === "onboarding") return value;
    console.error(`Unknown instance "${value}". Choose: personal, onboarding`);
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Which instance? (personal / onboarding): ", (answer) => {
      rl.close();
      const choice = answer.trim().toLowerCase();
      if (choice === "personal" || choice === "onboarding") {
        resolve(choice as InstanceName);
      } else {
        console.error(`Unknown choice "${answer}". Choose: personal, onboarding`);
        process.exit(1);
      }
    });
  });
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: "inherit", shell: false });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`"${[cmd, ...args].join(" ")}" exited with code ${code}`));
    });
  });
}

async function main() {
  const instance = await pickInstance();
  console.log(`\nSeeding → ${instance}\n`);

  const overrides = INSTANCES[instance];
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) env[key] = value;
  }

  // Required steps — any failure aborts the run.
  const required: [string, string[]][] = [
    ["npx", ["@optimizely/cms-cli@latest", "config", "push", "optimizely.config.mjs", "--force"]],
    ["npx", ["tsx", "scripts/seed-content.ts"]],
    ["npx", ["tsx", "scripts/seed-nav.ts"]],
    ["npx", ["tsx", "scripts/seed-modeling.ts"]],
    ["npx", ["tsx", "scripts/seed-faqs.ts"]],
  ];

  // Optional steps — failures print a warning and the run continues.
  // These may depend on Graph indexing the content from required steps (~60s lag).
  const optional: [string, string[]][] = [
    ["npx", ["tsx", "scripts/seed-homepage-variations.ts"]],
    ["npx", ["tsx", "scripts/seed-nav-strategy-demo.ts"]],
    ["npx", ["tsx", "scripts/seed-quotes.ts"]],
    // Excluded:
    // seed-business-banking-app-variation.ts — hardcoded version key, instance-specific
    // seed-fx-experiment.ts                  — requires separate FX_API_TOKEN + FX_PROJECT_ID
    // register-webhook.mjs                   — interactive prompt for public URL
  ];

  for (const [cmd, args] of required) {
    console.log(`\n→ ${[cmd, ...args].join(" ")}`);
    await run(cmd, args, env);
  }

  for (const [cmd, args] of optional) {
    console.log(`\n→ ${[cmd, ...args].join(" ")}`);
    try {
      await run(cmd, args, env);
    } catch (err) {
      console.warn(`  [warn] ${(err as Error).message} — continuing`);
    }
  }

  console.log(`\nDone — ${instance} seeded.`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
