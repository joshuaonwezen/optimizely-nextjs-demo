# External content sources (Content Source API)

Moved out of CLAUDE.md.

## External Content Sources (Content Source API)

### Account activation required for data indexing
Schema registration (`PUT /api/content/v3/types`) works without any special setup. Data indexing (`POST /api/content/v2/data`) requires the external content sources pipeline to be enabled for the account by Optimizely. Without activation, data pushes return 200 OK with a `journalId` but items never appear in Graph queries. Contact Optimizely support to enable this if data never indexes despite correct auth and schema registration.

### Corrupted index mapping — delete the source and re-register

If a data sync returns `200` with a `journalId` but the data never appears (queries return `total: 0`) **and the account is activated**, the source's Elasticsearch mapping is corrupted — e.g. from a changed field type (Float→GeoPoint) or a prior bad payload (see the `_rbac` object gotcha above). ES rejects every document while the sync endpoint still accepts the push (200), so the failure is invisible. The only fix is to delete the entire source and re-register:

```
DELETE https://cg.optimizely.com/api/content/v3/sources?id=<sourceId>
Authorization: Basic <base64(APP_KEY:APP_SECRET)>
```

Default mode deletes both types and data (`mode=types` or `mode=data` scope it). **`id` is REQUIRED — an empty `id` deletes ALL sources.** Confirm with `GET /api/content/v3/types?id=<sourceId>` → should return `404 Source 'X' not found`. Then re-run the seed (re-register the type, re-push the data). A healthy sibling instance can be left alone — recreate only the broken one.

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
