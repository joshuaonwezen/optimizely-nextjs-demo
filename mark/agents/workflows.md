# Workflow agents

Build these on the Mark canvas (Agents → Add Agent → Workflow Agent) after the specialized agents
exist, or import them from `mark/agents/*.json` once those exports are in the repo (see
`mark/README.md`). Webhook and scheduled runs execute **as the workflow's owner** and use the owner's
credits.

**Every trigger needs its Product Instance set** to the CMS (SaaS) instance this site runs on
(joshCMS). The field is optional in the form, but a background run has no CMS open, so without it
`cms_update_content_item` fails with "Authorization failed: A CMS product must be selected when using
this tool" (seen on the first live run, 2026-11-25). The site's own tools are not affected: the run
read the page and chose categories before it stopped at the save.

## `mosey_on_publish_enrich`

| Field | Value |
|---|---|
| Name | Mosey: tag on publish |
| Description | When an editor publishes a Mosey Bank page that lacks categories or metadata, tag it and fill in the metadata as a draft. |
| Trigger | **Webhook**. Payload content type `application/json`, Payload Schema `mark/payloads/on-publish.schema.json`. Auth Header Name `Authorization`, Auth Header Format `Bearer {key}`, plus a long random Auth Key. These three can't be edited after saving. |
| Step 1 | `mosey_page_tagger`. `content_key` Automatic (payload `contentKey`), `locale` Automatic (payload `locale`). |

After saving, copy the trigger's URL into `MARK_ON_PUBLISH_URL` and the header value with the key
filled in (`Bearer <key>`) into `MARK_ON_PUBLISH_AUTH` on the Vercel project, then redeploy.

## `mosey_on_publish_translate`

| Field | Value |
|---|---|
| Name | Mosey: translate on publish |
| Description | When an editor publishes the English version of a Mosey Bank page that has no Dutch version yet, translate it and save the translation as a draft. |
| Trigger | **Webhook**, as above, with `mark/payloads/on-translate.schema.json`. Its own Auth Key. |
| Step 1 | `mosey_page_translator`. `content_key` Automatic (payload `contentKey`), `source_locale` Automatic (payload `locale`), `target_locale` Fixed `nl`. |

Copy its URL and header value into `MARK_ON_TRANSLATE_URL` and `MARK_ON_TRANSLATE_AUTH`.

- **Languages** are `MARK_TRANSLATE_LOCALES` on the site (default `nl`). The payload's `targetLocales`
  lists the ones the page has no version in. For more than one language, replace step 1 with a
  **Loop** over `targetLocales` and set `target_locale` to Automatic (the loop item).
- **It runs after tagging, not beside it.** While "tag on publish" is configured, an incomplete page
  is not translated: the tagger's draft comes first, and the publish of that draft starts the
  translation, so the Dutch version carries the categories and metadata.
- **One translation per language.** A language the page already has a version in, even a draft, never
  starts a run.
- **The page and its shared blocks.** The agent asks `mosey_get_translation_plan` which shared blocks
  the page uses and saves a Dutch draft of each one that has none, then of the page. A shared block
  with no Dutch version is missing from the Dutch page. An editor publishes the blocks' drafts, then
  the page's.

## `mosey_on_review_compliance`

| Field | Value |
|---|---|
| Name | Mosey: compliance review on submit |
| Description | When an editor sends a Mosey Bank page for review, review that exact version against the content standards for the approver. |
| Trigger | **Webhook**, as above, with `mark/payloads/on-review.schema.json`. |
| Step 1 | `mosey_compliance_reviewer`. `content_key` Automatic (`contentKey`), `version` Automatic (`version`), `locale` Automatic (`locale`). |

Copy its URL and header value into `MARK_ON_REVIEW_URL` and `MARK_ON_REVIEW_AUTH`. Only a version
that reaches the status In review starts a run, which needs an approval sequence on the page.
`MARK_REVIEW_STATUSES=InReview,Ready` adds pages marked *Ready to publish*.

## `mosey_weekly_content_audit`

| Field | Value |
|---|---|
| Name | Mosey: weekly content audit |
| Description | Every Monday, audit the whole site, report content health, and tag up to five untagged pages. |
| Trigger | **Scheduler**, recurring, cron `0 7 * * 1` (Monday 07:00 UTC). Use **Run now** for the demo. |
| Step 1 | `mosey_content_auditor`. `stale_after_days` Fixed 180, `max_pages_to_tag` Fixed 5. |
| Step 2 | **Loop** over step 1's `pagesToTag`. |
| Step 2.1 | `mosey_page_tagger` inside the loop. `content_key` Automatic (item `contentKey`), `locale` Automatic (item `locale`). |

The report is step 1's `report` field in the run output. The tagging drafts appear in each page's
version list in the CMS.

## `mosey_experiment_rounds`

| Field | Value |
|---|---|
| Name | Mosey: test rounds |
| Description | Every day, read the results of every content test, report where each stands, and revise or write the variation of up to three pages that the results call for. |
| Trigger | **Scheduler**, recurring, cron `0 7 * * *` (daily 07:00 UTC). Use **Run now** for the demo. |
| Step 1 | `mosey_experiment_monitor`. `revise_after_days` Fixed 7, `max_pages` Fixed 3. |
| Step 2 | **Loop** over step 1's `pagesToContinue`. |
| Step 2.1 | `mosey_variation_writer` inside the loop. `page` Automatic (item `contentKey`), `locale` Automatic (item `locale`), `idea` and `audience` empty. |

The report is step 1's `report` field. Each loop run ends with the draft it saved and what an editor
does next.

- **Nothing changes in Feature Experimentation.** The tests are made and started from the Feature
  Experimentation panel in the CMS (the FX Experiments extension), as before. This workflow reads
  their results and writes CMS drafts.
- **A revision keeps the test going.** The variation's key stays the same, so the running rule serves
  the new wording as soon as an editor publishes the draft.
- **Reading results needs `OPTIMIZELY_FX_API_TOKEN`** on the Vercel project. Without it the tools
  list the running tests and say that results could not be read, and every page's action is `wait`.
- **One page from chat:** `mosey_variation_writer` has Trigger from Chat on. "Improve the test on
  /consultants/sarah-chen" or "write a variation of this page for first-time buyers" runs the same
  steps for one page, and is how a page gets its first variation.

The site's own tools authenticate with the registry entry's bearer token, so they work in a
scheduled run. Whether `cms_update_content_item` gets the owner's sign-in in a **scheduled** run is
not verified; webhook runs did on the CMS 13 build. *Run now* once and look for the drafts.
