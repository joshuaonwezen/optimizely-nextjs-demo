# Management API reference

Authentication, payload formats, and how to write a new seed script. Moved out of CLAUDE.md.

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

For additional CMS instances, suffix both sets with the instance suffix (`_JOSHCMS`, `_HARRYNEWCMS`, `_MOSTINNEWCMS`, `_APJCMS`, ...) and register the instance in `src/lib/optimizely/seedInstances.ts` so the `/demo/management-api` seed tool can resolve the right pair.

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

### Single content reference properties — format depends on the property type
```ts
// type: "content" (Content component) — MUST be a reference object.
// A plain string fails: 400 "Could not read value as Content component. Expected object."
featuredBlock: { reference: "cms://content/abc123" }

// type: "contentReference" — a plain string works.
author: "cms://content/abc123"
```

### Management API base URL
`https://api.cms.optimizely.com/v1/content`

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
- Single references, `type: "contentReference"`: `"cms://content/{key}"` string directly
- Single references, `type: "content"`: `{ reference: "cms://content/{key}" }` object — a plain string 400s with "Expected object"

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

Edit [scripts/seed-runner.ts](../scripts/seed-runner.ts). Scripts in `required[]` abort on failure; scripts in `optional[]` warn and continue:

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
