import { config } from "dotenv";
import { createContent, discoverGlobalRoot } from "./_shared";
import { QUOTE_CARDS } from "./quote-card-data";

config({ path: ".env.local" });

// QuoteBlock shared blocks backing the homepage CustomerVoicesBlock content area
// ("What our customers say"). Stable keys make re-runs idempotent.

async function main() {
  console.log("=== seed-quote-blocks.ts ===\n");

  const container = await discoverGlobalRoot();
  console.log(`  Creating ${QUOTE_CARDS.length} QuoteBlock shared blocks under ${container}\n`);

  for (const card of QUOTE_CARDS) {
    await createContent(
      {
        key: card.key,
        contentType: "QuoteBlock",
        container,
        locale: "en",
        displayName: `Quote - ${card.author}`,
        properties: {
          author: card.author,
          role:   card.role ?? "",
          text:   card.text,
        },
      },
      `Quote - ${card.author}`,
    );
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
