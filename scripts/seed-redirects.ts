/**
 * Redirect seeding script — creates:
 *   1. A handful of example RedirectRule blocks (vanity / renamed / prefix /
 *      external), each a shared block with a fixed key
 *   2. A RedirectConfig singleton ("Redirect Config") referencing all of them
 *
 * Middleware (src/middleware.ts) reads these via /api/redirects and issues the
 * redirect before the page router runs, so they work for still-published pages
 * (vanity URLs) as well as 404 recovery.
 *
 * Prerequisites:
 *   - `npm run opti:push` must have run (RedirectRule / RedirectConfig registered)
 *
 * No Graph lookups — safe to run immediately after the type push.
 *
 * Run: npx tsx scripts/seed-redirects.ts
 */

import { config } from "dotenv";
import { createContent, ensureSubfolder, sweepSeededBlocks } from "./_shared";

config({ path: ".env.local" });

// Singleton — fixed key after SiteSettings (0001) / SiteBanner (0002).
const CONFIG_KEY = "5e770000000000000000000000000003";

interface SeedRule {
  key: string;
  name: string;
  props: {
    fromPath: string;
    toPath: string;
    permanent: boolean;
    matchSubpaths: boolean;
    enabled: boolean;
    note: string;
  };
}

const RULES: SeedRule[] = [
  {
    key: "5e770000000000000000000000000031",
    name: "Redirect: /savings-accounts",
    props: {
      fromPath: "/savings-accounts",
      toPath: "/personal/savings",
      permanent: true,
      matchSubpaths: false,
      enabled: true,
      note: "Vanity URL. The destination page is still published — proves the check beats the router.",
    },
  },
  {
    key: "5e770000000000000000000000000032",
    name: "Redirect: /old-current-account",
    props: {
      fromPath: "/old-current-account",
      toPath: "/personal/current-account",
      permanent: true,
      matchSubpaths: false,
      enabled: true,
      note: "404 recovery: the page was renamed.",
    },
  },
  {
    key: "5e770000000000000000000000000033",
    name: "Redirect: /promo (and everything under it)",
    props: {
      fromPath: "/promo",
      toPath: "/offers",
      permanent: false,
      matchSubpaths: true,
      enabled: true,
      note: "Temporary campaign section move. /promo/summer-2026 -> /offers/summer-2026.",
    },
  },
  {
    key: "5e770000000000000000000000000034",
    name: "Redirect: /status",
    props: {
      fromPath: "/status",
      toPath: "https://status.mosey.example",
      permanent: false,
      matchSubpaths: false,
      enabled: true,
      note: "External status page.",
    },
  },
];

async function main() {
  console.log("=== Redirect Seeding Script ===\n");

  console.log("--- Discovering shared-blocks container ---");
  const container = await ensureSubfolder("redirects");
  console.log(`  blocks container (For All Applications): ${container}`);

  console.log("--- Cleaning up our RedirectConfig / RedirectRule blocks ---");
  await sweepSeededBlocks(
    ["RedirectConfig", "RedirectRule"],
    ["Redirect Config", ...RULES.map((r) => r.name)]
  );
  await new Promise((r) => setTimeout(r, 3000));

  console.log("--- Creating RedirectRule blocks ---");
  for (const rule of RULES) {
    await createContent(
      {
        key: rule.key,
        contentType: "RedirectRule",
        container,
        locale: "en",
        displayName: rule.name,
        properties: rule.props,
      },
      rule.name
    );
    console.log(`  [rule] ${rule.props.fromPath} -> ${rule.props.toPath}`);
  }

  console.log("--- Creating RedirectConfig singleton ---");
  await createContent(
    {
      key: CONFIG_KEY,
      contentType: "RedirectConfig",
      container,
      locale: "en",
      displayName: "Redirect Config",
      properties: {
        notes: "One row per redirect. Permanent = 308, leave off for a temporary 307.",
        rules: RULES.map((r) => ({ reference: `cms://content/${r.key}` })),
      },
    },
    "Redirect Config"
  );
  console.log(`  [config] Created "Redirect Config" (key ${CONFIG_KEY})`);

  console.log("\n=== Done ===");
  console.log("Wait ~30-60 s for Graph to index, then: curl -sI <host>/savings-accounts");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
