import "server-only";
import { getManagementToken } from "@/lib/optimizely/auth";
import {
  MISSING_TRANSLATION,
  TAXONOMY_KEY,
  humanizeKey,
  keyFromTermUri,
  publicCategoryUris,
  termUri,
  type TaxonomyTermMeta,
} from "@/lib/taxonomy";
import { markGraph } from "./graph";

const TERMS_QUERY = /* GraphQL */ `
  query MarkTaxonomyTerms {
    _TaxonomyTerm(limit: 100, locale: en) {
      items { _metadata { key displayName description usage parent } }
    }
  }
`;

const TERMS_ENDPOINT = `https://api.cms.optimizely.com/v1/experimental/taxonomies/${TAXONOMY_KEY}/terms`;
const SELECTABLE_TTL_MS = 10 * 60_000;

let selectableCache: { at: number; byKey: Map<string, boolean> } | null = null;

export interface AssignableCategory {
  key: string;
  /** The value the content item's `categories` property stores. */
  uri: string;
  /** The term and its ancestors, e.g. "Product > Borrowing > Mortgages". */
  path: string;
  description?: string;
}

// Graph carries the tree but not `isSelectable`, so that one flag is read from
// the CMS, one level per parent (the list endpoint has no "whole tree" option).
// It needs the Management API credentials; without them (or on any failure) the
// caller falls back to "everything below a root is assignable".
async function selectableByKey(terms: TaxonomyTermMeta[]): Promise<Map<string, boolean> | null> {
  if (selectableCache && Date.now() - selectableCache.at < SELECTABLE_TTL_MS) return selectableCache.byKey;
  if (!process.env.OPTIMIZELY_CMS_CLIENT_ID || !process.env.OPTIMIZELY_CMS_CLIENT_SECRET) return null;

  try {
    const token = await getManagementToken();
    const parents = [undefined, ...new Set(terms.map((term) => term.parent).filter((p): p is string => Boolean(p)))];
    const levels = await Promise.all(
      parents.map(async (parent) => {
        const query = new URLSearchParams({ pageSize: "100" });
        if (parent) query.set("parent", parent);
        const response = await fetch(`${TERMS_ENDPOINT}?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`GET terms (${parent ?? "roots"}): ${response.status}`);
        const body = (await response.json()) as {
          items?: Array<{ key: string; isSelectable?: boolean; isAvailable?: boolean }>;
        };
        return body.items ?? [];
      })
    );
    const byKey = new Map<string, boolean>();
    for (const term of levels.flat()) {
      byKey.set(term.key, term.isSelectable !== false && term.isAvailable !== false);
    }
    selectableCache = { at: Date.now(), byKey };
    return byKey;
  } catch (error) {
    console.error("[mark] could not read category selectability from the CMS:", error);
    return null;
  }
}

async function fetchTerms(): Promise<TaxonomyTermMeta[]> {
  const data = await markGraph<{
    _TaxonomyTerm: { items: Array<{ _metadata: TaxonomyTermMeta & { key: string | null } }> };
  }>(TERMS_QUERY);
  // Graph keeps one term document per locale; the key is the identity.
  const byKey = new Map<string, TaxonomyTermMeta>();
  for (const { _metadata: term } of data._TaxonomyTerm.items) {
    if (term.key && !byKey.has(term.key)) byKey.set(term.key, term);
  }
  return [...byKey.values()];
}

function label(term: TaxonomyTermMeta): string {
  return term.displayName && term.displayName !== MISSING_TRANSLATION ? term.displayName : humanizeKey(term.key);
}

// The categories an agent may put on a page: public terms an editor could pick.
// Grouping terms ("Product", "Borrowing") and the internal editorial-lifecycle
// branch are left out, so the list is safe to choose from without further rules.
export async function listAssignableCategories(): Promise<{
  categories: AssignableCategory[];
  selectability: "cms" | "assumed";
}> {
  const terms = await fetchTerms();
  const byKey = new Map(terms.map((term) => [term.key, term]));
  const selectable = await selectableByKey(terms);
  const publicKeys = new Set(
    publicCategoryUris(terms, terms.map((term) => termUri(term.key))).map((uri) => keyFromTermUri(uri))
  );

  const pathOf = (term: TaxonomyTermMeta): string => {
    const parts: string[] = [];
    const seen = new Set<string>();
    for (let current: TaxonomyTermMeta | undefined = term; current && !seen.has(current.key); ) {
      seen.add(current.key);
      parts.unshift(label(current));
      current = current.parent ? byKey.get(current.parent) : undefined;
    }
    return parts.join(" > ");
  };

  const categories = terms
    .filter((term) => publicKeys.has(term.key))
    .filter((term) => (selectable ? selectable.get(term.key) === true : Boolean(term.parent)))
    .map((term) => ({
      key: term.key,
      uri: termUri(term.key),
      path: pathOf(term),
      ...(term.description ? { description: term.description } : {}),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return { categories, selectability: selectable ? "cms" : "assumed" };
}

export async function categoryLabels(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const byKey = new Map((await fetchTerms()).map((term) => [term.key, term]));
  return keys.map((key) => {
    const term = byKey.get(key);
    return term ? label(term) : humanizeKey(key);
  });
}
