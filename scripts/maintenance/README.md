# Maintenance scripts

One-off repair, diagnostic and setup scripts. None of them run as part of
`npm run seed:all`; each targets whatever instance the base `OPTIMIZELY_*` vars in
`.env.local` point at. Write scripts are dry-run by default where noted.

| Script | What it does |
|---|---|
| `repair-page-properties.ts` | Finds pages whose published version lost its properties (a draft created with `POST /versions` starts with none) and republishes the newest surviving set. Dry run; `--apply` to write. |
| `patch-link-refs.ts` | Rewrites internal path strings in `type: "url"` link fields to stable `cms://content/{key}` references without reseeding. Dry run; `--apply` to write. |
| `test-odp.ts` | Lists ODP audience names, or checks one visitor's audience membership by `vuid` and/or `fs_user_id`. Read-only. |
| `seed-fx-flags.ts` | Creates the early homepage FX flags through the Flags REST API. Flags are normally managed through the Experimentation MCP server now; kept for reference. |

Run with `npx tsx scripts/maintenance/<script>.ts`.
