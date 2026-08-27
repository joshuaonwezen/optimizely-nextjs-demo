import { config } from "dotenv";
import { readFileSync } from "fs";
import {
  API_BASE,
  CONTENT_ENDPOINT,
  createContent,
  discoverRootContainer,
  elementComponent,
  getManagementToken,
  GRAPH_ENDPOINT,
  gridSection,
  SINGLE_KEY,
  uid,
  wrapProps,
} from "./_shared";

config({ path: ".env.local" });

let CONTAINER = "";

// Fixed keys so re-seeds 409-skip cleanly instead of duplicating (same idea as
// the SiteSettings/FAQ singletons). Generated once, then hard-coded here.
const BLOGS_HUB_KEY = "b1049a5f7c6d4e0a9f2b1c3d4e5f6a70";

// The shared hero image, uploaded to every instance under this fixed content key
// so one `cms://content/{key}` reference works across all of them. The image file
// ships in the repo; ensureHeroImage() uploads it if the instance doesn't have it.
const HERO_IMAGE_KEY = "b10a55e7000000000000000000000001";
const HERO_IMAGE_FILE = "public/demo/optimizely_logo.png";
const HERO_IMAGE_REF = `cms://content/${HERO_IMAGE_KEY}`;
// "For All Applications" global assets folder - the same well-known key on every
// instance; existing media live here too.
const GLOBAL_ASSETS_FOLDER = "e56f85d0e8334e02976a2d11fe4d598c";

interface BlogDef {
  key: string;
  routeSegment: string;
  displayName: string;
  heading: string;
  subheading: string;
  publishedDate: string; // ISO 8601
}

// Six blog posts. They share one hero image + author (the image below, the author
// resolved from Graph); heading/subheading/date vary per page. Each is seeded with
// a section containing a rich-text (TextBlock) element the editor can edit, plus
// room to add more elements/sections in the Visual Builder.
const BLOGS: BlogDef[] = [
  {
    key: "b1a01c000000000000000000000000a1",
    routeSegment: "smarter-saving-habits",
    displayName: "Blog - Smarter saving habits",
    heading: "Smarter saving habits that actually stick",
    subheading: "Small, automatic changes beat willpower every time. Here's where to start.",
    publishedDate: "2026-04-03T09:00:00.000Z",
  },
  {
    key: "b1a02c000000000000000000000000a2",
    routeSegment: "understanding-your-credit-score",
    displayName: "Blog - Understanding your credit score",
    heading: "Understanding your credit score",
    subheading: "What moves it, what doesn't, and the three things worth doing this month.",
    publishedDate: "2026-04-17T09:00:00.000Z",
  },
  {
    key: "b1a03c000000000000000000000000a3",
    routeSegment: "budgeting-for-a-first-home",
    displayName: "Blog - Budgeting for a first home",
    heading: "Budgeting for a first home without the stress",
    subheading: "A realistic month-by-month plan for turning a deposit goal into a moving date.",
    publishedDate: "2026-05-08T09:00:00.000Z",
  },
  {
    key: "b1a04c000000000000000000000000a4",
    routeSegment: "everyday-fraud-protection",
    displayName: "Blog - Everyday fraud protection",
    heading: "Everyday fraud protection you can set up in an hour",
    subheading: "Simple defences that stop the most common scams before they reach you.",
    publishedDate: "2026-05-29T09:00:00.000Z",
  },
  {
    key: "b1a05c000000000000000000000000a5",
    routeSegment: "making-the-most-of-a-lifetime-isa",
    displayName: "Blog - Making the most of a Lifetime ISA",
    heading: "Making the most of a Lifetime ISA",
    subheading: "How the 25% government bonus works and who it's genuinely worth it for.",
    publishedDate: "2026-06-12T09:00:00.000Z",
  },
  {
    key: "b1a06c000000000000000000000000a6",
    routeSegment: "planning-for-the-unexpected",
    displayName: "Blog - Planning for the unexpected",
    heading: "Planning for the unexpected: your emergency fund",
    subheading: "How much to keep, where to keep it, and how to rebuild it after you dip in.",
    publishedDate: "2026-06-26T09:00:00.000Z",
  },
];

/** Starter body copy for the blog's rich-text element. */
function starterBodyHtml(blog: BlogDef): string {
  return [
    `<p>${blog.subheading}</p>`,
    "<p>This is a starter rich-text area. Edit it in the Visual Builder, or add more elements and sections around it.</p>",
  ].join("");
}

/**
 * The blog composition: one grid section whose row/column holds a rich-text
 * (TextBlock) element. gridSection builds section → row → column → element.
 */
function blogComposition(blog: BlogDef) {
  const section = gridSection("Section", [
    elementComponent("TextBlock", "Rich Text", { body: { html: starterBodyHtml(blog) } }),
  ]);
  return {
    id: uid(),
    displayName: blog.displayName,
    nodeType: "experience",
    layoutType: "outline",
    nodes: [section],
  };
}

/**
 * Resolve an AuthorBlock key that actually exists in the CMS. Graph can keep a
 * deleted author lingering as a stale doc, so a bare limit:1 query may hand back
 * a ghost key that 400s on use (seen on re-seeded instances). We fetch several
 * candidates and return the first one the Management API confirms exists. Polls
 * to cover the ~30-60s indexing lag after seed-modeling creates the authors.
 */
async function resolveAuthorKey(attempts = 8, delayMs = 15000): Promise<string | null> {
  const token = await getManagementToken();
  const query = `query { AuthorBlock(limit: 25) { items { _metadata { key } } } }`;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(GRAPH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `epi-single ${SINGLE_KEY}` },
      body: JSON.stringify({ query }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        data?: { AuthorBlock?: { items?: Array<{ _metadata?: { key?: string } }> } };
      };
      const keys = (data.data?.AuthorBlock?.items ?? []).map((x) => x._metadata?.key).filter(Boolean) as string[];
      for (const key of keys) {
        const chk = await fetch(`${CONTENT_ENDPOINT}/${key}`, { headers: { Authorization: `Bearer ${token}` } });
        if (chk.ok) return key; // exists in the CMS - not a stale Graph doc
      }
    }
    if (i < attempts - 1) {
      console.log(`  [waiting] no live AuthorBlock indexed yet - retrying in ${delayMs / 1000}s (${i + 1}/${attempts})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

/** Pick an `_image` content type on this instance (ImageMedia is the built-in default). */
async function pickImageContentType(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/v1/contenttypes?pageSize=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: Array<{ key: string; baseType?: string }> };
  const imageTypes = (data.items ?? []).filter((t) => t.baseType === "_image").map((t) => t.key);
  return imageTypes.find((k) => k === "ImageMedia") ?? imageTypes.find((k) => k === "imageCustom") ?? imageTypes[0] ?? null;
}

/**
 * Upload the shared hero image under the fixed key if this instance doesn't have
 * it yet. Media is created with a single multipart POST (a JSON `content` part +
 * the binary `file` part) - the SaaS CMS REST API's only media path - then the
 * draft version is published. Idempotent: the fixed key 409-skips on re-run.
 */
async function ensureHeroImage(): Promise<boolean> {
  const token = await getManagementToken();

  const existing = await fetch(`${CONTENT_ENDPOINT}/${HERO_IMAGE_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (existing.ok) {
    console.log(`  [heroImage] already present (${HERO_IMAGE_KEY})`);
    return true;
  }

  const contentType = await pickImageContentType(token);
  if (!contentType) {
    console.warn("  [warn] No _image content type on this instance - cannot upload the hero image.");
    return false;
  }

  const buf = readFileSync(HERO_IMAGE_FILE);
  const form = new FormData();
  form.append(
    "content",
    new Blob(
      [
        JSON.stringify({
          key: HERO_IMAGE_KEY,
          contentType,
          container: GLOBAL_ASSETS_FOLDER,
          initialVersion: { displayName: "Optimizely Logo (blog hero)" },
        }),
      ],
      { type: "application/json" },
    ),
  );
  form.append("file", new Blob([new Uint8Array(buf)], { type: "image/png" }), "optimizely_logo.png");

  const up = await fetch(CONTENT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!up.ok) {
    if (up.status === 409) {
      console.log(`  [heroImage] already present (${HERO_IMAGE_KEY})`);
      return true;
    }
    console.warn(`  [warn] hero image upload failed: ${up.status} ${(await up.text()).slice(0, 200)}`);
    return false;
  }

  // Publish the freshly-created draft so the reference resolves as published content.
  const vRes = await fetch(`${CONTENT_ENDPOINT}/${HERO_IMAGE_KEY}/versions?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const version = ((await vRes.json()) as { items?: Array<{ version?: string }> }).items?.[0]?.version;
  if (version) {
    const pub = await fetch(`${CONTENT_ENDPOINT}/${HERO_IMAGE_KEY}/versions/${version}:publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!pub.ok) console.warn(`  [warn] publish hero image: ${pub.status} (may need approval; left as draft)`);
  }
  console.log(`  [heroImage] uploaded + published as ${contentType} (${HERO_IMAGE_KEY})`);
  return true;
}

/**
 * Repoint an already-existing blog page to the shared hero image + rich-text
 * section. A blog page has required fields, so POST /versions must carry a
 * *complete* new version (all required properties) rather than a blank draft;
 * the composition is sent too so existing pages pick up the rich-text element.
 */
async function updateBlogVersion(blog: BlogDef, authorKey: string, composition: unknown): Promise<void> {
  const token = await getManagementToken();
  const createRes = await fetch(`${CONTENT_ENDPOINT}/${blog.key}/versions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      locale: "en",
      displayName: blog.displayName,
      routeSegment: blog.routeSegment,
      properties: wrapProps({
        heading: blog.heading,
        subheading: blog.subheading,
        publishedDate: blog.publishedDate,
        heroImage: HERO_IMAGE_REF,
        author: { reference: `cms://content/${authorKey}` },
      }),
      composition,
    }),
  });
  if (!createRes.ok) {
    throw new Error(`create version ${blog.key}: ${createRes.status} ${(await createRes.text()).slice(0, 200)}`);
  }
  const vd = (await (
    await fetch(`${CONTENT_ENDPOINT}/${blog.key}/locales/en?pageSize=30`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { items?: Array<{ version?: string; status?: string }> };
  const version = (vd.items ?? [])
    .filter((i) => i.status === "draft" && i.version)
    .sort((a, b) => Number(b.version) - Number(a.version))[0]?.version;
  if (!version) throw new Error(`no draft version for ${blog.key}`);
  const pub = await fetch(`${CONTENT_ENDPOINT}/${blog.key}/versions/${version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pub.ok) console.warn(`  [warn] republish ${blog.key}: ${pub.status} (may need approval; left as draft)`);
}

async function main(): Promise<void> {
  CONTAINER = await discoverRootContainer();

  console.log("\n--- Ensuring the shared hero image is uploaded ---");
  const haveImage = await ensureHeroImage();

  console.log("\n--- Resolving the author from Graph ---");
  const authorKey = await resolveAuthorKey();
  if (authorKey) console.log(`  [author] ${authorKey}`);

  console.log("\n--- Creating the /blogs/ hub (empty DynamicExperience) ---");
  await createContent(
    {
      key: BLOGS_HUB_KEY,
      contentType: "DynamicExperience",
      locale: "en",
      container: CONTAINER,
      displayName: "Blogs",
      routeSegment: "blogs",
      composition: { id: uid(), displayName: "Blogs", nodeType: "experience", layoutType: "outline", nodes: [] },
    },
    "Blogs Hub",
  );
  console.log("  [created] Blogs Hub → /blogs/");

  // BlogExperience requires both a hero image and an author, enforced by the CMS
  // at POST time. Without either, every page POST would 400 - so skip the pages
  // (the empty hub is still useful) and say what to fix. Keeps this runner-safe.
  if (!haveImage || !authorKey) {
    console.warn(`  [warn] Skipping blog pages - missing ${!haveImage ? "hero image" : "author"}. Run seed-modeling (authors) and ensure an image can be uploaded, then re-run.`);
    console.log("\nDone. Created the /blogs/ hub only.");
    return;
  }

  console.log(`\n--- Creating / updating ${BLOGS.length} BlogExperience pages ---`);
  let created = 0;
  let updated = 0;
  for (const blog of BLOGS) {
    const composition = blogComposition(blog);
    try {
      const res = await createContent(
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
            heroImage: HERO_IMAGE_REF,
            // author is type:"content" → object form { reference: ... } (a plain string 400s).
            author: { reference: `cms://content/${authorKey}` },
          },
          composition,
        },
        blog.displayName,
      );

      if (res === null) {
        // Page already existed (409/route in use) - refresh its version so it
        // carries the shared hero image and the rich-text section.
        await updateBlogVersion(blog, authorKey, composition);
        console.log(`  [updated] ${blog.displayName}`);
        updated++;
      } else {
        console.log(`  [created] ${blog.displayName} → /blogs/${blog.routeSegment}/`);
        created++;
      }
    } catch (err) {
      // A stale Graph index can hand back an author key that no longer exists in
      // the CMS ("Referenced content ... does not exist"). Every page shares that
      // ref, so the rest would fail identically - warn and stop.
      console.warn(`  [warn] ${blog.displayName}: ${(err as Error).message.slice(0, 200)}`);
      console.warn("  [warn] Stopping - the shared author reference is not accepted by this instance (likely a stale Graph result). Re-run once the referenced author exists.");
      break;
    }
  }

  console.log(`\nDone. /blogs/ hub + ${created} created, ${updated} updated (hero image + rich-text section).`);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
