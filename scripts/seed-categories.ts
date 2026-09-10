import {
  CONTENT_ENDPOINT,
  GRAPH_ENDPOINT,
  SINGLE_KEY,
  getManagementToken,
  patchPublishedPageProperties,
} from "./_shared";
import { createTerm, deleteTerm, listAllTerms, termUri } from "./_taxonomy";
import { TAXONOMY_TREE, termsForUrl } from "./taxonomy-tree";

const FRESH = process.argv.includes("--fresh") || process.env.SEED_FRESH === "1";

// Graph caps `limit` at 100, so walk the result set with a cursor.
const PAGES_QUERY = `query AllPages($cursor: String) {
  _Page(
    limit: 100
    cursor: $cursor
    locale: en
    where: { _metadata: { url: { default: { exist: true } } } }
    orderBy: { _metadata: { url: { default: ASC } } }
  ) {
    total
    cursor
    items { _metadata { key displayName url { default } } }
  }
}`;

interface PageRow {
  key: string;
  displayName: string;
  url: string;
}

async function fetchPages(): Promise<PageRow[]> {
  const pages: PageRow[] = [];
  let cursor: string | undefined;

  for (;;) {
    const res = await fetch(GRAPH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `epi-single ${SINGLE_KEY}`,
      },
      body: JSON.stringify({ query: PAGES_QUERY, variables: { cursor } }),
    });
    const body = (await res.json().catch(() => null)) as {
      errors?: Array<{ message?: string }>;
      data?: {
        _Page?: {
          cursor?: string | null;
          items?: Array<{
            _metadata?: { key?: string; displayName?: string; url?: { default?: string } };
          }>;
        };
      };
    } | null;
    if (!res.ok || body?.errors?.length) {
      const detail = body?.errors?.map((e) => e.message).join("; ") ?? String(res.status);
      throw new Error(`Graph page query: ${detail}`);
    }

    const page = body?.data?._Page;
    const items = page?.items ?? [];
    pages.push(
      ...items
        .map((i) => ({
          key: i._metadata?.key ?? "",
          displayName: i._metadata?.displayName ?? "(untitled)",
          url: i._metadata?.url?.default ?? "",
        }))
        .filter((p) => p.key && p.url)
    );

    if (items.length < 100 || !page?.cursor) return pages;
    cursor = page.cursor;
  }
}

/**
 * Orders the tree so every parent is created before its children. The API
 * rejects a child whose parent does not exist yet, and a term's parent can
 * never be changed afterwards.
 */
function parentsFirst(): typeof TAXONOMY_TREE {
  const byKey = new Map(TAXONOMY_TREE.map((t) => [t.key, t]));
  const depth = (key: string, seen = new Set<string>()): number => {
    const term = byKey.get(key);
    if (!term?.parent || seen.has(key)) return 0;
    seen.add(key);
    return 1 + depth(term.parent, seen);
  };
  return [...TAXONOMY_TREE].sort((a, b) => depth(a.key) - depth(b.key));
}

async function seedTerms(): Promise<void> {
  if (FRESH) {
    const existing = await listAllTerms();
    // Deleting a parent cascades to its descendants, so delete deepest first to
    // keep the log honest about what was removed.
    for (const term of [...existing].reverse()) {
      await deleteTerm(term.key).catch(() => undefined);
    }
    console.log(`[fresh] removed ${existing.length} existing term(s)`);
  }

  let created = 0;
  let existed = 0;
  for (const term of parentsFirst()) {
    const result = await createTerm(term);
    if (result === "created") created += 1;
    else existed += 1;
  }
  console.log(
    `[terms] ${created} created, ${existed} already present, ${TAXONOMY_TREE.length} total`
  );
}

/**
 * Reads the categories already on the live version, so a re-seed does not create
 * a pointless new version for every page. Graph is not used here because it lags
 * the CMS by ~60s and would make back-to-back runs churn versions.
 */
async function currentCategories(key: string, locale = "en"): Promise<string[]> {
  const res = await fetch(`${CONTENT_ENDPOINT}/${key}/locales/${locale}?pageSize=1`, {
    headers: { Authorization: `Bearer ${await getManagementToken()}` },
  });
  if (!res.ok) return [];
  // Reads come back in PropertyData form ({ value: [...] }), the same shape
  // wrapProps() produces on write - not as a bare array.
  const data = (await res.json()) as {
    items?: Array<{ properties?: { categories?: { value?: string[] | null } | null } }>;
  };
  return data.items?.[0]?.properties?.categories?.value ?? [];
}

function sameTerms(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

async function assignCategories(): Promise<void> {
  const pages = await fetchPages();
  if (pages.length === 0) {
    console.warn(
      "[warn] Graph returned no pages - it may not have indexed this instance yet. Re-run in ~60s."
    );
    return;
  }

  let tagged = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  let cleared = 0;

  for (const page of pages) {
    const terms = termsForUrl(page.url);
    const uris = terms.map(termUri);

    if (terms.length === 0) {
      // A page the rules no longer tag may still carry categories from an
      // earlier tree. Clear them rather than leaving stale URIs behind.
      try {
        if ((await currentCategories(page.key)).length === 0) {
          skipped += 1;
          continue;
        }
        await patchPublishedPageProperties(page.key, { categories: [] });
        cleared += 1;
        console.log(`[cleared] ${page.url}`);
      } catch (err) {
        failed += 1;
        console.warn(`[warn] ${page.url}: ${(err as Error).message}`);
      }
      continue;
    }

    try {
      if (sameTerms(await currentCategories(page.key), uris)) {
        unchanged += 1;
        continue;
      }
      // `categories` is a built-in property on page versions - it is not declared
      // on any content type, and the CMS validates each URI against the taxonomy
      // (term must exist, be available and be selectable).
      //
      // Every seeded page is published, and a published version cannot be
      // patched, so this goes through the draft-then-publish helper rather than
      // patchContentProperties.
      await patchPublishedPageProperties(page.key, { categories: uris });
      tagged += 1;
      console.log(`[tagged] ${page.url} -> ${terms.join(", ")}`);
    } catch (err) {
      failed += 1;
      console.warn(`[warn] ${page.url}: ${(err as Error).message}`);
    }
  }

  console.log(
    `[assign] ${tagged} tagged, ${unchanged} already correct, ${cleared} cleared, ${skipped} skipped by design, ${failed} failed`
  );
}

async function main(): Promise<void> {
  await seedTerms();
  await assignCategories();
  console.log(
    "[done] Categories seeded. Graph needs ~30-60s to index terms and assignments."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
