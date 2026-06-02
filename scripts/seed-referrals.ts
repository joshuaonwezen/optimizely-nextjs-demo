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
    comment: "I moved my savings to Mosey after seeing their 5.1% AER rate. The transfer took less than a day and the app makes it easy to watch my interest grow.",
  },
  {
    id: 2,
    name: "Marcus Webb",
    comment: "Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer — never felt rushed.",
  },
  {
    id: 3,
    name: "Aisha Okafor",
    comment: "The mobile app notifications are brilliant. I know exactly where my money is going and the spending insights helped me save an extra £200 last month.",
  },
  {
    id: 4,
    name: "Tom Hartley",
    comment: "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless — invoices reconcile automatically.",
  },
  {
    id: 5,
    name: "Priya Sharma",
    comment: "I had a fraud alert on my card at 2am. I called the number and got through to a real person in under a minute. Card blocked, new one dispatched, sorted.",
  },
  {
    id: 6,
    name: "Daniel Reeves",
    comment: "Switched from my old bank after 12 years. Mosey's CASS switch took 7 working days and every direct debit moved without any issues whatsoever.",
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
    // _Item and _Metadata are globally defined contracts — no need to register them.
    // The global _Metadata (searchable:true on all fields) is what the CMS uses to
    // identify and display external items. Those fields return null in Graph queries
    // from external sources — use custom properties (name, comment) for app queries.
    contentTypes: {
      Referral: {
        contentType: ["_Item"],
        properties: {
          name:    { type: "String" },
          comment: { type: "String" },
        },
      },
    },
    preset: "next",
    useTypedFieldNames: true,
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
        key:                       `ref-${ref.id}`,
        displayName___searchable:  `Referral - ${ref.name}`,
        lastModified:              new Date().toISOString(),
        type:                      "Referral",
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
        "Content-Type": "text/plain",
        "og-job-id": `seed-referrals-${Date.now()}`,
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
