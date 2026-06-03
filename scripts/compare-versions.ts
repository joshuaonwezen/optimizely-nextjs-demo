import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";
config({ path: ".env.local" });
const CONTENT_ENDPOINT = "https://api.cms.optimizely.com/preview3/experimental/content";
const HOMEPAGE_KEY = "3525e1552b6f46158be2850ff6e6fb74";

async function getVersion(token: string, version: string) {
  const res = await fetch(`${CONTENT_ENDPOINT}/${HOMEPAGE_KEY}/versions/${version}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await res.json() as any;
}

function heroHeading(data: any): string {
  const nodes = data?.composition?.nodes ?? [];
  const hero = nodes.find((n: any) => n.component?.contentType === "Hero");
  return hero?.component?.properties?.heading ?? "(no hero found)";
}

function cardUrls(data: any): string[] {
  const nodes = data?.composition?.nodes ?? [];
  const urls: string[] = [];
  for (const section of nodes) {
    for (const row of section.nodes ?? []) {
      for (const col of row.nodes ?? []) {
        for (const el of col.nodes ?? []) {
          if (el.component?.contentType === "ProductCardBlock") {
            urls.push(el.component.properties.linkUrl ?? "?");
          }
        }
      }
    }
  }
  return urls;
}

async function main() {
  const token = await getManagementToken();
  for (const v of ["1305", "1306", "1307"]) {
    const data = await getVersion(token, v);
    console.log(`\n=== v${v} (variation=${data.variation ?? "null"}) ===`);
    console.log("  hero:", heroHeading(data));
    console.log("  cards:", cardUrls(data).join(" | ") || "(none)");
  }
}
main().catch(console.error);
