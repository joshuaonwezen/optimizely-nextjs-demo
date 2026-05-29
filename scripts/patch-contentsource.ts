import { config } from "dotenv";
import { getManagementToken } from "../src/lib/optimizely/auth";

config({ path: ".env.local" });

async function main() {
  const token = await getManagementToken();

  const res = await fetch("https://api.cms.optimizely.com/v1/contentsources/Referral", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/merge-patch+json",
    },
    body: JSON.stringify({
      propertyMappings: {
        key: "_itemMetadata.key",
        displayName: "name",
        keyFormat: "undefined",
      },
    }),
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log(text);
}

main().catch(console.error);
