import "server-only";
import { termUri } from "@/lib/taxonomy";
import { keysMissingFromCms } from "./cms";
import { markGraph } from "./graph";
import { getPageDocument, getPageVersions, loadPage, type PageRef } from "./pages";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const STATUSES = ["Published", "Draft", "Ready", "InReview"];
const CONTENT_KEY = /^[0-9a-f]{32}$/;
const PAGE_SIZE = 100;
const MAX_ROWS = 2000;
const MAX_DEPTH = 3;
const MAX_BLOCKS = 60;
const MAX_LINKED_PAGES = 15;
const CONCURRENCY = 5;

// Visual Builder plumbing between a property and the block it holds.
const STRUCTURE = new Set(["nodes", "component"]);

const REFERENCED_ITEMS_QUERY = /* GraphQL */ `
  query MarkReferencedItems($where: _ContentWhereInput, $skip: Int) {
    _Content(where: $where, limit: ${PAGE_SIZE}, skip: $skip, orderBy: { _metadata: { key: ASC } }) {
      items { _metadata { key locale status version displayName types url { default base } } }
    }
  }
`;

interface Reference {
  key: string;
  /** Where the reference sits, for the editor: "mainContent of the page". */
  usedIn: string;
  /** Graph wrote the item out in place, so what it references was walked with it. */
  expanded: boolean;
}

interface ItemVersion {
  key: string;
  locale: string;
  status: string;
  version: string;
  name: string;
  types: string[];
  url: string | null;
}

// Every content item a Graph document points at, in document order.
//  - A `type: "content"` reference is written out in full with the item's own
//    `_metadata.key` (an inline block has none), so a shared block nested in
//    another block is found in the same pass.
//  - A `type: "contentReference"` stays `{ key, url }`. What that item
//    references in turn is only in its own document.
// Links (url properties, rich text) are not references and are left alone.
function collect(value: Json, property: string, owner: string, out: Reference[]): void {
  if (Array.isArray(value)) {
    for (const entry of value) collect(entry, property, owner, out);
    return;
  }
  if (!value || typeof value !== "object") return;

  const usedIn = `${property} of ${owner}`;
  if (typeof value.key === "string" && CONTENT_KEY.test(value.key) && value.url && typeof value.url === "object") {
    out.push({ key: value.key, usedIn, expanded: false });
    return;
  }

  let inner = owner;
  const meta = value._metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    if (typeof meta.key === "string") out.push({ key: meta.key, usedIn, expanded: true });
    if (typeof meta.displayName === "string" && meta.displayName) inner = `'${meta.displayName}'`;
  }
  for (const [childKey, child] of Object.entries(value)) {
    if (childKey.startsWith("_")) continue;
    collect(child, STRUCTURE.has(childKey) ? property : childKey, inner, out);
  }
}

function referencesIn(doc: unknown, owner: string): Reference[] {
  const out: Reference[] = [];
  if (doc && typeof doc === "object" && !Array.isArray(doc)) {
    for (const [property, value] of Object.entries(doc as Record<string, Json>)) {
      if (!property.startsWith("_")) collect(value, property, owner, out);
    }
  }
  return out;
}

// Every version of these items in these languages that is live or waiting.
// Media and DAM assets have no row here, which is what leaves them out.
async function versionsOf(keys: string[], locales: string[]): Promise<ItemVersion[]> {
  const where = { _metadata: { key: { in: keys }, locale: { in: locales }, status: { in: STATUSES } } };
  const out: ItemVersion[] = [];
  for (let skip = 0; skip < MAX_ROWS; skip += PAGE_SIZE) {
    const data = await markGraph<{
      _Content: {
        items: Array<{
          _metadata: {
            key: string;
            locale: string;
            status: string;
            version: string;
            displayName: string | null;
            types: string[] | null;
            url: { default: string | null; base: string | null } | null;
          };
        }>;
      };
    }>(REFERENCED_ITEMS_QUERY, { where, skip });
    for (const { _metadata: meta } of data._Content.items) {
      out.push({
        key: meta.key,
        locale: meta.locale,
        status: meta.status,
        version: meta.version,
        name: meta.displayName ?? "",
        types: meta.types ?? [],
        url: meta.url?.default ? `${meta.url.base ?? ""}${meta.url.default}` : null,
      });
    }
    if (data._Content.items.length < PAGE_SIZE) break;
  }
  return out;
}

// What an item already has in one language: the live version, else the newest
// one waiting. Null means the language has no version at all.
function existingVersion(versions: Array<{ version: string; status: string }>) {
  const found =
    versions.find((entry) => entry.status === "Published") ??
    [...versions].sort((a, b) => Number(b.version) - Number(a.version))[0];
  return found ? { version: found.version, status: found.status } : null;
}

async function referencesOfBlocks(blocks: ItemVersion[]): Promise<Reference[]> {
  const out: Reference[] = [];
  for (let start = 0; start < blocks.length; start += CONCURRENCY) {
    const batch = blocks.slice(start, start + CONCURRENCY);
    const documents = await Promise.all(
      batch.map(({ key, version, locale, status }) =>
        getPageDocument({ facts: { contentKey: key, version, locale, status } })
      )
    );
    documents.forEach((document, index) => out.push(...referencesIn(document, `'${batch[index].name}'`)));
  }
  return out;
}

// What has to exist in the target language for a page to show there in full:
// the page, and every shared block it uses. A shared block is a content item
// with language versions of its own, and Graph resolves a reference in the
// page's language only: on joshCMS the German version of Credit Cards comes back
// with an empty featuredBlock and mainContent, because its two shared blocks
// have no German version. A block with no text of its own still needs one.
export async function getTranslationPlan(ref: PageRef, targetLocale: string) {
  const loaded = await loadPage(ref);
  if ("error" in loaded) return loaded;
  const { facts } = loaded;
  if (facts.status !== "Published") {
    return { error: `'${facts.name}' has no published version in '${facts.locale}' to translate from.` };
  }
  if (targetLocale === facts.locale) {
    return { error: `The target language is the source language ('${targetLocale}').` };
  }

  const seen = new Set([facts.contentKey]);
  const versions: ItemVersion[] = [];
  const blocks: Array<{ reference: Reference; live: ItemVersion }> = [];
  const pages: Array<{ reference: Reference; live: ItemVersion }> = [];
  let found = referencesIn(loaded.document, "the page");

  for (let depth = 0; depth < MAX_DEPTH && found.length > 0; depth += 1) {
    const fresh: Reference[] = [];
    for (const reference of found) {
      if (seen.has(reference.key)) continue;
      seen.add(reference.key);
      fresh.push(reference);
    }
    if (fresh.length === 0) break;

    const looked = await versionsOf(fresh.map((reference) => reference.key), [facts.locale, targetLocale]);
    versions.push(...looked);

    const unread: ItemVersion[] = [];
    for (const reference of fresh) {
      // No live version in the source language: the page does not show it either.
      const live = looked.find(
        (entry) => entry.key === reference.key && entry.locale === facts.locale && entry.status === "Published"
      );
      if (!live) continue;
      if (live.types.includes("_Page") || live.types.includes("_Experience")) {
        pages.push({ reference, live });
      } else if (live.types.includes("_Component")) {
        blocks.push({ reference, live });
        if (!reference.expanded) unread.push(live);
      }
    }
    found = await referencesOfBlocks(unread);
  }

  const inTarget = (key: string) =>
    existingVersion(versions.filter((entry) => entry.key === key && entry.locale === targetLocale));

  const gone = await keysMissingFromCms(blocks.map(({ live }) => live.key));
  const editable = blocks.filter(({ live }) => !gone?.has(live.key));
  const sharedBlocks = editable.slice(0, MAX_BLOCKS).map(({ reference, live }) => {
    const targetVersion = inTarget(live.key);
    return {
      contentKey: live.key,
      name: live.name,
      contentType: live.types[0] ?? "",
      usedIn: reference.usedIn,
      targetVersion,
      translate: !targetVersion,
    };
  });

  const notes: string[] = [];
  if (editable.length > MAX_BLOCKS) {
    notes.push(`The page uses ${editable.length} shared blocks; only the first ${MAX_BLOCKS} are listed.`);
  }
  if (gone === null && blocks.length > 0) {
    notes.push("Could not check the shared blocks against the CMS. Saving one that was deleted there fails with 'Content item not found'.");
  }

  const pageTarget = existingVersion((await getPageVersions(facts.contentKey, targetLocale)).map((entry) => entry.facts));
  return {
    page: {
      contentKey: facts.contentKey,
      name: facts.name,
      contentType: facts.contentType,
      url: facts.url,
      sourceLocale: facts.locale,
      sourceVersion: facts.version,
      targetLocale,
      targetVersion: pageTarget,
      translate: !pageTarget,
      categories: facts.categories.map(termUri),
    },
    sharedBlocks,
    sharedBlocksToTranslate: sharedBlocks.filter((block) => block.translate).length,
    linkedPagesWithoutTranslation: pages
      .filter(({ live }) => inTarget(live.key)?.status !== "Published")
      .slice(0, MAX_LINKED_PAGES)
      .map(({ reference, live }) => ({
        contentKey: live.key,
        name: live.name,
        url: live.url,
        usedIn: reference.usedIn,
      })),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
