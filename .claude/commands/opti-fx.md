---
description: Integrate Optimizely Feature Experimentation (FX) flags, variables, and CMS Variations in this Next.js project.
---

You are working with Feature Experimentation (FX) in this project. Key patterns:

## SDK wrapper

Located at `src/lib/optimizely/experimentation.ts`. Use it — don't import the FX SDK directly.

```ts
import { getDecision, getAllDecisions, bucketVisitor } from "@/lib/optimizely/experimentation";

// In a React Server Component:
const decision = await getDecision("my_flag_key", userId, attributes);
// decision.enabled, decision.variationKey, decision.variables
```

## User ID and attributes

Get from middleware-injected cookies/headers. Standard pattern in page routes:

```ts
import { cookies, headers } from "next/headers";

const cookieStore = await cookies();
const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";

const headerStore = await headers();
const ua = headerStore.get("user-agent") ?? "";
const device = /mobile/i.test(ua) ? "mobile" : "desktop";
const country = headerStore.get("x-vercel-ip-country") ?? "";

const attributes = { device, country };
```

The middleware (`src/middleware.ts`) sets `fx_user_id` as a persistent cookie on first request — always use this for stable bucketing, never generate a new UUID per request.

## Impression events

`getDecision` suppresses impressions by default (`DISABLE_DECISION_EVENT`). To fire an impression when a variant actually renders in the UI:

```tsx
import { bucketVisitor } from "@/lib/optimizely/experimentation";

export async function MyVariantComponent({ flagKey, userId, attributes }) {
  await bucketVisitor(flagKey, userId, attributes);
  return <div>...</div>;
}
```

## CMS Variations — the key pattern

FX variation keys map to CMS content variation names. The page route in `src/app/[[...slug]]/page.tsx` collects all active variation keys and passes them to Graph:

```ts
const decisions = await getAllDecisions(userId, attributes);
const variationKeys = Object.values(decisions)
  .filter(d => d.enabled && d.variationKey)
  .map(d => d.variationKey!);

const content = await getClient().getContentByPath(path, {
  variation: {
    include: "SOME",
    value: variationKeys,
    includeOriginal: true,  // falls back to published content if no key matches
  },
});
```

## Setting up a CMS Variation (editor steps)

1. Open the page in CMS Visual Builder
2. Click the block or section to personalize → "Add variation"
3. Name the variation to **exactly match** an FX variation key (e.g., `variation_1`) — case-sensitive
4. Edit the variation's content in the editor
5. Publish the variation

Graph returns the variation's content when that key is in the variation filter.

## Feature variables

Variables from the FX flag are available in the decision object:

```ts
const decision = await getDecision("subscribe_button", userId, attributes);
const label = decision.variables?.button_label as string ?? "Subscribe";
const color = decision.variables?.button_color as string ?? "brand";
```

Declare variables in the FX console: flag → Variables tab → add variable with key + type + default value.

## Audience attributes available in this project

| Attribute | Source | How to get it |
|-----------|--------|--------------|
| `device` | User-Agent | `headers().get("user-agent")` → parse mobile/desktop |
| `country` | Vercel/Cloudflare geo | `headers().get("x-vercel-ip-country")` |
| `loggedIn` | Session | Check auth cookie or next-auth session |
| `userId` | Stable cookie | `cookies().get("fx_user_id")?.value` |
| `utmSource` | Query param | `searchParams.get("utm_source")` |
| `customCookie` | Any cookie | `cookies().get("my_cookie")?.value` |

Combine as many as needed: `{ device, country, loggedIn, utmSource }`.

## Flag not bucketing / always off?

1. Is the flag enabled in the FX console?
2. Is there an active experiment or feature delivery rule targeting "everyone"?
3. Is `userId` stable (persistent cookie, not a new UUID per request)?
4. Do audience conditions match? Log `attributes` to confirm values.
5. Has the datafile refreshed? FX SDK fetches it with 60s revalidation — wait after making changes.

## Live demo

See `src/app/demo/feature-experimentation/page.tsx` for a working end-to-end example including live flag decisions, variable rendering, and code snippets.
