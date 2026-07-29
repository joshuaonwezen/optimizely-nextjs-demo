import { config } from "dotenv";
import { createContent, discoverGlobalRoot } from "./_shared";
import { QUOTE_CARDS, SPOTLIGHT_CARDS, type QuoteCard } from "./quote-card-data";

config({ path: ".env.local" });

// QuoteBlock shared blocks backing the two homepage CustomerVoicesBlock content
// areas: QUOTE_CARDS ("What our customers say") and SPOTLIGHT_CARDS ("Customer
// spotlights"). Spotlights reuse the QuoteBlock type (person -> author, quote ->
// text, no role). Stable keys make re-runs idempotent.
const CARDS: { card: QuoteCard; label: string }[] = [
  ...QUOTE_CARDS.map((card) => ({ card, label: "Quote" })),
  ...SPOTLIGHT_CARDS.map((card) => ({ card, label: "Spotlight" })),
];

async function main() {
  console.log("=== seed-quote-blocks.ts ===\n");

  const container = await discoverGlobalRoot();
  console.log(`  Creating ${CARDS.length} QuoteBlock shared blocks under ${container}\n`);

  for (const { card, label } of CARDS) {
    await createContent(
      {
        key: card.key,
        contentType: "QuoteBlock",
        container,
        locale: "en",
        displayName: `${label} - ${card.author}`,
        properties: {
          author: card.author,
          role:   card.role ?? "",
          text:   card.text,
        },
      },
      `${label} - ${card.author}`,
    );
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
