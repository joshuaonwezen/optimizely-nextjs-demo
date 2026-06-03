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

For components that need their own data, use a self-fetching pattern (call `graphqlFetch` inside the component when `!data.heading`). See `src/components/blocks/FaqContainerBlock/index.tsx`.

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

### `opti:push` requires explicit env var injection
`.env.local` is not auto-loaded by `opti:push`:
```bash
OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npm run opti:push
```

### New blocks are auto-discovered
`optimizely.config.mjs` globs `./src/components/**/*.tsx` — no manual config edit needed when adding a new block.

---

## Feature Experimentation (FX)

### Primary API: `getOptimizelyUser()`
Use `getOptimizelyUser()` from `src/lib/optimizely/user.ts` in server components. It reads cookies (`optimizelyEndUserId`, `demo_persona`, `demo_logged_in`) plus the `User-Agent` header for `device`, and creates the SDK user context once per request via React `cache()`. Call `user.decide(flagKey)` or `user.decideAll()` — no userId or attributes to thread through manually.

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

---

## Graph Caching

| Content | TTL | Tag | Revalidation |
|---------|-----|-----|-------------|
| Published pages | `revalidate: 60` | `"page"` | Publish webhook |
| Navigation | `revalidate: 300` | `"navigation"` | Publish webhook |
| External content | `revalidate: 60` | source-specific | Re-sync script |
| Draft/preview | `no-store` | — | Never cached |

Use `graphqlFetch` from `src/lib/optimizely/client.ts` for all manual queries — it handles auth mode (published vs draft) automatically.

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
    visitor.ts         — getVisitorContext() — reads fx_user_id, fx_device, demo_* cookies
    user.ts            — getOptimizelyUser() — combines visitor context + SDK into one cached helper
    componentRegistry.ts — registers all content types + React components
  lib/graphql/
    queries/           — named Graph queries with fallback data
    fragments/         — barrel export of all block fragments
scripts/
  seed-*.ts            — Management API content creation scripts
  seed-referrals.ts    — Content Source API (external data, not Management API)
```

---

## Adding a New Block — Checklist

1. `src/components/blocks/<Name>/index.tsx` — export `NameType` (contentType) + default component
2. `src/components/blocks/<Name>/Name.fragment.ts` — GraphQL fragment, export from `fragments/index.ts`
3. `src/lib/optimizely/componentRegistry.ts` — `sdk.registerContentType(NameType)` + `sdk.registerComponent(Name, { contentType: NameType })`
4. Run `opti:push` with credentials

## Seed Script Checklist

1. Auth: `getAuthToken()` from `src/lib/optimizely/auth.ts`
2. POST to `${OPTIMIZELY_CMS_URL}/preview3/experimental/content`
3. Content area items: `{ reference: "cms://content/{key}" }` format
4. Run with: `OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/seed-name.ts`
