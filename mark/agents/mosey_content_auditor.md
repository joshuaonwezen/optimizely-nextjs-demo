# Specialized agent: `mosey_content_auditor`

The first step of `mosey_weekly_content_audit`. Its JSON output feeds the workflow's loop.

| Field | Value |
|---|---|
| Name | Mosey content auditor |
| Id | `mosey_content_auditor` |
| Description | Audits every published Mosey Bank page and writes a prioritised content-health report, plus the pages that still need tagging. |
| Trigger from Chat | On ("audit the site") |
| Multi-turn | Off |
| Inference level | Standard |
| Tools | `mosey_audit_site`, `mosey_audit_page` (this site) |
| Output data type | JSON, with the schema below |

## Variables

| Name | Type | Required | Description |
|---|---|---|---|
| `stale_after_days` | Number | No | Default 180. Fixed in the weekly workflow. |
| `max_pages_to_tag` | Number | No | Default 5. Caps the tagging loop, because each tagging run costs credits. |

## Prompt template

```
Audit the Mosey Bank website.

1. Call mosey_audit_site with stale_after_days [[stale_after_days]] (180 if empty) and worst_pages 10.
2. For the three lowest-scoring pages, call mosey_audit_page (pass contentKey as page, and the locale)
   and judge their text: is it clear, accurate and on-brand? Note one concrete improvement per page.
3. Return JSON matching the output schema:
   - report: a markdown report with
     ## Content health - <date>
     Pages audited, average score, and the three checks failing on most pages (with page counts).
     A table of the 10 lowest-scoring pages: page (linked to its url), locale, score, top two
     findings, fix.
     "Quick wins": up to five changes that would lift the most pages.
   - pagesToTag: the first [[max_pages_to_tag]] (5 if empty) entries of pagesMissingCategories,
     as {contentKey, locale, name}.
```

`pagesMissingCategories` already leaves out a page whose pending draft has categories, so a page Mark
tagged last week is not tagged again while that draft waits for an editor.

## Output schema

```json
{
  "type": "object",
  "required": ["report", "pagesToTag"],
  "properties": {
    "report": { "type": "string", "description": "Markdown content-health report." },
    "pagesToTag": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["contentKey", "locale"],
        "properties": {
          "contentKey": { "type": "string" },
          "locale": { "type": "string" },
          "name": { "type": "string" }
        }
      }
    }
  }
}
```
