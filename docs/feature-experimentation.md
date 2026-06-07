# Feature Experimentation Integration

Optimizely Feature Experimentation (FX) runs alongside SaaS CMS on the same platform. This document covers how the two are wired together in this project.

---

## Architecture overview

```
Browser request
  │
  ▼
Middleware (src/middleware.ts)
  │  Sets optimizelyEndUserId cookie on first visit
  ▼
CmsPage server component (src/app/[[...slug]]/page.tsx)
  │  1. Reads cookies
  │  2. getAllDecisions() → active FX variation keys
  │  3. getContentByPath(url, { variation: { include: SOME, value: [...], includeOriginal: true } })
  │  4. Graph returns CMS variation if one exists, original content if not
  │  5. If a variation was served → bucketVisitor() fires the impression event
  ▼
Render
```

Component-level flags (GlobalBanner, ProductHeroBlock) follow a simpler pattern: `getDecision()` → render conditionally → `bucketVisitor()` if the flag is on.

---

## Cookies

`src/middleware.ts` sets one cookie on every request (once per browser, 1-year TTL):

| Cookie | Value | Purpose |
|---|---|---|
| `optimizelyEndUserId` | UUID | Stable user identity for consistent bucketing across requests |

The cookie is `httpOnly` and `sameSite: lax`. Device type (`mobile` | `desktop`) is not stored as a cookie — it is derived from the `User-Agent` header server-side in `getVisitorContext()`, which keeps it GDPR-safe and always current.

---

## The experimentation client

`src/lib/optimizely/experimentation.ts` is a stateless server-side helper. It fetches the FX datafile once per minute (via Next.js fetch cache), creates an SDK client, and exposes three functions.

### `getDecision(flagKey, userId, attributes?)`

Evaluates a single flag for a user. Uses `DISABLE_DECISION_EVENT` — no impression is recorded. Use this when reading flag variables to conditionally render UI.

```ts
const decision = await getDecision("banner", userId, { device, logged_in: false });
if (decision.enabled) {
  // render FX-driven banner using decision.variables
}
```

### `getAllDecisions(userId, attributes?)`

Evaluates all flags at once. Also uses `DISABLE_DECISION_EVENT`. Use this in the CMS page route to collect all active variation keys before the Graph call.

```ts
const decisions = await getAllDecisions(userId, { device, logged_in: false });
// decisions["banner"].variationKey → "banner1" | "banner2" | null
```

### `bucketVisitor(flagKey, userId, attributes?)`

Calls `decide()` **without** `DISABLE_DECISION_EVENT`, which causes the SDK to fire an impression event to Optimizely's event endpoint. Call this after you know the flag's content has actually been rendered — not during the routing/bucketing pass.

```ts
void bucketVisitor("banner", userId, { device, logged_in: false });
```

The call is fire-and-forget (`void`). The forwarding event processor dispatches immediately over HTTP.

---

## CMS Variations + FX: how they connect

Editors create **content variations** in Visual Builder keyed to FX experiment variation names. The key is the contract: an FX variation named `banner1` matches a CMS content variation also named `banner1`.

### The variation filter

After collecting active FX variation keys, the CMS page route passes them to `getContentByPath`:

```ts
const variationOption = activeVariations.length > 0
  ? { variation: { include: "SOME", value: activeVariations, includeOriginal: true } }
  : undefined;

const items = await client.getContentByPath(url, variationOption);
```

`GraphVariationInput` (from `@optimizely/cms-sdk`) has three modes:

| `include` | Behaviour |
|---|---|
| `NONE` | Return only original content, never variations |
| `ALL` | Return all variations (used by the preview route) |
| `SOME` | Return the variation whose key matches one of `value[]`, or fall back if `includeOriginal: true` |

### Critical: `includeOriginal: true` is required

`include: SOME` **without** `includeOriginal` is a strict filter. If the page has no CMS variation matching the requested keys, Graph returns zero results — not the original content. This causes a 404 for every page whenever a user is in any active FX experiment.

`includeOriginal: true` tells Graph to return the original content as a fallback when no matching variation exists. Always include it.

This option is defined in the SDK's TypeScript types (`GraphVariationInput` in `@optimizely/cms-sdk/dist/esm/graph/filters.d.ts`) but is not currently documented in the Optimizely Graph public docs. Its behaviour was confirmed by direct API testing.

### Impression tracking for CMS variations

Because all flags are evaluated with `DISABLE_DECISION_EVENT`, impressions are not automatically recorded. When Graph returns a content variation (`page._metadata?.variation` is set), the page route identifies which flag owns that variation key and calls `bucketVisitor` to fire the impression:

```ts
const servedVariation = page._metadata?.variation ?? null;
if (servedVariation) {
  const exposedFlag = Object.values(fxDecisions).find(
    (d) => d.variationKey === servedVariation
  );
  if (exposedFlag) {
    void bucketVisitor(exposedFlag.flagKey, userId, attributes);
  }
}
```

---

## Component-level flags

Some flags drive UI behaviour directly in components rather than swapping CMS content.

### GlobalBanner (`src/components/layout/GlobalBanner/index.tsx`)

The `banner` flag overrides the CMS-managed site banner when enabled. Variables:

| Variable | Type | Effect |
|---|---|---|
| `title` | string | Banner message (takes priority over `description`) |
| `description` | string | Banner message fallback |
| `linkText` | string | Optional link label (no href — for demo purposes) |

If the flag is off, the component falls through to the CMS `SiteBanner` content type.

### ProductHeroBlock (`src/components/blocks/ProductHeroBlock/index.tsx`)

The `add_to_cart` flag controls the CTA button appearance. Variables:

| Variable | Type | Effect |
|---|---|---|
| `button_color` | `blue` \| `green` \| `red` \| `purple` \| `amber` | Button background colour |
| `button_style` | `filled` \| `outline` | Button style modifier |

---

## Setting up an experiment end-to-end

### In Feature Experimentation

1. Create a flag (e.g. `banner`)
2. Add an experiment with named variations — e.g. `banner1`, `banner2`
3. Note the exact variation key strings — these become the link to CMS

### In Visual Builder (for CMS Variations)

1. Open the page or shared block you want to personalise
2. Open the **Variations** panel → **Add variation**
3. Name it exactly matching the FX variation key (e.g. `banner1`)
4. Edit and publish the variation content

Repeat for each variation. Users not in the experiment see original content automatically via `includeOriginal: true`.

### Launch

Start the experiment in the FX dashboard. FX controls bucketing and traffic allocation; Graph handles content delivery; the impression event closes the loop for analytics.

---

## Attributes and audiences

Attributes passed to the SDK map to FX audience conditions:

| Attribute | Values | FX Audience |
|---|---|---|
| `device` | `desktop` \| `mobile` | Desktop / Mobile |
| `logged_in` | `boolean` | Logged-in visitors |

`logged_in` is currently hardcoded to `false` throughout the project. To target logged-in users, read auth state and pass `logged_in: true`.

---

## Known limitations

**Semantic search not active** — The FX project has a `search_algorithm` flag with a `search_algorithm` JSON variable intended to drive search behaviour. The Optimizely Graph instance does not currently have semantic vector indexing enabled, so `_ranking: SEMANTIC` degrades to `_ranking: RELEVANCE` regardless of `_semanticWeight`. Enable vector indexing in the Graph project settings to activate semantic search.

**Impression events are fire-and-forget** — `bucketVisitor` uses `void` and dispatches asynchronously. In a Next.js streaming response context, the HTTP event dispatch may not complete before the response is fully sent. For production use, consider `waitUntil` from `next/server` to extend the request lifetime.

**`logged_in` is always false** — No authentication is implemented. All users are treated as anonymous with `logged_in: false`, so the `Logged-in visitors` FX audience is never matched.
