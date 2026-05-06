# Optimizely SaaS CMS — Manage Content Types

Use this skill whenever you need to create or update content types in Optimizely SaaS CMS.
All mutations go through the REST API at `https://api.cms.optimizely.com/v1/`.

## Authentication — JWT token (expires in 300 seconds)

The bearer token from the client_credentials flow expires after **300 seconds**. Always:
1. Request a fresh token at the start of a script.
2. Track the expiry time and refresh if more than ~260 seconds have passed.
3. Never hardcode a token — always fetch it programmatically.

**Bash one-liner (single request):**
```bash
export $(grep -v '^#' .env.local | xargs)
TOKEN=$(curl -s -X POST https://api.cms.optimizely.com/oauth/token \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"$OPTIMIZELY_CMS_CLIENT_ID\",\"client_secret\":\"$OPTIMIZELY_CMS_CLIENT_SECRET\"}" \
  | jq -r '.access_token')
```

**TypeScript helper (for scripts that make multiple calls):**
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
  // expires_in is in seconds (300); store as ms
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return cachedToken.token;
}
```

Always call `getToken()` immediately before each API request in long-running scripts — the cache check is cheap and prevents silent auth failures mid-script.

---

## Create a new content type

`POST https://api.cms.optimizely.com/v1/contenttypes`
Content-Type: `application/json`

```json
{
  "key": "MyBlockType",
  "displayName": "My Block",
  "description": "Optional description for editors",
  "baseType": "_component",
  "compositionBehaviors": ["elementEnabled"],
  "properties": {
    "headline": {
      "type": "string",
      "displayName": "Headline",
      "isRequired": false,
      "indexingType": "searchable"
    },
    "body": {
      "type": "richText",
      "displayName": "Body Text"
    },
    "image": {
      "type": "contentReference",
      "displayName": "Image",
      "allowedTypes": ["_image"],
      "indexingType": "disabled"
    },
    "items": {
      "type": "array",
      "displayName": "Items",
      "items": {
        "type": "content",
        "allowedTypes": ["MyOtherType"]
      }
    }
  }
}
```

### baseType values
- `_component` — shared block / component
- `_page` — page type
- `_experience` — Visual Builder experience
- `_section` — Visual Builder section
- `_element` — Visual Builder element
- `_image` / `_video` / `_media` — media types

### compositionBehaviors (only for `_component`)
- `sectionEnabled` — can be placed as a section in compositions
- `elementEnabled` — can be placed as an element inside columns
- `formsElementEnabled` — available as a form element

### Property types
| type | notes |
|------|-------|
| `string` | Plain text; add `indexingType: "searchable"` for full-text search |
| `richText` | HTML rich text |
| `boolean` | True/false |
| `integer` | Integer number |
| `float` | Decimal number |
| `dateTime` | ISO 8601 date-time |
| `url` | URL string |
| `contentReference` | Reference to another content item; use `allowedTypes` to restrict |
| `content` | Inline embedded component; use `contentType` to specify the type |
| `array` | List of values or content refs; requires nested `items` definition |
| `json` | Arbitrary JSON object |
| `link` | Link with href, title, target |

---

## Update an existing content type

`PATCH https://api.cms.optimizely.com/v1/contenttypes/{key}`
Content-Type: `application/merge-patch+json`

Only include fields you want to change. To add a property, include it in `properties` — merge-patch adds it without touching existing ones.

```json
{
  "displayName": "Updated Display Name",
  "properties": {
    "newField": {
      "type": "string",
      "displayName": "New Field"
    }
  }
}
```

**Merge-patch rules:** setting a field to `null` removes it; omitting a field leaves it unchanged.

---

## Delete a content type

`DELETE https://api.cms.optimizely.com/v1/contenttypes/{key}`

Only succeeds if no content items of that type exist.

---

## List / inspect content types

```bash
# List all (paginated)
curl -s "https://api.cms.optimizely.com/v1/contenttypes?pageSize=100" \
  -H "Authorization: Bearer $TOKEN" | jq '.items[].key'

# Get one
curl -s "https://api.cms.optimizely.com/v1/contenttypes/MyBlockType" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## After changing content types

- Run `npm run opti:push` to sync TypeScript definitions → CMS (or use the API directly as above).
- Optimizely Graph re-indexes the schema asynchronously — wait **1–2 minutes** before expecting new fields to appear in GraphQL queries.

## $ARGUMENTS
