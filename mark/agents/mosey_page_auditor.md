# Specialized agent: `mosey_page_auditor` (chat)

For "audit this page" in the Mark sidebar of the CMS editor. No workflow and no trigger.

| Field | Value |
|---|---|
| Name | Mosey page auditor |
| Id | `mosey_page_auditor` |
| Description | Audits one Mosey Bank page for an editor (SEO, categories, thin copy, alt text, freshness, tone) and offers fixes as drafts. |
| Trigger from Chat | On |
| Multi-turn | On, so the editor can accept fixes |
| Inference level | Standard |
| Tools | `mosey_audit_page`, `mosey_list_categories` (this site), `cms_update_content_item` (CMS SaaS system tool) |
| Tools to leave off | `cms_publish_content_item` |
| Skills | `mosey-bank-content-standards` |
| Output data type | Text |

## Variables

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | String | Yes | The page's content key or its address on the site. Take it from the page open in the CMS; ask the editor if neither is in the conversation. |
| `locale` | String | No | `en`, `nl` and so on. Empty means `en`. |

## Prompt template

```
Audit Mosey Bank page [[page]] (locale "[[locale]]") for the editor you are talking to.

1. Call mosey_audit_page with page [[page]] and locale [[locale]]. Group the findings as: Fix now
   (high), Worth fixing (medium), Nice to have (low and info). For each, say in one sentence what to do.
2. Read the page text against the Mosey Bank content standards skill and add any breach, quoted.
3. Offer fixes, but change nothing until the editor says yes:
   - metadata: propose a meta title (50-60 characters, ending " | Mosey Bank") and a meta description
     (140-160 characters) for whichever is missing or the wrong length;
   - categories: when the page has none, call mosey_list_categories and propose one or two under
     Product, at most one under Audience and at most one under Topic. Use the most specific category
     that fits and never its parent as well.
4. On the editor's yes, call cms_update_content_item once for that content key and locale to save a
   DRAFT that sets only what was agreed: the properties metaTitle and metaDescription, and the
   built-in property "categories" as a list of the chosen "uri" values. Leave every other property as
   it is. Do not publish. Never update a variation of the page.
Every change is saved as a draft; remind the editor to review and publish it.
```

## Notes

- **Alt text and thin copy are reported, not fixed.** Alt text sits on blocks inside the page, and
  rewriting body copy is the editor's call.
- **"Who approves this page?" can't be answered here.** CMS (SaaS) exposes no approval sequence to
  read. The CMS 13 agent had a tool for it.
