---
description: Write and run seed scripts for the Optimizely SaaS CMS Management API.
---

You are writing or editing a seed script that creates content via the Optimizely Management API. Key patterns and gotchas:

## Auth

Use `getAuthToken()` from `src/lib/optimizely/auth.ts`. It caches client-credentials tokens with a 30s refresh buffer.

```ts
import { getAuthToken } from "@/lib/optimizely/auth";  // adjust import path for scripts/

const token = await getAuthToken();
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
```

## Create content (POST)

```ts
const res = await fetch(
  `${process.env.OPTIMIZELY_CMS_URL}/preview3/experimental/content`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      contentType: ["TraditionalPage"],  // array of strings
      routeSegment: "my-page",
      status: "Published",
      properties: {
        heading: "My Heading",
        subheading: "My subheading",
      },
    }),
  }
);
const { key } = await res.json();  // save key for cross-references
```

## Content area references — CRITICAL

When a property is `type: "array"` (content area), items must use the `{ reference: "cms://content/{key}" }` format:

```ts
// CORRECT
faqItems: [
  { reference: "cms://content/abc123" },
  { reference: "cms://content/def456" },
]

// WRONG — these will error:
faqItems: ["cms://content/abc123"]
faqItems: [{ key: "abc123" }]
```

Error for wrong format: `"A content component must have either 'reference' or 'contentType' and 'properties' set"`

## Single content references

For a `type: "content"` single reference property:

```ts
featuredBlock: { reference: "cms://content/abc123" }
```

Note: Graph does NOT inline-expand single content references on page queries — it returns `{ __typename: "_Content", _metadata: { key: null } }`. If you need the referenced content's fields, either use a content area (array) instead, or make the component self-fetch its own data via `graphqlFetch`.

## Update content (PATCH)

```ts
await fetch(
  `${process.env.OPTIMIZELY_CMS_URL}/preview3/experimental/content/${key}`,
  {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      status: "Published",
      properties: { heading: "Updated heading" },
    }),
  }
);
```

## Delete content

```ts
await fetch(
  `${process.env.OPTIMIZELY_CMS_URL}/preview3/experimental/content/${key}`,
  { method: "DELETE", headers }
);
```

## Idempotent pattern

Look up existing items before creating so the script is safe to re-run:

```ts
import { graphqlFetch } from "@/lib/optimizely/client";

const existing = await graphqlFetch<{ MyType: { items: { _metadata: { key: string } }[] } }>(
  `{ MyType(limit: 100) { items { _metadata { key } } } }`
);
for (const item of existing.data?.MyType?.items ?? []) {
  await fetch(`${CMS_URL}/preview3/experimental/content/${item._metadata.key}`, {
    method: "DELETE", headers
  });
}
// then create fresh
```

## Running scripts

```bash
# Inject env vars explicitly — process.env doesn't pick them up automatically from .env.local
OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/seed-mytype.ts
```

Or add to `package.json` scripts and use dotenv:
```json
"seed:mytype": "dotenv -e .env.local -- npx tsx scripts/seed-mytype.ts"
```

## Look at existing scripts for patterns

- `scripts/seed-content.ts` — DynamicExperience pages with composition trees
- `scripts/seed-nav.ts` — Self-referential NavigationItem tree
- `scripts/seed-quotes.ts` — External content source (Content Source API, not Management API)
- `scripts/seed-faqs.ts` — Standalone blocks + content area references
