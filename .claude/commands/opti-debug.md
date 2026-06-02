---
description: Diagnose and fix common issues with Optimizely SaaS CMS, FX SDK, and Graph in this project.
---

A reference of known issues and their fixes. Check here before assuming a bug in the CMS or SDK.

---

## Graph returns `{ __typename: "_Content", _metadata: { key: null } }` for a content reference

**Cause:** Graph does NOT inline-expand `type: "content"` single references on page queries. This is by design — Graph only expands `type: "array"` content areas inline.

**How it appears:** Every `TraditionalPage.featuredBlock` returns `_Content` regardless of what's set. `_metadata.key` will be null. You cannot distinguish a set reference from an unset one via `__typename`.

**Fix:**
1. Make the target component self-fetch via `graphqlFetch` when it receives no data
2. Detect which page should render the block by URL, not by the `featuredBlock` value:

```tsx
// In TraditionalPage.tsx — URL-based detection, not featuredBlock detection
{content.featuredBlock?.__typename !== "_Content" && (
  <OptimizelyComponent content={content.featuredBlock} />
)}
{content._metadata?.url?.default?.includes("/faqs") && (
  <FaqContainerBlock content={{}} />
)}
```

See `src/components/blocks/FaqContainerBlock/index.tsx` for the self-fetching pattern.

---

## Management API error: "Could not read value as Content component"

**Cause:** Content area array items are using the wrong format.

**Fix:** Use `{ reference: "cms://content/{key}" }` — not plain strings, not `{ key }` objects.

```ts
// CORRECT
faqItems: [{ reference: "cms://content/abc123" }]

// WRONG
faqItems: ["cms://content/abc123"]       // plain string — rejected
faqItems: [{ key: "abc123" }]            // key object — rejected
```

---

## Management API error: "A content component must have either 'reference' or 'contentType' and 'properties' set"

**Cause:** Content area item is missing both `reference` and an inline content definition.

**Fix:** Same as above — use `{ reference: "cms://content/{key}" }` for references to existing content items.

---

## TypeScript error: Type `"MyBlock"` is not assignable to type `PermittedTypes`

**Cause:** `allowedTypes` in a content area property requires a `ContentType` object, not a plain string.

**Fix:** Import the type object and reference it directly:

```ts
// WRONG
allowedTypes: ["FaqItemBlock"]

// CORRECT
import { FaqItemBlockType } from "@/components/blocks/FaqItemBlock";
allowedTypes: [FaqItemBlockType]
```

---

## `opti:push` fails with authentication error

**Cause:** `OPTIMIZELY_CMS_CLIENT_ID` and `OPTIMIZELY_CMS_CLIENT_SECRET` are in `.env.local` but `opti:push` doesn't load dotenv automatically.

**Fix:** Inject env vars explicitly on the command line:

```bash
OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npm run opti:push
```

---

## FX flag always returns `enabled: false`

Check in order:
1. Is the flag enabled in the FX console?
2. Is there an active experiment or feature delivery rule? A flag with no rules is always off.
3. Is the delivery rule targeting "everyone" (or does the audience match the attributes)?
4. Is `userId` stable? Must come from the persistent `fx_user_id` cookie set by middleware — not a new UUID per request.
5. Do audience conditions actually match? Log the `attributes` object and compare to FX audience definition.
6. Has the datafile refreshed? FX SDK caches it for 60s — wait a minute after making changes in the FX console.

---

## CMS Variation content not appearing (personalization)

1. Variation name in CMS must **exactly** match the FX variation key string — case-sensitive, no spaces if the key has none
2. The variation key must be included in the `variation.value` array passed to `getContentByPath`
3. `includeOriginal: true` must be set — without it, unpersonalized visitors get no content
4. Variation must be **published**, not just saved as draft

---

## Graph query returns stale data

The ISR cache revalidates every 60s. For immediate revalidation during development:

```bash
curl -X POST "http://localhost:3000/api/revalidate?path=/my-path"
curl -X POST "http://localhost:3000/api/revalidate?tag=navigation"
```

Or just wait 60 seconds.

---

## `searchable: true` fields return null in Graph

External content source fields marked `searchable: true` are indexed for full-text search but not stored as regular retrievable properties. Store display values in non-searchable fields. If you need both search indexing AND retrieval, duplicate the field with a different name.

---

## Block not appearing in Visual Builder / CMS type picker

1. Confirm the type is registered in `src/lib/optimizely/componentRegistry.ts` via `sdk.registerContentType(MyBlockType)`
2. Run `opti:push` with credentials injected (see above) to push the schema to CMS
3. Verify in CMS → Content Types that the type appears
4. Clear browser cache / hard reload the CMS UI (`Cmd+Shift+R`)

---

## `compositionBehaviors` — elementEnabled vs. sectionEnabled

- `"elementEnabled"` — leaf block, cannot contain content area properties of other blocks
- `"sectionEnabled"` — container block, can have `type: "array"` content area properties

If you try to add a content area property to an `elementEnabled` block, the CMS will reject it or ignore the property silently.
