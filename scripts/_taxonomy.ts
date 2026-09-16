import { API_BASE, getManagementToken, apiFetch } from "./_shared";

// The CMS ships exactly one taxonomy today. Any other key is rejected by the API
// with "The taxonomy '<key>' is not supported."
export const TAXONOMY_KEY = "categories";

// Taxonomy endpoints sit behind /experimental/ and a per-instance feature flag.
// They are outside the v1 backward-compatibility guarantee, so every call the
// project makes goes through this module and nowhere else.
export const TAXONOMY_ENDPOINT = `${API_BASE}/v1/experimental/taxonomies/${TAXONOMY_KEY}/terms`;

// Term keys are far stricter than content keys: letters, digits and underscores
// only, starting with a letter. Hyphenated slugs like "personal-finance" are
// rejected, which is why the tree uses snake_case throughout.
export const TERM_KEY_PATTERN = /^[A-Za-z][_0-9A-Za-z]+$/;

export interface TaxonomyTerm {
  key: string;
  displayName: string;
  description?: string;
  sortOrder?: number;
  parent?: string | null;
  isAvailable?: boolean;
  isSelectable?: boolean;
  created?: string;
  createdBy?: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

/** Builds the URI form the content API expects: cms://taxonomy/categories/<termKey>. */
export function termUri(key: string): string {
  return `cms://taxonomy/${TAXONOMY_KEY}/${key}`;
}

/** Inverse of termUri(). Returns null for anything that is not a category URI. */
export function keyFromTermUri(uri: string): string | null {
  const prefix = `cms://taxonomy/${TAXONOMY_KEY}/`;
  return uri.startsWith(prefix) ? uri.slice(prefix.length) : null;
}

async function authHeaders(): Promise<Record<string, string>> {
  return {
    Authorization: `Bearer ${await getManagementToken()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Lists one level of the taxonomy: the direct children of `parent`, or the
 * root-level terms when `parent` is omitted. Follows paging until exhausted.
 *
 * Note the API's shape here - omitting `parent` returns ONLY roots, not the
 * whole taxonomy. Use listAllTerms() when you want every term.
 */
export async function listTerms(parent?: string): Promise<TaxonomyTerm[]> {
  const all: TaxonomyTerm[] = [];
  const pageSize = 100;
  for (let pageIndex = 0; ; pageIndex += 1) {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    });
    if (parent) query.set("parent", parent);
    const res = await apiFetch(`${TAXONOMY_ENDPOINT}?${query}`, {
      headers: await authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`GET terms: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as { items?: TaxonomyTerm[]; totalCount?: number };
    const items = data.items ?? [];
    all.push(...items);
    if (items.length < pageSize) return all;
  }
}

/** Walks the whole taxonomy, level by level, and returns every term. */
export async function listAllTerms(): Promise<TaxonomyTerm[]> {
  const all: TaxonomyTerm[] = [];
  const seen = new Set<string>();

  const walk = async (parent?: string): Promise<void> => {
    for (const term of await listTerms(parent)) {
      if (seen.has(term.key)) continue;
      seen.add(term.key);
      all.push(term);
      await walk(term.key);
    }
  };

  await walk();
  return all;
}

/**
 * Creates a term. A duplicate key returns 409, which is treated as "already
 * there" so the seed stays a non-destructive upsert like the rest of the
 * pipeline. Parents must exist before their children.
 */
export async function createTerm(
  term: TaxonomyTerm
): Promise<"created" | "exists"> {
  if (!TERM_KEY_PATTERN.test(term.key)) {
    throw new Error(
      `Invalid term key "${term.key}" - must match ${TERM_KEY_PATTERN} (letters, digits, underscores; no hyphens)`
    );
  }
  const res = await apiFetch(TAXONOMY_ENDPOINT, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(term),
  });
  if (res.status === 409) return "exists";
  if (!res.ok) {
    throw new Error(
      `POST term ${term.key}: ${res.status} ${(await res.text()).slice(0, 300)}`
    );
  }
  return "created";
}

/**
 * Updates the mutable fields of a term. `parent` is deliberately absent: the
 * CMS does not allow reparenting after creation, and the patch schema omits it.
 */
export async function patchTerm(
  key: string,
  patch: Pick<TaxonomyTerm, "displayName" | "description" | "sortOrder" | "isAvailable" | "isSelectable">
): Promise<void> {
  const res = await apiFetch(`${TAXONOMY_ENDPOINT}/${key}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${await getManagementToken()}`,
      "Content-Type": "application/merge-patch+json",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(
      `PATCH term ${key}: ${res.status} ${(await res.text()).slice(0, 300)}`
    );
  }
}

/** Deletes a term and its descendants. Content tagged with it loses that tag. */
export async function deleteTerm(key: string): Promise<void> {
  const res = await apiFetch(`${TAXONOMY_ENDPOINT}/${key}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `DELETE term ${key}: ${res.status} ${(await res.text()).slice(0, 300)}`
    );
  }
}
