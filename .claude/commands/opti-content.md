# Optimizely SaaS CMS — Create, Update & Publish Content

Use this skill to create, update, and publish content items (pages, shared blocks, components).
All mutations go through `https://api.cms.optimizely.com/v1/`.

## Authentication — JWT token (expires in 300 seconds)

The bearer token expires after **300 seconds**. Always fetch fresh and cache with expiry tracking:

```typescript
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  // Refresh 30 s before actual expiry to be safe (token TTL = 300 s)
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  const res = await fetch("https://api.cms.optimizely.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.OPTIMIZELY_CMS_CLIENT_ID,
      client_secret: process.env.OPTIMIZELY_CMS_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return cachedToken.token;
}
```

Call `getToken()` before every API request. Never reuse a token across long operations without re-checking expiry.

---

## Create a content item

`POST https://api.cms.optimizely.com/v1/content`
Content-Type: `application/json`

The body wraps `NewContent` — the content node metadata plus an `initialVersion` with display name, locale, properties, and status.

```json
{
  "key": "optional-custom-key-no-hyphens",
  "contentType": "HeroBlock",
  "container": "<container-key>",
  "initialVersion": {
    "locale": "en",
    "displayName": "My Hero Block",
    "status": "published",
    "properties": {
      "headline": "Welcome to Optimizely",
      "subheadline": "Build amazing digital experiences",
      "ctaText": "Get Started",
      "ctaLink": "/en/get-started"
    }
  }
}
```

- `key` — omit to let the API generate one (returned in the response)
- `container` — the folder/shared-assets container key from the CMS; required for blocks
- `status` in `initialVersion` can be `"draft"` or `"published"`; use `"published"` to make the item immediately live

### Property value formats

| Property type | Value format |
|---------------|-------------|
| `string` | `"plain string"` |
| `boolean` | `true` / `false` |
| `integer` | `42` |
| `float` | `3.14` |
| `dateTime` | `"2025-01-15T10:00:00Z"` (RFC 3339) |
| `url` | `"https://example.com"` |
| `contentReference` | `"cms://content/<key>"` — key must exist before referencing |
| `array` of content refs | `[{"reference":"cms://content/<key1>"},{"reference":"cms://content/<key2>"}]` |
| `richText` | `{"html": "<p>Hello <strong>world</strong></p>"}` |
| `link` | `{"href": "https://example.com", "title": "Example", "target": "_blank"}` |

**Important for content references:** The referenced content must exist in the CMS before you create the referencing item. If you're bulk-seeding, create leaf nodes first (bottom-up), then parents. Add a short delay (3–5 s) after creating referenced items to let the CMS propagate them.

---

## Update content properties

Content in Optimizely has two levels:
1. **Content node** (`PATCH /content/{key}`) — structural metadata: container, owner
2. **Content version** (`PATCH /content/{key}/versions/{version}`) — display name, properties, locale

To update properties, patch the version:

`PATCH https://api.cms.optimizely.com/v1/content/{key}/versions/{version}`
Content-Type: `application/merge-patch+json`

```json
{
  "displayName": "Updated Hero",
  "properties": {
    "headline": "New Headline",
    "ctaText": "Learn More"
  }
}
```

### Get the current version key

```bash
# List versions — the latest published one is what you want
curl -s "https://api.cms.optimizely.com/v1/content/{key}/versions" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.items[] | select(.status == "published") | .version'
```

Or get the full content node which includes version info:
```bash
curl -s "https://api.cms.optimizely.com/v1/content/{key}" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Publish a content version

After creating a draft version or after patching, publish it:

`POST https://api.cms.optimizely.com/v1/content/{key}/versions/{version}:publish`
Content-Type: `application/json`
Body: `{}` (empty object; no required fields)

```bash
curl -s -X POST \
  "https://api.cms.optimizely.com/v1/content/$KEY/versions/$VERSION:publish" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Full create-then-publish flow (TypeScript)

```typescript
// 1. Create as draft
const createRes = await fetch("https://api.cms.optimizely.com/v1/content", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
  body: JSON.stringify({
    contentType: "HeroBlock",
    container: CONTAINER_KEY,
    initialVersion: { locale: "en", displayName: "My Hero", status: "draft", properties: { ... } },
  }),
});
const created = await createRes.json();
const { key, initialVersion: { version } } = created;

// 2. Publish
await fetch(`https://api.cms.optimizely.com/v1/content/${key}/versions/${version}:publish`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
  body: "{}",
});
```

Alternatively, set `status: "published"` directly in the `initialVersion` body when creating — this publishes in a single request.

---

## Delete content

`DELETE https://api.cms.optimizely.com/v1/content/{key}`

Soft-deletes by default. To permanently delete, add `?permanent=true`.

---

## List content in a container

```bash
curl -s "https://api.cms.optimizely.com/v1/content/{containerKey}/items?pageSize=100" \
  -H "Authorization: Bearer $TOKEN" | jq '.items[] | {key, contentType: .contentType}'
```

---

## After creating / updating content

Optimizely Graph indexes content asynchronously. After creating or publishing content:
- Wait **30–60 seconds** before expecting the item to be queryable via GraphQL
- If a query returns empty results immediately after seeding, it's the indexing delay — retry after a minute

## $ARGUMENTS
