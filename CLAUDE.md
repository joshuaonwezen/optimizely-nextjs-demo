# Optimizely Next.js Demo — Project Context

This is a Next.js 16 + Optimizely SaaS CMS + Feature Experimentation demo project for a retail banking brand (Mosey Bank). The `/demo/*` pages are SDK documentation — do not change their content or purpose unless explicitly asked.

---

## Seeding Content

Full runbook (prerequisites, instances, runner steps, expected warnings, gotchas): [docs/seeding.md](docs/seeding.md). Rules to keep in mind on every change:

- **Always seed through the runner** (`npm run seed:all`, the `/demo/management-api` seed tool, or `npm run seed:instances`), never individual scripts. It is a **non-destructive upsert** with stable keys; `--fresh` / `SEED_FRESH=1` is the destructive rebuild.
- **Compositions must be PATCHed after creation** - POST silently drops `composition`.
- **`POST /content/{key}/versions` copies the composition but NOT the properties bag.** Patching a subset and publishing wipes every other property. Use `patchPublishedPageProperties()` or `publishComposition({ properties })` from `scripts/_shared.ts`; `scripts/maintenance/repair-page-properties.ts` repairs damage.
- **Find drafts in the locale-scoped list** (`/content/{key}/locales/{locale}`), never the global `/versions` list, which mixes languages.
- **Route Management API and Graph calls in scripts through `apiFetch`** (429 backoff).
- **A permanently deleted content key stays reserved** (POST 409 / GET 404) - never delete-and-recreate at the same key.
- **Shared blocks live under "For All Applications"** (`SysContentFolder` `e56f85d0e8334e02976a2d11fe4d598c`), in the subfolders `ensureSubfolder()` creates.
- **Graph indexing lags ~30-60s** behind writes; scripts that look keys up in Graph skip/warn on a fresh seed.

## Management API

Authentication, payload format rules, error troubleshooting and a step-by-step guide to writing a new seed script: [docs/management-api.md](docs/management-api.md). The essentials: content writes need a dedicated API key with content access (CLI credentials only push config); every property value is `{ value: ... }` (`wrapProps()`); `richText` is `{ html }`; content areas are `[{ reference: "cms://content/{key}" }]`; experience roots need `layoutType: "outline"`.

## Optimizely Graph — Critical Gotchas

### `type: "content"` refs ARE inline-expanded - only `type: "contentReference"` is not
The axis is the property type, not single vs array. `type: "content"` reference properties are inline-expanded by Graph whether they are a single value or a `type: "array"` content area. The SDK's generated page query includes an inline fragment for every allowed component type (`handleContentProperty` in [queryUtils.js](node_modules/@optimizely/cms-sdk/dist/esm/util/queryUtils.js) expands `_component` into each concrete type via `resolveAllowedTypes`), so the block arrives fully typed in one `getContentByPath()` request - no self-fetch needed.

The type that returns only `{ key, url }` is `type: "contentReference"`. Graph types that field as `ContentReference`; inline fragments are rejected by the schema (`"objects of type ContentReference can never be of type AuthorBlock"`). Resolve the full item in the **parent** component with `getClient().getContent({ key })` - do not add self-fetching logic inside the child component:

```tsx
// src/components/pages/ArticlePage.tsx
export default async function ArticlePage({ content }) {
  // content.author is a type:"contentReference" - Graph returned only { key, url }
  const author = content.author?._metadata?.key
    ? await getClient()
        .getContent({ key: content.author._metadata.key })
        .catch(() => null)
    : null;

  return (
    // author is now the full AuthorBlock - OptimizelyComponent can dispatch it
    <article>{author && <OptimizelyComponent content={author} />}</article>
  );
}
```

Verified against Graph: querying a single `type:"content"` `featuredBlock` with an inline fragment returns the concrete type and its fields in one query; the same inline-fragment attempt on a `contentReference` is rejected by the schema. `getContent()` also accepts a `graph://` string from `_metadata.url.graph`, and an optional `{ previewToken }` option for preview mode.

### Caching a raw Graph query with `"use cache"`

**Wrap `graphClient().request()` in a `"use cache"` function and put `cacheTag`/`cacheLife` there.** That is the only mechanism for giving a Graph query its own tag or TTL.

Why the cache boundary has to be the function: `getClient().request(query, variables, previewToken?, cache?)` passes no `next` and no `cache` to its `fetch()` ([graph/index.js](node_modules/@optimizely/cms-sdk/dist/esm/graph/index.js), the `request` method) — its `cache` boolean only appends `?cache=` to the Graph URL, which controls **Graph's own CDN**. Next then applies `autoNoCache` to any fetch with no explicit cache config, so the call is never registered in the **fetch data cache** and `revalidateTag` cannot reach it. The same is true of `getContent()` and `getContentByPath()`, which route through `request()`.

That is a statement about the *fetch data cache only*. An earlier version of this file and `/demo/caching` claimed `request()` "cannot participate in Next.js ISR" — that is wrong. Its results are still captured by page-output ISR (`export const revalidate`), and during build-time prerendering the fetch **is** cached and shared between export workers.

`"use cache"` makes the distinction moot, because it caches the **function's return value** rather than the fetch, so `cacheTag`/`cacheLife` apply over any client:

```ts
async function fetchFooter(locale: string): Promise<GetFooterResult> {
  "use cache";
  cacheTag("footer");
  cachePublishedContent();              // src/lib/optimizely/cacheProfile.ts
  try {
    return await graphClient().request(GET_FOOTER_QUERY, { locale: [locale] });
  } catch (error) {
    return cachedQueryFailed("fetchFooter", error);   // logs, shortens the entry, returns {}
  }
}
```

Rules this imposes:

- **The `try`/`catch` goes INSIDE the cached function, not outside.** This is the opposite of the instinct and of what an earlier version of this file said. A rejected promise inside `"use cache"` fails static generation outright (*"Error occurred prerendering page"*) and **no `try`/`catch` at the call site can rescue it** — the boundary swallows the rejection first. The empty result of an outage is still **written into the cache entry**, so `cachedQueryFailed()` lowers that entry's lifetime to `revalidate: 30` / `expire: 300` (cacheLife keeps the smallest value per field; `expire` must not go below 300s or a prerender treats the entry as dynamic). Use it in every catch; the one deliberate exception is `GetSupportedLocales.ts`, whose failure is a permanent property of the instance. Call-site `try`/`catch` blocks are still worth keeping — after this change they only catch *mapping* errors.
- **Nothing keyed on unbounded user input goes inside a boundary.** Arguments are the cache key, so a `"use cache"` function taking a search phrase or a geocoded lat/lon mints a permanent entry per distinct input that is never read again. `/api/search`, `/api/search/autocomplete` and `getNearbyLocations()` all call `request()` directly for this reason; `getLocations()` (no arguments) is cached.

- **`experimental.useCache: true` must stay in `next.config.ts`.** `cacheTag()` throws `E886` without it. This is deliberately *not* `cacheComponents: true`, which would also force `ppr: true` and require Suspense boundaries around every dynamic read.
- **It forbids `export const runtime` anywhere in `app/`.** The build fails with *"Route segment config `runtime` is not compatible with `nextConfig.experimental.useCache`"*. Node is the default, so just omit it.
- **No `cookies()`, `headers()` or `draftMode()` inside a cached function** — it throws. Read dynamic data outside and pass it in as an argument.
- **Args and the return value must be serializable**, and args form the cache key: `fetchNavigationCached(undefined, "en")` keys as `["$undefined","en"]`.
- **Preview fetches stay outside the boundary.** A draft must never be cached, and a preview token is dynamic data. `getNavigation()` in `GetNavigation.ts` is the reference: the `previewToken` branch calls `request()` directly (with `cache: false` so Graph's CDN is bypassed too), and only the published branch goes through the cached function.
- **Use `graphClient()` from `src/lib/optimizely/graphClient.ts`, not `getClient()` directly**, in anything reachable from `layout.tsx`. `getClient()` throws when `config()` has not run, and `config()` lives in `componentRegistry.ts`, which only **page routes** import — so site chrome calling `getClient()` directly throws on every route that skips the registry (all of `/demo/*`) and silently degrades to static fallback data.
- `revalidateTag` **does** expire `"use cache"` entries, verified against the publish webhook with `NEXT_PRIVATE_DEBUG_CACHE=1` — the single-argument `revalidateTag` cast in `src/app/api/webhooks/route.ts` needed no change.

| Use case | Recommended method |
|---|---|
| Fetch a content item by key | `getClient().getContent({ key })` |
| Fetch a page by URL path | `getClient().getContentByPath(url)` |
| Custom query needing tag revalidation | `"use cache"` + `cacheTag` over `graphClient().request()` |
| Custom query, no caching wanted | `graphClient().request()` directly |
| Preview/draft content | `request()` with a `previewToken`, never inside `"use cache"` |

### What Graph inline-expands vs. what needs a self-fetch
`type: "content"` (single or `type: "array"`, e.g. `featuredBlock`, `faqItems`, `navItems`, `mainContent`) returns full typed fields from Graph in the page query. `type: "contentReference"` (single or array, e.g. `author`, `members`, `milestones`, and image fields) returns only `{ key, url }` and must be resolved by key in the parent. So: reach for `type: "content"` when you want Graph to inline the referenced block; expect a self-fetch only for `contentReference`.

### Navigation query strategies — one production, three demo-only
`src/lib/graphql/queries/` contains four navigation queries. Only one is used by the site chrome:

- `GetNavigation.ts` — **production**. Fetches the shared `Navigation` block (named `"Navigation Menu"`) by type via `Navigation(limit: 1)`; used by `NavigationHeader`. Use this pattern for new work.
- `GetNavigationFromHierarchy.ts`, `GetNavigationFromContentType.ts`, `GetNavigationFromFlags.ts` — reference implementations consumed only by the `/demo/navigation` comparison page. Do not wire these into site chrome.

### Variation filter always needs `includeOriginal: true`
Without it, visitors who don't match any variation key get no content at all. Always set:
```ts
variation: { include: "SOME", value: variationKeys, includeOriginal: true }
```

### CMS Variations cannot be CREATED via the API, but CAN be UPDATED once created in the UI
The `variation` field exists on `ContentMetadata` in the Graph schema, and `_Page` accepts a `VariationInput` filter. But the Management API (`POST /v1/content` and `POST /content/{key}/versions`) silently ignores the `variation` field on write — stored items always have `variation: null`.

The error `"Variations can only be created from existing versions"` appears for some request shapes but no REST API path can create a named variation. **Creating** a CMS Variation for a DynamicExperience page must be done in the Visual Builder UI (open page → Add variation → name it to match the FX variation key exactly).

**However, once a variation is created in the UI, you CAN update its composition programmatically.** Creating a variation in Visual Builder adds a new draft **version** of the content. Discover the version numbers with `GET /content/{key}/versions`, then PATCH the target version with your composition and publish it:

```ts
await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/merge-patch+json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ locale: "en", status: "published", composition }),
});
```

Workflow:
1. Create each variation in Visual Builder (each becomes a new draft version)
2. Find version numbers: `GET ${CONTENT_ENDPOINT}/${key}/versions`
3. PATCH the version with the correct composition + `status: "published"` to set the content and publish

The `demo_persona` cookie bypass (injecting the variation key directly into Graph's filter) works today even without CMS variations — Graph returns the original page via `includeOriginal: true` as the fallback until real variations exist in the CMS.

### Geo search IS supported — use a single `GeoPoint` field, not two floats

Geo search works in Optimizely Graph (a common misconception says it doesn't). The catch: geo operators (`distance`, `withIn`, `orderBy` by distance) only attach to a single field of `type: "GeoPoint"` — they do **not** work on two separate `lat`/`lon` `Float` fields. Trying them on plain floats returns nothing, which is why people conclude geo search is unavailable.

- Content Source schema: `location: { type: "GeoPoint" }`
- Data (with `useTypedFieldNames: true`): `"location$$GeoPoint": { lat, lon }`
- Query: `where: { location: { distance: { origin: { lat, lon }, radius, unit: KM } } }` and `orderBy: { location: { origin: { lat, lon } } }` (nearest-first, ASC default).

**The `radius` argument is typed `Int`, not `Float`.** A `$radius: Float` variable is rejected with `Variable "$radius" of type "Float" used in position expecting type "Int"`. Declare `$radius: Int` and round the value before passing it.

Graph returns only `location { lat lon }` — **no computed distance** — so compute the "X km away" label yourself with Haversine (see `src/lib/geo.ts`). Reference implementation: `BankLocation` source, `getNearbyLocations()` in `src/lib/graphql/queries/GetLocations.ts`, `/api/locations/nearby` (takes `?q=<place>&radius=<km>`, geocodes the place, then runs the geo query), and the `BranchFinderBlock` rendered on `/locations` and `/en/help/branches`. Both pages are bound to the **same** shared block by `scripts/seed-branch-finder.ts` (one block per instance - each CMS has its own key).

**The indexed URL of a root-level page depends on the instance's container setup.** On a BlankExperience/folder root (personal, harryNewCMS, mostinNewCMS, toddCMS, apjCMS) Graph indexes `/locations/` - bare, like `/about/` and `/mortgage/`, so several `// /en/...` comments in `PAGE_KEYS` are stale there. On a DynamicExperience-as-start-page root (joshCMS) the same page indexes as `/en/locations/`. Both answer at `/locations` because `buildUrlCandidates` in the catch-all tries `/en/{path}/` before `/{path}/` - so resolve pages by querying Graph for `url.default`, never by assuming either form.

---

## Content Type Definitions

### `allowedTypes` must be ContentType objects, not strings
```ts
// WRONG
allowedTypes: ["FaqItemBlock"]

// CORRECT
import { FaqItemBlockType } from "@/components/blocks/FaqItemBlock";
allowedTypes: [FaqItemBlockType]
```

TypeScript will surface this as: `Type '"FaqItemBlock"' is not assignable to type 'PermittedTypes'`.

### `type: "composition"` — extra Visual Builder compositions on an experience

An `_experience` type can declare extra properties of `type: "composition"`, each rendering as its own composition in the Visual Builder outline with its own `allowedTypes`/`restrictedTypes`. Undocumented as of 2026-09; everything below was established against the live API. `ProductLandingExperience` (personal instance only, see below) uses it for a locked top area, an open middle, and a locked bottom.

- **`format` is the layout type.** Without `format: "outline"` the editor fails with *"The composition property does not have a layout type configured."* `layoutType`/`layout` are rejected as unknown fields, `editorSettings.*` as "not a valid setting".
- **The layout type is immutable once the property holds content** — including content deleted with `?permanent=true`, and `cms-ignore-data-loss-warnings` does not override it. Merge-patch the property to `null`, then re-add it with `format` set.
- **Only on `_experience`.** `_page` returns *"only supported on Experience content types"*.
- **The built-in `composition` cannot be removed, hidden or renamed** (the name is reserved), and the outline always lists it **last**, whatever `sortOrder` the other properties use. Restrict it with the type-level `composition` config (`CompositionConfiguration`: `allowedTypes`/`restrictedTypes` only):
  ```js
  contentType({ key: "...", baseType: "_experience",
    properties: { topComposition: { type: "composition", format: "outline", allowedTypes: ["HeroBlock"] } },
    composition: { allowedTypes: ["ArticleListBlock", "FaqContainerBlock"] },  // the built-in one
  })
  ```
  So a three-area page is: two custom properties plus the built-in composition as the bottom.
- **Content is written through v1** as `properties.<name> = { value: <node tree> }`, the same outline node shape as the built-in composition. preview3 reads the value back as `null` and v1 omits it on a draft read — check the published version or Graph. **Never PATCH a content type through preview3**: it silently resets `allowedTypes` to `[]`.
- **Graph** types the field as `CompositionStructureNode`, but cms-sdk 2.2.0 has no handler for the property type and emits a bare scalar field, which Graph rejects ("must have a selection of subfields"). [compositionProperties.ts](src/lib/optimizely/compositionProperties.ts) patches `GraphClient.prototype.request` to append `{ ...ICompositionNode }`; `adminPreviewClient` overrides `request` on its instance, so it calls `rewriteCompositionQuery` itself. The same patch deepens the SDK's `ICompositionNode` fragment from 4 to 5 levels: a native form container nests section > step > row > column > element, so at the SDK's depth every form element arrived as an empty column.
- A permanently deleted content key stays reserved (POST 409 / GET 404), so reshuffling these properties means the seed needs a new key.

### Product Landing types - rolled out per instance

`ProductLandingExperience` and `ArticleListBlock` are **not** in `optimizely.config.mjs` or the
`src/components/**/*.tsx` glob: they live in [productLandingTypes.mjs](src/lib/optimizely/productLandingTypes.mjs)
(`.mjs` because the SDK typings do not know `type: "composition"`), so a normal `opti:push` never
carries them anywhere. Each instance gets them explicitly:

- `npx tsx scripts/push-product-landing-types.ts` pushes them to the instance the env vars point at and
  re-adds `ProductLandingExperience` to `DynamicExperience.mayContainTypes`. **A normal `opti:push` resets
  that list, so re-run this after one.** It skips any CMS without the `Composition` property format.
- `npx tsx scripts/product-landing-instances.ts [--only=id,id] [--dry-run]` does push + seed across every
  instance in `seedInstances.ts`.
- `npx tsx scripts/seed-product-landing.ts` seeds just the page; it skips instances that lack the type.
- `PRODUCT_LANDING_CMS_HOSTS` in [productLandingInstances.ts](src/lib/optimizely/productLandingInstances.ts)
  decides where the **app** registers the types (registry, `generateMetadata` SEO fragment). Add a host only
  after its push is done AND Graph's schema sync has caught up - registering types Graph does not know adds
  fragments for unknown types and breaks **every** page on that instance.
- Live on **every** instance as of 2026-09-16: personal, joshCMS, harryNewCMS, mostinNewCMS, kastleNewCMS,
  toddCMS and apjCMS. apjCMS only gained the `Composition` property format on 2026-09-16; before that its push
  skipped itself, which is what the capability check is for. On kastleNewCMS the seeded page stays a **draft**
  (approval workflow) until someone approves it.

**`POST /v1/manifest` answers 200 even when it imports nothing.** The body carries `outcomes` and `errors`
per section; a push that "succeeded" can create zero types. Always fail on `errors[]`.

**Import the types in phases.** Inside a single manifest, an experience's allowed composition types are
validated against what the CMS *already* has, not against types created in the same payload. Pushing
`ArticleListBlock` together with `ProductLandingExperience` fails on a fresh instance with *"The type
'ArticleListBlock' cannot be used in a 'outline, grid, form' layout composition"* plus *"Unable to find a
content type"* for the display template, and nothing is created. Push components first, then experiences,
then display templates, waiting for each to become visible (the import is eventually consistent).

### `compositionBehaviors` — elementEnabled vs sectionEnabled
- `"elementEnabled"` — leaf block, can be placed inside a grid column; cannot have content area (`type: "array"`) properties
- `"sectionEnabled"` — container block, can have content area properties; can NOT be placed inside a grid column

These constraints trap block designs on both sides:
- A content area on an `elementEnabled` block fails at push time: `"The property 'items' is not allowed when content type has ElementEnabled."` Declaring both behaviors does not help — the push still fails.
- A `sectionEnabled`-only block placed as an element (seed `elementComponent()`, or gridSection columns) fails at content creation: `400 "Only element enabled components are allowed within an section."`

So a block that must sit inside a grid column (anything used with `elementComponent()`) can never have a content area — use plain properties, or restructure so the container block is a section.

### Contracts (shared property sets) — `contract()` requires SDK 2.1.0+
`@optimizely/cms-sdk` 2.1.0 exports `contract()` for reusable property groups; content types implement a contract via `extends:` (single contract or array). On 2.0.0 the import fails at runtime — there, fall back to spreading a plain shared-properties object into each type.

```ts
import { contract, contentType } from "@optimizely/cms-sdk";

export const EditorialContentContract = contract({
  key: "EditorialContent",
  displayName: "Editorial Content",
  properties: {
    title:   { type: "string", displayName: "Title",   indexingType: "searchable", isLocalized: true },
    summary: { type: "string", displayName: "Summary", indexingType: "searchable", isLocalized: true },
  },
});

export const ArticlePageType = contentType({
  key: "ArticlePage",
  baseType: "_page",
  extends: [SEOContract, EditorialContentContract],   // contract fields inherited
  properties: {
    body: { type: "richText", displayName: "Body", indexingType: "searchable", isLocalized: true },
  },
});
```

Notes:
- `contract()` accepts only `key`, `displayName`, and `properties` (no `description`).
- Contracts are NOT registered in `initContentTypeRegistry` — `contentType()` merges contract properties into the type object at definition time, so the registry and generated Graph fragments already see the full property set.
- Export contracts from `optimizely.config.mjs` so `opti:push` creates them in the CMS.

See `optimizely.config.mjs` (SEOContract, EditorialContentContract) and `src/app/demo/contracts/page.tsx` for the full working pattern.

### `component` property type — inline embedded component
```ts
import { ButtonComponentType } from "@/components/blocks/ButtonBlock";

cta: {
  type: "component",
  contentType: ButtonComponentType,
  displayName: "CTA Button",
}
```
Unlike `type: "content"` (a reference), `type: "component"` embeds the component inline. Access its fields directly (`content.cta.label`) with `pa("cta.label")` for nested preview attributes.

### `mayContainTypes` — page/folder child constraints
For `_page`, `_experience`, and `_folder` base types, restrict what content can be created as children:
```ts
export const BlogPageType = contentType({
  key: "BlogPage",
  baseType: "_page",
  mayContainTypes: [ArticlePageType, "_self"],  // "_self" = same type
  properties: { ... },
});
```

### `RichText` component for richText properties
```tsx
import { RichText } from "@optimizely/cms-sdk/react/richText";

// Prefer json for full control:
<div {...pa("body")}>
  <RichText content={content.body?.json} />
</div>

// Or raw HTML:
<div {...pa("body")} dangerouslySetInnerHTML={{ __html: content.body?.html ?? "" }} />
```

Apply `pa("body")` to the wrapper `<div>`, NOT to the `<RichText>` component itself.

### `opti:push` requires explicit env var injection
`.env.local` is not auto-loaded by `opti:push`:
```bash
OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npm run opti:push
```

### Push content types to every instance — validate on `personal` first
Any `opti:push` of content-type definitions must land on **every** CMS instance, not just personal. The workflow:

1. **Validate on `personal`** — push with the base `.env.local` vars and confirm the types apply cleanly (and, for breaking changes, that `--force` was accepted). Verify the affected pages/queries still work.
2. **Push to all other instances** — re-run `opti:push` for each remaining instance (joshCMS, harryNewCMS, mostinNewCMS, …), injecting that instance's suffixed credentials as base names:
   ```bash
   OPTIMIZELY_CMS_CLIENT_ID=$OPTIMIZELY_CMS_CLIENT_ID_JOSHCMS \
   OPTIMIZELY_CMS_CLIENT_SECRET=$OPTIMIZELY_CMS_CLIENT_SECRET_JOSHCMS \
     npm run opti:push        # add `-- --force` for breaking changes
   ```

The canonical instance list lives in `src/lib/optimizely/seedInstances.ts`. A schema that exists on some instances but not others breaks Graph queries on the un-pushed ones (see the `indexingType` deploy-ordering note below) — allow for the ~10 min Graph schema-sync lag before deploying code that relies on the new schema.

**Do NOT pass `--host <app-url>` to `opti:push` on SaaS.** The credentials alone select the tenant: the CLI sends the token request and all API calls through the default SaaS gateway `https://api.cms.optimizely.com`, and the tenant is derived from the client credentials in the token. Passing `--host https://app-<slug>.cms.optimizely.com` makes the CLI classify it as a **PaaS** host (`isSaasApiGateway()` fails the `api*.cms.optimizely.com` regex) and POST `/oauth/token` to the app host, which fails with a misleading `Error: Something went wrong when trying to fetch token. Please try again` even though the same client_id/secret authenticates fine against `api.cms.optimizely.com/oauth/token` directly. So inject only `OPTIMIZELY_CMS_CLIENT_ID` / `OPTIMIZELY_CMS_CLIENT_SECRET` (as the examples above do) and omit `--host`. Reordering choices within an existing setting (e.g. `BACKGROUND` vs `BACKGROUND_NONE_DEFAULT`) is **not** a breaking change — it pushes without `--force`.

### New blocks are auto-discovered
`optimizely.config.mjs` globs `./src/components/**/*.tsx` — no manual config edit needed when adding a new block.

### CLI 2.0.0 — new commands
- `npm run opti:login` — verify credentials (`optimizely-cms-cli login`)
- `npx optimizely-cms-cli config pull` — download existing CMS content types and generate TypeScript files (use `--output ./src/content-types --group` to organize by base type)
- `npx optimizely-cms-cli content delete <Key>` — delete a single content type
- `npx optimizely-cms-cli danger delete-all-content-types` — ⚠️ destructive, clears all user-defined types

### `indexingType` — Graph indexing rules

Three values: `"searchable"` (full-text), `"queryable"` (filter/sort/aggregate), `"disabled"` (excluded from Graph index).

**Critical constraint**: `"searchable"` and `"queryable"` are only valid on **primitive** fields (`string`, `richText`, `integer`, `dateTime`, `boolean`, array of primitives). `contentReference` and `content` fields **only accept `"disabled"`** — the CMS rejects any other value at push time with:
> `Setting 'IndexingType.Queryable' is not allowed on property of type 'contentReference'. 'IndexingType' should be applied to primitive properties.`

| Value | Use on | Examples |
|---|---|---|
| `"searchable"` | Prose text users search (`string`, `richText`) | `heading`, `body`, `bio`, `description` |
| `"queryable"` | Filter/sort metadata (enum `string`, `dateTime`, `integer`) | `category`, `publishDate`, `navOrder` |
| _(omit)_ | `contentReference`/`content` image/asset fields | `image` on ImageBlock, `backgroundImage` on HeroBlock |

**Critical: do NOT set `indexingType: "disabled"` on any `contentReference`/`content` field whose target you need to render — on `_page` AND `_component` types. Omit `indexingType` entirely instead.**

The SDK's `createQuery` **removes** any property with `indexingType === "disabled"` before building its GraphQL fragment ([createQuery.js](node_modules/@optimizely/cms-sdk/dist/esm/graph/createQuery.js), the `props.filter(t.indexingType !== 'disabled')` line). This applies to page fragments **and** to the component fragments used inside composition/experience queries — so a disabled image reference on a `_component` is dropped from the query too and arrives `undefined` at render time. (This corrects an earlier claim that disabling was "harmless on components because properties are returned inline" — it is not; composition components are queried via these same filtered fragments.)

When the field is included (indexingType omitted) and DAM is enabled, the SDK attaches `image { key url { ...ContentUrl } ...ContentReferenceItem }`, so `data.image` returns `{ key, url: { default }, item: { Url, Renditions, AltText, ... } }`. Render it with `getPreviewUtils().src(ref)` (adds the preview token in edit mode) + `damAssets().getSrcset/getAlt`, falling back to `url.default` for CMS globalassets. On a non-DAM instance the same field returns just `{ key, url: { default } }` (no `item`) and renders via the `url.default` fallback. See ImageBlock / RenditionImageBlock / HeroBlock and the `/demo/media` page.

**Deploy ordering (learned the hard way):** removing `indexingType` from an existing reference is a **breaking change** that must be pushed with `opti:push --force` to **every CMS instance the code is deployed against** (personal, joshCMS, harryNewCMS, mostinNewCMS, …). A `disabled` field is absent from Graph's schema, so code that queries `image { … }` fails on any un-pushed instance with `Cannot query field "image" on type "ImageBlock"` — and because every page's query embeds all component fragments, that error takes down **every page**, not just image pages. Graph exposes the field only after a **~10 min schema-sync lag** following the push. So: push the schema to all instances and wait for the sync **before** deploying code that queries the newly-enabled field.

### `isLocalized: true` — per-language field values

Add `isLocalized: true` to any field whose value should differ by language (user-visible text shown to site visitors).

**Localize**: `string` and `richText` prose fields — headings, body copy, labels, alt text, placeholders, button text, option lists.

**Do NOT localize**: URLs (`href`, `src`), booleans, integers, dates, enum discriminators (`variant`, `inputType`, `rendition`, `icon`), technical identifiers (`fieldName`, `key`).

**Breaking change**: Adding `isLocalized: true` to an **existing** field requires `--force`:
```bash
OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npm run opti:push -- --force
```
The CMS will warn: `"The changes to 'TypeName' are considered breaking and could potentially result in data loss."` This is expected — proceed with `--force`.

---

## CMS Categories (Taxonomy)

See [docs/categories.md](docs/categories.md). Key traps: term keys cannot contain hyphens; a term's parent is immutable; `categories` is a built-in version property; Graph reads it from `_itemMetadata.categories`, NOT `_metadata`; `GET /terms` returns only roots unless you pass `parent`.

## Feature Experimentation (FX)

### Primary API: `getOptimizelyUser()`
Use `getOptimizelyUser()` from `src/lib/optimizely/user.ts` in server components. It reads cookies (`optimizelyEndUserId`, `demo_persona`, `demo_bucketing_id`) plus the `User-Agent` header for `device`, and creates the SDK user context once per request via React `cache()`. Call `user.decide(flagKey)` or `user.decideAll()` — no userId or attributes to thread through manually.

```ts
const user = await getOptimizelyUser();
const decision = user.decide("my_flag");        // single flag, impression suppressed
const decisions = user.decideAll();              // all flags, impressions suppressed
user.decide("my_flag", []);                      // fire impression (empty options = no DISABLE_DECISION_EVENT)
```

For component-specific extra attributes, spread after `getVisitorContext()`:
```ts
const { userId, attributes } = await getVisitorContext();
await getDecision("my_flag", userId, { ...attributes, plan: "premium" });
```

### User ID must be stable across requests
Use the `optimizelyEndUserId` cookie set by middleware — never generate a new UUID per request. Unstable IDs mean users get randomly re-bucketed on every page load.

### Impressions are suppressed by default
`user.decide()` and `user.decideAll()` use `DISABLE_DECISION_EVENT` by default. Call `user.decide(flagKey, [])` (empty options array) in the component that actually renders the variant to fire the impression.

### CMS Variation names must exactly match FX variation key strings
Case-sensitive. If the FX flag has variation key `variation_1`, the CMS variation must be named exactly `variation_1`. A mismatch means the variation is never served.

### FX datafile has 60s cache
Changes in the FX console take up to 60 seconds to propagate. Wait before concluding a flag isn't working.

### Middleware rewrite — non-CMS routes must be excluded
The middleware appends variation segments to the URL path (e.g. `/savings/__v_homepage--business`) so each ISR cache key is stable per bucket. Any route that is NOT a CMS page must be excluded from this rewrite or it will 404: the rewritten path won't match its Next.js route and will fall through to the `[[...slug]]` catch-all, which calls `notFound()`.

Current exclusions in `src/middleware.ts`:
```ts
if (pathname.startsWith("/api/")) return response;
if (pathname.startsWith("/preview")) return response;
if (/^\/demo(\/|$)/.test(pathname)) return response;
if (pathname.includes(".segments/")) return response;
```

A path that already contains `__v_` was requested directly (middleware never sees its own rewrites). Segments the FX datafile knows are kept, anything else is 307-redirected away, and the `opti_wx_variation` cookie is validated the same way - so visitors cannot mint arbitrary ISR entries. Segment parsing/formatting lives in `src/lib/optimizely/variationPath.ts`, shared by middleware and the catch-all page.

Add a similar early-return whenever a new non-CMS route is introduced (landing pages, auth flows, etc.).

---

## Graph Caching

| Content | Mechanism | TTL | Tag | Revalidation |
|---------|-----------|-----|-----|-------------|
| Published pages | page-output ISR | `revalidate: 3600` | `"page"` | Publish webhook |
| The homepage `/` alone | **none** — its ODP branch calls `noStore()` | — | — | Server-rendered per request |
| Site chrome + content data | `"use cache"` + `cacheTag` | `cacheLife({ revalidate: 3600 })` | `"navigation"` / `"footer"` / `"settings"` / `"banner"` / `"quotes"` / `"quote-blocks"` / `"redirects"` / `"locations"` / `"page"` | Publish webhook |
| FX datafile | fetch-level `next` options | `next: { revalidate: 60 }` | — | Automatic |
| Search, autocomplete, nearby-branch lookup | uncached — args are unbounded user input | — | — | Never cached (Graph's own CDN still applies) |
| Draft/preview | uncached, outside any cache boundary | — | — | Never cached |

Time-based TTL is 1 hour (`CACHE_TTL = 3600` in `src/lib/optimizely/client.ts`) across page output, site chrome, and content data — it is the single source of truth, feeding both `cacheLife({ revalidate })` and the catch-all's `export const revalidate`. No Graph query uses fetch-level `next` options any more; the SDK client discards them (see above), so the FX datafile is the only remaining fetch-level consumer. Freshness is driven by the publish webhook (`revalidatePath`/`revalidateTag`); the 1-hour window is only the fallback ceiling. The FX datafile stays at 60s (see below) and search/preview stay uncached — those are deliberately excluded from the 1-hour policy.

Every tag lives in `CACHE_TAGS` (`src/lib/optimizely/cacheProfile.ts`), and `src/app/api/webhooks/route.ts` revalidates all of them. **Always call `cacheTag(CACHE_TAGS.x)`, never a string literal** - a new tag added anywhere else would have no webhook line and silently pin that data to the 1-hour ceiling.

For a new manual query, write a `"use cache"` function over `graphClient().request()` — see the section above.

### `_metadata.url.graph` — graph:// reference string
Every content item's `_metadata.url` now includes a `graph` field (e.g. `graph://cms/Page/abc123?loc=en`). Pass it directly to `getClient().getContent(graphRef)` to fetch that item without constructing a `GraphReference` object manually.

### External preview links — `/preview/share`

Lets editors share a link that opens a **draft** in the front end for people with **no CMS login**.

- The CMS `preview_token` is a ~5 min JWT and Optimizely provides **no way to extend it or mint a stable one**. Instead the draft is fetched with **App Key + Secret Basic auth** (`OPTIMIZELY_APP_KEY` / `_SECRET`) — Optimizely Graph treats that as super-user and returns content of any publish status, with no expiry. Those creds stay server-side only.
- The shareable URL carries **no Graph credential** — just `key` / `loc` / optional `ver` plus an HMAC-SHA256 `sig` signed with `OPTIMIZELY_PREVIEW_SECRET` (`src/lib/preview/shareLink.ts`). The signature only stops a recipient from editing the query string to pull other content keys. **Links never expire; rotating `OPTIMIZELY_PREVIEW_SECRET` is the kill switch** for every outstanding link.
- `src/lib/optimizely/adminPreviewClient.ts` is a `GraphClient` with its private `request()` monkey-patched to force the Basic header (same instance-patch pattern as `previewClient.ts`), so the full `getPreviewContent` pipeline runs unchanged over super-user auth. Shared DAM re-probe lives in `graphPreviewPatches.ts`.
- `src/app/preview/share/page.tsx` renders read-only — no `communicationinjector.js`, no `NextPreviewComponent`, no debug overlay. Covered by the existing `/preview` middleware exemption.
- `src/components/preview/PreviewToolbar.tsx` is one client component: a **Share link** button (one click → `copyToClipboard()` copies the signed pinned link; falls back to `execCommand` because the CMS iframe withholds the `clipboard-write` permission) and a diagnostics pill whose panel expands **inside the bar**. It is **portalled into `<div id="preview-topbar-slot">`** (declared first in `src/app/layout.tsx`, so the bar sits above the site nav at the very top). Nothing is `fixed`/`sticky` (both strand at the document bottom inside the CMS preview iframe) and nothing floats over the content. Visitor chrome is stripped on `/preview`: `AudienceSwitcher` via `DemoToolbar`, the FX/ODP banners via `HideOnPreview` in the layout.

### `damAssets` — DAM image/video/file utilities (SDK 2.0.0)
```ts
import { damAssets } from "@optimizely/cms-sdk";

const { getSrcset, getAlt, isDamImageAsset } = damAssets(content);
// getSrcset(content.image) → responsive srcset string with preview tokens in edit mode
// getAlt(content.image, "fallback") → AltText from DAM or fallback
// isDamImageAsset / isDamVideoAsset / isDamRawFileAsset → TypeScript type guards
```

### CMP CDN resize `action` must be lowercase
The on-the-fly resize params on `*.cmp.optimizely.com` URLs (via `damImageUrl` / `buildDamSrcset` in `src/lib/optimizely/damImage.ts`) require the `action` value to be **lowercase**: `crop | padding | border | crop+rescale`. Title-case (`action=Crop`) returns `400 Invalid action. Allowed: padding, crop, border, crop+rescale`. Optimizely's support article spells them title-case in prose — that casing is wrong vs. the live API. `damImageUrl` lowercases the value defensively, but always pass lowercase in code. `center_width`/`center_height` (0-100 % focal point) are unaffected; there is no format/quality param.

`getPreviewUtils` also now returns a `src(contentRef)` helper that appends the preview token to a single DAM image URL. Destructure it alongside `pa`:
```ts
const { pa, src } = getPreviewUtils(content);
<Image src={src(content.backgroundImage)} />
```

---

## External Content Sources (Content Source API)

See [docs/content-source-api.md](docs/content-source-api.md). Key traps: data indexing needs account activation (200 + journalId while nothing indexes); a 200-but-0-indexed source with activation means a corrupted mapping - delete the source (`id` REQUIRED, an empty id deletes all sources) and re-register; `_rbac` is the string `"r:Everyone:Read"`; auth needs app key AND secret.

## Project Structure

```
src/
  app/[[...slug]]/     — catch-all route, evaluates FX flags → passes variation keys to Graph
  app/demo/            — SDK documentation pages, do NOT change content unless explicitly asked
  components/blocks/   — each block: index.tsx (content type + display templates + component)
  lib/optimizely/
    client.ts          — CACHE_TTL only, the shared 1-hour TTL constant
    graphClient.ts     — graphClient() — getClient() that is guaranteed configured; use it in anything reachable from layout.tsx
    auth.ts            — OAuth token cache for Management API
    experimentation.ts — FX SDK wrapper (low-level: getOptimizelyClient, getDecision, etc.)
    fxAttributes.ts    — buildFxAttributes() - the one attribute set for middleware, server and browser decisions
    cookieNames.ts     — optimizelyEndUserId / demo_* cookie names (the literal names must not change)
    cacheProfile.ts    — CACHE_TAGS, cachePublishedContent(), cachedQueryFailed()
    variationPath.ts   — __v_flag--variation URL segment parse/format + datafile validation
    visitor.ts         — getVisitorContext() — reads optimizelyEndUserId, demo_persona, demo_bucketing_id cookies; derives device from User-Agent
    user.ts            — getOptimizelyUser() — combines visitor context + SDK into one cached helper
    componentRegistry.ts — registers all content types + React components (derived from BLOCK_MODULES)
  lib/graphql/
    queries/           — named Graph queries with fallback data
scripts/
  seed-*.ts            — Management API content creation scripts
  seed-quotes.ts       — Content Source API (external data, not Management API)
  maintenance/         — one-off repair / diagnostic scripts (not run by the seed runner)
docs/                  — seeding runbook, Management API, categories, Content Source API references
```

---

## Code Style Anti-Patterns

Do not introduce these patterns — they were cleaned up in a codebase pass and should not reappear.

### `// ---` divider comments
```ts
// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------
```
This is an AI code-generation artifact. File structure (constants → helpers → page export) is self-evident. Never use horizontal rule comments as section dividers.

The ban is on the horizontal-rule *decoration*, not on section comments themselves. A plain single-line comment (e.g. `// Part 2 — Create FaqContainerBlock referencing all FAQ items`) is fine — keep or add one wherever it genuinely helps a reader (human or Claude) understand what a section does; drop labels that restate the obvious (`// Main` above `main()`).

### Multi-line JSDoc file headers on utility modules
```ts
/**
 * Optimizely Graph client.
 *
 * Provides a thin fetch wrapper for making authenticated GraphQL requests
 * to the Optimizely Graph delivery API. Supports two authentication modes...
 */
```
File names and exports already communicate purpose. Remove these on sight.

### `export const dynamic` before imports
```ts
// WRONG — non-standard placement
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
```
Route config exports (`dynamic`, `revalidate`) belong after imports, before the page function.

### Module-level constants defined inside functions
```ts
// WRONG
export default async function CmsPage() {
  const KEY_QUERY = /* GraphQL */ `query FindPageKey(...) { ... }`;
  // ...
}
```
All query strings and constant data belong at module level so the file is scannable: constants at the top, logic in functions.

### Missing `data-component` attribute

Every component's outermost rendered element must have `data-component="ComponentName"` as its first attribute. This enables client-side scripts to target components reliably without coupling to class names (e.g. `document.querySelector('[data-component="HeroBlock"]')`). Apply it to all components in `src/components/` — blocks, layout, demo, pages, and experience. Skip components that render `null` or are effect-only.

### `data-track-view` — component visibility tracking

Add `data-track-view="ComponentName"` to the outermost rendered element of any block that is a significant content section (hero, CTA, product feature, pricing, etc.). `AutoTracker` observes all elements with this attribute via `IntersectionObserver` and fires `mb_feature_viewed` with `{ component, depth: 50 | 100 }` at 50% and 100% visibility thresholds. Each fires at most once per element per page load — no spam, no scroll listener overhead.

```tsx
<section
  data-component="MyBlock"
  data-track-view="MyBlock"
  className="..."
>
```

Place it on the same element as `data-component`. Skip it on utility/layout components (navigation, footer, wrappers) and on components that render `null` or are effect-only.

### Em dashes in prose and code comments
Do not use em dashes (`—`) anywhere in the demo pages: prose, JSX text, code snippet strings, or code comments. Use a regular hyphen with spaces (` - `) instead. Em dashes read as an AI-generation artifact.

---

## Adding a New Block — Checklist

1. `src/components/blocks/<Name>/index.tsx` — export exactly one `NameType` (`contentType()`), its `displayTemplate()`s, and the component as the default export. Add `data-component="Name"` as the first attribute on the outermost rendered element of the default export.
2. `src/lib/optimizely/componentRegistry.ts` — one import and one entry: `import * as NameModule from "@/components/blocks/Name";` plus `NameModule` in `BLOCK_MODULES`. The registry derives the content type, every display template and the component (keyed by the type's `.key`) from the module's exports; it throws if the module exports zero or several content types.
3. `scripts/cleanup-types.ts` — two edits (prevents accidental CMS deletion):
   - Add the type's `.key` string (e.g. `"MyBlock"`) to the `KEEP` set — use the actual `.key` value from `contentType({ key: "..." })`, **not** the TypeScript variable name
   - If the block exports display template variants, add each template's `.key` string (e.g. `"MyBlockCompactTemplate"`) to `KEEP_TEMPLATES`
4. Run `npm run opti:push` with credentials injected

### Adding a display template to `optimizely.config.mjs`

When adding a `displayTemplate({ key: "MyTemplate", ... })` to `optimizely.config.mjs`, also add `"MyTemplate"` to `KEEP_TEMPLATES` in `scripts/cleanup-types.ts`. Templates absent from `KEEP_TEMPLATES` (and whose key doesn't appear in `src/`) will be deleted the next time cleanup runs.

---

## Display Templates — Conventions

Every new block component must export at least one `displayTemplate()` alongside its `contentType()`. Add templates in the same `index.tsx` as the content type definition.

### Naming rules (for a non-technical editor audience)

- **Template `displayName`**: plain English describing the visual layout, e.g. "Default", "Card", "Compact", "Horizontal card". Never include "Template", "Block", or technical class names.
- **Setting `displayName`**: a label the editor would understand without any CMS knowledge, e.g. "Background color", "Heading size", "Text alignment".
- **Choice `displayName`**: plain English only. Never expose CSS class names or design token names:
  - Use "White" not "Surface (white)"
  - Use "Blue" not "Brand blue"
  - Use "Off-white" not "surfaceLow"
  - Use "Extra large (H1)" not "xl" or "5xl"
  - Use "None" not "Transparent"

### Shared settings library

Import from `src/components/blocks/_shared/displayTemplateSettings.ts` rather than defining the same settings inline. Spread the constants directly into the `settings` object:

```ts
import { BACKGROUND, HEADING_SIZE, TEXT_ALIGN, FONT_STYLE } from "../_shared/displayTemplateSettings";

export const MyBlockCardTemplate = displayTemplate({
  key: "MyBlockCardTemplate",
  settings: {
    ...BACKGROUND,
    ...HEADING_SIZE,
    ...TEXT_ALIGN,
    ...FONT_STYLE,
    // block-specific settings below
    showIcon: { editor: "checkbox" as const, displayName: "Show icon", sortOrder: 10, choices: {} },
  },
});
```

Available shared constants: `BACKGROUND`, `BACKGROUND_NONE_DEFAULT`, `BACKGROUND_BRAND_DEFAULT`, `BACKGROUND_OFFWHITE_DEFAULT`, `TEXT_COLOR`, `HEADING_SIZE`, `HEADING_SIZE_CARD`, `TEXT_ALIGN`, `FONT_STYLE`, `TEXT_SIZE`.
Helpers: `withDefault(SETTING, "choice")` returns a copy with that choice at sortOrder 0 (see below), `isChecked(ds, "key")` reads a checkbox.
Tailwind class lookup maps: `BG_CLASSES`, `HEADING_CLASSES`, `FONT_CLASSES`, `TEXT_SIZE_CLASSES`, `TEXT_ALIGN_CLASSES`.

### `BACKGROUND` vs `BACKGROUND_NONE_DEFAULT` — which background default

Both expose the same eight color choices; they differ only in which one sits at `sortOrder: 0`, and **the `sortOrder: 0` choice is the default the CMS materializes into `displaySettings` when the editor never touches the control** (same mechanic as `HEADING_SIZE_CARD`). That materialized value wins in `resolveStyleClasses`'s `pick()` over the block's own code fallback, so the `sortOrder: 0` choice — not the code fallback — is what an untouched block actually renders.

- `BACKGROUND` — **White** is the default. Use on **card / solid blocks** that should paint their own surface when unset: ProductCard, Quote, Testimonial, TeamMember, Author, Spotlight, Callout, FeatureItem, FaqItem, PricingTier, StatsCounter, CustomerVoices, Hero, ProductHero, FeaturedContent.
- `BACKGROUND_NONE_DEFAULT` — **None** (transparent, `BG_CLASSES.transparent` emits an empty wrapper) is the default, so an untouched block inherits the parent section's background instead of a white card. Use on **flat / content blocks** that should blend into their section: SectionHeading, RichText, LogoGrid, TeamGrid, Timeline, TimelineMilestone, Image, RenditionImage, ComparisonTable, ContactForm, BranchFinder, FaqContainer, RawHtml, CallToAction, OutcomeItem.

**When the intended default is anything else, wrap the setting in `withDefault()`** (e.g. `...withDefault(HEADING_SIZE, "lg")`) so the CMS default agrees with the code fallback. It only reorders choices - keys stay the same, so stored values are never orphaned - and it only affects nodes created afterwards. `optimizely.config.mjs` cannot import the shared `.ts` file (`opti:push` loads it with a plain Node `import()`), so it keeps its own inline copy of `TEXT_COLOR`.

Rule of thumb: if the block's `resolveStyleClasses(ds, { background: "transparent" })` code fallback is already `transparent`, spread `BACKGROUND_NONE_DEFAULT` so the CMS default agrees with the code. Both templates keep every color selectable — this only changes the untouched default. Changing which constant a block spreads is a display-template change → `opti:push` to every instance (see below).

### Choosing which settings to include per block

- Any block with a visible heading or title - add `HEADING_SIZE` and `FONT_STYLE`
- Any card / solid block that paints its own surface - add `BACKGROUND` (White default)
- Any flat / content block that should inherit its section's background - add `BACKGROUND_NONE_DEFAULT` (None default)
- Any block with multi-line text content - add `TEXT_ALIGN`
- Any block with prose or body text - add `TEXT_SIZE`
- Any **section-level** block (placed directly on the page, so no BlankSection spacing applies) - add `SPACING` and `CONTENT_WIDTH`, plus `COLUMNS` if it lays items out in a grid. Also add heading size and alignment for its header (`BlockHeader` takes `headingSize={style.heading}` and `align={style.align}`)
- Any element block with fixed vertical padding - add `SPACING`

### Layout settings: "Standard" means the block's own layout

`SPACING`, `CONTENT_WIDTH` and `COLUMNS` differ per block, so their first choice is "Standard". Read them with `spacingClass(ds, "py-20")`, `widthClass(ds, "max-w-3xl")` and `columnsClass(ds, "sm:grid-cols-2 lg:grid-cols-3")`, passing the block's current class as the standard. Stored content that never set them keeps rendering unchanged. When adding a heading size to a block whose current size isn't one of `HEADING_CLASSES`, only use `style.heading` when `ds.headingSize` is set (see BranchFinder/ContactForm).

### Placement: section vs element

`GridComponentWrapper` passes `placement="element"` to every block inside a row/column; blocks at the composition root get no prop (a section). A block enabled for both that brings its own page container (`max-w-* mx-auto px-8`) must wrap it in `pageContainer(props.placement, "...")`, because the row already centers and pads. See ImageBlock, TextBlock, FaqItemBlock, RawHtmlBlock.

Rows have `columnRatio` (two-column rows only), and columns have `contentAlign`.

### Template variants

If a block has more than one visual layout (e.g. card vs minimal, horizontal vs vertical), create a separate `displayTemplate()` for each with a `tag` value matching the resolver entry in `componentRegistry.ts`. Always set one template as `isDefault: true`.

Registering the block module is enough: every block renders all of its own templates (branching on `props.displayTemplateKey`), so `componentRegistry.ts` has no per-tag entries.

**SDK 2.2.0 never passes `displayTemplateKey` to a component** - `OptimizelyComponent` forwards only `content` and `displaySettings`. The key is injected by the wrappers in `src/components/experience/CompositionExperience.tsx`: `NodeWrapper` (every `OptimizelyComposition`) and `GridComponentWrapper` (`OptimizelyGridSection` in `BlankSection.tsx`). Any new composition renderer must pass one of them as `ComponentWrapper`, or every variant silently renders as the default. Until 2026-09-17 this was missing and no variant had ever rendered on a CMS page.

Only add a template when the **layout** changes (different markup/structure). A variant that only changes one style - alignment, a background, rounded corners, width - is a setting on the default template instead. Duplicated templates with identical settings were folded into settings on 2026-09-17 (SectionHeading Centered, FeatureItem Outlined/Brand, OutcomeItem Brand, Image Rounded, Text Narrow, LogoGrid Color, ProductCard Featured).

### Checkbox settings arrive as "True"/"False"

Graph returns checkbox values as the capitalised strings `"True"`/`"False"`, and the SDK's `parseDisplaySettings` only converts lowercase `"true"`/`"false"`. So `ds.x === true` never fires and `ds.x !== false` is always true. **Always read checkboxes with `isChecked(ds, "key")`.** Name checkboxes so unticked (the stored default) is the historic look - e.g. ProductCard's "Hide icon", not "Show icon".

### Checking template usage before removing one

`npx tsx scripts/maintenance/template-usage.ts --removed=KeyA,KeyB` counts which templates published experiences use on every instance and lists nodes still pointing at the given keys. Delete a template from an instance with `DELETE /v1/displaytemplates/{key}` only once nothing uses it there - `opti:push` never deletes templates.

### cleanup-types.ts

When adding a new display template, add its `.key` string to `KEEP_TEMPLATES` in `scripts/cleanup-types.ts`. Templates absent from this set will be deleted by the cleanup script on the next run.

---

