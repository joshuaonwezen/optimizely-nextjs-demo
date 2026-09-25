import { API_BASE, apiFetch } from "../_shared";
import { SEED_INSTANCES } from "../../src/lib/optimizely/seedInstances";

// Makes sure every instance has a DEFAULT application.
//
// A shared block in "For All Applications" sits outside every application's
// entryPoint, so the CMS has no application to build a preview URL from and falls
// back to the default one. With no default at all the block's preview pane reads
// "Preview is not configured" - which is what broke shared-block preview on
// toddCMS. Pages are unaffected: they live under the application's entry point.
//
// Dry run by default; pass --apply to write.
//
//   npx tsx scripts/maintenance/set-default-application.ts [--only=id,id] [--apply]

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const ONLY = arg("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const APPLY = process.argv.includes("--apply");

const APPLICATIONS_ENDPOINT = `${API_BASE}/v1/applications`;

interface Application {
  key: string;
  displayName?: string;
  isDefault?: boolean;
  entryPoint?: string;
  [field: string]: unknown;
}

/**
 * Mint a Management API token for one instance.
 *
 * getManagementToken() caches a single token module-wide off the BASE env vars,
 * so it cannot be used in a loop over instances - each one needs its own.
 */
async function getToken(suffix: string): Promise<string | null> {
  const clientId = process.env[`OPTIMIZELY_CMS_CLIENT_ID${suffix}`];
  const clientSecret = process.env[`OPTIMIZELY_CMS_CLIENT_SECRET${suffix}`];
  if (!clientId || !clientSecret) return null;

  const res = await apiFetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    console.log(`  [skip] token request failed: ${res.status} ${await res.text()}`);
    return null;
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

async function listApplications(token: string): Promise<Application[] | null> {
  const res = await apiFetch(`${APPLICATIONS_ENDPOINT}?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.log(`  [skip] GET /v1/applications failed: ${res.status} ${await res.text()}`);
    return null;
  }
  return ((await res.json()) as { items?: Application[] }).items ?? [];
}

/**
 * Flip isDefault on one application. The update verb is undocumented, so try
 * merge-patch (what the content endpoints use) and fall back to a full PUT of the
 * object with the server-managed audit fields stripped.
 */
async function setDefault(token: string, app: Application): Promise<string | null> {
  const url = `${APPLICATIONS_ENDPOINT}/${app.key}`;

  const patch = await apiFetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/merge-patch+json",
    },
    body: JSON.stringify({ isDefault: true }),
  });
  if (patch.ok) return null;
  const patchError = `PATCH ${patch.status} ${(await patch.text()).slice(0, 200)}`;

  // Strip the server-managed audit fields; the rest of the object round-trips.
  const writable: Record<string, unknown> = { ...app, isDefault: true };
  for (const field of ["created", "createdBy", "lastModified", "lastModifiedBy"]) {
    delete writable[field];
  }

  const put = await apiFetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(writable),
  });
  if (put.ok) return null;

  return `${patchError}; PUT ${put.status} ${(await put.text()).slice(0, 200)}`;
}

/**
 * Confirm the flag landed, reading the LIST endpoint rather than
 * /v1/applications/{key}: the single-item GET was observed reporting
 * isDefault: true on toddCMS while the list still said false, so the list is the
 * authoritative read. The write is also not immediately consistent, hence retries.
 */
async function verify(token: string, key: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    const apps = await listApplications(token);
    if (apps?.some((a) => a.key === key && a.isDefault)) return true;
  }
  return false;
}

async function main() {
  if (ONLY) {
    const unknown = ONLY.filter((id) => !SEED_INSTANCES.some((i) => i.id === id));
    if (unknown.length > 0) {
      console.error(`Unknown instance id(s): ${unknown.join(", ")}`);
      console.error(`Known ids: ${SEED_INSTANCES.map((i) => i.id).join(", ")}`);
      process.exit(1);
    }
  }

  console.log(APPLY ? "Mode: APPLY (writes)" : "Mode: dry run (pass --apply to write)");

  for (const instance of SEED_INSTANCES) {
    if (ONLY && !ONLY.includes(instance.id)) continue;
    console.log(`\n${instance.label} (${instance.id})`);

    const token = await getToken(instance.suffix);
    if (!token) {
      if (!process.env[`OPTIMIZELY_CMS_CLIENT_ID${instance.suffix}`]) {
        console.log("  [skip] no credentials in .env.local");
      }
      continue;
    }

    const apps = await listApplications(token);
    if (!apps) continue;

    if (apps.length === 0) {
      console.log("  [skip] no applications on this instance");
      continue;
    }

    const current = apps.find((a) => a.isDefault);
    if (current) {
      console.log(`  ok - default application is "${current.key}"`);
      continue;
    }

    // Several applications and none flagged: picking one is a judgement call
    // about which site owns shared-block preview, so leave it to a human.
    if (apps.length > 1) {
      console.log(`  [skip] ${apps.length} applications, none is default - choose one manually:`);
      for (const a of apps) console.log(`           ${a.key} (${a.displayName ?? "-"})`);
      continue;
    }

    const app = apps[0];
    if (!APPLY) {
      console.log(`  would set "${app.key}" (${app.displayName ?? "-"}) as the default application`);
      continue;
    }

    const error = await setDefault(token, app);
    if (error) {
      console.log(`  [fail] could not update "${app.key}": ${error}`);
      console.log("         fall back to the CMS UI: Settings > Applications > set as default");
      continue;
    }

    console.log(
      (await verify(token, app.key))
        ? `  set "${app.key}" as the default application`
        : `  [fail] update accepted but "${app.key}" still reads isDefault: false`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
