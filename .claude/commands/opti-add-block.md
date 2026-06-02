---
description: Add a new CMS block component to the Optimizely Next.js demo project end-to-end.
---

You are adding a new CMS block component. Follow these steps exactly.

## Step 1 — Define the content type

Create `src/components/blocks/<BlockName>/index.tsx`. Export a named `const <BlockName>Type` using `contentType()` from `@optimizely/cms-sdk`.

Rules:
- `baseType` must be `"_component"` for blocks
- Use `"sectionEnabled"` in `compositionBehaviors` if the block needs to contain a content area (array of child blocks). Use `"elementEnabled"` for leaf blocks with no children.
- `allowedTypes` in a content area must reference imported `ContentType` objects — NOT plain string keys like `"FaqItemBlock"`. Import the type object and reference it directly.
- Single `type: "content"` references are NOT inline-expanded by Graph — you only get base metadata, not the typed fields. Content area arrays (`type: "array"`) ARE expanded. If a block needs to resolve a single reference, use a self-fetching pattern instead.

```tsx
import { contentType } from "@optimizely/cms-sdk";
import { OtherBlockType } from "@/components/blocks/OtherBlock";

export const MyBlockType = contentType({
  key: "MyBlock",
  displayName: "My Block",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],  // or "sectionEnabled" if needs content area
  properties: {
    heading:  { type: "string",  displayName: "Heading" },
    body:     { type: "string",  displayName: "Body" },
    // Content area (use "sectionEnabled"):
    items: {
      type: "array",
      items: { type: "content", allowedTypes: [OtherBlockType] },
      displayName: "Items",
    },
  },
});
```

## Step 2 — Write the React component

In the same file, export the default Server Component. Use `getPreviewUtils` for edit mode overlays.

```tsx
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface MyBlockData {
  heading?: string | null;
  body?: string | null;
}

export default function MyBlock({ content }: { content: MyBlockData }) {
  const { pa } = getPreviewUtils(content as any);
  return (
    <div>
      {content.heading && <h2 {...pa("heading")}>{content.heading}</h2>}
      {content.body && <p {...pa("body")}>{content.body}</p>}
    </div>
  );
}
```

For self-fetching (when a single content reference won't expand via Graph):
```tsx
import { graphqlFetch } from "@/lib/optimizely/client";

const FETCH_QUERY = `{ MyBlock(limit: 1) { items { heading body } } }`;

export default async function MyBlock(props: MyBlockProps) {
  let data = props.content ?? props;
  if (!data.heading) {
    const res = await graphqlFetch<{ MyBlock: { items: MyBlockData[] } }>(
      FETCH_QUERY, {}, { next: { revalidate: 60 } }
    );
    data = res.data?.MyBlock?.items?.[0] ?? data;
  }
  // render...
}
```

## Step 3 — Add a GraphQL fragment

Create `src/components/blocks/<BlockName>/MyBlock.fragment.ts`:

```ts
import { gql } from "@optimizely/cms-sdk";

export const MyBlockFragment = gql`
  fragment MyBlockFields on MyBlock {
    heading
    body
  }
`;
```

Export it from `src/lib/graphql/fragments/index.ts`.

## Step 4 — Register in componentRegistry

Open `src/lib/optimizely/componentRegistry.ts`. Add the import and register inside `initializeRegistry()`:

```ts
import MyBlock, { MyBlockType } from "@/components/blocks/MyBlock";

sdk.registerContentType(MyBlockType);
sdk.registerComponent(MyBlock, { contentType: MyBlockType });
```

## Step 5 — Push to CMS

```bash
OPTIMIZELY_CMS_CLIENT_ID=... OPTIMIZELY_CMS_CLIENT_SECRET=... npm run opti:push
```

`opti:push` reads `optimizely.config.mjs` which globs `./src/components/**/*.tsx`. The new type is discovered automatically — no manual config edit needed.

## Step 6 — Verify

1. Open CMS → Content Types → confirm `MyBlock` appears
2. Add block to a page in Visual Builder
3. Check Graph responds with fields from the fragment
4. Check edit mode overlays work in preview
