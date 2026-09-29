# `getContentByPath` + `variation: { include: 'SOME' }` → Graph HTTP 500, and `includeOriginal` is silently ignored

| | |
|---|---|
| **Broken in** | `@optimizely/cms-sdk` **3.0.0** and **3.0.1** |
| **Last working** | **2.2.0** |
| **Impact** | every `getContentByPath()` call passing `include: 'SOME'` rejects with HTTP 500 |

Two defects, both from the same 3.0.0 refactor. `dist/esm/graph/operations.js` and `dist/esm/graph/filters.js` are **byte-identical between 3.0.0 and 3.0.1**, so 3.0.1 changes neither.

> Code below is quoted from the published `dist/` (brace style reformatted; logic and identifiers verbatim). I haven't seen the TS sources, so filenames under "Suggested fix" are inferred from the compiled layout.

## Evidence

Same page, same calls, only the SDK version differs. The page has 4 variations (`business`, `personal`, `mortgages`, `investments`) plus a base version.

| call | 2.2.0 | 3.0.1 |
|---|---|---|
| `SOME ["business"]` + `includeOriginal: true` | `business, BASE` | **HTTP 500** |
| `SOME ["no-such-variation"]` + `includeOriginal: true` | `BASE` | **HTTP 500** |
| `SOME ["business"]` + `includeOriginal: true`, *Defect 1 patched* | — | `business` — **`BASE` missing** |
| `ALL` | all 5 | all 5 |

Row 3 isolates Defect 2: patch Defect 1 and the 500 goes away, but `includeOriginal` still does nothing.

## Cause

2.2.0 passed the filter as one GraphQL **variable**, so `{ include, value, includeOriginal }` reached Graph intact:

```js
// 2.2.0 — dist/esm/graph/index.js
const GET_CONTENT_METADATA_QUERY = `
query GetContentMetadata($where: _ContentWhereInput, $variation: VariationInput) {
  _Content(where: $where, variation: $variation) { ... }
}`;

const input = { ...pathFilter(path, options?.host ?? this.host), variation: options?.variation };
```

3.0.0 replaced that with a clause **written into the query text** plus one scalar variable per variation name:

```js
// 3.0.1 — dist/esm/graph/filters.js
export function getVariationVarDecls(mode) {
  if (mode === 'none' || mode === 'all') return '';
  return Array.from({ length: mode.count }, (_, i) => `$v${i + 1}: String`).join(', ');
}

export function getVariationClause(mode) {
  if (mode === 'none') return '';
  if (mode === 'all') return ', variation: { include: ALL }';
  const values = Array.from({ length: mode.count }, (_, i) => `$v${i + 1}`).join(', ');
  return `, variation: { include: SOME, value: [${values}] }`;
}
```

## Defect 1 — the metadata query declares `$v1..$vN` but is never given their values

`getContentByPath` builds the variation variables and merges them into the **content** query's variables. The **metadata probe** is issued by `getContentMetaData()`, which builds its own variables — and never receives them:

```js
// dist/esm/graph/operations.js — getContentByPath
const varMode       = getVariationMode(options?.variation);
const variationVars = getVariationVariables(options?.variation);
const variables     = { ...filter.variables, ...variationVars };   // ✅ content query

const { contentTypeName, ... } = await getContentMetaData(
  context, filter, queryOptions, undefined, varMode,               // ❌ variationVars not passed
);

// dist/esm/graph/operations.js — getContentMetaData
async function getContentMetaData(context, filter, queryOptions, previewToken, variationMode = 'none') {
  const query = getMetadataQuery(filter.filterShape, variationMode, mayRenderForms);  // declares AND uses $v1..$vN
  const variables = {
    ...filter.variables,
    ...(mayRenderForms && { withForms: true }),                     // ❌ no variation values
  };
```

Graph receives `variation: { include: SOME, value: [null] }` → **HTTP 500**.

Only `getContentByPath` is affected; the other two `getContentMetaData` callers pass literal modes that need no variables (`getPreviewContent` → `'all'`, `getContent` → `'none'`).

## Defect 2 — `includeOriginal` never reaches the generated query

The public input type accepts it:

```ts
// dist/esm/graph/filters.d.ts
export type GraphVariationInput =
  | { include: 'NONE' }
  | { include: 'ALL' }
  | { include: 'SOME'; value: string[]; includeOriginal?: boolean };
```

…but nothing reads it. In the whole published `dist/` of 3.0.1, `includeOriginal` occurs in exactly two files — `dist/esm/graph/filters.d.ts` and `dist/cjs/graph/filters.d.ts` — and in **no `.js` file at all**. `getVariationMode()` discards it:

```js
export function getVariationMode(variation) {
  if (!variation || variation.include === 'NONE') return 'none';
  if (variation.include === 'ALL') return 'all';
  return { count: variation.value.length };   // ❌ includeOriginal dropped
}
```

The flag does change Graph's answer, so dropping it is observable. Identical query, one clause differing:

```graphql
variation: { include: SOME, value: ["no-such-variation"] }                         # → 0 items
variation: { include: SOME, value: ["no-such-variation"], includeOriginal: true }  # → 1 item (the base)
```

So a visitor matching no variation gets **no content at all** instead of the base version. Callers setting `includeOriginal: true` precisely to avoid that are silently ignored. For us it surfaced as a `notFound()` on the homepage.

## Reproduction

```
npm i @optimizely/cms-sdk@3.0.1 react react-dom next
OPTIMIZELY_GRAPH_SINGLE_KEY=<single key> node repro.mjs '/' '<a real variation name>'
```

The path must be a page with at least one CMS variation, and its content type must be registered.

```js
import { GraphClient, initContentTypeRegistry, contentType } from "@optimizely/cms-sdk";

initContentTypeRegistry([
  contentType({ key: "DynamicExperience", displayName: "Dynamic Experience", baseType: "_experience" }),
]);

const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY, { fragment: { dam: "off" } });

// Log what the SDK actually sends - the mismatch is visible without reaching Graph.
const inner = client.request.bind(client);
client.request = async (query, variables, ...rest) => {
  if (query.includes("GetContentMetadataByPath")) {
    console.log("  declares :", JSON.stringify([...query.matchAll(/\$(v\d+):/g)].map((m) => m[1])));
    console.log("  variables:", JSON.stringify(variables));
  }
  return inner(query, variables, ...rest);
};

for (const [label, variation] of [
  ["SOME", { include: "SOME", value: [process.argv[3]], includeOriginal: true }],
  ["ALL ", { include: "ALL" }],
]) {
  try {
    const items = await client.getContentByPath(process.argv[2], { variation });
    console.log(`${label} → ${items.length} item(s):`,
      items.map((i) => i?._metadata?.variation ?? "BASE").join(", "));
  } catch (e) {
    console.log(`${label} → THREW: ${e.message}`);
  }
}
```

```
  declares : ["v1"]                          <-- query declares $v1
  variables: {"path":"/","pathNoSlash":""}   <-- and is never given it
SOME → THREW: HTTP 500: Oops, something went wrong. Please report us with request id

  declares : []
  variables: {"path":"/","pathNoSlash":""}
ALL  → 5 item(s): investments, business, BASE, mortgages, personal
```

## Suggested fix

Forward the variation variables to the probe:

```diff
 // compiles to dist/esm/graph/operations.js - getContentByPath
-  await getContentMetaData(context, filter, queryOptions, undefined, varMode);
+  await getContentMetaData(context, filter, queryOptions, undefined, varMode, variationVars);

 // same file - getContentMetaData
-async function getContentMetaData(context, filter, queryOptions, previewToken, variationMode = 'none') {
+async function getContentMetaData(context, filter, queryOptions, previewToken, variationMode = 'none', variationVars = {}) {
   const variables = {
     ...filter.variables,
+    ...variationVars,
     ...(mayRenderForms && { withForms: true }),
   };
```

Carry `includeOriginal` through the mode into the clause:

```diff
 // compiles to dist/esm/graph/filters.js
 export function getVariationMode(variation) {
   if (variation.include === 'ALL') return 'all';
-  return { count: variation.value.length };
+  return { count: variation.value.length, includeOriginal: variation.includeOriginal ?? false };
 }

 export function getVariationClause(mode) {
   const values = Array.from({ length: mode.count }, (_, i) => `$v${i + 1}`).join(', ');
-  return `, variation: { include: SOME, value: [${values}] }`;
+  const original = mode.includeOriginal ? ', includeOriginal: true' : '';
+  return `, variation: { include: SOME, value: [${values}]${original} }`;
 }
```

I verified the first patch against 3.0.1 by injecting the missing `$vN` at the `request()` boundary: `include: 'SOME'` then succeeds instead of 500ing. That is how row 3 of the evidence table was produced.

**Suggested regression tests:** assert that every `$vN` a generated query declares is present in the variables sent with it — that catches Defect 1 and the whole class. For Defect 2, assert `includeOriginal: true` appears in the generated clause; no test exercises the option today, since no shipped `.js` references it.

## Workaround, and why this is easy to miss

Use `variation: { include: 'ALL' }` and pick the variation from the returned array yourself. `ALL` needs no variables (Defect 1 can't fire) and returns the base alongside the variations (Defect 2 is moot). The cost is the full variation set in every response — on our homepage, **20 KB → 124 KB**, roughly 6x.

Two reasons this can hide:

- **It only fails for a bucketed visitor.** If your app sends a variation filter only once a visitor has been assigned a variation, anonymous requests send no filter and every page renders fine. Ours 404'd only for real visitors, on one page.
- **A caught error looks like a missing page.** If a failed lookup is treated as "not found" rather than rethrown, the 500 becomes a silent 404 with nothing in the logs.
