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
const SOURCE_ID  = "quot";
const AUTH       = `Basic ${Buffer.from(`${APP_KEY}:${APP_SECRET}`).toString("base64")}`;

const QUOTES = [
  { id: 1, author: "Sarah Chen",    text: "I moved my savings to Mosey after seeing their 5.1% AER rate. The transfer took less than a day and the app makes it easy to watch my interest grow." },
  { id: 2, author: "Marcus Webb",   text: "Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer — never felt rushed." },
  { id: 3, author: "Aisha Okafor",  text: "The mobile app notifications are brilliant. I know exactly where my money is going and the spending insights helped me save an extra £200 last month." },
  { id: 4, author: "Tom Hartley",   text: "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless — invoices reconcile automatically." },
  { id: 5, author: "Priya Sharma",  text: "I had a fraud alert on my card at 2am. I called the number and got through to a real person in under a minute. Card blocked, new one dispatched, sorted." },
  { id: 6, author: "Daniel Reeves", text: "Switched from my old bank after 12 years. Mosey's CASS switch took 7 working days and every direct debit moved without any issues whatsoever." },
];

async function registerContentType(): Promise<void> {
  console.log("--- Part 1: Registering Quote content type ---");

  const body = {
    label: "Quotes",
    languages: ["en"],
    contentTypes: {
      Quote: {
        contentType: ["_Item"],
        properties: {
          author: { type: "String" },
          text:   { type: "String" },
        },
      },
    },
    preset: "next",
    useTypedFieldNames: true,
  };

  const res = await fetch(`${GRAPH_BASE}/api/content/v3/types?id=${SOURCE_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Type registration failed: ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] Quote type registered (${res.status})`);
}

async function seedQuotes(): Promise<void> {
  console.log("--- Part 2: Seeding quote items ---");

  const lines: string[] = [];
  for (const q of QUOTES) {
    lines.push(JSON.stringify({ index: { _id: q.id, language_routing: "en" } }));
    lines.push(JSON.stringify({
      _rbac: "r:Everyone:Read",
      _itemMetadata: {
        key:                      `qt-${q.id}`,
        displayName___searchable: `Quote - ${q.author}`,
        lastModified:             new Date().toISOString(),
        type:                     "Quote",
      },
      _metadata: {
        types:  ["Quote", "_Item"],
        locale: "en",
        key:    `qt-${q.id}`,
        status: "Published",
      },
      "author$$String": q.author,
      "text$$String":   q.text,
      ContentType: ["Quote"],
      Status:      "Published",
      Language:    { DisplayName: "English", Name: "en" },
    }));
  }

  const res = await fetch(`${GRAPH_BASE}/api/content/v2/data?id=${SOURCE_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "og-job-id": `seed-quotes-${Date.now()}`,
      Authorization: AUTH,
    },
    body: lines.join("\n"),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Data sync failed: ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] ${QUOTES.length} quotes synced (${res.status})`);
}

async function verifyIndexed(): Promise<void> {
  console.log("--- Part 3: Verifying indexed data (waiting 10s for Graph) ---");
  await new Promise((r) => setTimeout(r, 10000));

  const query = `
    query {
      Quote(limit: 2) {
        items { author text }
      }
    }
  `;

  const res = await fetch(GRAPH_QUERY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
    body: JSON.stringify({ query }),
  });

  const json = await res.json() as { data?: unknown; errors?: unknown };
  if (json.errors) console.warn("  [GraphQL errors]", JSON.stringify(json.errors, null, 2));
  console.log("  [indexed sample]", JSON.stringify(json.data, null, 2));
}

async function main() {
  console.log("=== Quote Seed Script ===\n");
  await registerContentType();
  await seedQuotes();
  await verifyIndexed();
  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
