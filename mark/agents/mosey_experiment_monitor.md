# Specialized agent: `mosey_experiment_monitor`

The first step of `mosey_experiment_rounds`. It reads every test's results in one call and its JSON
output feeds the workflow's loop.

| Field | Value |
|---|---|
| Name | Mosey experiment monitor |
| Id | `mosey_experiment_monitor` |
| Description | Reads the results of every content test on the Mosey Bank site, reports where each one stands, and lists the pages whose variation should be revised or written now. |
| Trigger from Chat | On ("how are the tests doing?") |
| Multi-turn | Off |
| Inference level | Standard |
| Tools | `mosey_list_experiments` (this site) |
| Output data type | JSON, with the schema below |

## Variables

| Name | Type | Required | Description |
|---|---|---|---|
| `revise_after_days` | Number | No | Default 7. Days without a significant result before a variation is revised. |
| `max_pages` | Number | No | Default 3. Caps the loop, because each writing run costs credits. |

## Prompt template

```
Report on the content tests of the Mosey Bank website.

1. Call mosey_list_experiments with revise_after_days [[revise_after_days]] (7 if empty).
   If it returns "notes", repeat them at the top of the report: they say what could not be read.
2. Return JSON matching the output schema:
   - report: a markdown report with
     ## Content tests - <date>
     A table of "tests": page (linked to its url), test, status, days running, primary metric,
     conclusion, and the summary sentence.
     "To ship": every test whose conclusion is "winner", with the winning variation. An editor ends
     it from the Feature Experimentation panel on that page.
     "To fix": every entry of "pagesWithProblems", with the problem as given.
     "Next": the pages in "pagesToContinue" and what will be written for each.
   - pagesToContinue: the first [[max_pages]] (3 if empty) entries of "pagesToContinue", as
     {contentKey, locale, name, action}.
Do not judge the results yourself: use each test's "conclusion" and "summary" as given.
```

## Output schema

```json
{
  "type": "object",
  "required": ["report", "pagesToContinue"],
  "properties": {
    "report": { "type": "string", "description": "Markdown report on the content tests." },
    "pagesToContinue": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["contentKey", "locale"],
        "properties": {
          "contentKey": { "type": "string" },
          "locale": { "type": "string" },
          "name": { "type": "string" },
          "action": { "type": "string", "enum": ["revise_variation", "write_new_variation"] }
        }
      }
    }
  }
}
```

## Notes

- **Only pages that already have a test are listed.** A first test on a page is an editor's decision:
  ask `mosey_variation_writer` in chat for a variation of that page.
- **A page appears in `pagesToContinue` once per round.** After the writer saves a draft, the page's
  action is `wait` until an editor publishes it, and after a revision is published it stays `wait`
  for `revise_after_days`, so a daily run does not rewrite a variation that just changed.
- **The conclusions are the site's, not the model's** (`summarizeResults` in
  `src/lib/mark/experimentResults.ts`): `winner` and `original_wins` need a significant result on the
  primary metric, `flat` is no significant result after `revise_after_days`, `running` is anything
  younger.
