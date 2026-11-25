# Specialized agent: `mosey_page_tagger`

Used as a step by `mosey_on_publish_enrich` and `mosey_weekly_content_audit`.

| Field | Value |
|---|---|
| Name | Mosey page tagger |
| Id | `mosey_page_tagger` |
| Description | Tags one Mosey Bank page with categories from the site taxonomy and fills in missing SEO metadata, saved as a draft for an editor to publish. |
| Trigger from Chat | Off (workflow step only) |
| Multi-turn | Off |
| Inference level | Standard |
| Tools (add manually, don't rely on prediction) | `mosey_get_page_profile`, `mosey_list_categories` (this site), `cms_update_content_item` (CMS SaaS system tool) |
| Tools to leave off | `cms_publish_content_item`. Without it the agent cannot publish, whatever it is told. |
| Output data type | Text (markdown) |

## Variables

| Name | Type | Required | Description |
|---|---|---|---|
| `content_key` | String | Yes | The page's content key (`contentKey` in the webhook payload). |
| `locale` | String | No | Locale of the version, e.g. `en` or `nl` (`locale` in the payload). Empty means `en`. |

## Prompt template

```
You tag one Mosey Bank page so it appears in the right category-filtered lists and in search.
The page has content key [[content_key]], locale "[[locale]]" (empty means en).

1. Call mosey_get_page_profile with page [[content_key]] and locale [[locale]].
   - If "missing" is empty, reply "Nothing to do: <page name> already has categories and metadata." and stop.
   - If "pendingDraft" is not null, reply "Nothing to do: <page name> already has a newer draft
     (version <n>) waiting for an editor." and stop. Never stack a second draft on top of one.
2. If "categories" is in "missing", call mosey_list_categories and choose categories for what the page
   is MAINLY about: one or two under Product, at most one under Audience, at most one under Topic.
   Use the most specific category that fits and never its parent as well. Only use categories from
   that list. Fewer accurate categories beat many vague ones.
3. Write metadata ONLY for the fields "missing" names. Never overwrite what an editor wrote.
   - metaTitle: 50-60 characters, main topic first, ending " | Mosey Bank".
   - metaDescription: 140-160 characters, plain English, one concrete benefit taken from the page text.
     Never invent rates or claims, never say "guaranteed" or "risk-free".
   - Write in the page's language.
4. Call cms_update_content_item once, for content key [[content_key]] in that locale, to save a DRAFT
   that sets only:
   - the properties metaTitle and metaDescription (just the ones you wrote);
   - the built-in property "categories": the list of chosen "uri" values, for example
     ["cms://taxonomy/categories/remortgaging", "cms://taxonomy/categories/guides"].
   Leave every other property as it is. Do not publish. Never update a variation of the page.
5. Reply in markdown: the categories chosen with a one-line reason each, the metadata written, and
   the page's url, so an editor can open the page in the CMS, review the draft and publish it.
```

## Notes

- **Categories live on the version** in CMS (SaaS), so a Dutch version is tagged in its own run with
  `locale` set to `nl`. There is no shared-across-languages save as on CMS 13.
- **If `cms_update_content_item` reports that a category is not selectable**, the list tool could not
  reach the CMS and guessed. See Troubleshooting in `mark/README.md`.
- The prompt names the property keys because they are this site's (`SEOContract` in
  `optimizely.config.mjs`), not something the system tool knows.
