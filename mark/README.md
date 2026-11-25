# Mark workflows for Mosey Bank: runbook

Mark is Optimizely's Agent Platform, formerly Opal. This folder holds the Mark side of the demo:
agent specs, a skill and the payload schemas. The site side is `src/lib/mark/`, the routes under
`/api/mark/`, and one line in `/api/webhooks`.

It is the SaaS CMS port of the CMS 13 build in `AlloyCms13/mark/`. The four workflows are the same.
What changed on the way is in [SaaS CMS compared with the CMS 13 build](#saas-cms-compared-with-the-cms-13-build).

## What the demo shows

| Workflow | Trigger | What Mark does | What changes in the CMS |
|---|---|---|---|
| Tag on publish | An editor publishes a page with no categories, meta title or meta description | Reads the page, picks categories from the taxonomy, writes the missing metadata | A new **draft** with categories and metadata |
| Compliance review | An editor sends a page for review (an approval sequence covers it) | Reviews the submitted version against the content standards | Nothing: the verdict is in the Mark run |
| Weekly audit | Monday 07:00 UTC, or Run now | Audits every page, writes a content-health report, tags up to 5 untagged pages | Up to 5 tagging drafts |
| Audit this page | An editor asks in the Mark sidebar | Audits the open page and offers fixes | Drafts, only after the editor says yes |

Mark never publishes. The agents have no publish tool attached, and every write is a draft saved
under the workflow owner's (or the chatting editor's) own sign-in.

## What is out of the box, and what this site adds

Mark ships system tools for CMS (SaaS), so less is custom here than on CMS 13. Writes are fully out
of the box. The reads that carry this site's own logic are five small read-only tools.

| Need | CMS 13 build | Here |
|---|---|---|
| Save categories and metadata as a draft | custom `alloy_save_page_enrichment` | Out of the box: `cms_update_content_item`. The site has **no write tool**. |
| Read a page | custom `alloy_get_page_profile` | Custom `mosey_get_page_profile`. `cms_get_content_data` reads the properties, but the profile also returns the copy inside Visual Builder compositions and `missing`, the list the trigger and the tagger share. |
| List categories | custom `alloy_list_categories` | Custom `mosey_list_categories`. Mark's own taxonomy tools need CMS admin rights and return one level per call; this returns every assignable category in one call, with grouping and internal terms already removed. |
| Audit a page, audit the site | custom | Custom `mosey_audit_page`, `mosey_audit_site`. The rules are this site's, and one deterministic call for the whole site costs far less than a model reading each page. |
| Read a submitted version | custom `alloy_get_review_context` | Custom `mosey_get_review_context`: the version in review, and each field that differs from the published page. |
| Who approves a page | custom `alloy_get_page_approvers` | **Not available.** The CMS (SaaS) REST API has `:approve` and `:reject` but nothing that reads an approval sequence. The review report ends with a preview link instead. |
| Start a run on publish | in-process `PublishedContent` event | The Graph webhook the site already receives, plus guards (below). |
| Start a run on submit | in-process `IApprovalEngineEvents.Started` | The same Graph webhook. CMS (SaaS) webhooks have no review event. |

How sure each part is:
- **Verified here** (2026-11-25, against joshCMS and toddCMS data): the five custom tools, the
  discovery manifest, the bearer check and every trigger guard. See [Local testing](#local-testing).
- **From Optimizely's docs, not exercised here:** the system tool names `cms_update_content_item`,
  `cms_get_content_data`, `cms_publish_content_item`, `cms_search_graph` and the taxonomy tools. Mark
  can't be called from outside its UI, so confirm the names in the agent's tool picker.
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
7. **Once per version**, and for publishes at most once per page every `MARK_DEBOUNCE_MINUTES` (2).
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
   It should list five tools. Check the site side first:
   `curl -s https://optimizely-onboarding.vercel.app/api/mark/discovery | jq '.functions[].name'`.
   - **One deployment per Mark instance.** Function names are unique per instance, so registering a
     second copy of this site there fails with "Function name ... already exists in another service".
   - **New or renamed tools only appear after a sync** of the entry.
4. **Skill.** Import `skills/mosey-bank-content-standards.md` as an organisation skill.
5. **Run the [first-run checks](#first-run-checks)** in Mark chat.
6. **Agents.** Create the four specialized agents in `agents/*.md`, then the three workflows in
   `agents/workflows.md`. Mark has no API for this.
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
     categories is a sixth tool on this site that writes the draft through the REST API. It was left
     out on purpose, because it would give a public demo site an endpoint that changes content.
3. **The draft keeps the other properties.** Compare the draft with the published version. A draft
   that lost its heading or body means the tool created a blank version (`POST /versions` does that);
   don't use it for this workflow.

## Demo script

1. **Audit this page.** Open a page in the CMS, open Mark and ask "audit this page". Accept the
   suggested metadata and categories. The draft appears in the version list.
2. **Tag on publish.**
   - Open a page the audit lists under `pagesMissingCategories`. Change a word and publish.
   - Within a minute or so the Mark run shows the categories chosen and why. Graph indexing sits
     between the publish and the run, so allow up to a minute.
   - The page has a new draft by the workflow owner with categories and the missing metadata.
     Publish it. That publish starts no run, because the page is now complete.
3. **Compliance review.**
   - On a page covered by an approval sequence, add "Guaranteed returns, risk-free" and send it for
     review.
   - The Mark run returns a **Blocker** verdict quoting the phrase, with a preview link to the exact
     version submitted.
   - No approval sequence on the page? Set `MARK_REVIEW_STATUSES=InReview,Ready` and use
     *Ready to publish* instead; the run starts on that status too.
4. **Weekly audit.** Open "Mosey: weekly content audit" and click *Run now*. Show the report, then
   show that the loop tagged up to five pages.

## Environment variables

All server-side. None is needed for the site to build or run.

| Variable | Purpose |
|---|---|
| `MARK_TOOLS_BEARER` | The bearer token on the Tool Registry entry. Unset: every tool call gets 503. |
| `MARK_ON_PUBLISH_URL` | Webhook URL of "Mosey: tag on publish". **A secret.** |
| `MARK_ON_PUBLISH_AUTH` | The whole auth header value, e.g. `Bearer <auth key>`. **A secret.** |
| `MARK_ON_REVIEW_URL`, `MARK_ON_REVIEW_AUTH` | The same for "Mosey: compliance review on submit". |
| `MARK_ON_PUBLISH_AUTH_HEADER`, `MARK_ON_REVIEW_AUTH_HEADER` | Header name, if the trigger doesn't use `Authorization`. |
| `MARK_TRIGGER_USERS` | Comma-separated emails allowed to start runs. Empty: anyone signed in as a person. joshCMS is shared, so set it to the presenters. |
| `MARK_WORKFLOWS_ENABLED` | `false` is the kill switch for both triggers. |
| `MARK_DEBOUNCE_MINUTES` | Minimum gap between publish runs for one page. Default 2. |
| `MARK_FRESH_MINUTES` | How recent a version must be to count as just published or submitted. Default 10. |
| `MARK_REVIEW_STATUSES` | Graph statuses that start a review. Default `InReview`; add `Ready` for pages with no approval sequence. |
| `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET` | The Management API client of this site's CMS. The tools still answer without it, but they then can't ask the CMS two things, and say so in their output: whether each page Graph lists still exists (see below), and which category terms are selectable. Set them. |

On Vercel a changed variable only reaches the site with the next deployment.

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
| A tool call returns 401 or 503 | 401: the registry entry's bearer token isn't `MARK_TOOLS_BEARER`. 503: the variable isn't set on this deployment. |
| A tool call returns 403 or 429 with `x-vercel-mitigated: challenge` | Vercel's Attack Mode is challenging the host. It blocks Mark and the Graph webhook alike. |
| Mark says a category is not selectable | `mosey_list_categories` could not reach the CMS and guessed. Set the Management API credentials. |
| The save fails with "Content item not found" | The page is a blueprint or was deleted from the CMS, and the tools could not check: `mosey_audit_site` then carries a `note` saying so. Set the Management API credentials. |
| A real page is missing from the audit | The Management API client can't read it, so the CMS answered 404 for its key. Give the client read access. |
| No review run | The version never reached `InReview`: no approval sequence covers the page. See step 3 of the demo script. |
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
- A publish by a person of an incomplete page sent **one** POST with the auth header; the same event
  again was dropped.
- Publishes by the seed's API client, of a complete page, and of a page with a newer draft sent nothing.
- A block, a variation, another site's page and `bulk.completed` were ignored silently.
- A submission by a user outside `MARK_TRIGGER_USERS` sent nothing; a 401 from the listener was logged
  as `failed`.

Not tested end to end: a real publish through Graph to a real Mark run. That needs the deployment.

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
- **A version in review can be shown to anyone.** The review payload and tool return a signed
  `/preview/share` link pinned to the submitted version, in place of the CMS 13 build's edit-mode link.
  The tools return no deep link into the CMS editor: its URL scheme isn't documented.
- **`lastModifiedBy` tells people from machines.** It is an email for a person and a client id for an
  API client, which replaces the CMS 13 build's list of machine identities.
