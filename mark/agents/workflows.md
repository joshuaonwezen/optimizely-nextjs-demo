# Workflow agents

Build these on the Mark canvas (Agents → Add Agent → Workflow Agent) after the specialized agents
exist, or import them from `mark/agents/*.json` once those exports are in the repo (see
`mark/README.md`). Webhook and scheduled runs execute **as the workflow's owner** and use the owner's
credits.

The `cms_*` system tools must act on the CMS (SaaS) instance this site runs on (joshCMS). Where a
trigger or agent offers a **Product Instance**, pick that one. How a background run chooses an
instance when the Mark instance is connected to several is not verified here: the first run of each
workflow is the check, and a wrong instance shows up as "content not found" on the save.

## `mosey_on_publish_enrich`

| Field | Value |
|---|---|
| Name | Mosey: tag on publish |
| Description | When an editor publishes a Mosey Bank page that lacks categories or metadata, tag it and fill in the metadata as a draft. |
| Trigger | **Webhook**. Payload content type `application/json`, Payload Schema `mark/payloads/on-publish.schema.json`. Auth Header Name `Authorization`, Auth Header Format `Bearer {key}`, plus a long random Auth Key. These three can't be edited after saving. |
| Step 1 | `mosey_page_tagger`. `content_key` Automatic (payload `contentKey`), `locale` Automatic (payload `locale`). |

After saving, copy the trigger's URL into `MARK_ON_PUBLISH_URL` and the header value with the key
filled in (`Bearer <key>`) into `MARK_ON_PUBLISH_AUTH` on the Vercel project, then redeploy.

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

The site's own tools authenticate with the registry entry's bearer token, so they work in a
scheduled run. Whether `cms_update_content_item` gets the owner's sign-in in a **scheduled** run is
not verified; webhook runs did on the CMS 13 build. *Run now* once and look for the drafts.
