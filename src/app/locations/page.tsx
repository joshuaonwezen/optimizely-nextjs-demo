import type { Metadata } from "next";
import LocationsFinder from "./LocationsFinder";

export const metadata: Metadata = {
  title: "Find your nearest branch | Mosey Bank",
};

export default function LocationsPage() {
  return (
    <main data-component="LocationsPage" className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-on-surface">Find your nearest branch</h1>
        <p className="text-sm text-on-surface-variant">
          Enter a city or address and we&apos;ll show the closest Mosey Bank branches, ranked by distance.
        </p>
      </header>

      <LocationsFinder />
    </main>
  );
}
