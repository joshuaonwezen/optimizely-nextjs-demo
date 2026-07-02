# Optimizely Next.js Demo — Project Context

This is a Next.js 16 + Optimizely SaaS CMS + Feature Experimentation demo project for a retail banking brand (Mosey Bank). The `/demo/*` pages are SDK documentation — never change their content or purpose.

---

## Seeding Content

### Before your first seed — prerequisites checklist

Complete this once per instance before running the seed. Skip it and the seed will fail with credential or container errors.

**Step 1 — Create a content API key in the CMS**

CLI credentials (used by `opti:push`) cannot create content. You need a separate key with write access:
1. CMS → Settings → API Keys → Create API Key
2. CMS → Settings → Set Access Rights → grant the new key content read/write
3. Copy the Client ID and Client Secret

**Step 2 — Set up the root container (ONBOARDING only)**

The seed needs a DynamicExperience set as the site start page. This must be created manually once:
1. CMS → Visual Builder → New page → DynamicExperience → name it anything (e.g. "Site Root")
2. CMS → Settings → Site → Start page → select the DynamicExperience you just created
3. Note the content key from the CMS UI URL (the UUID in the address bar, without hyphens) — this is `OPTIMIZELY_ROOT_CONTAINER_ONBOARDING`

You can skip step 3 — the seed auto-discovers the root container via `GET /v1/applications` and prints it on every run. Setting the env var is a convenience to avoid the API call.

**Step 3 — Populate `.env.local`**

The runner reads credentials from `.env.local`. For the `personal` instance use the base name; for `onboarding` append `_ONBOARDING`.

| Variable | Required | Where to get it |
|---|---|---|
| `OPTIMIZELY_CMS_CLIENT_ID` | Yes | Step 1 above (API Key Client ID) |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | Yes | Step 1 above (API Key Client Secret) |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | Yes | CMS → Settings → API Keys → existing Graph key |
| `OPTIMIZELY_GRAPH_GATEWAY` | Yes | CMS → Settings → API Keys → Graph endpoint URL |
| `OPTIMIZELY_CMS_URL` | Yes | `https://app-<slug>.cms.optimizely.com` |
| `OPTIMIZELY_APP_KEY` | For webhooks + Content Source API | Same API key, used for Basic auth on webhook registration and Content Source API data sync |
| `OPTIMIZELY_APP_SECRET` | For webhooks + Content Source API | Same API key |
| `OPTIMIZELY_ROOT_CONTAINER` | No — auto-discovered | UUID (no hyphens) of the root container; set to skip the discovery call |

Suffix every variable name with `_ONBOARDING` for the onboarding instance. Example:
```
OPTIMIZELY_CMS_CLIENT_ID=abc123
OPTIMIZELY_CMS_CLIENT_ID_ONBOARDING=xyz789
```

**Step 4 — Run the seed**

```bash
npx tsx scripts/seed-runner.ts --instance=onboarding
```

---

### How to seed

Always use the seed runner — never call individual seed scripts directly:

```bash
npm run seed:all   # prompts: "Which instance? (personal / onboarding)"
```

Or pass the instance directly (Claude should always do this after asking the user):

```bash
npx tsx scripts/seed-runner.ts --instance=personal
npx tsx scripts/seed-runner.ts --instance=onboarding
```

### What the runner does (in order)

| Step | Script | Notes |
|---|---|---|
| 1 | `opti:push` | Pushes content type definitions to the CMS |
| 2 | `seed-content.ts` | Creates 19 DynamicExperience/TraditionalPage pages + homepage |
| 3 | `seed-nav.ts` | Creates NavigationItem tree + Navigation block |
| 4 | `seed-modeling.ts` | Authors, articles, case studies, milestones, team members, hub pages, Phase D pages |
| 5 | `seed-faqs.ts` | 6 FaqItemBlock items + FaqContainerBlock, wired to the FAQs page |
| 6 | `seed-homepage-variations.ts` | Optional — needs Graph to have indexed the homepage (~60s lag) |
| 7 | `seed-nav-strategy-demo.ts` | Optional — nav strategy demo pages |
| 8 | `seed-quotes.ts` | Optional — quote content via Content Source API |
| 9 | `seed-localization.ts` | Optional — Dutch (nl) versions of all pages, navigation, and FAQs. Translates via the exact-match dictionary in `scripts/translations-nl.ts`; needs Graph to have indexed everything above, so re-run individually after ~60s on a fresh seed |

Steps 6-9 are optional: if they fail (usually Graph lag on a fresh seed), the runner warns and continues. Re-run them individually after ~60s if needed.

**seed-nav must run before seed-faqs** — seed-faqs Part 3 looks up the FAQs page in Graph to wire the FAQ container to it. The FAQs page is created by seed-nav. Running them out of order causes a warning ("FAQs page not found in Graph") and skips the wiring; re-run `npx tsx scripts/seed-faqs.ts` after seed-nav completes.

### Expected warnings on a clean seed run

These are normal — they are not failures:

| Warning | Why | What to do |
|---|---|---|
| `[warn] PATCH /versions/1422: 400 Only versions in status 'draft' can be patched` | The ONBOARDING root container is a DynamicExperience set as the start page. It was created manually and is already published. The seed can't patch its composition. | A separate homepage page is created at route `/` as a sibling — that's what the app serves. Ignore this warning. |
| `[warn] Could not patch homepage at key=... — update it manually in Visual Builder` | Same as above. | Ignore. The app uses the newly created homepage, not the container itself. |
| `[warn] FAQs page not found in Graph — run seed:nav first, then re-run this script` | seed-faqs ran before Graph indexed the FAQs page created by seed-nav. | Re-run `npx tsx scripts/seed-faqs.ts` after the full seed completes. |
| `[indexed sample] { "Quote": { "items": [] } }` | Graph hasn't indexed the quotes yet (10s polling started immediately after sync). | Wait 30-60s, then visit `/demo/content-source` to verify. |
| `[attempt 1 failed] POST with variation field: 400 Variations can only be created from existing versions` | CMS variations can't be created via the API. | Create them manually in Visual Builder — seed-homepage-variations.ts prints exact instructions. |

### Scripts excluded from the runner

- `seed-business-banking-app-variation.ts` — hardcoded version key for personal instance only
- `register-webhook.mjs` — interactive prompt for public URL; run manually when needed

FX flags and experiments are managed through the Optimizely Experimentation MCP server (`mcp__exp__*` tools), not via a local seed script.

### Two instances

Credentials for each instance live in `.env.local` with suffixes:

| Instance | Suffix | CMS URL |
|---|---|---|
| personal | _(none)_ | `app-ocstjoshuac8je4ft002.cms.optimizely.com` |
| onboarding | `_ONBOARDING` | `app-opononboard15smbt002.cms.optimizely.com` |

Each instance needs its own `OPTIMIZELY_ROOT_CONTAINER_<SUFFIX>` — a UUID **without hyphens** pointing to the root container for that instance. It must exist before seeding. Two supported container setups:

| Setup | When to use | Notes |
|---|---|---|
| BlankExperience / folder | Organizational container only, not a page itself | Traditional approach; container is never visited directly |
| DynamicExperience as start page | Container IS the site start page at `/` | ONBOARDING uses this; seed patches the container's own composition |

For the DynamicExperience-as-start-page setup, the CMS admin must:
1. Create a DynamicExperience in the CMS (Settings → Content or Visual Builder)
2. Set it as the site start page (Settings → Site → Start page)
3. Copy its key (from the CMS UI URL, without hyphens) into `OPTIMIZELY_ROOT_CONTAINER_ONBOARDING`

The seed script handles both setups automatically: it always tries to patch the container key directly with the homepage composition when Graph hasn't indexed the start page yet.

### Critical gotchas

**Compositions must be PATCHed after creation** — the Management API silently drops the `composition` field on POST. `seed-content.ts` handles this automatically: POST creates the item, then a PATCH to `/content/{key}/versions/{version}` with `application/merge-patch+json` saves the composition. If you write a new seed script that creates DynamicExperience pages, follow the same pattern.

**Homepage variations cannot be created via API** — the Visual Builder UI is required. `seed-homepage-variations.ts` prints manual instructions when it can't create them. Create each variation in the CMS (open Homepage → Add variation), name them exactly matching the FX variation keys (`new_visitor`, `personal`, `business`), then the script can PATCH their compositions.

**Graph indexing lag** — newly created content takes ~30-60s to appear in Graph. Scripts that look up keys via Graph (seed-faqs wiring, seed-homepage-variations, Phase D pages in seed-modeling) will skip/warn on a fresh seed run. Re-run those individual scripts after waiting.

**API keys need content write scope** — CLI credentials (used for `opti:push`) only have config-push scope and will get `403 Required access is 'create'` on content operations. Content seeding requires a dedicated API key created in **Settings → API Keys** with write access granted in **Settings → Set Access Rights**.

**Container key format** — the `OPTIMIZELY_ROOT_CONTAINER` value must be a UUID without hyphens (e.g. `bac6997fb4594e9ebcd93349de583fee`), not the hyphenated form from the CMS UI URL.

**Navigation is a shared application-level block, not a composition node** — `NavigationItem` and `Navigation` blocks live as standalone CMS items under the root container. They are fetched by the Next.js app via a Graph query (by display name `"Seeded Navigation"`), not embedded in any page composition. `DynamicExperienceType.mayContainTypes` must include `NavigationItem` and `Navigation` for this to work when the root container is a DynamicExperience.

**Permanently deleting all children may delete the container itself** — if you `DELETE /content/{key}?permanent=true` every child of a DynamicExperience container, the CMS may cascade-delete the container too. If the container key starts returning 404, create a new DynamicExperience, set it as the start page, and update `OPTIMIZELY_ROOT_CONTAINER` in `.env.local`. Never use `permanent=true` on the container itself.

---

## Management API — Authentication

### Token endpoint
All Management API calls authenticate with a Bearer JWT obtained from:

```
POST https://api.cms.optimizely.com/oauth/token
Content-Type: application/json

{ "grant_type": "client_credentials", "client_id": "...", "client_secret": "..." }
```

The token is valid for **300 seconds (5 minutes)**. `auth.ts` caches it and re-fetches automatically before expiry.

### API key requirements
The `api:admin` scope is required for content create/update/delete operations. **CLI credentials** (created via `npx @optimizely/cms-cli login` or used for `opti:push`) only have config-push scope — they can push content types but will get `403 Required access is 'create'` on content operations.

For content seeding you need a dedicated **API key** created in the CMS UI:
1. **Settings → API Keys** → Create API Key (name: letters, numbers, hyphens, underscores only)
2. **Settings → Set Access Rights** → grant the new key content read/write access
3. Use the resulting Client ID + Secret as `OPTIMIZELY_CMS_CLIENT_ID` / `OPTIMIZELY_CMS_CLIENT_SECRET`

### Two credential types in `.env.local`
| Variable | Purpose | Created via |
|---|---|---|
| `OPTIMIZELY_CMS_CLIENT_ID` / `_SECRET` | Content management (seed scripts, Management API) | Settings → API Keys in CMS UI |
| `OPTIMIZELY_APP_KEY` / `_SECRET` | Graph webhook registration (Basic auth) | Settings → API Keys in CMS UI |

For a second CMS instance, suffix both sets with `_ONBOARDING` (or another label) and the seed runner picks the right pair automatically.

### v1 API — endpoint and payload rules

All seed scripts use `https://api.cms.optimizely.com/v1/content`.

**Payload shape:** content version fields (`displayName`, `locale`, `routeSegment`, `properties`, `composition`) go inside an `initialVersion` object. `status` is read-only on creation — publish separately via `POST /content/{key}/versions/{version}:publish`.

**`PropertyData` format:** every property value must be wrapped as `{ value: <actual> }`. Use `wrapProps(properties)` from `scripts/_shared.ts` for all `component.properties` and `initialVersion.properties` objects. Forgetting this gives a 400 "The value did not match the expected type" error.

**`richText` properties:** must be `{ html: "<p>...</p>" }` objects, not plain strings. After `wrapProps`, becomes `{ value: { html: "..." } }`.

**201 with empty body:** v1 sometimes returns 201 with no response body. Always read the body with `.text()` first, then check `if (!text.trim())` before parsing JSON. If empty, do a `GET /content/{key}/versions?pageSize=1` to find the version ID for publishing.

**Patching published versions:** `PATCH /content/{key}/versions/{version}` only works on draft versions. To update a published item, create it without publishing first (pass `{ skipPublish: true }` to `createContent()`), patch the draft, then let `patchContentProperties()` republish it.

**DynamicExperience compositions:** the root experience node requires `layoutType: "outline"`. Missing this gives a 400 "The layout type '' is not of the required type 'outline'" error.

**Content type keys in compositions:** `contentType` values inside composition nodes are validated against registered types. Use the registered key (e.g., `"HeroBlock"`) not a display name (e.g., `"Hero"`).

### Seed script error troubleshooting

| Error message | Cause | Fix |
|---|---|---|
| `"The value did not match the expected type." field: ...component.properties` | Inline composition node `component.properties` is a plain object, not `PropertyData` format | Wrap with `wrapProps({...})` from `_shared.ts` |
| `"The value did not match the expected type." field: ...initialVersion.properties` | Top-level `properties` in the POST body are not wrapped | Pass properties through `createContent()` from `_shared.ts`, which calls `wrapProps` automatically |
| `"Could not read value as 'RichText'. Expected object with an 'html' property."` | A `richText` typed property was set to a plain HTML string | Change to `{ html: "<p>...</p>" }` |
| `"The layout type '' is not of the required type 'outline'."` field: `...composition.LayoutType` | A DynamicExperience composition root node is missing `layoutType` | Add `layoutType: "outline"` to the experience root node |
| `"The specified content type '...' does not exist."` | A composition node `contentType` string doesn't match any registered type key | Check `optimizely.config.mjs` / `componentRegistry.ts` for the correct key (e.g. `"HeroBlock"` not `"Hero"`) |
| `SyntaxError: Unexpected end of JSON input` after POST or PATCH | v1 API returned 201/200 with empty body; code called `.json()` on it | Read body with `.text()` first; if empty, do `GET /content/{key}/versions?pageSize=1` to find version ID |
| `"Only versions in status 'draft' can be patched."` | Trying to PATCH a published version | Create item with `{ skipPublish: true }`, patch the draft, `patchContentProperties()` republishes automatically |
| `"A content component must have either 'reference' or 'contentType' and 'properties' set"` | Content area array item is a plain string or `{ key: "..." }` instead of `{ reference: "cms://content/..." }` | Use `[{ reference: "cms://content/{key}" }]` format for array properties |
| `403 Required access is 'create'` | Using CLI credentials for a content API call | Use the dedicated API key created in Settings → API Keys with content write scope |
| `409` on POST | Trying to create content with a key that already exists | The item already exists; `createContent()` skips silently. If you need a fresh item, delete first or generate a new key |

---

## Optimizely Graph — Critical Gotchas

### Single content references are NOT inline-expanded
`type: "content"` single reference properties on pages return only base metadata from Graph — regardless of whether the field is set. Graph only inline-expands `type: "array"` content areas.

The base metadata does include `_metadata.key`. Use `getClient().getContent({ key })` in the **parent** component (the page that received the reference) to resolve the full item before passing it down — do not add self-fetching logic inside the child component:

```tsx
// src/components/pages/TraditionalPage.tsx
export default async function TraditionalPage({ content }) {
  let featuredBlock = content.featuredBlock ?? null;

  // Graph returned base metadata only (_Content) — resolve to full item
  if (featuredBlock?.__typename === "_Content" && featuredBlock?._metadata?.key) {
    featuredBlock = await getClient()
      .getContent({ key: featuredBlock._metadata.key }, { next: { revalidate: 60 } })
      .catch(() => null);
  }

  return (
    // featuredBlock is now the full item — OptimizelyComponent can dispatch it
    {featuredBlock && featuredBlock.__typename !== "_Content" && (
      <OptimizelyComponent content={featuredBlock} />
    )}
  );
}
```

`getContent()` also accepts a `graph://` string from `_metadata.url.graph`, and an optional `{ previewToken }` option for preview mode.

### `graphqlFetch` vs `getClient().request()` — when to use each
The SDK exposes `getClient().request(query, variables, previewToken?, cache?)` for raw GraphQL queries. The `cache` parameter is a boolean — it does not support Next.js `next: { revalidate, tags }` fetch options.

`graphqlFetch` in `src/lib/optimizely/client.ts` exists specifically because Next.js ISR requires passing `next: { revalidate, tags }` through the underlying `fetch()` call. The SDK's `request()` method cannot do this.

| Use case | Recommended method |
|---|---|
| Fetch a content item by key | `getClient().getContent({ key })` |
| Fetch a page by URL path | `getClient().getContentByPath(url)` |
| Custom query needing ISR revalidation tags | `graphqlFetch(query, vars, { next: { revalidate, tags } })` |
| Custom query, no ISR tags needed | Either works; `getClient().request()` avoids the extra wrapper |
| Preview/draft content | Either — both accept `previewToken`; `graphqlFetch` sets `cache: "no-store"` automatically when a token is present |

### Content area arrays ARE inline-expanded
`type: "array"` content areas (e.g., `faqItems`, `navItems`) return full typed fields from Graph. Use arrays when you need Graph to resolve referenced content.

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
`https://api.cms.optimizely.com/v1/content`

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

### `indexingType` — Graph indexing rules

Three values: `"searchable"` (full-text), `"queryable"` (filter/sort/aggregate), `"disabled"` (excluded from Graph index).

**Critical constraint**: `"searchable"` and `"queryable"` are only valid on **primitive** fields (`string`, `richText`, `integer`, `dateTime`, `boolean`, array of primitives). `contentReference` and `content` fields **only accept `"disabled"`** — the CMS rejects any other value at push time with:
> `Setting 'IndexingType.Queryable' is not allowed on property of type 'contentReference'. 'IndexingType' should be applied to primitive properties.`

| Value | Use on | Examples |
|---|---|---|
| `"searchable"` | Prose text users search (`string`, `richText`) | `heading`, `body`, `bio`, `description` |
| `"queryable"` | Filter/sort metadata (enum `string`, `dateTime`, `integer`) | `category`, `publishDate`, `navOrder` |
| `"disabled"` | `contentReference`/`content` on `_component` types only | `backgroundImage` on HeroBlock |

**Critical: do NOT set `indexingType: "disabled"` on `contentReference` fields on `_page` types.**

The SDK's `createQuery` skips any property with `indexingType === "disabled"` when building GraphQL fragments. On a `_component` type this is harmless because component properties are returned inline in composition data. On a `_page` type it means the field is never queried and `content.heroImage` is always `null`.

For `contentReference` fields on `_page` types, **omit `indexingType` entirely** — the SDK will include the field in its generated fragment and Graph will return the image URL.

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

### Account activation required for data indexing
Schema registration (`PUT /api/content/v3/types`) works without any special setup. Data indexing (`POST /api/content/v2/data`) requires the external content sources pipeline to be enabled for the account by Optimizely. Without activation, data pushes return 200 OK with a `journalId` but items never appear in Graph queries. Contact Optimizely support to enable this if data never indexes despite correct auth and schema registration.

### `searchable: true` fields return null on direct retrieval
Fields marked searchable are indexed for full-text search but not stored as regular properties. Duplicate the field without `searchable: true` if you need to retrieve it in a query.

### NdJSON sync format
Each line must be a valid JSON object. Use `items.map(i => JSON.stringify({...})).join("\n")` — never pretty-print.

Each record is two lines: an action line followed by a data line.

```
{"index": {"_id": 1, "language_routing": "en"}}
{
  "_rbac": "r:Everyone:Read",
  "_itemMetadata": {
    "key": "qt-1",
    "displayName___searchable": "Quote - Sarah Chen",
    "lastModified": "2026-07-02T00:00:00.000Z",
    "type": "Quote"
  },
  "_metadata": {
    "types": ["Quote", "_Item"],
    "locale": "en",
    "key": "qt-1",
    "status": "Published"
  },
  "author$$String": "Sarah Chen",
  "text$$String": "I moved my savings to Mosey...",
  "ContentType": ["Quote"],
  "Status": "Published",
  "Language": { "DisplayName": "English", "Name": "en" }
}
```

Key rules for the data line:
- `_rbac`: must be the string `"r:Everyone:Read"` — NOT an object. Sending `{ "read": ["Everyone"] }` causes an Elasticsearch mapper_parsing_exception and silently drops the record.
- Custom field names must have `$$Type` suffixes matching their schema type: `field$$String`, `field$$Float`, `field$$Integer`, `field$$Boolean`. Fields without the suffix are not indexed as typed properties.
- `_metadata` (top-level, separate from `_itemMetadata`) is required for indexing to succeed. Include `types`, `locale`, `key`, and `status`.
- `displayName` inside `_itemMetadata` must be written as `displayName___searchable` (three underscores + `searchable`).

### Auth for Content Source API
Both `APP_KEY` and `APP_SECRET` are required. Key-only (trailing colon, no secret) returns 401.
```ts
Authorization: `Basic ${Buffer.from(`${GRAPH_APP_KEY}:${GRAPH_APP_SECRET}`).toString("base64")}`
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
4. `scripts/cleanup-types.ts` — two edits (prevents accidental CMS deletion):
   - Add the type's `.key` string (e.g. `"MyBlock"`) to the `KEEP` set — use the actual `.key` value from `contentType({ key: "..." })`, **not** the TypeScript variable name
   - If the block exports display template variants, add each template's `.key` string (e.g. `"MyBlockCompactTemplate"`) to `KEEP_TEMPLATES`
5. Run `npm run opti:push` with credentials injected

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

Available shared constants: `BACKGROUND`, `HEADING_SIZE`, `TEXT_ALIGN`, `FONT_STYLE`, `TEXT_SIZE`.
Tailwind class lookup maps: `BG_CLASSES`, `HEADING_CLASSES`, `FONT_CLASSES`, `TEXT_SIZE_CLASSES`, `TEXT_ALIGN_CLASSES`.

### Choosing which settings to include per block

- Any block with a visible heading or title - add `HEADING_SIZE` and `FONT_STYLE`
- Any block that renders with a card or section background - add `BACKGROUND`
- Any block with multi-line text content - add `TEXT_ALIGN`
- Any block with prose or body text - add `TEXT_SIZE`

### Template variants

If a block has more than one visual layout (e.g. card vs minimal, horizontal vs vertical), create a separate `displayTemplate()` for each with a `tag` value matching the resolver entry in `componentRegistry.ts`. Always set one template as `isDefault: true`.

In `componentRegistry.ts`, register tag variants like this:

```ts
MyBlock: {
  default: MyBlock,
  tags: { Card: MyBlock, Minimal: MyBlock },
},
```

### cleanup-types.ts

When adding a new display template, add its `.key` string to `KEEP_TEMPLATES` in `scripts/cleanup-types.ts`. Templates absent from this set will be deleted by the cleanup script on the next run.

---

## Writing a New Seed Script — Step-by-Step

### 1. Imports and setup

```ts
import { config } from "dotenv";
import { randomUUID } from "crypto";
import { getManagementToken } from "../src/lib/optimizely/auth";
import { createContent, patchContentProperties, discoverRootContainer, wrapProps } from "./_shared";

config({ path: ".env.local" });
let CONTAINER = "";
```

Call `discoverRootContainer()` at the start of `main()` — it reads the root container key via the Management API so you don't need to hardcode it or read from env vars.

### 2. Creating a simple content item

Use `createContent()` from `_shared.ts` for all content creation. It handles: v1 payload shaping, `wrapProps` on properties, publishing, and the 201-empty-body quirk.

```ts
const key = randomUUID().replace(/-/g, "");

await createContent({
  key,
  contentType: "ArticlePage",       // must match registered content type key exactly
  locale: "en",
  container: CONTAINER,
  displayName: "My Article",
  routeSegment: "my-article",
  status: "published",              // ignored by createContent (it publishes separately)
  properties: {
    title: "My Article",
    summary: "A short description.",
    body: { html: "<p>First paragraph.</p>" },    // richText: always { html: "..." }
    publishDate: "2026-06-10T09:00:00Z",
  },
}, "My Article");
```

**Property format rules:**
- `createContent()` calls `wrapProps()` automatically on `properties` — pass plain values
- For inline composition nodes, call `wrapProps({...})` yourself on `component.properties`
- `richText` typed properties must be `{ html: "<p>...</p>" }` objects, not plain strings
- Content area arrays: `[{ reference: "cms://content/{key}" }]`
- Single content references: `"cms://content/{key}"` string directly

### 3. Creating a DynamicExperience page with a composition

DynamicExperience compositions must be **PATCHed separately** after creation — the POST body silently drops the `composition` field. `seed-content.ts` handles this via a dedicated PATCH step. Use `createContent()` for the POST, then PATCH manually:

```ts
const key = randomUUID().replace(/-/g, "");

// Step 1: POST to create the page (composition field is ignored on POST)
await createContent({
  key,
  contentType: "DynamicExperience",
  locale: "en",
  container: CONTAINER,
  displayName: "My Page",
  routeSegment: "my-page",
}, "My Page");

// Step 2: PATCH the composition onto the version
const token = await getManagementToken();
const vRes = await fetch(`https://api.cms.optimizely.com/v1/content/${key}/locales/en?pageSize=1`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { items } = await vRes.json();
const version = items[0].version;

await fetch(`https://api.cms.optimizely.com/v1/content/${key}/versions/${version}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/merge-patch+json" },
  body: JSON.stringify({
    composition: {
      id: randomUUID().replace(/-/g, ""),
      displayName: "Composition",
      nodeType: "experience",
      layoutType: "outline",          // required — missing this gives a 400 error
      nodes: [
        {
          id: randomUUID().replace(/-/g, ""),
          displayName: "My Heading",
          nodeType: "component",
          component: {
            contentType: "SectionHeadingBlock",   // must be a registered content type key
            properties: wrapProps({               // must call wrapProps on inline node properties
              heading: "Hello World",
              subheading: "A subtitle here.",
            }),
          },
        },
      ],
    },
  }),
});

// Step 3: Publish after patching
await fetch(`https://api.cms.optimizely.com/v1/content/${key}/versions/${version}:publish`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
```

See `seed-content.ts` for the full working pattern with error handling.

### 4. Two-pass pattern for circular cross-references

When items reference each other (e.g. Article A relates to Article B, B relates to A), you can't include the references on creation because neither item exists yet when the other is created. Use a two-pass approach:

```ts
// Pass 1: create all items WITHOUT the cross-references, leave them as draft
for (const item of ITEMS) {
  await createContent({ key: item.key, ...propertiesWithoutCrossRefs }, item.name, { skipPublish: true });
}

// Pass 2: patch each draft to add cross-references, then patchContentProperties publishes it
for (const item of ITEMS) {
  if (item.relatedKeys.length === 0) continue;
  await patchContentProperties(item.key, {
    relatedItems: item.relatedKeys.map((k) => `cms://content/${k}`),
  });
}
```

`patchContentProperties()` from `_shared.ts` always republishes after patching, whether the item was draft or had been published.

### 5. Adding a new script to the runner

Edit [scripts/seed-runner.ts](scripts/seed-runner.ts). Scripts in `required[]` abort on failure; scripts in `optional[]` warn and continue:

```ts
const required: [string, string[]][] = [
  // ... existing required steps
  ["npx", ["tsx", "scripts/seed-my-new-script.ts"]],  // add here if required
];

const optional: [string, string[]][] = [
  // ... existing optional steps
  ["npx", ["tsx", "scripts/seed-my-new-script.ts"]],  // or here if optional
];
```

Order matters — if your script needs content from another script (e.g. Graph-indexed pages), place it after that script. seed-nav must come before seed-faqs.

### 6. Composition node structure reference

```
experience (root)
  layoutType: "outline"         ← required
  nodeType: "experience"
  nodes: [
    section
      nodeType: "section"
      layoutType: "grid"        ← required for grid sections
      component: { contentType: "BlankSection", properties: {} }
      nodes: [
        row
          nodeType: "row"
          nodes: [
            column
              nodeType: "column"
              nodes: [
                component         ← leaf node with content
                  nodeType: "component"
                  component:
                    contentType: "MyBlock"   ← must be a registered type key
                    properties: wrapProps({ ... })  ← always call wrapProps here
              ]
          ]
      ]

    component               ← can also appear directly under experience root
      nodeType: "component"
      component: { contentType: "...", properties: wrapProps({...}) }
  ]
```
