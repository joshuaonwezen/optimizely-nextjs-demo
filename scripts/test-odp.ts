import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local
const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const host = process.env.OPTIMIZELY_ODP_API_HOST!;
const apiKey = process.env.OPTIMIZELY_ODP_API_KEY!;

async function odp<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${host}/v3/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) console.error("ODP errors:", JSON.stringify(json.errors, null, 2));
  return json.data as T;
}

// Account-level list of every audience definition and its identifier. The `name` values
// here are exactly what ODP_SEGMENT_TO_VARIATION keys (and the ODP subset filter) must use.
async function listAllAudiences() {
  const data = await odp<{ audiences?: { edges?: Array<{ node: { name: string; description?: string } }> } }>(
    `{ audiences { edges { node { name description } } } }`
  );
  const edges = data?.audiences?.edges ?? [];
  console.log(`\nAccount audiences (${edges.length}):\n`);
  for (const e of edges) console.log(`  ${e.node.name}\n      ${e.node.description ?? ""}`);
}

// Per-visitor membership. `subset` is REQUIRED by ODP - pass the audience names you care about.
// `idType` is the ODP identifier the value is looked up under. The app stitches the FX id as
// `fs_user_id` (OdpSetup) but historically queried `vuid` - pass both to compare.
async function testVisitor(userId: string, subset: string[], idType: "vuid" | "fs_user_id" = "vuid") {
  console.log(`\nMembership for ${idType} "${userId}" against [${subset.join(", ")}]:\n`);
  const data = await odp<{ customer?: { audiences?: { edges?: Array<{ node: { name: string; state: string } }> } } }>(
    `query($userId: String!, $subset: [String!]!) {
      customer(${idType}: $userId) { audiences(subset: $subset) { edges { node { name state } } } }
    }`,
    { userId, subset }
  );
  const edges = data?.customer?.audiences?.edges ?? [];
  if (!edges.length) {
    console.log(`  (no data - ${idType} unknown to ODP, or none of the subset applies)`);
    return;
  }
  for (const e of edges) console.log(`  ${e.node.name}  →  ${e.node.state}`);
  const qualified = edges.filter((e) => e.node.state === "qualified").map((e) => e.node.name);
  console.log("\n  Qualified:", qualified.length ? qualified.join(", ") : "(none)");
}

// Usage:
//   npx tsx scripts/test-odp.ts                       → list every account audience identifier
//   npx tsx scripts/test-odp.ts <id> [names...]       → test one visitor by BOTH vuid and fs_user_id
//   npx tsx scripts/test-odp.ts --vuid <id> [names]   → test only as a vuid
//   npx tsx scripts/test-odp.ts --fsid <id> [names]   → test only as an fs_user_id
//     e.g. npx tsx scripts/test-odp.ts abc-123 business_banking_customer personal_banking_customers
const args = process.argv.slice(2);
let only: "vuid" | "fs_user_id" | undefined;
if (args[0] === "--vuid") { only = "vuid"; args.shift(); }
else if (args[0] === "--fsid" || args[0] === "--fs_user_id") { only = "fs_user_id"; args.shift(); }

const [id, ...names] = args;
if (!id) {
  listAllAudiences();
} else {
  const subset = names.length ? names : ["business_banking_customer", "personal_banking_customers"];
  const run = async () => {
    if (only !== "fs_user_id") await testVisitor(id, subset, "vuid");
    if (only !== "vuid") await testVisitor(id, subset, "fs_user_id");
  };
  run();
}
