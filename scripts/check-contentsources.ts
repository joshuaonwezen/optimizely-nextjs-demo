import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

async function main() {
  const token = await getManagementToken();
  const res = await fetch("https://api.cms.optimizely.com/v1/contentsources", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log(JSON.stringify(JSON.parse(text), null, 2));
}

main().catch(console.error);
