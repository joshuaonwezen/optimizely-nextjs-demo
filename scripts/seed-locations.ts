import { config } from "dotenv";

config({ path: ".env.local" });

const GRAPH_BASE    = "https://cg.optimizely.com";
const GRAPH_GATEWAY = process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";
const SOURCE_ID     = "locs";

interface Location {
  id: number;
  branchName: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  services: string;
  coordinates: { lat: number; lon: number };
}

const LOCATIONS: Location[] = [
  { id: 1,  branchName: "ING Bank Centraal",         address: "Bijlmerplein 888",       city: "Amsterdam",  country: "Netherlands",    phone: "+31 20 228 9000",   services: "Current accounts, mortgages, investments",      coordinates: { lat: 52.3676, lon: 4.9041  } },
  { id: 2,  branchName: "Rabobank Rotterdam",         address: "Blaak 333",              city: "Rotterdam",  country: "Netherlands",    phone: "+31 10 213 7000",   services: "Business banking, trade finance",               coordinates: { lat: 51.9244, lon: 4.4777  } },
  { id: 3,  branchName: "Deutsche Bank Frankfurt",    address: "Taunusanlage 12",        city: "Frankfurt",  country: "Germany",        phone: "+49 69 910 00",     services: "Private banking, asset management",            coordinates: { lat: 50.1109, lon: 8.6821  } },
  { id: 4,  branchName: "Commerzbank Muenchen",       address: "Theatinerstrasse 11",    city: "Munich",     country: "Germany",        phone: "+49 89 4545 0",     services: "Retail banking, SME lending",                   coordinates: { lat: 48.1351, lon: 11.5820 } },
  { id: 5,  branchName: "KBC Brussels Centre",        address: "Havenlaan 2",            city: "Brussels",   country: "Belgium",        phone: "+32 2 429 4111",    services: "Retail banking, insurance, online services",   coordinates: { lat: 50.8503, lon: 4.3517  } },
  { id: 6,  branchName: "BNP Paribas Fortis Gent",   address: "Veldstraat 49",          city: "Ghent",      country: "Belgium",        phone: "+32 9 265 0000",    services: "Mortgages, savings, personal loans",            coordinates: { lat: 51.0543, lon: 3.7174  } },
  { id: 7,  branchName: "Barclays London City",       address: "1 Churchill Place",      city: "London",     country: "United Kingdom", phone: "+44 20 7116 1000",  services: "Investment banking, private banking",          coordinates: { lat: 51.5155, lon: -0.0922 } },
  { id: 8,  branchName: "Lloyds Edinburgh",           address: "125 Princes Street",    city: "Edinburgh",  country: "United Kingdom", phone: "+44 131 623 0000",  services: "Retail banking, mortgages, savings",            coordinates: { lat: 55.9533, lon: -3.1883 } },
  { id: 9,  branchName: "Swedbank Stockholm",         address: "Landsvaegen 40",         city: "Stockholm",  country: "Sweden",         phone: "+46 8 585 900 00",  services: "Personal banking, digital services",           coordinates: { lat: 59.3293, lon: 18.0686 } },
  { id: 10, branchName: "Nordea Goeteborg",           address: "Ostra Hamngatan 16",     city: "Gothenburg", country: "Sweden",         phone: "+46 10 157 1000",   services: "Corporate banking, trade finance",             coordinates: { lat: 57.7089, lon: 11.9746 } },
];

interface Instance {
  name: string;
  auth: string;
  singleKey: string;
}

function buildInstances(): Instance[] {
  const instances: Instance[] = [];

  const key1    = process.env.OPTIMIZELY_APP_KEY;
  const secret1 = process.env.OPTIMIZELY_APP_SECRET;
  if (key1 && secret1) {
    instances.push({
      name:      "personal",
      auth:      `Basic ${Buffer.from(`${key1}:${secret1}`).toString("base64")}`,
      singleKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "",
    });
  }

  const key2    = process.env.OPTIMIZELY_APP_KEY_ONBOARDING;
  const secret2 = process.env.OPTIMIZELY_APP_SECRET_ONBOARDING;
  if (key2 && secret2) {
    instances.push({
      name:      "onboarding",
      auth:      `Basic ${Buffer.from(`${key2}:${secret2}`).toString("base64")}`,
      singleKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY_ONBOARDING ?? "",
    });
  }

  return instances;
}

async function registerContentType(auth: string, instanceName: string): Promise<boolean> {
  console.log("  Part 1: Registering BankLocation content type (GeoPoint)");

  const body = {
    label: "Bank Locations",
    languages: ["en"],
    contentTypes: {
      BankLocation: {
        contentType: ["_Item"],
        properties: {
          branchName:  { type: "String" },
          address:     { type: "String" },
          city:        { type: "String" },
          country:     { type: "String" },
          phone:       { type: "String" },
          services:    { type: "String" },
          coordinates: { type: "GeoPoint" },
        },
      },
    },
    preset: "next",
    useTypedFieldNames: true,
  };

  const res  = await fetch(`${GRAPH_BASE}/api/content/v3/types?id=${SOURCE_ID}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body:    JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    console.warn(`  [warn] GeoPoint type rejected by ${instanceName} (${res.status}): ${text.slice(0, 300)}`);
    console.log("  Falling back to lat/lon as separate Float fields");
    return await registerFallbackContentType(auth, instanceName);
  }

  console.log(`  [ok] BankLocation type registered with GeoPoint (${res.status})`);
  return true;
}

async function registerFallbackContentType(auth: string, instanceName: string): Promise<boolean> {
  const body = {
    label: "Bank Locations",
    languages: ["en"],
    contentTypes: {
      BankLocation: {
        contentType: ["_Item"],
        properties: {
          branchName: { type: "String" },
          address:    { type: "String" },
          city:       { type: "String" },
          country:    { type: "String" },
          phone:      { type: "String" },
          services:   { type: "String" },
          lat:        { type: "Float" },
          lon:        { type: "Float" },
        },
      },
    },
    preset: "next",
    useTypedFieldNames: true,
  };

  const res  = await fetch(`${GRAPH_BASE}/api/content/v3/types?id=${SOURCE_ID}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body:    JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Fallback registration failed on ${instanceName}: ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] BankLocation type registered with lat/lon floats (${res.status})`);
  return false;
}

async function seedLocations(auth: string, geoPoint: boolean, instanceName: string): Promise<void> {
  console.log(`  Part 2: Seeding ${LOCATIONS.length} bank locations`);

  const lines: string[] = [];
  for (const loc of LOCATIONS) {
    lines.push(JSON.stringify({ index: { _id: loc.id, language_routing: "en" } }));

    const props: Record<string, unknown> = {
      _itemMetadata: {
        key:                      `loc-${loc.id}`,
        displayName___searchable: `${loc.branchName} - ${loc.city}`,
        lastModified:             new Date().toISOString(),
        type:                     "BankLocation",
      },
      branchName:  loc.branchName,
      address:     loc.address,
      city:        loc.city,
      country:     loc.country,
      phone:       loc.phone,
      services:    loc.services,
      ContentType: ["BankLocation"],
      Status:      "Published",
      Language:    { DisplayName: "English", Name: "en" },
      _rbac:       { read: ["Everyone"] },
    };

    if (geoPoint) {
      props.coordinates = loc.coordinates;
    } else {
      props.lat = loc.coordinates.lat;
      props.lon = loc.coordinates.lon;
    }

    lines.push(JSON.stringify(props));
  }

  const res = await fetch(`${GRAPH_BASE}/api/content/v2/data?id=${SOURCE_ID}`, {
    method:  "POST",
    headers: {
      "Content-Type": "text/plain",
      "og-job-id":    `seed-locations-${instanceName}-${Date.now()}`,
      Authorization:  auth,
    },
    body: lines.join("\n"),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Data sync failed on ${instanceName}: ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] ${LOCATIONS.length} locations synced (${res.status})`);
}

async function verifyIndexed(singleKey: string, geoPoint: boolean): Promise<void> {
  console.log("  Part 3: Verifying indexed data (waiting 10s for Graph)");
  await new Promise((r) => setTimeout(r, 10000));

  const basicQuery = /* GraphQL */`
    query {
      BankLocation(limit: 3, orderBy: { city: ASC }) {
        items { branchName city country }
      }
    }
  `;

  const basicRes = await fetch(GRAPH_GATEWAY, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${singleKey}` },
    body:    JSON.stringify({ query: basicQuery }),
  });
  const basicJson = await basicRes.json() as { data?: unknown; errors?: unknown };
  if (basicJson.errors) console.warn("  [GraphQL errors - basic]", JSON.stringify(basicJson.errors, null, 2));
  console.log("  [indexed sample]", JSON.stringify(basicJson.data, null, 2));

  if (!geoPoint) {
    console.log("  [skip] GeoPoint not used - skipping geo-search test");
    return;
  }

  console.log("\n  Part 4: Testing geo-search (500km from Amsterdam)");

  const geoQuery = /* GraphQL */`
    query {
      BankLocation(
        where: {
          coordinates: {
            distance: {
              origin: { lat: 52.3676, lon: 4.9041 }
              radius: 500
              unit: KM
            }
          }
        }
      ) {
        total
        items { branchName city country }
      }
    }
  `;

  const geoRes = await fetch(GRAPH_GATEWAY, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${singleKey}` },
    body:    JSON.stringify({ query: geoQuery }),
  });
  const geoJson = await geoRes.json() as { data?: unknown; errors?: unknown };

  if (geoJson.errors) {
    console.warn("  [GEO-SEARCH FAILED] Graph rejected the distance filter:");
    console.warn("  ", JSON.stringify(geoJson.errors, null, 2));
    console.log("  Finding: GeoPoint type was accepted at schema registration time but geo-distance");
    console.log("  queries do not work via the Content Source API. The Graph engineer's assessment");
    console.log("  is correct - a native GeoPoint type in SaaS CMS is needed for this to work.");
  } else {
    console.log("  [GEO-SEARCH PASSED]", JSON.stringify(geoJson.data, null, 2));
  }
}

async function main() {
  const instances = buildInstances();
  if (instances.length === 0) {
    console.error("Missing OPTIMIZELY_APP_KEY/APP_SECRET in .env.local");
    process.exit(1);
  }

  console.log(`=== Location Seed Script (${instances.map((i) => i.name).join(", ")}) ===\n`);

  for (const instance of instances) {
    console.log(`\n--- ${instance.name} ---`);
    const geoPoint = await registerContentType(instance.auth, instance.name);
    await seedLocations(instance.auth, geoPoint, instance.name);
    await verifyIndexed(instance.singleKey, geoPoint);
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
