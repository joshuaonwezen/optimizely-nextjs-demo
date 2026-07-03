"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type FacetValue = { name: string; count: number };
type SearchResult = {
  title: string;
  url: string;
  score: number;
  category: string | null;
  tags: string[];
};
type SearchResponse = {
  total: number;
  items: SearchResult[];
  facets: { category: FacetValue[]; tags: FacetValue[] };
};
type Suggestions = { tags: string[]; paths: string[] };

const EMPTY_SUGGESTIONS: Suggestions = { tags: [], paths: [] };

export default function FacetedSearchDemo() {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY_SUGGESTIONS);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string, cats: string[], tgs: string[]) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q || q.length < 2) {
      setResponse(null);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, facets: "1" });
        if (cats.length > 0) params.set("category", cats.join(","));
        if (tgs.length > 0) params.set("tags", tgs.join(","));
        const res = await fetch(`/api/search?${params}`);
        setResponse(await res.json());
      } catch {
        setResponse(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const autocomplete = useCallback((q: string) => {
    if (autocompleteDebounce.current) clearTimeout(autocompleteDebounce.current);
    if (!q || q.length < 2) {
      setSuggestions(EMPTY_SUGGESTIONS);
      return;
    }
    autocompleteDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions({ tags: data.tags ?? [], paths: data.paths ?? [] });
      } catch {
        setSuggestions(EMPTY_SUGGESTIONS);
      }
    }, 200);
  }, []);

  useEffect(() => {
    search(query, categories, tags);
  }, [query, categories, tags, search]);

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function applySuggestion(value: string) {
    setShowSuggestions(false);
    if (value.startsWith("/")) {
      window.location.href = value;
      return;
    }
    setQuery(value);
    autocomplete("");
  }

  const hasSuggestions = suggestions.tags.length > 0 || suggestions.paths.length > 0;

  return (
    <div data-component="FacetedSearchDemo" className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            autocomplete(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Search articles - try banking, mortgage, savings…"
          className="w-full px-4 py-2 text-sm bg-surface border border-ghost-border rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {showSuggestions && hasSuggestions && (
          <div className="absolute z-20 mt-1 w-full bg-surface border border-ghost-border rounded-xl shadow-lift overflow-hidden">
            {suggestions.tags.length > 0 && (
              <div className="p-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant px-2 pb-1">Tags</p>
                {suggestions.tags.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => applySuggestion(s)}
                    className="block w-full text-left px-2 py-1.5 text-sm text-on-surface rounded-lg hover:bg-surface-low"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {suggestions.paths.length > 0 && (
              <div className="p-2 border-t border-ghost-border">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant px-2 pb-1">Pages</p>
                {suggestions.paths.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => applySuggestion(s)}
                    className="block w-full text-left px-2 py-1.5 text-sm font-mono text-brand rounded-lg hover:bg-surface-low truncate"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <div className="space-y-4">
          <FacetGroup
            label="Category"
            values={response?.facets.category ?? []}
            selected={categories}
            onToggle={(v) => toggle(categories, v, setCategories)}
          />
          <FacetGroup
            label="Tags"
            values={response?.facets.tags ?? []}
            selected={tags}
            onToggle={(v) => toggle(tags, v, setTags)}
          />
          {(categories.length > 0 || tags.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setCategories([]);
                setTags([]);
              }}
              className="text-xs text-brand hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="space-y-2 min-h-24">
          {loading && <p className="text-xs text-on-surface-variant">Searching…</p>}
          {!loading && response && (
            <p className="text-xs text-on-surface-variant">
              {response.total} result{response.total !== 1 ? "s" : ""} for{" "}
              <strong className="text-on-surface">&ldquo;{query}&rdquo;</strong>
              {categories.length + tags.length > 0 && (
                <> · {categories.length + tags.length} filter{categories.length + tags.length !== 1 ? "s" : ""} active</>
              )}
            </p>
          )}
          {!loading && response && response.items.length > 0 && (
            <ul className="space-y-2 divide-y divide-ghost-border">
              {response.items.map((r) => (
                <li key={r.url} className="pt-2 first:pt-0 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <a href={r.url} className="text-brand hover:underline truncate">{r.title}</a>
                    <span className="text-xs font-mono text-on-surface-variant shrink-0">{r.score.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {r.category && <span className="font-mono">{r.category}</span>}
                    {r.tags.length > 0 && <span className="font-mono"> · {r.tags.join(", ")}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {!loading && query.length >= 2 && response && response.items.length === 0 && (
            <p className="text-xs text-on-surface-variant italic">No results match the query and active filters.</p>
          )}
          {query.length < 2 && (
            <p className="text-xs text-on-surface-variant italic">
              Type at least two characters. Facet counts appear with the first results.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-on-surface-variant border-t border-ghost-border pt-3">
        Calls <code className="bg-surface px-1 rounded font-mono">/api/search?facets=1</code> and{" "}
        <code className="bg-surface px-1 rounded font-mono">/api/search/autocomplete</code> - facet
        counts are computed by Graph on the filtered result set, so they narrow as you drill down.
      </p>
    </div>
  );
}

function FacetGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div data-component="FacetGroup">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-2">{label}</p>
      {values.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic">No values yet.</p>
      ) : (
        <ul className="space-y-1">
          {values.map((v) => (
            <li key={v.name}>
              <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(v.name)}
                  onChange={() => onToggle(v.name)}
                  className="accent-brand"
                />
                <span className="truncate">{v.name}</span>
                <span className="ml-auto font-mono text-on-surface-variant">{v.count}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
