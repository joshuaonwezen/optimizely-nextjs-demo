# Seeding CMS content

Moved out of CLAUDE.md; CLAUDE.md keeps the rules that matter on every change.

## Seeding Content

### Before your first seed — prerequisites checklist

Complete this once per instance before running the seed. Skip it and the seed will fail with credential or container errors.

**Step 1 — Create a content API key in the CMS**

CLI credentials (used by `opti:push`) cannot create content. You need a separate key with write access:
1. CMS → Settings → API Keys → Create API Key
2. CMS → Settings → Set Access Rights → grant the new key content read/write
3. Copy the Client ID and Client Secret

**Step 2 — Set up the root container (JOSHCMS only)**

The seed needs a DynamicExperience set as the site start page. This must be created manually once:
1. CMS → Visual Builder → New page → DynamicExperience → name it anything (e.g. "Site Root")
2. CMS → Settings → Site → Start page → select the DynamicExperience you just created
3. Note the content key from the CMS UI URL (the UUID in the address bar, without hyphens) — this is `OPTIMIZELY_ROOT_CONTAINER_JOSHCMS`

You can skip step 3 — the seed auto-discovers the root container via `GET /v1/applications` and prints it on every run. Setting the env var is a convenience to avoid the API call.

**Step 3 — Populate `.env.local`**

The runner reads credentials from `.env.local`. For the `personal` instance use the base name; for the other instances append the instance suffix (`_JOSHCMS`, `_HARRYNEWCMS`, `_MOSTINNEWCMS`, `_APJCMS` — see the instances table below). Known instances are registered in `src/lib/optimizely/seedInstances.ts`.

| Variable | Required | Where to get it |
|---|---|---|
| `OPTIMIZELY_CMS_CLIENT_ID` | Yes | Step 1 above (API Key Client ID) |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | Yes | Step 1 above (API Key Client Secret) |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | Yes | CMS → Settings → API Keys → existing Graph key |
| `OPTIMIZELY_GRAPH_GATEWAY` | Yes | CMS → Settings → API Keys → Graph endpoint URL |
| `OPTIMIZELY_CMS_URL` | Yes | `https://app-<slug>.cms.optimizely.com` |
| `OPTIMIZELY_APP_KEY` | For webhooks + Content Source API | Same API key, used for Basic auth on webhook registration and Content Source API data sync |
| `OPTIMIZELY_APP_SECRET` | For webhooks + Content Source API | Same API key |
| `OPTIMIZELY_ROOT_CONTAINER` | No — auto-discovered | UUID (no hyphens) of the root container; set to skip the discovery call |

Suffix every variable name with the instance suffix for non-personal instances. Example:
```
OPTIMIZELY_CMS_CLIENT_ID=abc123
OPTIMIZELY_CMS_CLIENT_ID_JOSHCMS=xyz789
```

**Step 4 — Run the seed**

Use the seed tool on `/demo/management-api` (pick the instance from the dropdown), or from the CLI inject the instance's suffixed values as base names:

```bash
OPTIMIZELY_CMS_URL=$OPTIMIZELY_CMS_URL_JOSHCMS \
OPTIMIZELY_CMS_CLIENT_ID=$OPTIMIZELY_CMS_CLIENT_ID_JOSHCMS \
... npx tsx scripts/seed-runner.ts
```

---

### How to seed

Always use the seed runner — never call individual seed scripts directly. The runner does NOT parse an `--instance` flag; it reads only the base env var names from its environment. Two ways to target an instance:

1. **Seed tool (preferred):** `/demo/management-api` → "Reseed this CMS instance" → pick the instance from the dropdown. The API route resolves the suffixed `.env.local` vars server-side and injects them as base names before spawning the runner.
2. **CLI:** `npm run seed:all` seeds whatever the base vars in `.env.local` point to (the personal instance). For another instance, override the base vars on the command line with that instance's suffixed values.
3. **All instances (CLI):** `npm run seed:instances` seeds every instance in `src/lib/optimizely/seedInstances.ts` in sequence. It resolves each instance's suffixed vars the same way the seed route does, skips any instance whose required vars are absent (warning, not fatal), continues past a failed instance, and prints a per-instance summary at the end. Add `--dry-run` to only report which instances would seed, or `--localize` to include the Dutch localization step.

### Non-destructive by default (`--fresh` to rebuild)

**The seed is now a non-destructive upsert by default. It no longer deletes existing content.** Re-seeding updates the pages the seed owns in place and leaves editor-created pages (and any other content under the root) untouched.

- **Stable content keys.** Every seeded page/block gets a *deterministic* key (`stableKey()` in `scripts/_shared.ts`) derived from its identity (route path for pages, a per-item id for modeling, `href` for nav), instead of a fresh random UUID each run. So a re-seed resolves to the **same** key + URL, and anything referencing a page by key/URL survives. `seed-content.ts` also reconciles by URL first (`reconcilePageIdentities()` → `resolvePageKey()`), adopting an existing page's key when one already sits at the target URL.
- **What each seeder does on a default run:** `seed-content` upserts pages in place (never deletes the root's children); `seed-modeling` keeps existing items (createContent 409-skips) and only creates what's missing; `seed-nav` still rebuilds its own `Navigation`/`NavigationItem` blocks (the Management API does not persist content-area edits through PATCH, so nav blocks must be DELETE+POST) but with stable keys and it never touches content pages or editor-named nav blocks.
- **`--fresh` (or `SEED_FRESH=1`) restores the old destructive rebuild:** delete every child of the root and recreate from scratch. The runner forwards it to every seed script: `npm run seed:all -- --fresh` (or set `SEED_FRESH=1`). Use it for a clean slate.
- **One-time migration:** the *first* seed after this change against an instance that still holds old **random-key** content should be run **once with `--fresh`** to clear the pre-existing random-key pages/blocks; every seed after that can use the default. (`seed-content` adopts old page keys by URL so it transitions cleanly without `--fresh`, but `seed-modeling`/`seed-nav` would otherwise leave old random-key duplicates until a `--fresh` run.)
- **Trade-off:** with no default delete, a page the seed *used to* create but no longer defines lingers as an orphan. That is the intended "retain" behavior; `--fresh` clears it.
- The `/demo/management-api` seed tool always runs the safe default; use the CLI with `--fresh` when you need the destructive rebuild.

### What the runner does (in order)

| Step | Script | Notes |
|---|---|---|
| 1 | `opti:push` | Pushes content type definitions to the CMS |
| 2 | `seed-content.ts` | Creates 19 DynamicExperience/TraditionalPage pages + homepage |
| 3 | `seed-nav.ts` | Creates NavigationItem tree + Navigation block |
| 4 | `seed-modeling.ts` | Authors, articles, case studies, milestones, team members, hub pages, Phase D pages |
| 5 | `seed-faqs.ts` | 6 FaqItemBlock items + FaqContainerBlock, wired to the FAQs page |
| 6 | `seed-homepage-variations.ts` | Optional — needs Graph to have indexed the homepage (~60s lag) |
| 7 | `seed-nav-strategy-demo.ts` | Optional — nav strategy demo pages |
| 8 | `seed-quotes.ts` | Optional — quote content via Content Source API |
| 9 | `seed-localization.ts` | Optional — Dutch (nl) versions of all pages, navigation, and FAQs. Translates via the exact-match dictionary in `scripts/translations-nl.ts`; needs Graph to have indexed everything above, so re-run individually after ~60s on a fresh seed |

Steps 6-9 are optional: if they fail (usually Graph lag on a fresh seed), the runner warns and continues. Re-run them individually after ~60s if needed.

**seed-nav must run before seed-faqs** — seed-faqs Part 3 looks up the FAQs page in Graph to wire the FAQ container to it. The FAQs page is created by seed-nav. Running them out of order causes a warning ("FAQs page not found in Graph") and skips the wiring; re-run `npx tsx scripts/seed-faqs.ts` after seed-nav completes.

### Expected warnings on a clean seed run

These are normal — they are not failures:

| Warning | Why | What to do |
|---|---|---|
| `[warn] PATCH /versions/1422: 400 Only versions in status 'draft' can be patched` | The joshCMS root container is a DynamicExperience set as the start page. It was created manually and is already published. The seed can't patch its composition. | A separate homepage page is created at route `/` as a sibling — that's what the app serves. Ignore this warning. |
| `[warn] Could not patch homepage at key=... — update it manually in Visual Builder` | Same as above. | Ignore. The app uses the newly created homepage, not the container itself. |
| `[warn] FAQs page not found in Graph — run seed:nav first, then re-run this script` | seed-faqs ran before Graph indexed the FAQs page created by seed-nav. | Re-run `npx tsx scripts/seed-faqs.ts` after the full seed completes. |
| `[indexed sample] { "Quote": { "items": [] } }` | Graph hasn't indexed the quotes yet (10s polling started immediately after sync). | Wait 30-60s, then visit `/demo/content-source` to verify. |
| `[attempt 1 failed] POST with variation field: 400 Variations can only be created from existing versions` | CMS variations can't be created via the API. | Create them manually in Visual Builder — seed-homepage-variations.ts prints exact instructions. |
| `[skipped-publish] "<name>" - approval workflow requires review; left as draft` | The instance (e.g. joshCMS) has a content-approval workflow, so the Management API can't publish directly (`400 ... requires approval`). | Expected on approval-gated instances. The item is created as a **draft** and seeding continues (`isApprovalRequired()` in `_shared.ts` gates this skip). Approve the drafts in the CMS to make them live, or disable the approval workflow for the seed API key and re-seed to publish directly. |

### Scripts excluded from the runner

- `register-webhook.mjs` — interactive prompt for public URL; run manually when needed

FX flags and experiments are managed through the Optimizely Experimentation MCP server (`mcp__exp__*` tools), not via a local seed script.

### Contact form seed scripts — which one to use

Three scripts cover the contact-form demos; they are complementary, not alternatives:

| Script | What it does | Prerequisite |
|---|---|---|
| `seed-contact-pages.ts` | Creates the shared custom `ContactFormBlock` and the "Contact (Classic)" TraditionalPage that carries it. It only rebuilds `/help/contact` as an experience when that key is already a DynamicExperience; seed-content creates it as a TraditionalPage, and a permanently deleted key stays reserved, so it never deletes that page | None |
| `seed-form-block.ts` | Populates a native OptiForms container with form elements (text, email, select, textarea, submit) | A published "Form Container" shared block created manually in the CMS UI (native forms cannot be created via the API) |
| `seed-contact-form.ts` | Builds the "Contact (Form)" DynamicExperience (`/help/contact-form`, or `/contact-form` when `/help` isn't indexed): the custom `ContactFormBlock` as a root component node plus the native Form Container as a form section | `seed-contact-pages.ts`, `seed-form-block.ts` |

All three run in the runner's optional phase in this order. If no Form Container block exists in the CMS, `seed-form-block.ts` and `seed-contact-form.ts` warn and skip. Native form elements render only because `compositionProperties.ts` deepens the SDK's composition query (a form nests one level deeper than a grid section).

### Instances

Credentials for each instance live in `.env.local` with suffixes. The registry in `src/lib/optimizely/seedInstances.ts` maps instance ids to suffixes and drives the dropdown in the `/demo/management-api` seed tool.

| Instance | Suffix | CMS URL | Hosted URL |
|---|---|---|---|
| personal | _(none)_ | `app-ocstjoshuac8je4ft002.cms.optimizely.com` | — |
| joshCMS (formerly "onboarding") | `_JOSHCMS` | `app-opononboard15smbt002.cms.optimizely.com` | — |
| harryNewCMS | `_HARRYNEWCMS` | `app-opon10saas39t5rt001.cms.optimizely.com` | `harry-cms.vercel.app` |
| mostinNewCMS | `_MOSTINNEWCMS` | `app-opon10saas39t5rt002.cms.optimizely.com` | `mostin-cms.vercel.app` |
| kastleNewCMS | `_KASTLENEWCMS` | `app-opononboards2c23t002.cms.optimizely.com` | _(TBD)_ |
| toddCMS | `_TODDCMS` | `app-opononboardyt09bt002.cms.optimizely.com` | _(TBD)_ |
| apjCMS | `_APJCMS` | `app-opon12saasw5l98p001.cms.optimizely.com` | `apj-cms.vercel.app` |

Each instance needs its own `OPTIMIZELY_ROOT_CONTAINER_<SUFFIX>` — a UUID **without hyphens** pointing to the root container for that instance. It must exist before seeding. Two supported container setups:

| Setup | When to use | Notes |
|---|---|---|
| BlankExperience / folder | Organizational container only, not a page itself | Traditional approach; container is never visited directly |
| DynamicExperience as start page | Container IS the site start page at `/` | joshCMS uses this; seed patches the container's own composition |

For the DynamicExperience-as-start-page setup, the CMS admin must:
1. Create a DynamicExperience in the CMS (Settings → Content or Visual Builder)
2. Set it as the site start page (Settings → Site → Start page)
3. Copy its key (from the CMS UI URL, without hyphens) into `OPTIMIZELY_ROOT_CONTAINER_JOSHCMS`

The seed script handles both setups automatically: it always tries to patch the container key directly with the homepage composition when Graph hasn't indexed the start page yet.

### Critical gotchas

**Compositions must be PATCHed after creation** — the Management API silently drops the `composition` field on POST. `seed-content.ts` handles this automatically: POST creates the item, then a PATCH to `/content/{key}/versions/{version}` with `application/merge-patch+json` saves the composition. If you write a new seed script that creates DynamicExperience pages, follow the same pattern.

**Homepage variations cannot be created via API** — the Visual Builder UI is required. `seed-homepage-variations.ts` prints manual instructions when it can't create them. Create each variation in the CMS (open Homepage → Add variation), name them exactly matching the FX variation keys (`new_visitor`, `personal`, `business`), then the script can PATCH their compositions.

**Graph indexing lag** — newly created content takes ~30-60s to appear in Graph. Scripts that look up keys via Graph (seed-faqs wiring, seed-homepage-variations, Phase D pages in seed-modeling) will skip/warn on a fresh seed run. Re-run those individual scripts after waiting.

**Content-area expansions can be stale in Graph** — Graph materializes a parent's content-area expansion (e.g. a NavigationItem's `children`) when it indexes the parent. If a referenced child's doc wasn't indexed yet at that moment, the child stays missing from the parent's expansion even after the child appears in the index. Fix: force a reindex by republishing the parent — but beware: `POST /content/{key}/versions` creates a **blank** version, NOT a copy of the current one. Publishing it as-is wipes the item's properties. The safe sequence is: `GET` the current version's `properties` → `POST /versions?locale=en` to create the draft → `PATCH` the draft with those properties (merge-patch+json) → `:publish`. Deleted items can also linger in the index for a while as stale docs; they don't affect queries that go through a live parent's references.

**`POST /content/{key}/versions` does NOT copy the properties bag** — it copies the item's **composition** but starts with **no properties at all**. So the pattern "create a draft, merge-patch the few properties I care about, publish" silently **wipes every other property** (heading, body, metaTitle, mainContent, title, tags, ...) the moment it publishes. Compositions survive, so a Visual Builder page still looks right while its SEO fields and content-area bindings are gone, which makes this very easy to miss.

`patchPublishedPageProperties()` in `scripts/_shared.ts` now reads the current version's properties and merges the new ones on top, so callers are safe. Any NEW code that creates a draft by hand must do the same. `scripts/maintenance/repair-page-properties.ts` detects and repairs the damage: it compares each page's published version against the newest version that still had properties and republishes the merged set (dry run by default, `--apply` to write, and it also clears empty leftover drafts). Judge damage by the **published** version, not the newest row, since a leftover draft on top does not affect what the site serves. The Management API rate-limits bulk runs with 429 plus `Retry-After`, so back off rather than aborting.

**API keys need content write scope** — CLI credentials (used for `opti:push`) only have config-push scope and will get `403 Required access is 'create'` on content operations. Content seeding requires a dedicated API key created in **Settings → API Keys** with write access granted in **Settings → Set Access Rights**.

**Container key format** — the `OPTIMIZELY_ROOT_CONTAINER` value must be a UUID without hyphens (e.g. `bac6997fb4594e9ebcd93349de583fee`), not the hyphenated form from the CMS UI URL.

**Shared blocks vs content items — two different kinds of CMS items**. *Shared blocks* live inside the "For All Applications" system folder (`SysContentFolder`, well-known key `e56f85d0e8334e02976a2d11fe4d598c`, a child of the top-level content root), show up in the **Shared Blocks** tab, and are what editors bind into **content areas** (`type: "array"` of `content`). *Content items* live elsewhere in the tree, show up in the **Content Manager** tab, and are the targets of **contentReference** properties. A block created directly under the top-level root is a plain content item - it never appears in the Shared Blocks tab. `discoverGlobalRoot()` in `scripts/_shared.ts` resolves the shared-blocks folder; `sweepMisplacedSharedBlocks()` migrates blocks stranded at the root by older seeds.

**Seeded shared blocks are organized into subfolders under "For All Applications"**, not created flat in the folder root. `ensureSubfolder(id)` in `scripts/_shared.ts` creates (idempotently, with fixed keys) and returns the container for each; every seed script passes that as the block's `container`. The six subfolders and their owners:

| Subfolder | Blocks | Seed scripts |
|---|---|---|
| Navigation & Footer | `Navigation`, `NavigationItem`, `Footer` | seed-nav, seed-footer |
| Site Settings | `SiteSettings`, `SiteBanner` | seed-settings |
| FAQs | `FaqItemBlock`, `FaqContainerBlock` | seed-faqs, seed-content |
| Quotes | `QuoteBlock` | seed-content (creates first), seed-quote-blocks |
| Editorial | modeling blocks, `CalloutBlock`, `CallToAction` | seed-modeling, seed-content |
| Forms & Tools | `ContactFormBlock`, `BranchFinderBlock` | seed-contact-pages, seed-branch-finder |

Because seed-content must create the homepage's bound blocks (Quote cards, the shared Callout/CTA) before its pages, it writes them straight into the Quotes / Editorial subfolders (via `ensureSubfolder("quotes")` / `ensureSubfolder("editorial")`), not its own FAQs container - whichever of seed-content / seed-quote-blocks runs second 409-skips.

Notes on how the reorg stays safe and idempotent:
- Nesting is safe: the app fetches blocks **by type** (`Navigation(limit: 1)`, `Footer(limit: 1)`) and binds them by `cms://content/{key}` reference, so neither depends on the container. Blocks only need to stay **descendants of** "For All Applications" to remain in the Shared Blocks tab.
- **`SysContentFolder` is non-localized** - creating one must NOT send `initialVersion.locale` (400 otherwise). `ensureSubfolder()` handles this.
- **One-time migration**: `migrateFlatSharedBlocksToSubfolders()` (called first, in seed-content) deletes seed-owned block types that older seeds left flat in the folder root, so the per-script creates land in subfolders without a 409 collision (fixed-key blocks) or a duplicate (random-key blocks). It is type-scoped (`RELOCATED_BLOCK_TYPES` in `_shared.ts`) and flat-only, so native form containers, media, and editor blocks at the root are left alone, and it is a no-op once the root is clear.
- **Singletons use fixed keys**: `SiteSettings` / `SiteBanner` (and the FAQ items, quote cards, shared Callout/CTA) have stable keys, so re-seeds 409-skip and can never duplicate - independent of the display-name sweep, which had a flaky per-item version fetch.
- `sweepMisplacedSharedBlocks()` / `sweepSeededBlocks()` recurse into every `SysContentFolder` under the blocks folder, so re-seeds clean the seed's own copies inside subfolders too.

**Navigation is a shared block, not a composition node** — `NavigationItem` and `Navigation` blocks live in the shared-blocks folder (see above). The `Navigation` block is named `"Navigation Menu"` and is fetched by the Next.js app via a Graph query (by type, `Navigation(limit: 1)` — the display name is not used for filtering), not embedded in any page composition. `DynamicExperienceType.mayContainTypes` must include `NavigationItem` and `Navigation` for this to work when the root container is a DynamicExperience.

**Permanently deleting all children may delete the container itself** — if you `DELETE /content/{key}?permanent=true` every child of a DynamicExperience container, the CMS may cascade-delete the container too. If the container key starts returning 404, create a new DynamicExperience, set it as the start page, and update `OPTIMIZELY_ROOT_CONTAINER` in `.env.local`. Never use `permanent=true` on the container itself.

---
