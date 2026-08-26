import { config } from "dotenv";
import {
  createContent,
  discoverRootContainer,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  uid,
  type CompNode,
} from "./_shared";

config({ path: ".env.local" });

let CONTAINER = "";

// Fixed keys so re-seeds 409-skip cleanly instead of duplicating (same idea as
// the SiteSettings/FAQ singletons). Generated once, then hard-coded here.
const BLOGS_HUB_KEY = "b1049a5f7c6d4e0a9f2b1c3d4e5f6a70";

interface BlogDef {
  key: string;
  routeSegment: string;
  displayName: string;
  heading: string;
  subheading: string;
  publishedDate: string; // ISO 8601
}

// Six blog posts. They share one hero image + author (resolved from Graph below);
// heading/subheading/date vary per page. Each is seeded with a single empty
// section the editor can fill or delete in the Visual Builder.
const BLOGS: BlogDef[] = [
  {
    key: "b1a01c000000000000000000000000a1",
    routeSegment: "smarter-saving-habits",
    displayName: "Blog — Smarter saving habits",
    heading: "Smarter saving habits that actually stick",
    subheading: "Small, automatic changes beat willpower every time. Here's where to start.",
    publishedDate: "2026-04-03T09:00:00.000Z",
  },
  {
    key: "b1a02c000000000000000000000000a2",
    routeSegment: "understanding-your-credit-score",
    displayName: "Blog — Understanding your credit score",
    heading: "Understanding your credit score",
    subheading: "What moves it, what doesn't, and the three things worth doing this month.",
    publishedDate: "2026-04-17T09:00:00.000Z",
  },
  {
    key: "b1a03c000000000000000000000000a3",
    routeSegment: "budgeting-for-a-first-home",
    displayName: "Blog — Budgeting for a first home",
    heading: "Budgeting for a first home without the stress",
    subheading: "A realistic month-by-month plan for turning a deposit goal into a moving date.",
    publishedDate: "2026-05-08T09:00:00.000Z",
  },
  {
    key: "b1a04c000000000000000000000000a4",
    routeSegment: "everyday-fraud-protection",
    displayName: "Blog — Everyday fraud protection",
    heading: "Everyday fraud protection you can set up in an hour",
    subheading: "Simple defences that stop the most common scams before they reach you.",
    publishedDate: "2026-05-29T09:00:00.000Z",
  },
  {
    key: "b1a05c000000000000000000000000a5",
    routeSegment: "making-the-most-of-a-lifetime-isa",
    displayName: "Blog — Making the most of a Lifetime ISA",
    heading: "Making the most of a Lifetime ISA",
    subheading: "How the 25% government bonus works and who it's genuinely worth it for.",
    publishedDate: "2026-06-12T09:00:00.000Z",
  },
  {
    key: "b1a06c000000000000000000000000a6",
    routeSegment: "planning-for-the-unexpected",
    displayName: "Blog — Planning for the unexpected",
    heading: "Planning for the unexpected: your emergency fund",
    subheading: "How much to keep, where to keep it, and how to rebuild it after you dip in.",
    publishedDate: "2026-06-26T09:00:00.000Z",
  },
];

/** A section shell with one empty column — an editable drop target in the Visual Builder. */
function emptySection(name: string): CompNode {
  return {
    id: uid(),
    displayName: name,
    nodeType: "section",
    layoutType: "grid",
    component: { contentType: "BlankSection", properties: {} },
    nodes: [
      {
        id: uid(),
        displayName: "Row",
        nodeType: "row",
        nodes: [{ id: uid(), displayName: "Column", nodeType: "column", nodes: [] }],
      },
    ],
  };
}

/**
 * Resolve one content key for a Graph type (e.g. an AuthorBlock or an image).
 * Polls until Graph has indexed at least one — seed-modeling creates the authors
 * just before this script runs and Graph lags ~30-60s. Returns null if none
 * appears within the timeout (blogs are still created, just missing that field).
 */
async function resolveOneKey(graphType: string, attempts = 8, delayMs = 15000): Promise<string | null> {
  const query = `query ResolveOne { ${graphType}(limit: 1) { items { _metadata { key } } } }`;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(GRAPH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
      body: JSON.stringify({ query }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        data?: Record<string, { items?: Array<{ _metadata?: { key?: string } }> }>;
      };
      const key = data.data?.[graphType]?.items?.[0]?._metadata?.key;
      if (key) return key;
    }
    if (i < attempts - 1) {
      console.log(`  [waiting] no ${graphType} indexed yet — retrying in ${delayMs / 1000}s (${i + 1}/${attempts})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

async function main(): Promise<void> {
  CONTAINER = await discoverRootContainer();

  console.log("\n--- Resolving shared references from Graph ---");
  const authorKey = await resolveOneKey("AuthorBlock");
  if (!authorKey) {
    console.warn("  [warn] No AuthorBlock indexed in Graph — run seed-modeling first, then re-run this script. Blogs will be created without an author.");
  } else {
    console.log(`  [author] ${authorKey}`);
  }

  // _Image is the Graph type for CMS images; fall back to _Media if it isn't exposed.
  let heroImageKey = await resolveOneKey("_Image", 2, 5000);
  if (!heroImageKey) heroImageKey = await resolveOneKey("_Media", 2, 5000);
  if (!heroImageKey) {
    console.warn("  [warn] No image found in Graph — blogs will be created without a hero image. Upload an image and set it per page in the Visual Builder.");
  } else {
    console.log(`  [heroImage] ${heroImageKey}`);
  }

  console.log("\n--- Creating the /blogs/ hub (empty DynamicExperience) ---");
  await createContent(
    {
      key: BLOGS_HUB_KEY,
      contentType: "DynamicExperience",
      locale: "en",
      container: CONTAINER,
      displayName: "Blogs",
      routeSegment: "blogs",
      composition: {
        id: uid(),
        displayName: "Blogs",
        nodeType: "experience",
        layoutType: "outline",
        nodes: [],
      },
    },
    "Blogs Hub",
  );
  console.log("  [created] Blogs Hub → /blogs/");

  // heroImage and author are both isRequired on BlogExperience, and the CMS
  // enforces this at POST time. Without a valid reference for each, every page
  // POST would 400 — so skip the pages (the empty hub is still useful) and tell
  // the operator what to seed/upload first. Keeps this step safe in the runner.
  if (!heroImageKey || !authorKey) {
    console.warn("  [warn] Skipping blog pages — BlogExperience requires both a hero image and an author, and one could not be resolved from Graph. Run seed-modeling (authors) and upload at least one image to this instance, then re-run.");
    console.log("\nDone. Created the /blogs/ hub only.");
    return;
  }

  console.log(`\n--- Creating ${BLOGS.length} BlogExperience pages ---`);
  let created = 0;
  for (const blog of BLOGS) {
    try {
      await createContent(
        {
          key: blog.key,
          contentType: "BlogExperience",
          locale: "en",
          container: BLOGS_HUB_KEY,
          displayName: blog.displayName,
          routeSegment: blog.routeSegment,
          properties: {
            heading: blog.heading,
            subheading: blog.subheading,
            publishedDate: blog.publishedDate,
            // heroImage is type:"contentReference" → plain cms:// string.
            heroImage: `cms://content/${heroImageKey}`,
            // author is type:"content" → object form { reference: ... } (a plain string 400s).
            author: { reference: `cms://content/${authorKey}` },
          },
          composition: {
            id: uid(),
            displayName: blog.displayName,
            nodeType: "experience",
            layoutType: "outline",
            nodes: [emptySection("Section")],
          },
        },
        blog.displayName,
      );
      console.log(`  [created] ${blog.displayName} → /blogs/${blog.routeSegment}/`);
      created++;
    } catch (err) {
      // A stale Graph index can hand back a heroImage/author key that no longer
      // exists in the CMS ("Referenced content ... does not exist"). Every page
      // shares those two refs, so the rest would fail identically — warn and stop.
      console.warn(`  [warn] ${blog.displayName}: ${(err as Error).message.slice(0, 200)}`);
      console.warn("  [warn] Stopping — the shared hero image/author reference is not accepted by this instance (likely a stale Graph result). Re-run once the referenced items exist.");
      break;
    }
  }

  console.log(`\nDone. Seeded the /blogs/ hub + ${created} blog page(s).`);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
