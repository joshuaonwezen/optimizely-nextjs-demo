import { seedExternalSource, type ExternalRecord } from "./_contentSource";

// External "BankLocation" content source (id `locs`) with a GeoPoint `location`
// field for geo search. Seeded via the Content Source API using the shared
// helper (self-heals a corrupted `locs` mapping via delete + re-register).
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

async function main() {
  console.log("=== Location Seed Script ===\n");
  const records: ExternalRecord[] = LOCATIONS.map((loc) => ({
    id: loc.id,
    key: `loc-${loc.id}`,
    displayName: `${loc.branchName} - ${loc.city}`,
    fields: {
      "branchName$$String": loc.branchName,
      "address$$String":    loc.address,
      "city$$String":       loc.city,
      "country$$String":    loc.country,
      "phone$$String":      loc.phone,
      "services$$String":   loc.services,
      "location$$GeoPoint": { lat: loc.coordinates.lat, lon: loc.coordinates.lon },
    },
  }));

  const { indexed } = await seedExternalSource({
    sourceId: "locs",
    label: "Bank Locations",
    typeName: "BankLocation",
    properties: {
      branchName: { type: "String" },
      address:    { type: "String" },
      city:       { type: "String" },
      country:    { type: "String" },
      phone:      { type: "String" },
      services:   { type: "String" },
      location:   { type: "GeoPoint" },
    },
    records,
  });

  console.log(`\n=== Done (indexed ${indexed}) ===`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
