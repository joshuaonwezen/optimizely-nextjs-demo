export const TAXONOMY_KEY = "categories";

// Optimizely Graph does not fall back across languages for taxonomy terms. A
// term with no translation in the requested locale returns this en-dash
// placeholder rather than the master-language value, so treat it as "missing"
// and fall back yourself.
export const MISSING_TRANSLATION = "–";

export interface TaxonomyTermMeta {
  key: string;
  displayName: string;
  description?: string | null;
  usage?: string | null;
  parent?: string | null;
}

export interface TermNode extends TaxonomyTermMeta {
  children: TermNode[];
  depth: number;
}

/** Builds the URI form stored on content: cms://taxonomy/categories/<termKey>. */
export function termUri(key: string): string {
  return `cms://taxonomy/${TAXONOMY_KEY}/${key}`;
}

/** Inverse of termUri(). Returns null for anything that is not a category URI. */
export function keyFromTermUri(uri: string): string | null {
  const prefix = `cms://taxonomy/${TAXONOMY_KEY}/`;
  return uri.startsWith(prefix) ? uri.slice(prefix.length) : null;
}

/** Accepts either a bare term key or a full category URI and returns the key. */
export function toTermKey(value: string): string {
  return keyFromTermUri(value) ?? value;
}

/**
 * Human label for a term. Falls back to the key when the term is unknown or
 * has no translation in the queried locale, so a label is never blank.
 */
export function termLabel(
  terms: TaxonomyTermMeta[],
  keyOrUri: string
): string {
  const key = toTermKey(keyOrUri);
  const term = terms.find((t) => t.key === key);
  const name = term?.displayName;
  if (!name || name === MISSING_TRANSLATION) return humanizeKey(key);
  return name;
}

/** Turns a snake_case term key into a readable label, for use as a last resort. */
export function humanizeKey(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Folds the flat term list Graph returns into a tree using the `parent` field.
 * Terms whose parent is missing from the list are treated as roots so nothing
 * is silently dropped.
 */
export function buildTermTree(terms: TaxonomyTermMeta[]): TermNode[] {
  const byKey = new Map<string, TermNode>();
  for (const term of terms) {
    byKey.set(term.key, { ...term, children: [], depth: 0 });
  }

  const roots: TermNode[] = [];
  for (const node of byKey.values()) {
    const parent = node.parent ? byKey.get(node.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const setDepth = (nodes: TermNode[], depth: number): void => {
    for (const node of nodes) {
      node.depth = depth;
      node.children.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setDepth(node.children, depth + 1);
    }
  };
  roots.sort((a, b) => a.displayName.localeCompare(b.displayName));
  setDepth(roots, 0);
  return roots;
}

/** Flattens a term tree back into depth-ordered rows, for rendering an indented list. */
export function flattenTree(nodes: TermNode[]): TermNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

/**
 * A term's key plus every key beneath it.
 *
 * Content is tagged leaf-only (a page under /mortgage/remortgaging/ carries
 * `remortgaging`, not also `mortgages`), so filtering by a parent has to expand
 * to its descendants. This is what makes the `parent` field earn its place, and
 * it keeps the stored data clean instead of denormalizing ancestors onto every
 * item.
 */
export function descendantKeys(terms: TaxonomyTermMeta[], key: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const term of terms) {
    if (!term.parent) continue;
    const siblings = childrenOf.get(term.parent) ?? [];
    siblings.push(term.key);
    childrenOf.set(term.parent, siblings);
  }

  const out: string[] = [];
  const walk = (k: string, seen: Set<string>): void => {
    if (seen.has(k)) return;
    seen.add(k);
    out.push(k);
    for (const child of childrenOf.get(k) ?? []) walk(child, seen);
  };
  walk(toTermKey(key), new Set());
  return out;
}

/**
 * Expands a set of selected term keys (or URIs) into the full URI list to pass
 * to Graph as an `in` filter, so selecting "Mortgages" matches everything
 * beneath it.
 */
export function expandToUris(
  terms: TaxonomyTermMeta[],
  keysOrUris: string[]
): string[] {
  const expanded = new Set<string>();
  for (const value of keysOrUris) {
    for (const key of descendantKeys(terms, value)) expanded.add(key);
  }
  return [...expanded].map(termUri);
}

export interface FacetBucket {
  name: string;
  count: number;
}

export interface RolledUpTerm extends TermNode {
  /** Items tagged with this exact term. */
  ownCount: number;
  /** Items tagged with this term or anything beneath it. */
  totalCount: number;
}

/**
 * Sums each term's own facet bucket with all of its descendants', so a parent
 * row can show a meaningful count.
 *
 * Graph returns one bucket per term actually in use, which with leaf-only
 * tagging means grouping nodes never appear. Rolling up locally is what lets a
 * sidebar render the tree rather than a flat list of leaves.
 */
export function rollUpCounts(
  terms: TaxonomyTermMeta[],
  buckets: FacetBucket[]
): RolledUpTerm[] {
  const own = new Map<string, number>();
  for (const bucket of buckets) {
    own.set(toTermKey(bucket.name), bucket.count);
  }

  return flattenTree(buildTermTree(terms)).map((node) => ({
    ...node,
    ownCount: own.get(node.key) ?? 0,
    totalCount: descendantKeys(terms, node.key).reduce(
      (sum, key) => sum + (own.get(key) ?? 0),
      0
    ),
  }));
}

/**
 * Root terms whose whole branch is editorial metadata rather than something a
 * visitor should see.
 *
 * The `usage` flag (Public / Internal) is the CMS-native way to express this,
 * but it is absent from the taxonomy write schema, so terms created through the
 * API are always Public until an editor flips them in Settings > Categories.
 * Until that happens this list is what keeps workflow terms off public pages;
 * once the branch is marked Internal the usage check below covers it anyway.
 */
export const INTERNAL_ROOT_KEYS = ["lifecycle"];

/** Walks up the parent chain and returns the key of the term's root ancestor. */
function rootKeyOf(terms: TaxonomyTermMeta[], key: string): string {
  const byKey = new Map(terms.map((t) => [t.key, t]));
  let current = byKey.get(key);
  const seen = new Set<string>();
  while (current?.parent && !seen.has(current.key)) {
    seen.add(current.key);
    const parent = byKey.get(current.parent);
    if (!parent) break;
    current = parent;
  }
  return current?.key ?? key;
}

/** True when a term is safe to show to a site visitor. */
function isPublicTerm(terms: TaxonomyTermMeta[], keyOrUri: string): boolean {
  const key = toTermKey(keyOrUri);
  const term = terms.find((t) => t.key === key);
  if (term?.usage === "Internal") return false;
  return !INTERNAL_ROOT_KEYS.includes(rootKeyOf(terms, key));
}

/** Filters a list of category URIs down to the ones a visitor should see. */
export function publicCategoryUris(
  terms: TaxonomyTermMeta[],
  uris: string[]
): string[] {
  return uris.filter((uri) => isPublicTerm(terms, uri));
}

/**
 * Maps the legacy ArticlePage.category / CaseStudyPage.industry enum values onto
 * taxonomy term keys. Content seeded before Categories existed still carries the
 * old property, so the listing and article surfaces fall back through this map
 * when a page has no categories assigned yet (and on instances where the
 * taxonomy has not been seeded at all).
 */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "personal-finance": "personal_finance",
  "business-banking": "business_banking",
  investments: "investments",
  "market-insights": "market_insights",
};

/**
 * The category URIs for a content item, preferring real taxonomy assignments and
 * falling back to the legacy enum property when none exist.
 */
export function resolveCategoryUris(
  categories: string[] | null | undefined,
  legacyValue?: string | null
): string[] {
  if (categories?.length) return categories;
  const mapped = legacyValue ? LEGACY_CATEGORY_MAP[legacyValue] : undefined;
  return mapped ? [termUri(mapped)] : [];
}
