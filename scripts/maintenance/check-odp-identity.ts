/**
 * Answers one question: when the FX SDK's native ODP integration fetches segments,
 * which identifier does it send - fs_user_id or vuid?
 *
 * It matters because this app stitches the FX visitor id into ODP as fs_user_id
 * (OdpSetup.tsx), and odp.ts documents the trap: querying by vuid returns an empty
 * customer, so every audience silently resolves false.
 *
 * Method, chosen to be deterministic:
 *   1. Take the LIVE datafile and inject one ODP audience condition, so the SDK has a
 *      segment to ask about. (Without one, fetchQualifiedSegments() has nothing to
 *      fetch and never contacts ODP - the result would prove nothing.)
 *   2. Wrap global fetch to capture the exact GraphQL request the SDK sends to ODP.
 *   3. Run the same visitor through the hand-rolled odp.ts query and compare results.
 *
 * Run: npx tsx scripts/maintenance/check-odp-identity.ts [--user=<fs_user_id>] [--segment=<name>]
 */

import { config } from "dotenv";
import https from "https";
import {
  createInstance,
  createStaticProjectConfigManager,
  createForwardingEventProcessor,
  createLogger,
  createOdpManager,
  eventDispatcher,
  ERROR,
} from "@optimizely/optimizely-sdk";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const USER = arg("user") ?? "identity-check-visitor";
const SEGMENT = arg("segment") ?? "mortgage_visitors";
const SDK_KEY = process.env.OPTIMIZELY_FX_SDK_KEY;
const ODP_HOST = process.env.OPTIMIZELY_ODP_API_HOST ?? "https://api.zaius.com";
const ODP_KEY = process.env.OPTIMIZELY_ODP_API_KEY;

type Captured = { url: string; body: string; apiKey?: string; status?: number; response?: string };
const captured: Captured[] = [];

// The SDK's Node build talks to ODP through the https module, NOT global fetch (a
// fetch hook sees nothing and the check comes back falsely "inconclusive"). Patch
// https.request and collect whatever the SDK writes to ODP-bound requests.
const realFetch = globalThis.fetch;
const realRequest = https.request.bind(https);
(https as unknown as { request: typeof https.request }).request = ((...reqArgs: unknown[]) => {
  const req = (realRequest as (...a: unknown[]) => ReturnType<typeof https.request>)(...reqArgs);
  const first = reqArgs[0] as string | URL | { hostname?: string; host?: string; path?: string };
  const url =
    typeof first === "string" ? first
    : first instanceof URL ? first.href
    : `https://${first?.hostname ?? first?.host ?? ""}${first?.path ?? ""}`;
  if (/zaius|odp/i.test(url)) {
    const entry: Captured = { url, body: "" };
    const opts = (typeof first === "object" && !(first instanceof URL) ? first : reqArgs[1]) as
      | { headers?: Record<string, string> }
      | undefined;
    const headerKey = Object.entries(opts?.headers ?? {}).find(([k]) => k.toLowerCase() === "x-api-key")?.[1];
    if (headerKey) entry.apiKey = String(headerKey);
    req.on("response", (res) => {
      entry.status = res.statusCode;
      const parts: string[] = [];
      res.on("data", (d) => parts.push(String(d)));
      res.on("end", () => (entry.response = parts.join("")));
    });
    const chunks: string[] = [];
    const write = req.write.bind(req);
    req.write = ((chunk: unknown, ...rest: unknown[]) => {
      chunks.push(String(chunk));
      return (write as (...a: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof req.write;
    const end = req.end.bind(req);
    req.end = ((chunk?: unknown, ...rest: unknown[]) => {
      if (chunk && typeof chunk !== "function") chunks.push(String(chunk));
      entry.body = chunks.join("");
      captured.push(entry);
      return (end as (...a: unknown[]) => typeof req)(chunk, ...rest);
    }) as typeof req.end;
  }
  return req;
}) as typeof https.request;

async function directQuery(identifierField: string, id: string): Promise<string[] | "error"> {
  if (!ODP_KEY) return "error";
  const query = `query($id: String!, $s: [String!]!) {
    customer(${identifierField}: $id) { audiences(subset: $s) { edges { node { name state } } } }
  }`;
  const res = await realFetch(`${ODP_HOST}/v3/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ODP_KEY },
    body: JSON.stringify({ query, variables: { id, s: [SEGMENT] } }),
  });
  if (!res.ok) return "error";
  const data = (await res.json()) as {
    data?: { customer?: { audiences?: { edges?: Array<{ node: { name: string; state: string } }> } } };
  };
  return (data.data?.customer?.audiences?.edges ?? [])
    .filter((e) => e.node.state === "qualified")
    .map((e) => e.node.name);
}

async function main() {
  if (!SDK_KEY) throw new Error("OPTIMIZELY_FX_SDK_KEY missing");
  console.log(`=== ODP identity check ===`);
  console.log(`  visitor: ${USER}`);
  console.log(`  segment: ${SEGMENT}\n`);

  const datafile = await (await realFetch(`https://cdn.optimizely.com/datafiles/${SDK_KEY}.json`)).json();
  const odpIntegration = (datafile.integrations ?? []).find((i: { key: string }) => i.key === "odp");
  console.log(`  datafile ODP integration: ${odpIntegration ? `yes (${odpIntegration.host})` : "NO"}`);

  datafile.audiences = [
    ...(datafile.audiences ?? []),
    {
      id: "999000111",
      name: "identity-check (injected, not saved)",
      conditions: JSON.stringify([
        "or",
        { match: "qualified", name: "odp.audiences", type: "third_party_dimension", value: SEGMENT },
      ]),
    },
  ];

  const client = createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile: JSON.stringify(datafile) }),
    logger: createLogger({ level: ERROR }),
    eventProcessor: createForwardingEventProcessor(eventDispatcher),
    odpManager: createOdpManager({ segmentsCacheTimeout: 0, segmentsApiTimeout: 5000 }),
  });
  if (!client) throw new Error("createInstance returned null");
  await client.onReady({ timeout: 5000 }).catch(() => undefined);

  const ctx = client.createUserContext(USER);
  if (!ctx) throw new Error("createUserContext returned null");
  const ok = await ctx.fetchQualifiedSegments();
  const sdkSegments = ctx.qualifiedSegments ?? [];

  console.log(`\n-- SDK path (fetchQualifiedSegments)`);
  console.log(`  resolved: ${ok}   qualifiedSegments: ${JSON.stringify(sdkSegments)}`);

  const odpCalls = captured.filter((c) => c.url.includes("graphql"));
  console.log(`  ODP GraphQL requests captured: ${odpCalls.length}`);
  let sdkIdentifier = "unknown";
  for (const call of odpCalls) {
    const field = call.body.match(/customer\(\s*(\w+)\s*:/)?.[1];
    if (field) sdkIdentifier = field;
    console.log(`  identifier field used by SDK: ${field ?? "(not found in body)"}`);
    console.log(`  body: ${call.body.slice(0, 220)}`);
    // Only a prefix, and only to tell WHICH key it is - never print a key in full.
    const mask = (k?: string) => (k ? `${k.slice(0, 6)}... (${k.length} chars)` : "(none)");
    console.log(`  x-api-key sent by SDK: ${mask(call.apiKey)}`);
    console.log(`  datafile publicKey:    ${mask(odpIntegration?.publicKey)}`);
    console.log(`  OPTIMIZELY_ODP_API_KEY: ${mask(ODP_KEY)}`);
    console.log(`  response: HTTP ${call.status ?? "?"} ${(call.response ?? "").slice(0, 300)}`);
  }

  console.log(`\n-- Direct path (the query odp.ts runs)`);
  const byFsUserId = await directQuery("fs_user_id", USER);
  const byVuid = await directQuery("vuid", USER);
  console.log(`  customer(fs_user_id): ${JSON.stringify(byFsUserId)}`);
  console.log(`  customer(vuid):       ${JSON.stringify(byVuid)}`);

  console.log(`\n=== VERDICT ===`);
  if (odpCalls.length === 0) {
    console.log("  INCONCLUSIVE - the SDK sent no ODP request, so nothing was proven.");
  } else if (sdkIdentifier === "fs_user_id") {
    console.log("  SAFE - the SDK queries by fs_user_id, the same identifier OdpSetup stitches.");
  } else if (sdkIdentifier === "vuid") {
    console.log("  TRAP CONFIRMED - the SDK queries by vuid; our visitors live under fs_user_id.");
  } else {
    console.log(`  UNEXPECTED identifier "${sdkIdentifier}" - inspect the captured body above.`);
  }
  const agree = JSON.stringify([...sdkSegments].sort()) === JSON.stringify(
    Array.isArray(byFsUserId) ? [...byFsUserId].sort() : byFsUserId
  );
  console.log(`  SDK result ${agree ? "MATCHES" : "DIFFERS FROM"} the direct fs_user_id query.`);

  await client.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
