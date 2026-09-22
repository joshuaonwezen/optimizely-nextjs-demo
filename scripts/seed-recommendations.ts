/**
 * Places a RecommendationBlock at the bottom of the "Insights Hub: Articles"
 * experience (/insights/articles).
 *
 * The block renders a server shell from these CMS properties and fetches the
 * personalised items in the browser from /api/personalization/recommendations, so
 * the page it sits on keeps its ISR cache entry.
 *
 * That page is an _experience, so the block goes into its COMPOSITION rather than a
 * mainContent content area. Two traps that follow from that:
 *   - POST /content/{key}/versions copies the composition but NOT the properties bag,
 *     so every existing property is read first and passed back through
 *     publishComposition({ properties }) - otherwise publishing wipes them.
 *   - routeSegment is carried on the draft too, or the CMS re-derives the URL from
 *     displayName and the page silently moves.
 *
 * Re-runnable: an existing RecommendationBlock node is dropped before the fresh one
 * is appended, so repeat runs do not stack copies.
 *
 * Run: npx tsx scripts/seed-recommendations.ts
 */

import { config } from "dotenv";
import {
  apiFetch,
  CONTENT_ENDPOINT,
  findPageKeyByUrl,
  elementComponent,
  gridSection,
  publishComposition,
  type CompNode,
} from "./_shared";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

const TARGET_URLS = [
  "/insights/articles",
  "/insights/articles/",
  "/en/insights/articles",
  "/en/insights/articles/",
];

const BLOCK_TYPE = "RecommendationBlock";

// The shared CompNode has no displaySettings field (only seed-homepage-variations.ts
// declares one, locally). Extending here keeps that shared type untouched.
type StyledNode = CompNode & {
  displaySettings?: { displayTemplate: string; settings: Record<string, string> };
};

type Version = {
  displayName?: string;
  routeSegment?: string;
  properties?: Record<string, unknown>;
  composition?: { nodes?: CompNode[] } & Record<string, unknown>;
};

async function readCurrent(key: string, locale = "en"): Promise<Version> {
  const token = await getManagementToken();
  const res = await apiFetch(`${CONTENT_ENDPOINT}/${key}/locales/${locale}?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET locales/${locale} for ${key}: ${res.status}`);
  const data = (await res.json()) as { items?: Version[] };
  const current = data.items?.[0];
  if (!current) throw new Error(`No ${locale} version found for ${key}`);
  return current;
}

/** True when this node, or anything under it, is a RecommendationBlock. */
function containsBlock(node: CompNode): boolean {
  if (node.component?.contentType === BLOCK_TYPE) return true;
  return (node.nodes ?? []).some(containsBlock);
}

async function main() {
  console.log(`=== Seeding ${BLOCK_TYPE} onto /insights/articles ===\n`);

  const pageKey = await findPageKeyByUrl(TARGET_URLS);
  if (!pageKey) {
    console.warn(
      "  [warn] Insights Hub: Articles not found in Graph - run seed-content first, then re-run"
    );
    return;
  }
  console.log(`  page key: ${pageKey}`);

  const current = await readCurrent(pageKey);
  const existingNodes = current.composition?.nodes ?? [];
  console.log(`  existing composition: ${existingNodes.length} node(s)`);

  const kept = existingNodes.filter((node) => !containsBlock(node));
  if (kept.length !== existingNodes.length) {
    console.log(`  [clean] dropped ${existingNodes.length - kept.length} node(s) from a previous run`);
  }

  // "Show why these were picked" surfaces the signal that chose the articles, which is
  // the whole point of the block in a demo. Checkbox values are the capitalised strings
  // "True"/"False" - the SDK only parses the lowercase form, hence isChecked().
  const element: StyledNode = {
    ...elementComponent(BLOCK_TYPE, "Recommended For You", {
      heading: "Recommended for you",
      subheading:
        "Chosen from the topics you have been reading. Read a few articles and this list changes.",
      limit: 3,
    }),
    displaySettings: {
      displayTemplate: "RecommendationBlockDefaultTemplate",
      settings: { showReason: "True" },
    },
  };
  const block = gridSection("Recommended For You", [element]);

  const composition = {
    ...current.composition,
    nodes: [...kept, block],
  };

  // The draft starts with NO properties, so pass the existing bag back verbatim.
  // It is already in { value: ... } form, which is what the PATCH expects.
  await publishComposition(pageKey, composition, {
    locale: "en",
    displayName: current.displayName,
    routeSegment: current.routeSegment,
    properties: current.properties ?? {},
  });

  console.log(
    `\nDone - ${BLOCK_TYPE} appended to the Insights Hub: Articles composition.` +
      ` Allow ~30-60s for Graph reindex, then reload /insights/articles.`
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
