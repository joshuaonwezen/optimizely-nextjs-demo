# Mark workflows for Mosey Bank: runbook

Mark is Optimizely's Agent Platform, formerly Opal. This folder holds the Mark side of the demo:
agent specs, a skill and the payload schemas. The site side is `src/lib/mark/`, the routes under
`/api/mark/`, and one line in `/api/webhooks`.

It is the SaaS CMS port of the CMS 13 build in `AlloyCms13/mark/`. Four workflows are the same;
"translate on publish" is new here.
What changed on the way is in [SaaS CMS compared with the CMS 13 build](#saas-cms-compared-with-the-cms-13-build).

## What the demo shows

| Workflow | Trigger | What Mark does | What changes in the CMS |
|---|---|---|---|
| Tag on publish | An editor publishes a page with no categories, meta title or meta description | Reads the page, picks categories from the taxonomy, writes the missing metadata | A new **draft** with categories and metadata |
| Translate on publish | An editor publishes the English version of a complete page that has no Dutch version | Translates the page, and every shared block it uses, into Dutch | A Dutch **draft** language version of the page and of each shared block that had none |
| Compliance review | An editor sends a page for review (an approval sequence covers it) | Reviews the submitted version against the content standards | Nothing: the verdict is in the Mark run |
| Weekly audit | Monday 07:00 UTC, or Run now | Audits every page, writes a content-health report, tags up to 5 untagged pages | Up to 5 tagging drafts |
| Audit this page | An editor asks in the Mark sidebar | Audits the open page and offers fixes | Drafts, only after the editor says yes |
| Test rounds | Monday 07:00 UTC, Run now, or an editor asks for a page | Reads the Feature Experimentation results of the Personal Banking content test, then rewrites the variation when it is not winning | A new version of the variation, **published** by the run. Nothing changes in Feature Experimentation |

With one exception Mark never publishes: the agents have no publish tool attached, and every write
is a draft saved under the workflow owner's (or the chatting editor's) own sign-in. The exception is
`mosey_variation_writer`, which publishes the variation it rewrote when its `publish` input is `yes`,
after checking its own work. It never publishes an original page.

## What is out of the box, and what this site adds

Mark ships system tools for CMS (SaaS), so less is custom here than on CMS 13. Writes are fully out
of the box. The reads that carry this site's own logic are eight small read-only tools.

| Need | CMS 13 build | Here |
|---|---|---|
| Save categories and metadata as a draft | custom `alloy_save_page_enrichment` | Out of the box: `cms_update_content_item`. The site has **no write tool**. |
| Read a page | custom `alloy_get_page_profile` | Custom `mosey_get_page_profile`. `cms_get_content_data` reads the properties, but the profile also returns the copy inside Visual Builder compositions and `missing`, the list the trigger and the tagger share. |
| List categories | custom `alloy_list_categories` | Custom `mosey_list_categories`. Mark's own taxonomy tools need CMS admin rights and return one level per call; this returns every assignable category in one call, with grouping and internal terms already removed. |
| Audit a page, audit the site | custom | Custom `mosey_audit_page`, `mosey_audit_site`. The rules are this site's, and one deterministic call for the whole site costs far less than a model reading each page. |
| Read a submitted version | custom `alloy_get_review_context` | Custom `mosey_get_review_context`: the version in review, and each field that differs from the published page. |
| Find what a translation has to cover | not in the CMS 13 build | Custom `mosey_get_translation_plan`: the page and every shared block it uses, each with what the target language already has. See [Translating a page means translating its shared blocks](#translating-a-page-means-translating-its-shared-blocks). |
| Read a test's results and decide what to write | not in the CMS 13 build | Custom `mosey_get_experiment_brief` and `mosey_list_experiments`. Mark's own Feature Experimentation tools rank experiments across a program and cannot read one test's results. See [Test rounds](#test-rounds-what-the-site-reads-and-what-mark-writes). |
| Create a page variation | not in the CMS 13 build | Out of the box: `cms_create_content_variation`, then `cms_update_content_item`. |
| Who approves a page | custom `alloy_get_page_approvers` | **Not available.** The CMS (SaaS) REST API has `:approve` and `:reject` but nothing that reads an approval sequence. The review report ends with a preview link instead. |
| Start a run on publish | in-process `PublishedContent` event | The Graph webhook the site already receives, plus guards (below). |
| Start a run on submit | in-process `IApprovalEngineEvents.Started` | The same Graph webhook. CMS (SaaS) webhooks have no review event. |

How sure each part is:
- **Verified here** (2026-11-25, against joshCMS and toddCMS data): the six custom tools, the
  discovery manifest, the bearer check and every trigger guard. See [Local testing](#local-testing).
- **From Optimizely's docs, not exercised here:** the system tool names `cms_update_content_item`,
  `cms_get_content_data`, `cms_publish_content_item`, `cms_search_graph` and the taxonomy tools. Mark
  can't be called from outside its UI, so confirm the names in the agent's tool picker.
- **Verified end to end** (2026-11-25, joshCMS): a real publish started "tag on publish" and Mark's
  draft appeared 20 seconds later. A publish of *Credit Cards* started "translate on publish" and
  three Dutch drafts (two shared blocks, then the page) appeared within a minute.
- **Verified in Mark chat** (2026-11-25, joshCMS): `mosey_audit_site` answers through the Tool
  Registry, and `cms_update_content_item` saved a draft with `metaDescription` and the built-in
  `categories` property. The draft was saved under the chatting user's own sign-in, the published
  version stayed as it was, and every other property was carried over.

## How a run starts

```
  CMS (SaaS)                    this site                                   Mark
  ──────────                    ─────────                                   ────
  editor publishes a page ─┐
  editor sends for review ─┼─▶ Graph ─▶ POST /api/webhooks (existing)
                           │              1. revalidates the cache, as before
                           │              2. doc.updated ..._Published  ─guards─▶ workflow "tag on publish"
                           │                                            ─guards─▶ workflow "translate on publish"
                           │                 doc.updated ..._InReview   ─guards─▶ workflow "review on submit"
                           │                                             Scheduler ─▶ workflow "weekly audit"
                           │                                             Chat      ─▶ agent "page auditor"
                           │
  cms_update_content_item ◀┴──────────── writes a draft, as the owner ──── agents
  GET /api/mark/discovery, POST /api/mark/tools/{tool} ◀── reads ───────── agents
```

There is nothing new to register for the triggers. The Graph webhook that revalidates the cache
(`npm run webhook:register`, unfiltered) already delivers every `doc.updated` event, and its docId says
what happened: `{guid}_{locale}_Published` for a live page, `{guid}_{version}_{locale}_InReview` for a
submitted version.

**The guards** (`src/lib/mark/triggers.ts`). Every run is billed in credits to the workflow's owner,
so each guard exists to stop an event from starting one by accident:
1. **Pages of this site only.** Blocks, media, variations and pages of another site on the same CMS
   are ignored without a log line.
2. **Fresh.** Graph re-sends a page's Published document whenever any draft of it is saved, so the
   version must have changed in the last `MARK_FRESH_MINUTES` (10). Anything older is a re-index.
3. **A person.** A person saves under their email address; seed scripts, extensions and other API
   clients save under a client id and never start a run.
4. **On the allowlist**, when `MARK_TRIGGER_USERS` is set.
5. **Publish only: something is missing.** This is also the loop breaker: once an editor publishes
   Mark's draft, the page is complete.
6. **Publish only: no newer draft.** Mark's own draft is a save, so Graph re-sends the Published
   document seconds after the run started. The newer draft is how the site knows not to start another.
7. **Translate only: the English version, complete, with no Dutch version yet.**
   - Only a publish in `MARK_TRANSLATE_SOURCE_LOCALE` (`en`) counts.
   - A language in `MARK_TRANSLATE_LOCALES` (`nl`) that the page already has a version in, even a
     draft, is left to its editor. That is also the loop breaker: Mark's own draft is such a version.
   - While "tag on publish" is configured, an incomplete page waits. The tagger's draft comes first,
     and the publish of that draft starts the translation, so the translation carries the categories
     and metadata.
8. **Once per version**, and for tagging at most once per page every `MARK_DEBOUNCE_MINUTES` (2).
   This memory is per server instance, so it is best effort on Vercel; guards 2, 5 and 6 hold everywhere.
   Reviews are not debounced by time: each submission is one deliberate act.

## One-time setup

The Mark instance is `8791023536c248d2b20558b4df19ffcc`, the one the CMS 13 demo uses. It is already
connected to **joshCMS**: a colleague's CMS webhook there posts to it. So the site to set up is
`optimizely-onboarding.vercel.app`.

1. **Deploy** this code. A push to `main` builds every Vercel project of this repo; only
   `optimizely-onboarding` needs the settings below.
2. **Set `MARK_TOOLS_BEARER`** on the project to a long random value and redeploy. Until it is set,
   every tool answers 503. The Graph credentials the tools read with (`OPTIMIZELY_APP_KEY`,
   `OPTIMIZELY_APP_SECRET`) are already there for `/preview/share`.
3. **Tool Registry.** In Mark, add a registry entry with discovery URL
   `https://optimizely-onboarding.vercel.app/api/mark/discovery` and the bearer token from step 2.
   It should list eight tools. Check the site side first:
   `curl -s https://optimizely-onboarding.vercel.app/api/mark/discovery | jq '.functions[].name'`.
   - **One deployment per Mark instance.** Function names are unique per instance, so registering a
     second copy of this site there fails with "Function name ... already exists in another service".
   - **New or renamed tools only appear after a sync** of the entry.
4. **Skill.** Import `skills/mosey-bank-content-standards.md` as an organisation skill.
5. **Run the [first-run checks](#first-run-checks)** in Mark chat.
6. **Agents.** Create the seven specialized agents in `agents/*.md`, then the five workflows in
   `agents/workflows.md`. Mark has no API for this. Set each trigger's **Product Instance** to this
   site's CMS, or the agents cannot save.
   - **First time:** build them by hand, then *Download Agent* and commit each export here as
     `agents/<id>.json`. The format isn't documented, so an export is the only reliable template.
   - **After that:** *Add Agent → Import Agent* recreates them. A workflow import brings its
     specialized agents, and gives every webhook trigger a **new URL**, so redo step 7.
7. **Trigger settings.** Put each webhook trigger's URL and key on the Vercel project
   (see [Environment variables](#environment-variables)) and redeploy. With no URL set, no run is
   ever started; the tools work regardless.

## First-run checks

Do these in Mark chat before building the workflows. Open Mark from the joshCMS editor, so its
`cms_*` tools act on joshCMS.

1. **The site's tools answer.** "Call mosey_audit_site." You should get about 90 pages and an average
   score. "Call mosey_list_categories" should list 44 categories.
2. **Mark can save a draft with categories.** On a page nobody minds (for example *Hello World*):
   "Using cms_update_content_item, save a draft of content `<key>` (en) that sets `metaDescription` to
   'Test' and the `categories` property to `["cms://taxonomy/categories/guides"]`. Do not publish."
   Then open the page in the CMS: the draft should show the category under Settings and the published
   version should be untouched. Delete the draft afterwards.
   - **If the tool has no way to set `categories`:** keep it for the metadata. The fallback for the
     categories is one more tool on this site, which writes the draft through the REST API. It was
     left out on purpose, because it would give a public demo site an endpoint that changes content.
3. **The draft keeps the other properties.** Compare the draft with the published version. A draft
   that lost its heading or body means the tool created a blank version (`POST /versions` does that);
   don't use it for this workflow.
4. **Mark can revise a variation** (for the test rounds). On a page with a published variation nobody
   minds: "Call mosey_get_experiment_brief for `<page>`. Then, using cms_update_content_item with
   ContentVersion set to that variation's publishedVersion, save a draft that changes only
   `<one text property>`. Do not publish." Call the brief again: the variation should show one draft
   with your line under `copyChanges`, and `page.pendingDraftOfOriginal` should be unchanged. If the
   draft landed on the original page instead, the revise step cannot be used as written.

## Demo script

1. **Audit this page.** Open a page in the CMS, open Mark and ask "audit this page". Accept the
   suggested metadata and categories. The draft appears in the version list.
2. **Tag on publish.**
   - Open a page the audit lists under `pagesMissingCategories`. Change a word and publish.
   - Within a minute or so the Mark run shows the categories chosen and why. Graph indexing sits
     between the publish and the run, so allow up to a minute.
   - The page has a new draft by the workflow owner with categories and the missing metadata.
     Publish it. That publish starts no run, because the page is now complete.
3. **Translate on publish.** Publish the draft from step 2. The page is now complete, so that
   publish starts the translation. A page that is already complete and has no Dutch version is
   translated on its next English publish.
   - The Mark run lists the page and each shared block it translated. A Dutch draft appears in the
     page's language list and in each of those blocks.
   - Publish the blocks' Dutch drafts, then the page's. The Dutch page shows a shared block only
     once that block is published in Dutch.
   - *Credit Cards* is a good page for it: one shared block in each of its two block fields.
4. **Compliance review.**
   - On a page covered by an approval sequence, add "Guaranteed returns, risk-free" and send it for
     review.
   - The Mark run returns a **Blocker** verdict quoting the phrase, with a preview link to the exact
     version submitted.
   - No approval sequence on the page? Set `MARK_REVIEW_STATUSES=InReview,Ready` and use
     *Ready to publish* instead; the run starts on that status too.
5. **Weekly audit.** Open "Mosey: weekly content audit" and click *Run now*. Show the report, then
   show that the loop tagged up to five pages.
6. **Test rounds.**
   - Open "Mosey: test rounds" and click *Run now*. It reads the Personal Banking test: the
     variation has gone more than a week without a significant result.
   - The run rewrites the variation, checks its own work and publishes it, then says which lines
     changed and why. Open `/personal-banking` in the variation's group to see the new wording.
   - Nothing was touched in Feature Experimentation: the test keeps running, and the panel on the
     page shows the results as before.
   - Run it again: it now waits, because the variation changed today.
   - From chat, for any page: "Write a variation of /mortgage for first-time buyers." Then add
     the variation to a test in the panel.

## Environment variables

All server-side. None is needed for the site to build or run.

| Variable | Purpose |
|---|---|
| `MARK_TOOLS_BEARER` | The bearer token on the Tool Registry entry. Unset: every tool call gets 503. |
| `MARK_ON_PUBLISH_URL` | Webhook URL of "Mosey: tag on publish". **A secret.** |
| `MARK_ON_PUBLISH_AUTH` | The whole auth header value, e.g. `Bearer <auth key>`. **A secret.** |
| `MARK_ON_TRANSLATE_URL`, `MARK_ON_TRANSLATE_AUTH` | The same for "Mosey: translate on publish". |
| `MARK_TRANSLATE_LOCALES` | Comma-separated languages to translate into. Default `nl`. |
| `MARK_TRANSLATE_SOURCE_LOCALE` | The language translated from. Default `en`. |
| `MARK_ON_REVIEW_URL`, `MARK_ON_REVIEW_AUTH` | The same for "Mosey: compliance review on submit". |
| `MARK_ON_PUBLISH_AUTH_HEADER`, `MARK_ON_TRANSLATE_AUTH_HEADER`, `MARK_ON_REVIEW_AUTH_HEADER` | Header name, if the trigger doesn't use `Authorization`. |
| `MARK_TRIGGER_USERS` | Comma-separated emails allowed to start runs. Empty: anyone signed in as a person. joshCMS is shared, so set it to the presenters. |
| `MARK_WORKFLOWS_ENABLED` | `false` is the kill switch for both triggers. |
| `MARK_DEBOUNCE_MINUTES` | Minimum gap between publish runs for one page. Default 2. |
| `MARK_FRESH_MINUTES` | How recent a version must be to count as just published or submitted. Default 10. |
| `MARK_REVIEW_STATUSES` | Graph statuses that start a review. Default `InReview`; add `Ready` for pages with no approval sequence. |
| `OPTIMIZELY_FX_API_TOKEN` | An Optimizely API token that can read the Feature Experimentation project. **A secret.** The two experiment tools read rules, ended tests and results with it. Unset: they list the running tests from the public datafile, say that results could not be read, and never ask for a variation to be written. The project and environment come from `OPTIMIZELY_FX_SDK_KEY`'s datafile. |
| `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET` | The Management API client of this site's CMS. The tools still answer without it, but they then can't ask the CMS two things, and say so in their output: whether each page Graph lists still exists (see below), and which category terms are selectable. Set them. |

On Vercel a changed variable only reaches the site with the next deployment.

### Translating a page means translating its shared blocks

A shared block is a content item with language versions of its own; the page only points to it. Graph
resolves a page's references in the page's own language, with no fallback to English, so a shared
block with no Dutch version is simply not on the Dutch page. 50 of joshCMS's 88 real pages use at
least one shared block (calls to action, callouts, FAQ items, authors, the homepage has 22), so a
translator that only translates the page leaves holes in most of them.

`mosey_get_translation_plan` (`src/lib/mark/translation.ts`) finds them, so the model does not have to:
- **Blocks in content areas and in the composition.** Graph writes a `type: "content"` reference out
  in place, with the block's own `_metadata.key`. A block stored on the page itself has no key, which
  is how the two are told apart.
- **Blocks behind reference properties** (`outcomes`, `testimonial`, `members`). A `contentReference`
  is only `{ key, url }` in the document, so these are looked up, and their own documents are read for
  what they reference in turn.
- **Shared blocks nested in other blocks**, to three levels. *Savings Offer* has nine: three variation
  items, each holding a heading and a call to action.
- Images and DAM assets are left out. Pages the page references are never translated; those with no
  published version in the target language are returned so that the run can report them.

Each block comes back with `targetVersion` (what that language already has, or null) and `translate`.
The agent saves a draft for every block with `translate: true`, then for the page. Two things follow:
- **A block with no text still needs a version.** A `VariationItemBlock` has no localized property,
  but without a Dutch version it is missing from the Dutch page along with the blocks inside it.
- **Whether a content area is localized differs per instance.** `TraditionalPage.mainContent` is
  localized on joshCMS and shared on the others. A localized one holds its own list per language, so
  the translation must carry the list over or the area is empty. The agent therefore goes by
  `cms_get_content_type_details`, never by the code definition.

### Test rounds: what the site reads and what Mark writes

The tests themselves are unchanged. An editor makes and starts one from the Feature Experimentation
panel on a page (the FX Experiments CMS extension): a flag whose variation keys are the page's CMS
variation names, a rule, a metric. The site serves the variation Feature Experimentation decides.
This workflow adds the two halves around that:

- **Reading.** `mosey_get_experiment_brief` (one page) and `mosey_list_experiments` (the site) read
  the rules that serve CMS variations and each test's results, and reduce them to a conclusion and an
  action (`src/lib/mark/experiments.ts`, `experimentResults.ts`).
  - A rule counts when its flag has the boolean `cms_flag` variable with default `true`; its
    `cms_route` default says which page. That is the FX Experiments extension's contract.
  - Results come from `GET /v2/experiments/{id}/results`, the numbers behind the Results page. The
    first metric is the primary one. `winner` and `original_wins` need significance; `flat` is none
    after `revise_after_days`.
  - That endpoint can answer with a calculation that is days old and only then start a new one, so a
    stale answer for a running test is asked for a second time.
  - The page's variations come from Graph with `variation: { include: ALL }`, each compared with the
    original: changed fields, changed lines of copy, and problems.
- **Writing.** `mosey_variation_writer` follows the action. `revise_variation` saves a new version of
  the variation in the test; `write_new_variation` creates a variation and fills it in. Both go
  through Mark's own CMS tools: the site has no tool that writes. With `publish` set to `yes` the
  agent publishes the version after checking it against the brief; otherwise it stays a draft.

What the brief checks on every variation, because each has happened on joshCMS:
- **A URL of its own.** A variation made with a display name other than the page's gets its own URL
  segment, Graph indexes it there, and the site, which looks variations up at the page's URL, serves
  the original to visitors the test counts in the variation.
- **Several drafts.** Mark's create and update calls can leave two; the CMS editor opened and
  published the empty one.
- **Published and identical to the original.** A test of it measures nothing.

Known limits:
- **The demo's results are seeded, and the seed follows the rewrite, not the wording.**
  `npm run exp:seed` sends the visitors and conversions behind every result. For a content test it
  asks `mosey_list_experiments` which version of the variation is live and gives each published
  version an effect of its own, fixed until the next rewrite:
  - a variation's first version trails the original, which is what gets the first rewrite written;
  - after that, three rewrites in four beat the original and one in four trails it;
  - the size is scaled to the test's rarest metric (about 30% for a 3% click, about 17% for a 9%
    one), so that a week or two of seeded traffic can tell versions apart.

  It cannot judge what a rewrite says, and results are cumulative, so the verdict follows a rewrite
  with a delay. It needs `MARK_TOOLS_BEARER` as a GitHub Actions secret; without it, or when the
  site cannot be reached, a content test keeps one fixed outcome from its flag key. With real
  visitors the numbers are real.
- **Pages built in Visual Builder** keep their wording in the layout, so the writer sends the whole
  layout back with a few lines changed. `cms_update_content_item` documents properties only; that
  it takes a layout rests on Mark's own page building and has not been run here yet. The writer's
  check refuses to publish when lines went missing.
- **A revision blurs the test.** Results are cumulative, so they mix visitors of the old and the new
  wording. A clean read needs a new variation in a new test.

### Why the tools ask the CMS which pages exist

Graph is what the tools read, but it is not the authority on which pages exist. On joshCMS, 11 of the
99 pages Graph lists as published cannot be opened in the CMS:
- **Blueprints.** Page templates are indexed as published pages under `/blueprints/`. They are not
  content items (`GET /v1/content/{key}` is 404, `GET /v1/blueprints/{key}` is 200).
- **Deleted items whose Graph documents were never removed.** Six old seed pages under
  `/articles-demo/` and `/blogs/`.

Nothing in a Graph document tells either kind from a real page, and Mark's `cms_update_content_item`
answers "Content item not found" for them. So `keysMissingFromCms()` (`src/lib/mark/cms.ts`) asks the
CMS for each key once (cached for five minutes), `mosey_audit_site` leaves those pages out and says
how many, and the single-page tools return an error that names the reason.

## Troubleshooting

Trigger decisions are logged with `console.error`, the one console method the production build keeps.
Filter Vercel's runtime logs on `[mark]`. The same skip for the same document is logged at most once
every 10 minutes, because the CMS autosaves and each save re-sends the event.

| Symptom | Check |
|---|---|
| No Mark run after a publish | `[mark] started on-publish ...` means the POST went out; look in Mark. `[mark] skipped publish ...: <reason>` names the guard. No line at all: the event wasn't a page of this site, the trigger URL isn't set, or Graph never called `/api/webhooks`. |
| `[mark] failed ...: HTTP 401` or `403` | The header value doesn't match the trigger's key. A trigger's key can't be edited: delete the trigger, recreate it, update the variable. |
| `... is Graph re-indexing it, not a new publish` on a real publish | The run would have been started more than `MARK_FRESH_MINUTES` after the publish. Graph was slow, or the page was scheduled. Raise the window. |
| A run stops with "A CMS product must be selected when using this tool" | The trigger has no Product Instance. A background run has no CMS open, so Mark's own CMS tools don't know which one to write to. Set it on the trigger to this site's CMS. |
| A tool call returns 401 or 503 | 401: the registry entry's bearer token isn't `MARK_TOOLS_BEARER`. 503: the variable isn't set on this deployment. |
| A tool call returns 403 or 429 with `x-vercel-mitigated: challenge` | Vercel's Attack Mode is challenging the host. It blocks Mark and the Graph webhook alike. |
| Mark says a category is not selectable | `mosey_list_categories` could not reach the CMS and guessed. Set the Management API credentials. |
| The save fails with "Content item not found" | The page is a blueprint or was deleted from the CMS, and the tools could not check: `mosey_audit_site` then carries a `note` saying so. Set the Management API credentials. |
| A real page is missing from the audit | The Management API client can't read it, so the CMS answered 404 for its key. Give the client read access. |
| No review run | The version never reached `InReview`: no approval sequence covers the page. See step 4 of the demo script. |
| No translation after a publish | `[mark] skipped translate ...` names the reason. The usual two: the page is not complete yet, so tagging goes first; or it already has a version in that language, which may be an old draft. |
| Blocks are missing on a translated page | A shared block there has no published version in that language. Call `mosey_get_translation_plan` for the page: `translate: true` means no version at all, a `targetVersion` with status `Draft` means it was translated and is waiting to be published. Running `mosey_page_translator` on the page again fills the gaps and changes nothing else. An empty content area with all its blocks translated is a localized content area that the page's translation was saved without. |
| The test tools say results could not be read | `OPTIMIZELY_FX_API_TOKEN` is not set on the deployment, or its token cannot read the project. |
| A test round writes nothing | Each page's `reason` says why. The usual three: a draft is already waiting for an editor, the test is younger than `revise_after_days`, or the variation was revised less than that long ago. |
| A variation is published but visitors get the original | Call `mosey_get_experiment_brief` for the page and read the variation's `problems`. A URL of its own is the usual cause: set its "Name in URL" to the page's and publish again. |
| Two runs for one publish | Two server instances each saw the event before either remembered it. The tagger stops at its first step when a draft is already pending. If both runs got past that at once there are two drafts; keep the newer. |

## Local testing

Mark's backend can't reach localhost, so Mark itself can't call a local site. Everything on the site
side can be tested without it:

1. Run a local listener that records each POST. It stands in for Mark's webhook endpoint.
2. Start `next dev` with `MARK_TOOLS_BEARER=local-test`, the two trigger URLs pointed at the listener,
   and `MARK_FRESH_MINUTES=100000000` so that old versions count as new. To read another instance,
   put its credentials in the base variable names (`OPTIMIZELY_APP_KEY=$OPTIMIZELY_APP_KEY_JOSHCMS ...`)
   and set `NEXT_PUBLIC_SITE_URL` to that site's address, or every page looks like another site's.
3. Call the tools:
   ```bash
   curl -s -X POST localhost:3000/api/mark/tools/mosey-audit-site \
     -H "Authorization: Bearer local-test" -H "Content-Type: application/json" \
     -d '{"parameters":{}}'
   ```
4. Post a Graph event for a real document id:
   ```bash
   curl -s -X POST "localhost:3000/api/webhooks?secret=$OPTIMIZELY_REVALIDATE_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"type":{"subject":"doc","action":"updated"},"data":{"docId":"<guid>_en_Published"}}'
   ```
   and read the `[mark]` line in the dev server's output.

Observed on 2026-11-25:
- `mosey_audit_site` covered 92 page/locale rows of joshCMS and left out 11 that the CMS does not
  have, in 1.3 s once the CMS answers were cached (3.7 s the first time).
- `mosey_list_categories` returned 44 of the 55 terms: no roots, no grouping terms, no lifecycle branch.
- `mosey_get_review_context` on toddCMS's *Personal Loans* (version 1726, in review) returned
  `changedFields: ["heading"]` with the text before and after.
- `mosey_get_translation_plan` answered for the 88 real English pages of joshCMS (median 1.1 s,
  slowest 2.9 s; one needed a second try after a network error) and returned the "not a page in
  the CMS" error for the other 11. *Credit Cards* gave
  two shared blocks, *Savings Offer* nine (nested two deep), a case study five behind reference
  properties plus one linked page. For German it marked the blocks that already have a German draft
  as `translate: false`.
- A publish by a person of an incomplete page sent **one** POST with the auth header; the same event
  again was dropped.
- Publishes by the seed's API client, of a complete page, and of a page with a newer draft sent nothing.
- A block, a variation, another site's page and `bulk.completed` were ignored silently.
- A submission by a user outside `MARK_TRIGGER_USERS` sent nothing; a 401 from the listener was logged
  as `failed`.

Observed on 2026-11-26, the two experiment tools against joshCMS and the live Feature
Experimentation project (2 to 4 s a call):
- *Help & Support*: one running test, 5 days, "test" at +2.1% on CTA Click and not significant, so
  `wait`. Its variation's `copyChanges` named the one changed line.
- *Personal Banking*: 13 days without a significant result, so `revise_variation` for "invest".
- *Sarah Chen*: a variation with an unpublished draft, so `wait`, with the problem that the published
  version is identical to the original.
- The homepage: no test, four personalization rules by audience, and `wait` for an editor's old draft.
- A page with no test: `write_new_variation`.
- `mosey_list_experiments` returned both tests and Personal Banking under `pagesToContinue`.
- Without `OPTIMIZELY_FX_API_TOKEN`: the running tests, the note that results could not be read, and
  `wait` everywhere. A call without the bearer token got 401.
- **Not exercised:** the Mark side. The agents have to be built in the Mark UI, and the first-run
  check for revising a variation has not been run.

A real publish through Graph to a real Mark run needs the deployment; see "Verified end to end"
under [What is out of the box](#what-is-out-of-the-box-and-what-this-site-adds).

## SaaS CMS compared with the CMS 13 build

- **No code runs inside the CMS.** The triggers hang off the Graph webhook, and the tools are Next.js
  route handlers. `AlloyCms13/mark/REPLICATING.md` section 6 predicted this shape.
- **CMS (SaaS) has its own webhooks** (Settings > Webhooks, or `POST /v1/experimental/webhooks`). They
  can post `contentVersion:preview1:published` straight to a Mark trigger with no code at all, and
  joshCMS already has one doing that. This build does not use them for two reasons:
  - they carry no guards, so a seed run or a block publish would each start a paid run;
  - they have no event for "sent for review". `GET /v1/experimental/webhookdefinitions` lists
    `published`, `scheduled` and `localeDeleted` for content versions on all eight instances.
- **Tool auth is a bearer token on the registry entry**, not the user's Opti ID token. The custom
  tools are read-only and read through Graph as the site, so they also work in scheduled runs. Writes
  go through Mark's own tools and so still carry the user's identity.
- **Categories are per version**, not shared by every language as on CMS 13. Each locale's version is
  tagged on its own.
- **A shared block has its own language versions**, and a page shows it only in the page's language.
  Translating a page therefore means translating its shared blocks as separate items.
- **A version in review can be shown to anyone.** The review payload and tool return a signed
  `/preview/share` link pinned to the submitted version, in place of the CMS 13 build's edit-mode link.
  The tools return no deep link into the CMS editor: its URL scheme isn't documented.
- **`lastModifiedBy` tells people from machines.** It is an email for a person and a client id for an
  API client, which replaces the CMS 13 build's list of machine identities.
