/**
 * Seeds the "Product Landing" demo page (ProductLandingExperience) at
 * /product-landing. The type has three stacked compositions:
 *   - topComposition: HeroBlock + a BlankSection grid (sub-hero feature items)
 *   - middleComposition: open, one starter section editors can add to
 *   - composition (built-in): ArticleListBlock + FaqContainerBlock (shared FAQ items),
 *     restricted by the type-level composition config
 *
 * Extra composition properties are written through v1 as `{ value: <node tree> }`
 * in `properties`, the same node shape as the built-in `composition`.
 *
 * Personal instance only for now (guarded by isPersonalInstance) - not part of seed-runner.
 * Run: npx tsx scripts/seed-product-landing.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getManagementToken } from "../src/lib/optimizely/auth";
import {
  API_BASE,
  CONTENT_ENDPOINT,
  apiFetch,
  contentKeyExists,
  createContent,
  discoverRootContainer,
  elementComponent,
  gridSection,
  isApprovalRequired,
  rootComponent,
  sectionComponent,
  stableKey,
  uid,
  type CompNode,
} from "./_shared";
import { FAQ_ITEMS } from "./faq-data";
import { isPersonalInstance } from "../src/lib/optimizely/personalInstance";

const TYPE_KEY = "ProductLandingExperience";
const ROUTE = "product-landing";
// "/v3": each reshuffle of the composition properties needs the page deleted
// first, and a permanently deleted key stays reserved (POST 409, GET 404).
const PAGE_KEY = stableKey("productlanding", `/${ROUTE}/v3`);

function outline(displayName: string, nodes: CompNode[]) {
  return { id: uid(), displayName, nodeType: "experience", layoutType: "outline", nodes };
}

function topComposition() {
  return outline("Top", [
    rootComponent("HeroBlock", "Product Hero", {
      headline: "The Mosey Everyday Account",
      subheadline: "A fee-free current account with instant notifications, savings pots and 24/7 support.",
    }),
    gridSection("Sub-hero grid", [
      elementComponent("FeatureItemBlock", "No monthly fees", {
        title: "No monthly fees",
        description: "Keep every penny. No account fees, no minimum balance.",
      }),
      elementComponent("FeatureItemBlock", "Instant notifications", {
        title: "Instant notifications",
        description: "See every payment the moment it happens.",
      }),
      elementComponent("FeatureItemBlock", "Savings pots", {
        title: "Savings pots",
        description: "Set money aside for the things that matter, with round-ups.",
      }),
    ]),
  ]);
}

function middleComposition() {
  return outline("Middle", [
    sectionComponent("SectionHeadingBlock", "Why Mosey", {
      heading: "Banking that works around you",
      subheading: "This area is open - add any section or block in Visual Builder.",
    }),
  ]);
}

function bottomComposition() {
  return outline("Composition", [
    rootComponent("ArticleListBlock", "Related articles", {
      heading: "Related reading",
      subheading: "Guides and insights to get more from your account.",
      category: "personal-finance",
      limit: 3,
      layout: "grid",
    }),
    rootComponent("FaqContainerBlock", "Account FAQs", {
      heading: "Frequently asked questions",
      subheading: "Quick answers about the Everyday Account.",
      faqItems: FAQ_ITEMS.slice(0, 4).map((f) => ({ reference: `cms://content/${f.key}` })),
    }),
  ]);
}

async function call(method: string, url: string, body?: unknown, contentType = "application/json") {
  const token = await getManagementToken();
  const res = await apiFetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

// Returns a draft version to write into: the new item's first version, or a
// fresh draft on an existing item (its properties are fully rewritten below,
// so POST /versions not copying them is fine here).
async function draftVersion(container: string): Promise<string> {
  if (await contentKeyExists(PAGE_KEY)) {
    const r = await call("POST", `${CONTENT_ENDPOINT}/${PAGE_KEY}/versions?locale=en`, { displayName: "Product Landing", routeSegment: ROUTE });
    if (r.status >= 300) throw new Error(`create draft: ${r.status} ${r.text}`);
    const created = r.text.trim() ? JSON.parse(r.text) : null;
    if (created?.version) return created.version as string;
  } else {
    await createContent(
      { key: PAGE_KEY, contentType: TYPE_KEY, container, locale: "en", displayName: "Product Landing", routeSegment: ROUTE },
      "Product Landing",
      { skipPublish: true }
    );
  }
  const list = await call("GET", `${CONTENT_ENDPOINT}/${PAGE_KEY}/versions?pageSize=1`);
  const version = list.status < 300 ? JSON.parse(list.text).items?.[0]?.version : undefined;
  if (!version) throw new Error(`No version for ${PAGE_KEY} (${list.status}) - the key may be reserved by a deleted item.`);
  return version as string;
}

async function main() {
  console.log("=== Seeding Product Landing page ===\n");

  if (!isPersonalInstance()) {
    console.warn("  [skip] Product Landing is personal-instance only for now; OPTIMIZELY_CMS_URL points elsewhere.");
    return;
  }

  const typeRes = await call("GET", `${API_BASE}/v1/contenttypes/${TYPE_KEY}`);
  if (typeRes.status === 404) {
    console.warn(`  [warn] ${TYPE_KEY} is not on this instance - run opti:push first. Skipping.`);
    return;
  }

  const container = await discoverRootContainer();
  const version = await draftVersion(container);
  console.log(`  page key: ${PAGE_KEY}, draft version: ${version}`);

  const patch = await call(
    "PATCH",
    `${CONTENT_ENDPOINT}/${PAGE_KEY}/versions/${version}`,
    {
      displayName: "Product Landing",
      routeSegment: ROUTE,
      composition: bottomComposition(),
      properties: {
        metaTitle: { value: "The Mosey Everyday Account" },
        metaDescription: { value: "A fee-free current account with instant notifications and savings pots." },
        topComposition: { value: topComposition() },
        middleComposition: { value: middleComposition() },
      },
    },
    "application/merge-patch+json"
  );
  if (patch.status >= 300) throw new Error(`PATCH version ${version}: ${patch.status} ${patch.text}`);
  console.log("  [patched] top, middle and bottom (built-in) compositions + SEO fields");

  const pub = await call("POST", `${CONTENT_ENDPOINT}/${PAGE_KEY}/versions/${version}:publish`);
  if (isApprovalRequired(pub.status, pub.text)) {
    console.log("  [skipped-publish] approval workflow requires review; left as draft");
  } else if (pub.status >= 300) {
    throw new Error(`publish: ${pub.status} ${pub.text}`);
  } else {
    console.log("  [published]");
  }

  console.log(`\nDone. Allow ~30-60s for Graph, then visit /en/${ROUTE}/`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
