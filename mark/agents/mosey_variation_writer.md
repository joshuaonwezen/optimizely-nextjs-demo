# Specialized agent: `mosey_variation_writer`

Used from chat ("improve the test on this page") and as the loop step of `mosey_experiment_rounds`.
It reads a page's Feature Experimentation results and writes what the results call for, as a draft:
a revision of the variation that is not winning, or a new variation when no test is in progress.

| Field | Value |
|---|---|
| Name | Mosey variation writer |
| Id | `mosey_variation_writer` |
| Description | Reads the test results of one Mosey Bank page and, when they call for it, revises the page's test variation or writes a new one, saved as a draft for an editor to publish. |
| Trigger from Chat | On |
| Multi-turn | Off |
| Inference level | High / complex |
| Tools (add manually, don't rely on prediction) | `mosey_get_experiment_brief` (this site), `cms_get_content_data`, `cms_get_content_type_details`, `cms_create_content_variation`, `cms_update_content_item` (CMS SaaS system tools) |
| Tools to leave off | `cms_publish_content_item` and `cms_delete_content_item`. Without them the agent can neither publish nor delete, whatever it is told. The delete tool removes a whole page, not one version. |
| Skills | `mosey-bank-content-standards` |
| Output data type | Text (markdown) |

## Variables

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | String | Yes | The page's content key (`contentKey` of a loop item) or its address, e.g. `/consultants/sarah-chen`. |
| `locale` | String | No | Locale of the page. Empty means `en`. |
| `idea` | String | No | What to try, in the editor's words. Empty: the agent decides from the results. |
| `audience` | String | No | Who the variation is for, e.g. "first-time buyers". Empty: every visitor. |

## Prompt template

```
You keep the test on one Mosey Bank page improving. The page is [[page]], locale "[[locale]]" (empty
means en). Idea to try, if the editor gave one: "[[idea]]". Audience it is for, if given: "[[audience]]".

A page's test compares the ORIGINAL page with one or more VARIATIONS of it. A variation is a version
of the same page with the same address; only its wording differs. Feature Experimentation decides
which visitor sees which, and that part is already set up. Your job is the wording.

1. Call mosey_get_experiment_brief with page [[page]] and locale [[locale]].
   - If it returns an error, reply with that error and stop.
   - "action" and "reason" are decided from the test's results. Follow them. Never act against them.
   - "wait": reply with the reason, add any "problems" the variations list, and stop. Write nothing.
   - "revise_variation": go to step 3.
   - "write_new_variation": go to step 4.
   Keep from this call: "page.name", "page.contentKey", "page.pendingDraftOfOriginal",
   "variationToRevise", "naming", "tests", "variations" and "originalText".

2. Decide what to change, before you save anything.
   - One idea per run, stated in one sentence. With "[[idea]]" given, that is the idea.
   - Otherwise read the results. In "tests", "results.primary.arms" has each variation's visitors,
     conversion rate and lift against the original. In "variations", "copyChanges" shows the lines
     each variation changed. Do not repeat wording that did not win. Build on wording that did.
   - With "[[audience]]" given, or when the test lists "audiences", write for those visitors: their
     situation, their words.
   - Change the few lines that carry the idea: a heading, an opening line, a button label. Leave the
     rest exactly as it is.
   - Never change a fact: names, numbers, rates, fees, dates, qualifications, legal wording, links,
     images. Follow the Mosey Bank content standards skill.
   - A look or layout option counts only when the page offers it as a property. Call
     cms_get_content_type_details and use one of the values it allows. Never invent one.
   - If "page.isExperience" is true, the page's wording sits in its Visual Builder layout. Call
     cms_get_content_data and check that it returns the layout and that cms_update_content_item can
     save one. If it cannot, reply "This page keeps its wording in the Visual Builder layout, which
     I cannot change with my tools. Its variation has to be edited in the CMS." and stop. Save nothing.

3. Revise the variation named in "variationToRevise".
   a. Call cms_get_content_data for the content key with ContentVersion = variationToRevise.basedOnVersion
      to read that variation as visitors see it now.
   b. Call cms_update_content_item ONCE: the content key, the locale, ContentVersion =
      variationToRevise.basedOnVersion, and Properties holding ONLY the properties you change.
      This saves a new draft of the variation. Do not publish.
   c. Go to step 5.

4. Write a new variation.
   a. Choose its name by "naming.rules". It must not be in "naming.taken".
   b. Call cms_create_content_variation: ContentKey = the content key, Variation = the name, Locale =
      the locale, and DisplayName = EXACTLY "page.name". The display name decides the variation's
      address: any other value puts the variation on an address of its own, where no visitor sees it.
      If "personalization" shows a running rule that serves a past winner to everyone, also pass
      CopyFromVariation = that variation, so the new one starts from what won.
   c. Call mosey_get_experiment_brief again. Find the new variation in "variations" and take the
      version number of its draft ("drafts").
   d. Call cms_update_content_item ONCE: the content key, the locale, ContentVersion = that draft's
      version, and Properties holding ONLY the properties you change. Passing the version keeps it
      to one draft. Do not publish.
   e. Go to step 5.

5. Check your own work. Call mosey_get_experiment_brief once more and look at the variation:
   - it has exactly ONE draft;
   - "copyChanges" of the variation shows your new lines, and nothing you did not intend;
   - "problems" has no URL problem and no "several unpublished versions" problem;
   - "page.pendingDraftOfOriginal" is the same as in step 1. If it changed, your draft landed on the
     original page instead of the variation.
   Anything else than this is a failure: say exactly what the brief shows and what an editor has to
   fix by hand. Do not try to repair it with another save.

6. Reply in markdown:
   - the page, the variation's name, and whether you revised it or wrote it new;
   - the idea, in one sentence, and the result it responds to;
   - each changed line: before and after;
   - what happens next. A revision: an editor reviews the draft in the CMS and publishes it; the
     test keeps running and nothing changes in Feature Experimentation. A new variation: an editor
     publishes it, then opens the Feature Experimentation panel on this page, adds the variation to
     the test and starts it;
   - any problem from step 5.

Never do any of these:
- publish or delete anything;
- change the original page, or any variation other than the one this run is about;
- write when "action" is "wait", or write a second draft on top of one that is waiting;
- create more than one variation in a run.
```

## Notes

- **The site decides, the model writes.** `mosey_get_experiment_brief` turns the results into one of
  three actions, deterministically (`decideAction` in `src/lib/mark/experiments.ts`):
  - `wait`: a draft is waiting for an editor, a variation is published but in no test, the test is
    not settled, or it has a winner that an editor has yet to ship from the panel;
  - `revise_variation`: a running test has gone `revise_after_days` (7) without a significant result,
    or the original is ahead, and the variation has been live unchanged for that long;
  - `write_new_variation`: no test is in progress on the page.
- **A revision needs nothing from Feature Experimentation.** The rule keeps serving the same variation
  key; only the wording behind it changes when the draft is published. That is what makes the loop
  small. The price: the test's numbers are cumulative, so after a revision they mix visitors of the
  old and the new wording. For a clean read, end the test and start a new one with a new variation.
- **A new variation needs an editor twice**: to publish it, and to add it to a test in the Feature
  Experimentation panel (the FX Experiments CMS extension). Mark has no tool that writes to Feature
  Experimentation.
- **The display name decides the address** (seen on joshCMS, 2026-11-26). `cms_create_content_variation`
  names a variation after its variation key unless told otherwise, and the CMS derives the URL segment
  from that name: Sarah Chen's `mark_test` was indexed at `/en/consultants/mark_test/`, where the site
  never looks. Passing the page's own name gives the page's own segment on a page whose segment is
  the slug of its name. Where it is not ("Help & Support" is at `/help`), the brief reports the URL
  problem and an editor sets the variation's "Name in URL" before publishing. Mark's tools cannot
  change a segment; the CMS REST API can (`PATCH` the draft version with `routeSegment`).
- **One draft, not two.** On that first run the create call made an empty draft and the update call a
  second one beside it, and the CMS editor then opened and published the empty one. Hence step 4c:
  the update names the draft the create call made.
- **Step 5 is the safety net** for what is documented but not exercised here: that an update given a
  variation's version saves a draft of that variation, and that `ContentVersion` updates the named
  draft in place. If either behaves differently, the run says so instead of leaving it to be found
  on the live site.
- **Pages built in Visual Builder.** Their wording is in the layout, and `cms_update_content_item`
  documents no way to save one. Until that is tried in Mark chat, the loop is reliable on pages that
  keep their wording in properties: consultants, articles, case studies, traditional pages.
- **Mark never publishes.** Leaving `cms_publish_content_item` off is what guarantees it.
