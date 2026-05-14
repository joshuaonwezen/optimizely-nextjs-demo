/**
 * Registers the Referral content type and seeds sample data via the
 * Optimizely Graph Content Source sync API.
 *
 * This API is separate from the CMS Management API — it pushes data
 * directly into Optimizely Graph without going through the CMS.
 *
 * Run: npx tsx scripts/seed-referrals.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";
const GRAPH_QUERY = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";

const APP_KEY    = process.env.OPTIMIZELY_APP_KEY!;
const APP_SECRET = process.env.OPTIMIZELY_APP_SECRET!;

if (!APP_KEY || !APP_SECRET) {
  console.error("Missing OPTIMIZELY_APP_KEY or OPTIMIZELY_APP_SECRET in .env.local");
  process.exit(1);
}

const GRAPH_BASE = "https://cg.optimizely.com";
const SOURCE_ID  = "rfl";
const AUTH       = `Basic ${Buffer.from(`${APP_KEY}:${APP_SECRET}`).toString("base64")}`;

// ---------------------------------------------------------------------------
// Sample referral data
// ---------------------------------------------------------------------------

const REFERRALS = [
  {
    id: 1,
    name: "Sarah Chen",
    comment: "Switched our content team from Contentful to Optimizely SaaS CMS. The Visual Builder makes it trivial for editors to create new pages without any engineer support.",
  },
  {
    id: 2,
    name: "Marcus Webb",
    comment: "The @recursive GraphQL directive saved us three days of nav implementation work. Fetches 5 levels of nested content in a single round-trip.",
  },
  {
    id: 3,
    name: "Aisha Okafor",
    comment: "Optimizely Graph's ISR plus on-demand revalidation gives us the best of both worlds — fast static pages that update the moment editors publish.",
  },
  {
    id: 4,
    name: "Tom Hartley",
    comment: "We migrated our product catalog to the Graph Content Source API. Data syncs from our PIM in real-time and is immediately queryable via GraphQL.",
  },
  {
    id: 5,
    name: "Priya Sharma",
    comment: "Feature Experimentation and CMS in one platform is a genuine game changer. We A/B test content variations without ever leaving the same toolchain.",
  },
  {
    id: 6,
    name: "Daniel Reeves",
    comment: "Preview mode was clean to implement. Pass a previewToken, swap to no-store caching, and editors see unpublished changes instantly in the live app.",
  },
];

// ---------------------------------------------------------------------------
// Part 1 — Register the Referral content type
// ---------------------------------------------------------------------------

async function registerContentType(): Promise<void> {
  console.log("--- Part 1: Registering Referral content type ---");

  const body = {
    label: "Referrals",
    languages: ["en"],
    // _Metadata and _Item mirror the global platform contracts.
    // Defining them here makes Referral's _itemMetadata field resolvable in Graph.
    propertyTypes: {
      _Metadata: {
        helpText: "The base metadata type for items.",
        properties: {
          key:          { type: "String",   searchable: false, index: true },
          displayName:  { type: "String",   searchable: false, index: true },
          lastModified: { type: "DateTime", searchable: false, index: true },
          type:         { type: "String",   searchable: false, index: true },
        },
      },
    },
    contentTypes: {
      _Item: {
        abstract: true,
        helpText: "The base type for all Item types.",
        contentType: [],
        properties: {
          _itemMetadata: { type: "_Metadata", searchable: false, index: true },
        },
      },
      Referral: {
        contentType: ["_Item"],
        properties: {
          name:    { type: "String" },
          comment: { type: "String" },
        },
      },
    },
  };

  const res = await fetch(
    `${GRAPH_BASE}/api/content/v3/types?id=${SOURCE_ID}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTH,
      },
      body: JSON.stringify(body),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Type registration failed: ${res.status} ${text.slice(0, 300)}`);
  }
  console.log(`  [ok] Referral type registered (${res.status})`);
}

// ---------------------------------------------------------------------------
// Part 2 — Seed content items (NdJSON format)
// ---------------------------------------------------------------------------

async function seedReferrals(): Promise<void> {
  console.log("--- Part 2: Seeding referral items ---");

  const lines: string[] = [];
  for (const ref of REFERRALS) {
    lines.push(JSON.stringify({ index: { _id: ref.id, language_routing: "en" } }));
    lines.push(JSON.stringify({
      Id:      `ref-${ref.id}`,
      Name:    `Referral - ${ref.name}`,
      _itemMetadata: {
        key:          `ref-${ref.id}`,
        displayName:  `Referral - ${ref.name}`,
        lastModified: new Date().toISOString(),
        type:         "Referral",
      },
      name:               ref.name,
      comment:            ref.comment,
      ContentType:        ["Referral"],
      Status:             "Published",
      Language:           { DisplayName: "English", Name: "en" },
      RolesWithReadAccess: "Everyone",
    }));
  }

  const ndjson = lines.join("\n");

  const res = await fetch(
    `${GRAPH_BASE}/api/content/v2/data?id=${SOURCE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-ndjson",
        Authorization: AUTH,
      },
      body: ndjson,
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Data sync failed: ${res.status} ${text.slice(0, 300)}`);
  }
  console.log(`  [ok] ${REFERRALS.length} referrals synced (${res.status})`);
  console.log(`  Response: ${text.slice(0, 200)}`);
}

// ---------------------------------------------------------------------------
// Part 3 — Verify what Graph actually indexed
// ---------------------------------------------------------------------------

async function verifyIndexed(): Promise<void> {
  console.log("--- Part 3: Verifying indexed data (waiting 10s for Graph) ---");
  await new Promise((r) => setTimeout(r, 10000));

  const query = `
    query {
      Referral(limit: 2) {
        items {
          name
          comment
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
      Authorization: `epi-single ${SINGLE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json() as { data?: unknown; errors?: unknown };
  if (json.errors) {
    console.warn("  [GraphQL errors]", JSON.stringify(json.errors, null, 2));
  }
  console.log("  [indexed sample]", JSON.stringify(json.data, null, 2));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Referral Seed Script ===\n");
  await registerContentType();
  await seedReferrals();
  await verifyIndexed();
  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
