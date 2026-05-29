/**
 * Registers a Spotlight content type and seeds sample data via the
 * Optimizely Graph Content Source sync API.
 *
 * Uses preset "next" and the updated payload format per engineer guidance:
 *   - displayName___searchable in _itemMetadata
 *   - _metadata.types array instead of top-level ContentType
 *   - _rbac instead of RolesWithReadAccess
 *
 * Run: npx tsx scripts/seed-spotlights.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const APP_KEY    = process.env.OPTIMIZELY_APP_KEY!;
const APP_SECRET = process.env.OPTIMIZELY_APP_SECRET!;

if (!APP_KEY || !APP_SECRET) {
  console.error("Missing OPTIMIZELY_APP_KEY or OPTIMIZELY_APP_SECRET in .env.local");
  process.exit(1);
}

const SINGLE_KEY  = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";
const GRAPH_QUERY = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
const GRAPH_BASE  = "https://cg.optimizely.com";
const SOURCE_ID   = "sptl";
const AUTH        = `Basic ${Buffer.from(`${APP_KEY}:${APP_SECRET}`).toString("base64")}`;

const SPOTLIGHTS = [
  { id: 1, person: "James Hartley",   quote: "The mortgage process was seamless. Our advisor kept us informed every step of the way and we moved in three weeks ahead of schedule." },
  { id: 2, person: "Priya Nair",      quote: "Switching our business current account was easier than I expected. The relationship manager understood our cash flow needs from day one." },
  { id: 3, person: "Thomas Bakker",   quote: "The investment dashboard gives me a clear view of my portfolio without needing to call anyone. I feel genuinely in control of my savings." },
  { id: 4, person: "Sophie Andersen", quote: "I got approved for a personal loan within hours. The whole application was done on my phone and the funds were there the next morning." },
];

async function registerContentType(): Promise<void> {
  console.log("--- Part 1: Registering Spotlight content type (preset: next) ---");

  const body = {
    preset: "next",
    label: "Spotlights",
    languages: ["en"],
    contentTypes: {
      Spotlight: {
        contentType: ["_Item"],
        properties: {
          person: { type: "String" },
          quote:  { type: "String" },
        },
      },
    },
  };

  const res = await fetch(`${GRAPH_BASE}/api/content/v3/types?id=${SOURCE_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: AUTH,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Type registration failed: ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] Spotlight type registered (${res.status})`);
  console.log(`  Response: ${text.slice(0, 200)}`);
}

async function seedSpotlights(): Promise<void> {
  console.log("--- Part 2: Seeding spotlight items ---");

  const lines: string[] = [];
  for (const t of SPOTLIGHTS) {
    lines.push(JSON.stringify({ index: { _id: t.id, language_routing: "en" } }));
    lines.push(JSON.stringify({
      id:     `sptl-${t.id}`,
      person: t.person,
      quote:  t.quote,
      _itemMetadata: {
        key:                      `sptl-${t.id}`,
        "displayName___searchable": `Spotlight - ${t.person}`,
        lastModified:             new Date().toISOString(),
        type:                     "Spotlight",
      },
      _rbac: "r:Everyone:Read",
      _metadata: {
        status: "Published",
        types:  ["Spotlight", "_Item"],
      },
    }));
  }

  const res = await fetch(`${GRAPH_BASE}/api/content/v2/data?id=${SOURCE_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "og-job-id":    `seed-spotlights-${Date.now()}`,
      Authorization:  AUTH,
    },
    body: lines.join("\n"),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Data sync failed: ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] ${SPOTLIGHTS.length} spotlights synced (${res.status})`);
  console.log(`  Response: ${text.slice(0, 200)}`);
}

async function verifyIndexed(): Promise<void> {
  console.log("--- Part 3: Verifying indexed data (waiting 10s for Graph) ---");
  await new Promise((r) => setTimeout(r, 10000));

  const query = `
    query {
      Spotlight(limit: 4) {
        items {
          person
          quote
          _itemMetadata {
            key
            displayName
            lastModified
            type
          }
        }
      }
    }
  `;

  const res = await fetch(GRAPH_QUERY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `epi-single ${SINGLE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json() as { data?: unknown; errors?: unknown };
  if (json.errors) console.warn("  [GraphQL errors]", JSON.stringify(json.errors, null, 2));
  console.log("  [indexed sample]", JSON.stringify(json.data, null, 2));
}

async function main() {
  console.log("=== Spotlight Seed Script ===\n");
  await registerContentType();
  await seedSpotlights();
  await verifyIndexed();
  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
