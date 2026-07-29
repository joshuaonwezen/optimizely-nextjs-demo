import { seedExternalSource, type ExternalRecord } from "./_contentSource";

// External "Spotlight" content source (id `sptl`, fields person + quote).
// Featured-customer spotlights, seeded via the Content Source API.
const SPOTLIGHTS = [
  { person: "Elena Ruiz",     quote: "Mosey helped me buy my first flat at 26. The adviser broke every step down so I actually understood my mortgage - not just signed it." },
  { person: "Jamal Osei",     quote: "I run a small design studio. Mosey's business account and instant invoicing mean I finally spend evenings designing instead of doing admin." },
  { person: "Fen Li",         quote: "After moving countries twice, Mosey was the first bank that made cross-border transfers feel simple and transparent." },
  { person: "Grace Adeyemi",  quote: "The savings goals feature nudged me into an emergency fund without thinking about it. I hit six months of expenses this year." },
  { person: "Noah Bergström",  quote: "When my card was cloned abroad, the fraud team called me before I even noticed. New card waiting at my hotel the next morning." },
  { person: "Priya Nair",     quote: "As a freelancer my income is lumpy. Mosey's spending insights smooth it out so I always know what's safe to spend." },
];

async function main() {
  console.log("=== Spotlight Seed Script ===\n");
  const records: ExternalRecord[] = SPOTLIGHTS.map((s, i) => ({
    id: i + 1,
    key: `sp-${i + 1}`,
    displayName: `Spotlight - ${s.person}`,
    fields: { "person$$String": s.person, "quote$$String": s.quote },
  }));

  const { indexed } = await seedExternalSource({
    sourceId: "sptl",
    label: "Spotlights",
    typeName: "Spotlight",
    properties: { person: { type: "String" }, quote: { type: "String" } },
    records,
  });

  console.log(`\n=== Done (indexed ${indexed}) ===`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
