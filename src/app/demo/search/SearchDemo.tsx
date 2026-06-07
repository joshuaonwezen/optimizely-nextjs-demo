"use client";
import { useState, useCallback, useRef } from "react";

type SearchResult = { title: string; url: string; score: number };

export default function SearchDemo() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"relevance" | "semantic">("relevance");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string, m: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) {
      setResults([]);
      setTotal(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&mode=${m}`);
        const data = await res.json();
        setResults(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  return (
    <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value, mode);
          }}
          placeholder="Type to search published content…"
          className="flex-1 px-4 py-2 text-sm bg-surface border border-ghost-border rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <select
          value={mode}
          onChange={(e) => {
            const m = e.target.value as "relevance" | "semantic";
            setMode(m);
            search(query, m);
          }}
          className="px-3 py-2 text-sm bg-surface border border-ghost-border rounded-xl text-on-surface focus:outline-none"
        >
          <option value="relevance">Relevance</option>
          <option value="semantic">Semantic</option>
        </select>
      </div>

      {loading && (
        <p className="text-xs text-on-surface-variant">Searching…</p>
      )}

      {!loading && total !== null && (
        <p className="text-xs text-on-surface-variant">
          {total} result{total !== 1 ? "s" : ""} for{" "}
          <strong className="text-on-surface">&ldquo;{query}&rdquo;</strong>
          {" "}· <span className="font-mono">{mode}</span> ranking
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2 divide-y divide-ghost-border">
          {results.map((r) => (
            <li key={r.url} className="flex items-center justify-between gap-4 pt-2 first:pt-0 text-sm">
              <a href={r.url} className="text-brand hover:underline truncate">{r.title}</a>
              <span className="text-xs font-mono text-on-surface-variant shrink-0">
                {r.score.toFixed(3)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.length >= 2 && results.length === 0 && total !== null && (
        <p className="text-xs text-on-surface-variant italic">No results found.</p>
      )}

      <p className="text-xs text-on-surface-variant border-t border-ghost-border pt-3">
        Calls <code className="bg-surface px-1 rounded font-mono">/api/search</code> with{" "}
        <code className="bg-surface px-1 rounded font-mono">cache: &ldquo;no-store&rdquo;</code>
        {" "}- results are never cached.
      </p>
    </div>
  );
}
