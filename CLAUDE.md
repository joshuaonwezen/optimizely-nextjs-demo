# Optimizely Next.js Demo — Project Context

This is a Next.js 16 + Optimizely SaaS CMS + Feature Experimentation demo project for a retail banking brand (Mosey Bank). The `/demo/*` pages are SDK documentation — never change their content or purpose.

---

## Optimizely Graph — Critical Gotchas

### Single content references are NOT inline-expanded
`type: "content"` single reference properties on pages return only base metadata from Graph — regardless of whether the field is set. Graph only inline-expands `type: "array"` content areas.

Do not try to detect whether a reference is set from its returned value — the value looks the same whether set or unset. Use URL-based detection instead:

```tsx
// In TraditionalPage.tsx — detect by URL, not by featuredBlock value
{content._metadata?.url?.default?.includes("/faqs") && (
  <FaqContainerBlock content={{}} />
)}
```

For components that need their own data, two options:

**Option A — self-fetching pattern** (call `graphqlFetch` inside the component when `!data.heading`). See `src/components/blocks/FaqContainerBlock/index.tsx`.

**Option B — `getContent()` by key** (SDK 2.0.0+): the base metadata returned for a single reference includes `_metadata.key`. Use `getClient().getContent({ key })` to fetch the full item:

```ts
import { getClient } from "@optimizely/cms-sdk";

export default async function FaqContainerBlock({ content }) {
  let data = content;
  if (!data.heading && data._metadata?.key) {
    data = await getClient().getContent({ key: data._metadata.key });
  }
  // render...
}
```

`getContent()` also accepts a `graph://` string from `_metadata.url.graph`, and an optional `{ previewToken }` option for preview mode.

### Content area arrays ARE inline-expanded
`type: "array"` content areas (e.g., `faqItems`, `navItems`) return full typed fields from Graph. Use arrays when you need Graph to resolve referenced content.

### Variation filter always needs `includeOriginal: true`
Without it, visitors who don't match any variation key get no content at all. Always set:
```ts
variation: { include: "SOME", value: variationKeys, includeOriginal: true }
```

### CMS Variations cannot be CREATED via the API, but CAN be UPDATED once created in the UI
The `variation` field exists on `ContentMetadata` in the Graph schema, and `_Page` accepts a `VariationInput` filter. But the Management API (`POST /preview3/experimental/content` and `POST /content/{key}/versions`) silently ignores the `variation` field on write — stored items always have `variation: null`.

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

See `scripts/update-homepage-variations.ts` for a full working example.

The `demo_persona` cookie bypass (injecting the variation key directly into Graph's filter) works today even without CMS variations — Graph returns the original page via `includeOriginal: true` as the fallback until real variations exist in the CMS.

---

## Management API — Content Format Rules

### Content area references must use the `reference` object format
```ts
// CORRECT
faqItems: [{ reference: "cms://content/abc123" }]

// WRONG — both will error
faqItems: ["cms://content/abc123"]
faqItems: [{ key: "abc123" }]
```

Error for wrong format: `"A content component must have either 'reference' or 'contentType' and 'properties' set"`

### Single content reference properties
```ts
featuredBlock: { reference: "cms://content/abc123" }
```

### Management API base URL
`${OPTIMIZELY_CMS_URL}/preview3/experimental/content`

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

### `compositionBehaviors` — elementEnabled vs sectionEnabled
- `"elementEnabled"` — leaf block, cannot have content area (`type: "array"`) properties
- `"sectionEnabled"` — container block, can have content area properties

Adding a content area to an `elementEnabled` block will be silently ignored or rejected by the CMS.

### `contract()` — reusable property sets (SDK 2.0.0)
Use `contract()` to define shared property groups (SEO fields, authoring metadata, etc.) that multiple content types can extend:

```ts
import { contract } from "@optimizely/cms-sdk";

export const SEOContract = contract({
  key: "seo",
  displayName: "SEO Properties",
  properties: {
    metaTitle:       { type: "string", displayName: "Meta Title", maxLength: 60 },
    metaDescription: { type: "string", displayName: "Meta Description", maxLength: 160 },
    ogImage:         { type: "contentReference", allowedTypes: ["_image"] },
  },
});

// Extend in a content type:
export const ArticlePageType = contentType({
  key: "ArticlePage",
  baseType: "_page",
  extends: SEOContract,  // single or array: extends: [SEOContract, AuthorContract]
  properties: { heading: { type: "string" } },
});
```

Register contracts in `initContentTypeRegistry` before the types that extend them.

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

### New blocks are auto-discovered
`optimizely.config.mjs` globs `./src/components/**/*.tsx` — no manual config edit needed when adding a new block.

### CLI 2.0.0 — new commands
- `npm run opti:login` — verify credentials (`optimizely-cms-cli login`)
- `npx optimizely-cms-cli config pull` — download existing CMS content types and generate TypeScript files (use `--output ./src/content-types --group` to organize by base type)
- `npx optimizely-cms-cli content delete <Key>` — delete a single content type
- `npx optimizely-cms-cli danger delete-all-content-types` — ⚠️ destructive, clears all user-defined types

---

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
The middleware appends variation segments to the URL path (e.g. `/savings/__v_homepage_audience--variation_1`) so each ISR cache key is stable per bucket. Any route that is NOT a CMS page must be excluded from this rewrite or it will 404: the rewritten path won't match its Next.js route and will fall through to the `[[...slug]]` catch-all, which calls `notFound()`.

Current exclusions in `src/middleware.ts`:
```ts
if (request.nextUrl.pathname.startsWith("/api/")) return response;
if (request.nextUrl.pathname.startsWith("/preview")) return response;
if (/^\/demo(\/|$)/.test(request.nextUrl.pathname)) return response;
if (request.nextUrl.pathname.includes(VARIATION_MARKER)) return response;
```

Add a similar early-return whenever a new non-CMS route is introduced (landing pages, auth flows, etc.).

---

## Graph Caching

| Content | TTL | Tag | Revalidation |
|---------|-----|-----|-------------|
| Published pages | `revalidate: 60` | `"page"` | Publish webhook |
| Navigation | `revalidate: 300` | `"navigation"` | Publish webhook |
| External content | `revalidate: 60` | source-specific | Re-sync script |
| Draft/preview | `no-store` | — | Never cached |

Use `graphqlFetch` from `src/lib/optimizely/client.ts` for all manual queries — it handles auth mode (published vs draft) automatically.

### `_metadata.url.graph` — graph:// reference string
Every content item's `_metadata.url` now includes a `graph` field (e.g. `graph://cms/Page/abc123?loc=en`). Pass it directly to `getClient().getContent(graphRef)` to fetch that item without constructing a `GraphReference` object manually.

### `damAssets` — DAM image/video/file utilities (SDK 2.0.0)
```ts
import { damAssets } from "@optimizely/cms-sdk";

const { getSrcset, getAlt, isDamImageAsset } = damAssets(content);
// getSrcset(content.image) → responsive srcset string with preview tokens in edit mode
// getAlt(content.image, "fallback") → AltText from DAM or fallback
// isDamImageAsset / isDamVideoAsset / isDamRawFileAsset → TypeScript type guards
```

`getPreviewUtils` also now returns a `src(contentRef)` helper that appends the preview token to a single DAM image URL. Destructure it alongside `pa`:
```ts
const { pa, src } = getPreviewUtils(content);
<Image src={src(content.backgroundImage)} />
```

---

## External Content Sources (Content Source API)

### `searchable: true` fields return null on direct retrieval
Fields marked searchable are indexed for full-text search but not stored as regular properties. Duplicate the field without `searchable: true` if you need to retrieve it in a query.

### NdJSON sync format
Each line must be a valid JSON object. Use `items.map(i => JSON.stringify({...})).join("\n")` — never pretty-print.

### Auth for Content Source API
```ts
Authorization: `Basic ${btoa(`${GRAPH_APP_KEY}:`)}`  // note the trailing colon
```

---

## Project Structure

```
src/
  app/[[...slug]]/     — catch-all route, evaluates FX flags → passes variation keys to Graph
  app/demo/            — SDK documentation pages, do NOT change content
  components/blocks/   — each block: index.tsx (type + component) + *.fragment.ts
  lib/optimizely/
    client.ts          — graphqlFetch wrapper (handles published vs draft auth)
    auth.ts            — OAuth token cache for Management API
    experimentation.ts — FX SDK wrapper (low-level: getOptimizelyClient, getDecision, etc.)
    visitor.ts         — getVisitorContext() — reads optimizelyEndUserId, demo_persona, demo_bucketing_id cookies; derives device from User-Agent
    user.ts            — getOptimizelyUser() — combines visitor context + SDK into one cached helper
    componentRegistry.ts — registers all content types + React components
  lib/graphql/
    queries/           — named Graph queries with fallback data
scripts/
  seed-*.ts            — Management API content creation scripts
  seed-quotes.ts       — Content Source API (external data, not Management API)
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

### Em dashes in prose and code comments
Do not use em dashes (`—`) anywhere in the demo pages: prose, JSX text, code snippet strings, or code comments. Use a regular hyphen with spaces (` - `) instead. Em dashes read as an AI-generation artifact.

---

## Adding a New Block — Checklist

1. `src/components/blocks/<Name>/index.tsx` — export `NameType` (contentType) + default component. Add `data-component="Name"` as the first attribute on the outermost rendered element of the default export.
2. `src/components/blocks/<Name>/Name.fragment.ts` — GraphQL fragment, co-located with the block component
3. `src/lib/optimizely/componentRegistry.ts` — three edits:
   - Import the block and its type
   - Add `NameType` to `initContentTypeRegistry([...])` array
   - Add `Name` to `initReactComponentRegistry({ resolver: { ... } })` object (use `{ default: Name, tags: { Variant: Name } }` pattern if display template variants exist)
4. Run `npm run opti:push` with credentials injected

## Seed Script Checklist

1. Auth: `getAuthToken()` from `src/lib/optimizely/auth.ts`
2. POST to `${OPTIMIZELY_CMS_URL}/preview3/experimental/content`
3. Content area items: `{ reference: "cms://content/{key}" }` format
4. Run with: `OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/seed-name.ts`
