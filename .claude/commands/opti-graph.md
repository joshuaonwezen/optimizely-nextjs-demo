---
description: Write Graph (GraphQL) queries for Optimizely SaaS CMS in this project.
---

You are writing a Graph query. Key patterns for this project:

## Client

Use `graphqlFetch` from `src/lib/optimizely/client.ts` for manual queries (seed scripts, self-fetching components). The SDK's `getClient().getContentByPath()` is used in the catch-all page route.

```ts
import { graphqlFetch } from "@/lib/optimizely/client";

const res = await graphqlFetch<{ MyType: { items: MyData[] } }>(
  `{ MyType(limit: 10) { items { heading body } } }`,
  {},                         // variables (pass {} if none)
  { next: { revalidate: 60, tags: ["my-type"] } }  // Next.js cache options
);
const items = res.data?.MyType?.items ?? [];
```

## Auth modes

- **Published (default):** Uses `OPTIMIZELY_GRAPH_SINGLE_KEY` header — ISR safe, CDN cached
- **Draft/preview:** Uses `OPTIMIZELY_GRAPH_APP_KEY` Bearer token — bypasses cache, always fresh

The client auto-selects based on whether a preview token is present in context. No manual switching needed in components.

## Content areas vs. single references — CRITICAL GOTCHA

| Property type | Graph behavior |
|---------------|---------------|
| `type: "array"` (content area) | **Inline-expanded** — you get full typed fields |
| `type: "content"` (single ref) | **NOT expanded** — returns only base metadata, never the typed fields you need |

If a `TraditionalPage` has `featuredBlock: { type: "content" }`, Graph returns only base metadata for ALL pages regardless of whether the field is set. You cannot reliably detect whether a single reference is set from the returned value alone.

**Workaround A — `getContent()` by key** (SDK 2.0.0, cleaner): the base metadata returned for a single reference includes `_metadata.key`. Use this to fetch the full item:

```ts
import { getClient } from "@optimizely/cms-sdk";

// In the block component:
if (!data.heading && data._metadata?.key) {
  data = await getClient().getContent({ key: data._metadata.key });
}
```

`getContent()` also accepts a `graph://` string from `_metadata.url.graph` directly.

**Workaround B — self-fetching via `graphqlFetch`**, and URL-based detection in the page component:

```tsx
// In TraditionalPage.tsx
{content._metadata?.url?.default?.includes("/faqs") && (
  <FaqContainerBlock content={{}} />
)}
```

See `src/components/blocks/FaqContainerBlock/index.tsx` for the self-fetching pattern.

## @recursive directive (navigation)

For self-referential types (NavigationItem with children):

```graphql
fragment NavItemFields on NavigationItem {
  label
  url
  children {
    ...NavItemFields
  }
}

{
  NavigationRoot(limit: 1) {
    items {
      navItems {
        ...NavItemFields @recursive(depth: 5)
      }
    }
  }
}
```

See `src/lib/graphql/queries/GetNavigation.ts` for the full implementation.

## Variation filter (CMS Variations / personalization)

```graphql
{
  _Page(
    where: { _metadata: { url: { default: { eq: "/my-page" } } } }
    variation: { include: SOME, value: ["variation_1", "variation_2"], includeOriginal: true }
  ) {
    items {
      __typename
      _metadata { key version }
      ... on TraditionalPage { heading body { json } }
    }
  }
}
```

`includeOriginal: true` — if none of the variation keys match a CMS variation on this content, return the original published version (safe fallback, always set this).

The page route at `src/app/[[...slug]]/page.tsx` passes FX variation keys here automatically.

## Caching strategy

| Content | TTL | Tag | Revalidation trigger |
|---------|-----|-----|---------------------|
| Published pages | `revalidate: 60` | `"page"` | Publish webhook → `revalidateTag("page")` |
| Navigation | `revalidate: 300` | `"navigation"` | Publish webhook → `revalidateTag("navigation")` |
| External referrals | `revalidate: 60` | `"referrals"` | Manual re-sync script |
| Site banner | `revalidate: 60` | `"banner"` | Publish webhook |
| Draft/preview | `no-store` | — | Never cached |

Revalidation endpoints: `POST /api/revalidate?path=/my-path` or `POST /api/revalidate?tag=navigation`.

## Fragment colocation

Each block has a fragment alongside its component:

```
src/components/blocks/MyBlock/
  index.tsx              ← component + content type definition
  MyBlock.fragment.ts    ← GraphQL fragment
```

The fragment file is co-located with the block — the SDK picks it up automatically from the block registration in `componentRegistry.ts`.

## External content queries

External content sources (registered via Content Source API) are queried the same as CMS content:

```graphql
{ Referral(limit: 10) { items { name quote rating } } }
```

Note: `searchable: true` fields may return `null` on direct retrieval (they're indexed but not stored as regular fields). Use non-searchable fields or duplicate data for direct access.
