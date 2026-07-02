"use client";
import { useState, useCallback, type FormEvent } from "react";

interface NearbyLocation {
  branchName: string;
  city: string;
  country: string;
  phone: string;
  services: string;
  distanceKm: number | null;
}

interface NearbyResponse {
  origin: { lat: number; lon: number; label: string } | null;
  items: NearbyLocation[];
  error?: string;
}

const RADIUS_OPTIONS = [250, 500, 1000, 2500];

export default function LocationsFinder() {
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(500);
  const [results, setResults] = useState<NearbyLocation[]>([]);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (q.length < 2) return;

      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/locations/nearby?q=${encodeURIComponent(q)}&radius=${radius}`);
        const data: NearbyResponse = await res.json();

        setSearched(true);
        setResults(data.items ?? []);
        setOriginLabel(data.origin?.label ?? null);

        if (data.error) {
          setMessage(data.error);
        } else if (!data.origin) {
          setMessage("We couldn't find that location. Try a city name or full address.");
        }
      } catch {
        setResults([]);
        setMessage("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [query, radius]
  );

  return (
    <div data-component="LocationsFinder" className="space-y-6">
      <form onSubmit={search} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City or address, e.g. Berlin"
          className="flex-1 px-4 py-2 text-sm bg-surface border border-ghost-border rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="px-3 py-2 text-sm bg-surface border border-ghost-border rounded-xl text-on-surface focus:outline-none"
          aria-label="Search radius"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              Within {r} km
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="px-5 py-2 text-sm font-medium bg-brand text-on-brand rounded-xl disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {originLabel && !message && (
        <p className="text-xs text-on-surface-variant">
          Nearest branches to <strong className="text-on-surface">{originLabel}</strong>
        </p>
      )}

      {message && <p className="text-sm text-on-surface-variant">{message}</p>}

      {!loading && searched && !message && results.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          No branches within {radius} km. Try a larger radius.
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-3">
          {results.map((loc) => (
            <li
              key={loc.branchName}
              className="flex items-start justify-between gap-4 bg-surface-lowest border border-ghost-border rounded-2xl p-5"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-on-surface">{loc.branchName}</p>
                <p className="text-xs text-on-surface-variant">
                  {loc.city}, {loc.country}
                </p>
                <p className="text-xs text-on-surface-variant">{loc.services}</p>
                <p className="text-xs text-on-surface-variant">{loc.phone}</p>
              </div>
              {loc.distanceKm != null && (
                <span className="shrink-0 text-xs font-medium text-brand whitespace-nowrap">
                  {loc.distanceKm} km away
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
