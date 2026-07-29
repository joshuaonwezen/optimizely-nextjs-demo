import { seedExternalSource, type ExternalRecord } from "./_contentSource";

// External "Quote" content source (id `quot`, fields author + text), seeded via
// the Content Source API. Uses the shared helper so a corrupted `quot` mapping
// (200-but-0-indexed) self-heals via delete + re-register.
const QUOTES = [
  { id: 1, author: "Sarah Chen",    text: "I moved my savings to Mosey after seeing their 5.1% AER rate. The transfer took less than a day and the app makes it easy to watch my interest grow." },
  { id: 2, author: "Marcus Webb",   text: "Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer - never felt rushed." },
  { id: 3, author: "Aisha Okafor",  text: "The mobile app notifications are brilliant. I know exactly where my money is going and the spending insights helped me save an extra £200 last month." },
  { id: 4, author: "Tom Hartley",   text: "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless - invoices reconcile automatically." },
  { id: 5, author: "Priya Sharma",  text: "I had a fraud alert on my card at 2am. I called the number and got through to a real person in under a minute. Card blocked, new one dispatched, sorted." },
  { id: 6, author: "Daniel Reeves", text: "Switched from my old bank after 12 years. Mosey's CASS switch took 7 working days and every direct debit moved without any issues whatsoever." },
];

async function main() {
  console.log("=== Quote Seed Script ===\n");
  const records: ExternalRecord[] = QUOTES.map((q) => ({
    id: q.id,
    key: `qt-${q.id}`,
    displayName: `Quote - ${q.author}`,
    fields: { "author$$String": q.author, "text$$String": q.text },
  }));

  const { indexed } = await seedExternalSource({
    sourceId: "quot",
    label: "Quotes",
    typeName: "Quote",
    properties: { author: { type: "String" }, text: { type: "String" } },
    records,
  });

  console.log(`\n=== Done (indexed ${indexed}) ===`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
