import { config } from "dotenv";
import fs from "fs";
import { apiFetch, CONTENT_ENDPOINT, findPageKeyByUrl } from "../_shared";
import { getManagementToken } from "../../src/lib/optimizely/auth";

config({ path: ".env.local" });

const OUT = process.env.BACKUP_OUT ?? "insights-articles-BEFORE.json";

async function main() {
  const key = await findPageKeyByUrl(["/insights/articles", "/insights/articles/", "/en/insights/articles/"]);
  if (!key) throw new Error("Insights Hub: Articles not found in Graph");
  const token = await getManagementToken();
  const res = await apiFetch(`${CONTENT_ENDPOINT}/${key}/locales/en?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
  const cur = data.items?.[0];
  if (!cur) throw new Error("no en version");
  fs.writeFileSync(OUT, JSON.stringify(cur, null, 2));
  const comp = cur.composition as { nodes?: Array<{ nodeType?: string; displayName?: string }> } | undefined;
  console.log(`key: ${key}`);
  console.log(`displayName: ${cur.displayName}   routeSegment: ${cur.routeSegment}`);
  console.log(`status: ${cur.status}  version: ${cur.version}`);
  console.log(`property keys: ${Object.keys((cur.properties as object) ?? {}).join(", ") || "(none)"}`);
  console.log(`composition nodes: ${(comp?.nodes ?? []).length}`);
  for (const n of comp?.nodes ?? []) console.log(`   - ${n.nodeType}: ${n.displayName}`);
  console.log(`\nbacked up -> ${OUT}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
