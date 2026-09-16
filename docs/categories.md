# CMS Categories (taxonomy)

Moved out of CLAUDE.md.

## CMS Categories (Taxonomy)

Hierarchical, editor-managed terms that cross content types. Shipped in SaaS CMS on 2026-08-31. Seeded by `npm run seed:categories` (`scripts/seed-categories.ts`), documented at `/demo/categories`.

### Where things live

| Concern | Location |
|---|---|
| Term CRUD client | `scripts/_taxonomy.ts` (the ONLY file that calls the experimental endpoint) |
| The term tree + URL assignment rules | `scripts/taxonomy-tree.ts` (data only) |
| Seed runner step | `scripts/seed-categories.ts`, in the runner's `optional[]` phase after `seed-search-config` |
| Front-end helpers | `src/lib/taxonomy.ts` (`termUri`, `toTermKey`, `termLabel`, `buildTermTree`, `publicCategoryUris`) |
| Graph queries | `src/lib/graphql/queries/GetTaxonomyTerms.ts` (`getTaxonomyTerms`, `getContentTaxonomy`) |

### Term keys cannot contain hyphens

The API enforces `^[A-Za-z][_0-9A-Za-z]+$` (2-100 chars). A slug like `personal-finance` is rejected, so the tree uses snake_case. `LEGACY_CATEGORY_MAP` in `src/lib/taxonomy.ts` maps the old `ArticlePage.category` enum values onto the new term keys.

### Terms are managed through an experimental, feature-flagged API

```
GET|POST   /v1/experimental/taxonomies/categories/terms
GET|PATCH|DELETE /v1/experimental/taxonomies/categories/terms/{termKey}
```

Needs an `api:admin` token AND CMS admin rights. `categories` is the only supported `taxonomyKey`. Confirmed enabled on `personal`; assume nothing about the other instances until a `GET` returns 200 there.

- **Create parents before children.** A child whose `parent` does not exist is a 400.
- **A term's parent can never be changed.** Moving one means delete plus recreate, which drops it from every item already tagged. Get the tree right up front.
- **`usage` (Public/Internal) is not in the write schema.** API-created terms are always Public; toggle them in Settings > Categories. Until then, `INTERNAL_ROOT_KEYS` in `src/lib/taxonomy.ts` is what keeps the editorial-lifecycle branch off public pages.
- **`isAvailable: false` removes a term from Graph entirely**, which is how to retire one without losing history. `isSelectable: false` makes it a grouping node that cannot be assigned.

### The tree: 4 levels, leaf-only tagging, expansion at query time

`scripts/taxonomy-tree.ts` defines 55 terms across four axes, four levels deep
(`product > borrowing > mortgages > remortgaging`). The four roots plus `everyday`, `borrowing`,
`saving_investing` and `business` are `isSelectable: false` grouping nodes.

Content is tagged with its **most specific** term only. A page under `/mortgage/remortgaging/` carries
`remortgaging`, NOT also `mortgages` / `borrowing` / `product`. Two consequences:

- **Filtering a parent must expand to its descendants.** `expandToUris(terms, keys)` in `src/lib/taxonomy.ts`
  does this; every browse surface calls it before hitting Graph. On this instance, filtering `mortgages`
  exactly matches 3 items, expanded it matches 11.
- **Grouping nodes never appear in facets**, because nothing can be tagged with them. `rollUpCounts(terms,
  buckets)` sums each term with its descendants locally, which is what lets a sidebar render the tree instead
  of a flat list of leaves.

Because the taxonomy has to be loaded before the filter can be expanded, browse pages `await
getTaxonomyTerms()` first and only then run the content query - do not put them in the same `Promise.all`.

`cash_isa` is deliberately left with no content: facets only return buckets in use, so the full taxonomy and
the applied taxonomy are different lists. Do not build navigation purely off facet output.

Changing the tree means `npm run seed:categories -- --fresh` (delete and recreate), because a term's parent is
immutable. That also loses any `usage: Internal` flags set by hand in the CMS, so re-mark the `lifecycle`
branch afterwards.

### `GET /terms` returns ONLY root terms unless you pass `parent`

The list endpoint is one level at a time: omitting `parent` returns root-level terms, not the whole taxonomy.
`listTerms(parent?)` in `scripts/_taxonomy.ts` is that single level; `listAllTerms()` walks the tree. Using the
wrong one silently under-reports (an earlier `--fresh` logged "removed 4 terms" when it had removed 27, because
deleting the 4 roots cascades to every descendant).

### Assignment: `categories` is a BUILT-IN version property

There is no category property type on the content type API (`type: "category"` and every variant is rejected with "The Type field does not support the value ..."). You do **not** declare anything, and there is no `opti:push`. `categories` is simply accepted on a content version's `properties`:

```
PATCH /v1/content/{key}/versions/{version}
Content-Type: application/merge-patch+json
{ "properties": { "categories": { "value": ["cms://taxonomy/categories/mortgages"] } } }
```

Verified as a real built-in, not silent acceptance of unknown fields: an undeclared `zzBogusField` is rejected with 400 while `categories` persists and round-trips. The CMS validates every URI (term must exist, be available, and be selectable) and names `properties.categories.value` in the problem document. Categories are version-scoped, so a published version cannot be patched directly. Silently dropped on `_component` types: pages only.

### Graph: `_itemMetadata.categories`, NOT `_metadata.categories`

This is the easiest mistake to make. On `_Content` and every concrete type:
- `_metadata` is typed `IContentMetadata`, which has **no** `categories` field
- `_itemMetadata` is typed `_Metadata`, which has `categories: [String]`

`_metadata { categories }` fails with `Cannot query field "categories" on type "IContentMetadata"`.

Categories are filterable (`_itemMetadata: { categories: { in: [...] } }`) and **facetable** (`facets { _itemMetadata { categories(orderType: COUNT, orderBy: DESC, limit: 40) { name count } } }`). Faceting on `_Content` gives counts spanning every content type at once, which the old per-type `category` enum could never do.

Bucket names and field values are always URI strings (`cms://taxonomy/categories/<key>`), never display names. Resolve labels by joining against `_TaxonomyTerm`.

### `_TaxonomyTerm` exposes `parent` (the public docs omit it)

`_TaxonomyTerm._metadata` = `key, taxonomy, displayName, description, usage, parent, locale, status`. The published docs list everything except `parent`; it is in the schema, and without it there is no way to build a hierarchy. Graph stores one term document per locale, so dedupe by key even with a locale filter.

### No language fallback on terms

Content falls back to the master language; taxonomy terms do not. An untranslated term returns the en-dash placeholder `"–"` in the queried locale rather than the master value. `MISSING_TRANSLATION` in `src/lib/taxonomy.ts` treats that literal as missing and falls back to a humanized key.

---
