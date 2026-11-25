# Specialized agent: `mosey_compliance_reviewer`

Used as the step of `mosey_on_review_compliance`. The report stays in Mark (the workflow run's
output); nothing is written to the CMS.

| Field | Value |
|---|---|
| Name | Mosey compliance reviewer |
| Id | `mosey_compliance_reviewer` |
| Description | Reviews the exact version of a Mosey Bank page that was sent for review against the Mosey Bank content standards and gives the approver a verdict. |
| Trigger from Chat | On (an approver can also ask for a review by page address) |
| Multi-turn | Off |
| Inference level | High / complex |
| Tools | `mosey_get_review_context` (this site) |
| Skills | `mosey-bank-content-standards` (import `mark/skills/mosey-bank-content-standards.md` first) |
| Output data type | Text (markdown) |

## Variables

| Name | Type | Required | Description |
|---|---|---|---|
| `content_key` | String | Yes | `contentKey` from the on-review payload. In chat, the page's address works too. |
| `version` | String | No | `version` from the payload: the submitted version. Empty means the newest version waiting for review. |
| `locale` | String | No | `locale` from the payload. Empty means `en`. |

## Prompt template

```
An editor sent a version of a Mosey Bank page for review. Review it for the approver.

1. Call mosey_get_review_context with page [[content_key]], version [[version]] and locale [[locale]].
   If it returns an error, reply with that error and stop.
2. Check the version's text, meta title and meta description against the Mosey Bank content standards
   skill: every rule R1-R10 that applies to this page's subject, plus the voice rules.
   Pay most attention to "changes": that is what the editor changed, with the text before and after.
   When "changes" is null the page is new, so review all of it.
3. Reply in markdown, in English, for the approver:
   ## <page name> (<locale>) - <Pass | Changes needed | Blocker>
   One sentence on what the submission changes.
   | Quote | Rule | Why | Suggested rewrite |   (one row per issue; omit the table when there are none)
   Then at most three short style notes.
4. End with two lines:
   "Preview of the submitted version: <previewUrl>" (leave the line out when previewUrl is null)
   "Next: approve or decline version <version> of <page name> in the CMS."
Quote the page's exact words. Don't rewrite the whole page and don't invent rules.
```

## Notes

- **No "who approves next" line.** CMS (SaaS) has no API that reads an approval sequence, so the
  CMS 13 agent's `alloy_get_page_approvers` step has no counterpart here.
- **The preview link needs no sign-in** and shows that exact version, so the report can be forwarded
  to someone without a CMS account. Rotating `OPTIMIZELY_PREVIEW_SECRET` invalidates every such link.
