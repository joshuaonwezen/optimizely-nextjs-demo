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
  { id: 1,  branchName: "Mosey Bank Amsterdam Central",  address: "Damrak 101",             city: "Amsterdam",  country: "Netherlands",    phone: "+31 20 555 0100",   services: "Current accounts, mortgages, investments",    coordinates: { lat: 52.3676, lon: 4.9041  } },
  { id: 2,  branchName: "Mosey Bank Rotterdam Harbour",  address: "Blaak 200",              city: "Rotterdam",  country: "Netherlands",    phone: "+31 10 555 0200",   services: "Business banking, trade finance",             coordinates: { lat: 51.9244, lon: 4.4777  } },
  { id: 3,  branchName: "Mosey Bank Frankfurt Mitte",    address: "Kaiserstrasse 50",       city: "Frankfurt",  country: "Germany",        phone: "+49 69 555 0300",   services: "Private banking, asset management",           coordinates: { lat: 50.1109, lon: 8.6821  } },
  { id: 4,  branchName: "Mosey Bank Munich Marienplatz", address: "Kaufingerstrasse 15",    city: "Munich",     country: "Germany",        phone: "+49 89 555 0400",   services: "Retail banking, SME lending",                 coordinates: { lat: 48.1351, lon: 11.5820 } },
  { id: 5,  branchName: "Mosey Bank Brussels Centre",    address: "Boulevard du Midi 30",   city: "Brussels",   country: "Belgium",        phone: "+32 2 555 0500",    services: "Retail banking, insurance, online services", coordinates: { lat: 50.8503, lon: 4.3517  } },
  { id: 6,  branchName: "Mosey Bank Ghent Korenmarkt",   address: "Korenmarkt 12",          city: "Ghent",      country: "Belgium",        phone: "+32 9 555 0600",    services: "Mortgages, savings, personal loans",          coordinates: { lat: 51.0543, lon: 3.7174  } },
  { id: 7,  branchName: "Mosey Bank London City",        address: "Threadneedle Street 8",  city: "London",     country: "United Kingdom", phone: "+44 20 5550 0700",  services: "Investment banking, private banking",         coordinates: { lat: 51.5155, lon: -0.0922 } },
  { id: 8,  branchName: "Mosey Bank Edinburgh Royal",    address: "Princes Street 88",      city: "Edinburgh",  country: "United Kingdom", phone: "+44 131 555 0800",  services: "Retail banking, mortgages, savings",          coordinates: { lat: 55.9533, lon: -3.1883 } },
  { id: 9,  branchName: "Mosey Bank Stockholm Gamla",    address: "Stortorget 4",           city: "Stockholm",  country: "Sweden",         phone: "+46 8 555 0900",    services: "Personal banking, digital services",          coordinates: { lat: 59.3293, lon: 18.0686 } },
  { id: 10, branchName: "Mosey Bank Gothenburg Port",    address: "Ostra Hamngatan 22",     city: "Gothenburg", country: "Sweden",         phone: "+46 31 555 1000",   services: "Corporate banking, trade finance",            coordinates: { lat: 57.7089, lon: 11.9746 } },
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

async function registerContentType(auth: string, instanceName: string): Promise<void> {
  console.log("  Part 1: Registering BankLocation content type (GeoPoint location field)");

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
          location:   { type: "GeoPoint" },
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
  if (!res.ok) throw new Error(`Schema registration failed on ${instanceName}: ${res.status} ${text.slice(0, 300)}`);
  console.log(`  [ok] BankLocation type registered (${res.status})`);
}

async function seedLocations(auth: string, instanceName: string): Promise<void> {
  console.log(`  Part 2: Seeding ${LOCATIONS.length} bank locations`);

  const lines: string[] = [];
  for (const loc of LOCATIONS) {
    lines.push(JSON.stringify({ index: { _id: loc.id, language_routing: "en" } }));

    const props: Record<string, unknown> = {
      _rbac: "r:Everyone:Read",
      _itemMetadata: {
        key:                      `loc-${loc.id}`,
        displayName___searchable: `${loc.branchName} - ${loc.city}`,
        lastModified:             new Date().toISOString(),
        type:                     "BankLocation",
      },
      _metadata: {
        types:  ["BankLocation", "_Item"],
        locale: "en",
        key:    `loc-${loc.id}`,
        status: "Published",
      },
      "branchName$$String": loc.branchName,
      "address$$String":    loc.address,
      "city$$String":       loc.city,
      "country$$String":    loc.country,
      "phone$$String":      loc.phone,
      "services$$String":   loc.services,
      "location$$GeoPoint":  { lat: loc.coordinates.lat, lon: loc.coordinates.lon },
      ContentType: ["BankLocation"],
      Status:      "Published",
      Language:    { DisplayName: "English", Name: "en" },
    };

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

async function verifyIndexed(singleKey: string): Promise<void> {
  console.log("  Part 3: Verifying indexed data (waiting 10s for Graph)");
  await new Promise((r) => setTimeout(r, 10000));

  // Geo search sample: branches within 500km of Amsterdam, ranked nearest-first.
  const query = /* GraphQL */`
    query {
      BankLocation(
        where: { location: { distance: { origin: { lat: 52.3676, lon: 4.9041 }, radius: 500, unit: KM } } }
        orderBy: { location: { origin: { lat: 52.3676, lon: 4.9041 } } }
      ) {
        total
        items { branchName city country location { lat lon } }
      }
    }
  `;

  const res  = await fetch(GRAPH_GATEWAY, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `epi-single ${singleKey}` },
    body:    JSON.stringify({ query }),
  });
  const json = await res.json() as { data?: unknown; errors?: unknown };
  if (json.errors) console.warn("  [GraphQL errors]", JSON.stringify(json.errors, null, 2));
  console.log("  [geo search sample: within 500km of Amsterdam, nearest first]");
  console.log("  " + JSON.stringify(json.data, null, 2));
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
    await registerContentType(instance.auth, instance.name);
    await seedLocations(instance.auth, instance.name);
    await verifyIndexed(instance.singleKey);
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
