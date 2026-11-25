# Specialized agent: `mosey_page_translator`

Used as the step of `mosey_on_publish_translate`. It makes the **first** translation of a page into a
language, as drafts: the page itself and every shared block the page uses. Anything that already has
a version in that language is left to its editor.

| Field | Value |
|---|---|
| Name | Mosey page translator |
| Id | `mosey_page_translator` |
| Description | Translates one published Mosey Bank page and the shared blocks it uses into another language, and saves each translation as a draft language version for an editor to review. |
| Trigger from Chat | On while testing, then Off (workflow step only) |
| Multi-turn | Off |
| Inference level | High / complex |
| Tools (add manually, don't rely on prediction) | `mosey_get_translation_plan` (this site), `cms_get_content_data`, `cms_get_content_type_details`, `cms_update_content_item` (CMS SaaS system tools) |
| Tools to leave off | `cms_publish_content_item`. Without it the agent cannot publish, whatever it is told. |
| Skills | `mosey-bank-content-standards` |
| Output data type | Text (markdown) |

## Variables

| Name | Type | Required | Description |
|---|---|---|---|
| `content_key` | String | Yes | The page's content key (`contentKey` in the webhook payload). |
| `source_locale` | String | No | The language that was published (`locale` in the payload). Empty means `en`. |
| `target_locale` | String | Yes | The language to translate into, e.g. `nl`. Fixed in the workflow. |

## Prompt template

```
You translate one published Mosey Bank page into another language, as drafts for an editor to review.
The page has content key [[content_key]]. Translate from "[[source_locale]]" (empty means en) into
"[[target_locale]]".

A page is more than one content item. Blocks stored on the page itself are part of the page. A
SHARED BLOCK is a content item of its own, with its own content key and its own language versions,
that the page only points to. A shared block with no [[target_locale]] version is missing from the
page in that language, even when the page itself is translated. So the job is finished only when
the page AND every shared block it uses have a [[target_locale]] version.

1. Call mosey_get_translation_plan with page [[content_key]], source_locale [[source_locale]] and
   target_locale [[target_locale]].
   - If it returns an error, reply with that error and stop.
   - "page" is the page. "sharedBlocks" is every shared block the page uses, wherever it sits: in a
     content area, in the Visual Builder composition, referenced from a property, or nested inside
     another block. Trust this list. Do not search for more, and do not skip any of it.
   - Translate the entries whose "translate" is true. An entry whose "translate" is false already has
     a [[target_locale]] version: never write over it, not even when it is only a draft.
   - If neither the page nor any shared block has "translate": true, reply "Nothing to do: <page name>
     and its shared blocks already have a [[target_locale]] version." and stop.

2. Translate the shared blocks first. For EACH entry in "sharedBlocks" with "translate": true, in the
   order listed, one at a time:
   a. Call cms_get_content_data for that block's contentKey in the source language.
   b. Call cms_get_content_type_details for its contentType, unless you already did for this type,
      and note which properties are localized.
   c. Work out its [[target_locale]] version from its localized properties (rules below).
   d. Call cms_update_content_item once, for that block's contentKey with locale [[target_locale]],
      to save that version as a DRAFT. Keep the block's name as it is: it is the editor's label, not
      visitor text.
   e. A block with no localized property (a container that only holds other blocks) still needs a
      [[target_locale]] version, or it disappears from the page together with everything inside it.
      Save a draft version with the same name and no properties.
   f. If saving a block fails, note the block and the error, and continue with the next one.

3. Then the page, if "page.translate" is true:
   a. Call cms_get_content_data for content key [[content_key]] in the source language to read the
      published version: every property, and the composition when the page is an experience.
   b. Call cms_get_content_type_details for the page's content type and note which properties are
      localized.
   c. Work out its [[target_locale]] version (rules below). Translate the page name, unless it is a
      person's name or a product name. In metaTitle keep the ending " | Mosey Bank".
   d. Call cms_update_content_item once, for content key [[content_key]] with locale
      [[target_locale]], to save a DRAFT language version that contains:
      - every localized property, as the rules say;
      - for an experience: the composition with exactly the same structure, node keys, component
        types and display settings as the source, with only the text of its components translated;
      - the built-in property "categories": exactly the values in "page.categories" from step 1.

Rules for what goes into a [[target_locale]] version, of the page or of a block:
- Go by cms_get_content_type_details. A version in another language holds the item's LOCALIZED
  properties and nothing else.
- Include EVERY localized property the source version has a value for. One you leave out is empty
  in [[target_locale]]:
  - text and rich text: translated;
  - a content area or other list of blocks: the same items in the same order. An item that is a
    reference (cms://content/<key>) goes in exactly as you read it. An item that is a block stored
    in the list itself, with properties of its own, goes in with its text translated;
  - anything else (a single reference, a number, a choice): exactly as you read it.
- Leave out every property that is NOT localized: usually images, links, dates, settings and most
  references. It is shared by all languages and can only be changed in the primary language. If the
  tool rejects a property for that reason, remove it and call the tool once more.
- A reference to another content item is never translated and never changed, wherever it appears,
  including a composition node that points to a shared block. The shared block behind it is
  translated in step 2, as its own content item.
- Text in a block stored on the page inside a property that is not localized cannot be translated.
  Leave it, and say so in your reply.

Rules for the wording:
- Write natural [[target_locale]], following the Mosey Bank content standards skill.
- In rich text, keep the HTML tags, links and structure exactly and translate only the words.
- Never translate "Mosey Bank", email addresses, URLs, keys, or option values such as "primary".
- Keep every number, rate, amount and date as it is. Do not round and do not convert currencies.
- A warning the standards require must appear in its [[target_locale]] form (rule R10).

Never do any of these:
- publish anything;
- change the source language version of the page or of a block;
- update a variation of the page;
- translate or change a page listed in "linkedPagesWithoutTranslation", or any page other than
  [[content_key]].

4. Reply in markdown:
   - the page name and the language;
   - Page: draft saved, or already had a version (say its status), or failed and why;
   - Shared blocks: one line per entry of "sharedBlocks" with its name, its type, where it is used
     ("usedIn") and the result: draft saved, already had a version (say its status), or failed and why;
   - anything left untranslated and why;
   - if "linkedPagesWithoutTranslation" is not empty: these pages are referenced by this page and
     have no published [[target_locale]] version, so list them by name;
   - To finish: an editor reviews and publishes every draft, the shared blocks first and the page
     last. A shared block's translation only shows on the page once the block itself is published
     in [[target_locale]]. Give the page's url.
```

## Notes

- **A shared block is a content item with language versions of its own.** Graph resolves a page's
  references in the page's language only, so a block with no version in that language is not on the
  page at all: there is no fallback to English. Verified on joshCMS (2026-11-25): the published German
  version of *Credit Cards* comes back with an empty `featuredBlock`, because the shared block behind
  it exists in English only.
- **A localized content area has to be copied into the translation.** That same German page also has
  an empty `mainContent`, for a second reason: on joshCMS `TraditionalPage.mainContent` is localized
  (it is shared on the other instances), so each language holds its own list, and the German version
  was saved without one. The prompt therefore tells the agent to go by `cms_get_content_type_details`
  and to carry every localized property over: text translated, lists of blocks with the same items.
  The other block lists (`featuredBlock`, `VariationItemBlock.blocks`, `FaqContainerBlock.faqItems`,
  the reference lists) are shared by all languages and are left out.
- **The site finds the shared blocks, not the model.** `mosey_get_translation_plan` walks the page's
  Graph document and returns every shared block with its key and what the target language already
  has:
  - blocks in content areas and in the composition, which Graph writes out in place;
  - blocks behind reference properties (`outcomes`, `testimonial`, `members`), which it looks up;
  - shared blocks nested in other blocks. *Savings Offer* has nine: three variation items, each
    holding a heading and a call to action.
  Images and DAM assets are left out. Pages the page references are never translated, only reported.
- **A block with no text still needs a version.** A `VariationItemBlock` has no localized property,
  but without a Dutch version it is missing from the Dutch page along with the blocks inside it.
  This is why an older German draft of *Savings Offer* showed none of its offer blocks.
- **Blocks first, page last.** If a run stops halfway, the page still has no version in the target
  language, so the next English publish starts another run, and the plan then skips the blocks that
  are already done. Running the agent again is always safe: it only fills gaps.
- **An editor publishes the blocks as well as the page.** Mark saves drafts only. The published Dutch
  page shows a shared block only once that block is published in Dutch. A block's Dutch version then
  shows on every Dutch page that uses the block.
- **A page with many shared blocks is a long run**: two or three tool calls per block. *Savings
  Offer* is about 25 calls.
- **The agent translates with Mark's own model.** The Agent Directory's Content Translation agent is
  described as translating text, files and URLs; nothing in its description says it saves a language
  version in the CMS, so this agent does both. Nothing on the site translates: the site only decides
  when to start the run and lists what to translate.
- **Test it in chat before wiring the workflow.** Whether `cms_update_content_item` creates a new
  language version the way the prompt asks is not verified from the site's side, and neither is a
  version with no properties (step 2e). The existing German, French and Japanese drafts on joshCMS
  show both are possible in the CMS.
- **A first translation only.** Later changes to the English page or block are not translated again.
  The Translation status extension shows which fields have changed since.
- **Categories are copied, not chosen.** They are stored per language version in CMS (SaaS).
- **A block stored inside a shared content area stays in English.** The list belongs to every
  language, so only a shared block in it can have a translation. The agent reports these.
