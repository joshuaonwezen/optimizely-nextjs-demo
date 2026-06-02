---
description: Register and sync an external content source with Optimizely Graph (Content Source API).
---

You are setting up an external content source — data from outside the CMS that gets pushed into Graph and queried like native content.

## When to use

Use this for: testimonials, product catalog, CRM records, third-party documents, any data that lives outside the CMS but should be searchable and queryable via Graph. The data is NOT managed in the CMS UI — it's pushed via API and queried from Graph.

## Step 1 — Register a schema

One-time setup (idempotent — safe to re-run):

```ts
const GRAPH_API_URL = process.env.OPTIMIZELY_GRAPH_GATEWAY_URL!;
const GRAPH_APP_KEY = process.env.OPTIMIZELY_GRAPH_APP_KEY!;
const SOURCE_ID = "my-source-id";  // unique identifier for this data source

await fetch(
  `${GRAPH_API_URL}/api/content/v3/contentTypes?id=${SOURCE_ID}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Basic ${btoa(`${GRAPH_APP_KEY}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ContentType: "MyItem",
      Preset: "next",
      Properties: {
        name:   { type: "string",  searchable: true },
        quote:  { type: "string",  searchable: true },
        rating: { type: "integer" },
      },
    }),
  }
);
```

Base type presets:
- `"next"` / `"_Item"` — generic content item (most common)
- `"_AssetItem"` — downloadable asset (adds `url` field)
- `"_ImageItem"` — image asset (adds `url`, `width`, `height`)

## Step 2 — Sync data (NdJSON)

Each line in the body is a separate JSON object (NdJSON format):

```ts
const items = [
  { id: "item-1", name: "Sarah Chen", quote: "Great service!", rating: 5 },
  { id: "item-2", name: "Marcus Webb", quote: "Very helpful.",  rating: 4 },
];

const ndjson = items
  .map(item => JSON.stringify({
    _itemMetadata: {
      key:   item.id,
      name:  item.name,
      types: ["MyItem"],
    },
    name:   item.name,
    quote:  item.quote,
    rating: item.rating,
  }))
  .join("\n");

await fetch(
  `${GRAPH_API_URL}/api/content/v3/content?id=${SOURCE_ID}`,
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${GRAPH_APP_KEY}:`)}`,
      "Content-Type": "application/x-ndjson",
    },
    body: ndjson,
  }
);
```

## Step 3 — Query from Graph

External items query exactly like CMS content — no special handling needed:

```ts
import { graphqlFetch } from "@/lib/optimizely/client";

const QUERY = `{
  MyItem(limit: 10) {
    items {
      name
      quote
      rating
    }
  }
}`;

const res = await graphqlFetch<{ MyItem: { items: MyItemData[] } }>(
  QUERY, {}, { next: { revalidate: 60, tags: ["my-items"] } }
);
```

## Searchable field gotcha

Fields marked `searchable: true` are indexed for full-text search but may return `null` when queried as regular fields. To get the value back in a query, either:
1. Store it in a non-searchable field as well (duplicate it)
2. Only use the field for search/filtering, store display values in regular fields

## Running the script

See `scripts/seed-referrals.ts` and `scripts/seed-spotlights.ts` for working examples.

```bash
OPTIMIZELY_GRAPH_APP_KEY=xxx npx tsx scripts/seed-mytype.ts
```

## Fallback pattern

Always provide a hardcoded fallback array for demo resilience if Graph is down or the source hasn't synced:

```ts
const DEMO_ITEMS: MyItem[] = [
  { name: "Demo Item", quote: "Fallback content for demo.", rating: 5 },
];

export async function getMyItems(): Promise<MyItem[]> {
  try {
    const res = await graphqlFetch<{ MyItem: { items: MyItem[] } }>(
      QUERY, {}, { next: { revalidate: 60 } }
    );
    return res.data?.MyItem?.items ?? DEMO_ITEMS;
  } catch {
    return DEMO_ITEMS;
  }
}
```

## Demo page

See `src/app/demo/external-content/page.tsx` for a live example with Referral items showing the full schema registration, sync payload, and Graph query patterns.
