import { CONTENT_ENDPOINT, GRAPH_ENDPOINT, SINGLE_KEY, getManagementToken, apiFetch } from "../_shared";

// One-off repair. Creating a draft with POST /content/{key}/versions copies the
// composition but NOT the properties bag, so any code that creates a draft and
// then merge-patches only a subset of properties silently drops the rest on
// publish. This script finds pages whose live version lost its properties and
// republishes them with the newest surviving property set, preserving whatever
// categories are currently assigned.
//
// Run with --apply to write; default is a dry run.

const DRY = !process.argv.includes("--apply");

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));


interface VersionRow {
  version: string;
  status: string;
  displayName?: string;
  routeSegment?: string;
  properties?: Record<string, unknown>;
}

const PAGES_QUERY = `query AllPages($cursor: String) {
  _Page(limit: 100, cursor: $cursor, locale: en,
        where: { _metadata: { url: { default: { exist: true } } } },
        orderBy: { _metadata: { url: { default: ASC } } }) {
    cursor
    items { _metadata { key url { default } } }
  }
}`;

async function allPages(): Promise<Array<{ key: string; url: string }>> {
  const out: Array<{ key: string; url: string }> = [];
  let cursor: string | undefined;
  for (;;) {
    const res = await apiFetch(GRAPH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `epi-single ${SINGLE_KEY}`,
      },
      body: JSON.stringify({ query: PAGES_QUERY, variables: { cursor } }),
    });
    const body = (await res.json()) as {
      data?: {
        _Page?: {
          cursor?: string | null;
          items?: Array<{ _metadata?: { key?: string; url?: { default?: string } } }>;
        };
      };
    };
    const page = body.data?._Page;
    const items = page?.items ?? [];
    out.push(
      ...items
        .map((i) => ({ key: i._metadata?.key ?? "", url: i._metadata?.url?.default ?? "" }))
        .filter((p) => p.key && p.url)
    );
    if (items.length < 100 || !page?.cursor) return out;
    cursor = page.cursor;
  }
}

async function versions(key: string, locale = "en"): Promise<VersionRow[]> {
  const token = await getManagementToken();
  const res = await apiFetch(`${CONTENT_ENDPOINT}/${key}/locales/${locale}?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Graph can keep serving a doc for content that has since been deleted, so a
  // 404 here means a stale index entry, not a failure worth aborting the run.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GET locales ${key}: ${res.status}`);
  return ((await res.json()) as { items?: VersionRow[] }).items ?? [];
}

async function fullVersion(key: string, version: string): Promise<VersionRow> {
  const token = await getManagementToken();
  const res = await apiFetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET version ${key}/${version}: ${res.status}`);
  return (await res.json()) as VersionRow;
}

/** Property keys that carry real content, ignoring the categories we just added. */
function meaningful(props: Record<string, unknown> | undefined): string[] {
  return Object.keys(props ?? {}).filter((k) => k !== "categories");
}

async function repair(key: string): Promise<string> {
  const rows = await versions(key);
  if (rows.length === 0) return "skip: no versions";

  // Judge health by the PUBLISHED version, not the newest row: a leftover draft
  // sitting on top does not affect what the site serves.
  const published = rows.find((r) => r.status === "published") ?? rows[0];
  const current = published;
  const currentProps = (current.properties ?? {}) as Record<string, unknown>;

  if (meaningful(currentProps).length > 0) {
    // Drop drafts that carry nothing but categories - they are debris from an
    // interrupted repair and would show an editor an empty page.
    const stale = rows.filter(
      (r) => r.status === "draft" && meaningful(r.properties).length === 0
    );
    if (stale.length === 0) return "ok: intact";
    if (DRY) return `WOULD DROP ${stale.length} empty draft(s)`;
    const token = await getManagementToken();
    for (const s of stale) {
      await apiFetch(`${CONTENT_ENDPOINT}/${key}/versions/${s.version}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return `DROPPED ${stale.length} empty draft(s)`;
  }

  const good = rows.find((r) => meaningful(r.properties).length > 0);
  if (!good) return "ok: never had properties";

  const goodFull = await fullVersion(key, good.version);
  const goodProps = (goodFull.properties ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...goodProps };
  if (currentProps.categories !== undefined) merged.categories = currentProps.categories;

  const summary = `from v${good.version}: ${meaningful(goodProps).join(", ")}`;
  if (DRY) return `WOULD RESTORE ${summary}`;

  const token = await getManagementToken();
  const draftRes = await apiFetch(`${CONTENT_ENDPOINT}/${key}/versions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      locale: "en",
      displayName: goodFull.displayName ?? current.displayName,
      routeSegment: goodFull.routeSegment ?? current.routeSegment,
    }),
  });
  if (!draftRes.ok) {
    return `FAIL draft: ${draftRes.status} ${(await draftRes.text()).slice(0, 160)}`;
  }

  // The new draft is not always visible on the very next read, so poll briefly.
  let draft: VersionRow | undefined;
  for (let attempt = 0; attempt < 5 && !draft; attempt += 1) {
    if (attempt > 0) await sleep(1000);
    draft = (await versions(key))
      .filter((r) => r.status === "draft")
      .sort((a, b) => Number(b.version) - Number(a.version))[0];
  }
  if (!draft) return "FAIL: no draft created";

  const patch = await apiFetch(`${CONTENT_ENDPOINT}/${key}/versions/${draft.version}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/merge-patch+json",
    },
    body: JSON.stringify({ properties: merged }),
  });
  if (!patch.ok) return `FAIL patch: ${patch.status} ${(await patch.text()).slice(0, 160)}`;

  const pub = await apiFetch(`${CONTENT_ENDPOINT}/${key}/versions/${draft.version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pub.ok) return `FAIL publish: ${pub.status}`;

  return `RESTORED ${summary}`;
}

async function main(): Promise<void> {
  const pages = await allPages();
  console.log(`${DRY ? "[dry-run]" : "[apply]"} checking ${pages.length} page(s)\n`);
  let restored = 0;
  let drafts = 0;
  for (const p of pages) {
    const result = await repair(p.key);
    if (result.startsWith("RESTORED") || result.startsWith("WOULD RESTORE")) restored += 1;
    if (result.startsWith("DROPPED") || result.startsWith("WOULD DROP")) drafts += 1;
    if (!result.startsWith("ok:")) console.log(`${result}\n    ${p.url}`);
  }
  console.log(
    `
${restored} page(s) ${DRY ? "would be restored" : "restored"}, ` +
      `${drafts} empty draft(s) ${DRY ? "would be dropped" : "dropped"}` +
      (DRY ? " (re-run with --apply)" : "")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
