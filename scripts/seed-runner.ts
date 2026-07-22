import { config as loadEnv } from "dotenv";
import { spawn } from "child_process";

loadEnv({ path: ".env.local" });

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
  // Values come from .env.local, or from whatever the caller injected into the
  // environment (the /demo/management-api seed tool resolves the input fields and
  // passes them through). Children inherit this env, so overrides propagate.
  const env: NodeJS.ProcessEnv = { ...process.env };

  console.log(`\nSeeding -> ${env.OPTIMIZELY_CMS_URL ?? "(OPTIMIZELY_CMS_URL not set)"}\n`);

  // Fail fast if core credentials are missing - avoids cryptic errors deep in subprocesses.
  const REQUIRED_VARS = [
    "OPTIMIZELY_CMS_CLIENT_ID",
    "OPTIMIZELY_CMS_CLIENT_SECRET",
    "OPTIMIZELY_GRAPH_SINGLE_KEY",
    "OPTIMIZELY_GRAPH_GATEWAY",
    "OPTIMIZELY_CMS_URL",
    "OPTIMIZELY_APP_KEY",
    "OPTIMIZELY_APP_SECRET",
  ];
  const missingVars = REQUIRED_VARS.filter((v) => !env[v]);
  if (missingVars.length > 0) {
    console.error(
      `\nMissing required env vars:\n` +
      missingVars.map((v) => `  - ${v}`).join("\n") +
      "\n\nSet these in .env.local (or fill them into the /demo/management-api seed tool)." +
      "\nSee CLAUDE.md -> Seeding Content -> Before your first seed for details."
    );
    process.exit(1);
  }

  // Required steps - any failure aborts the run.
  const required: [string, string[]][] = [
    ["npx", ["@optimizely/cms-cli@latest", "config", "push", "optimizely.config.mjs", "--force"]],
    ["npx", ["tsx", "scripts/seed-content.ts"]],
    ["npx", ["tsx", "scripts/seed-nav.ts"]],
    ["npx", ["tsx", "scripts/seed-modeling.ts"]],
    ["npx", ["tsx", "scripts/seed-faqs.ts"]],
    ["npx", ["tsx", "scripts/seed-quotes.ts"]],
    ["npx", ["tsx", "scripts/seed-locations.ts"]],
  ];

  // Localization is opt-in: only runs with --localize or SEED_LOCALIZE truthy
  // (the /demo/management-api seed tool sets SEED_LOCALIZE via its checkbox).
  const localize =
    process.argv.includes("--localize") || /^(1|true|yes)$/i.test(env.SEED_LOCALIZE ?? "");
  // Normalize into env so the spawned seed-localization child sees it (the child's
  // own guard checks SEED_LOCALIZE / its argv, and it won't inherit the runner's --localize arg).
  if (localize) env.SEED_LOCALIZE = "1";

  // Optional steps - failures print a warning and the run continues.
  // These may depend on Graph indexing the content from required steps (~60s lag).
  const optional: [string, string[]][] = [
    ["npx", ["tsx", "scripts/seed-homepage-variations.ts"]],
    ["npx", ["tsx", "scripts/seed-nav-strategy-demo.ts"]],
    // Geo branch-finder shared block on /en/help/branches. seed-locations (now a
    // required step) has already run, so BankLocation data exists; needs the
    // branches page in Graph.
    ["npx", ["tsx", "scripts/seed-branch-finder.ts"]],
    ["npx", ["tsx", "scripts/seed-contact-pages.ts"]],
    // Requires a published "Form Container" shared block authored in the CMS UI
    // (native forms cannot be created via the API). Warns and skips if none exists.
    // Build out the block's elements first, then place it on the contact page.
    ["npx", ["tsx", "scripts/seed-form-block.ts"]],
    ["npx", ["tsx", "scripts/seed-contact-form.ts"]],
    // Footer links point at pages from seed-content/seed-nav — needs Graph to
    // have indexed them (~60s lag on a fresh seed; re-run individually if links
    // are missing). Must run before seed-localization so nl versions cover it.
    ["npx", ["tsx", "scripts/seed-footer.ts"]],
    ["npx", ["tsx", "scripts/seed-settings.ts"]],
    // Last: needs every page above to be in Graph already (~60s indexing lag on
    // a fresh seed - re-run individually if many items are skipped/failed).
    // Opt-in only (see `localize` above); the child inherits SEED_LOCALIZE via env.
    ...(localize ? [["npx", ["tsx", "scripts/seed-localization.ts"]]] as [string, string[]][] : []),
    // Excluded:
    // register-webhook.mjs - interactive prompt for public URL
    // FX flags/experiments are managed via the Optimizely Experimentation MCP server.
  ];

  for (const [cmd, args] of required) {
    console.log(`\n-> ${[cmd, ...args].join(" ")}`);
    await run(cmd, args, env);
  }

  for (const [cmd, args] of optional) {
    console.log(`\n-> ${[cmd, ...args].join(" ")}`);
    try {
      await run(cmd, args, env);
    } catch (err) {
      console.warn(`  [warn] ${(err as Error).message} - continuing`);
    }
  }

  console.log(`\nDone. Seeded ${env.OPTIMIZELY_CMS_URL ?? ""}.`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
