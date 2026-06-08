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

const SEGMENT_QUERY = `
  query GetSegments($userId: String!, $segmentFilter: [String!]!) {
    customer(vuid: $userId) {
      audiences(subset: $segmentFilter) {
        edges { node { name state } }
      }
    }
  }
`;

async function test(userId: string, segmentFilter: string[]) {
  console.log(`\nQuerying ODP for userId: ${userId}`);
  console.log("Subset:", segmentFilter);
  const res = await fetch(`${host}/v3/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ query: SEGMENT_QUERY, variables: { userId, segmentFilter } }),
  });
  console.log("Status:", res.status);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
  const qualified: string[] = (json.data?.customer?.audiences?.edges ?? [])
    .filter((e: { node: { state: string } }) => e.node.state === "qualified")
    .map((e: { node: { name: string } }) => e.node.name);
  console.log("Qualified segments:", qualified.length ? qualified : "(none)");
}

// Replace USER_ID with a real vuid from your ODP account (check ODP → People or use the optimizelyEndUserId cookie)
// Replace segment names with real segment names from your ODP account
test("test-visitor-123", ["has_email", "opted_in"]);
