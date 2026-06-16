"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

interface SearchResult {
  title:    string;
  url:      string;
  score:    number;
  trackUrl: string | null;
}

type SearchMode = "relevance" | "semantic";

interface Props {
  onClose: () => void;
}

export default function SearchOverlay({ onClose }: Props) {
  const [query,   setQuery]   = useState("");
  const [mode,    setMode]    = useState<SearchMode>("relevance");
  const [weight,  setWeight]  = useState(0.5);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const runSearch = useCallback(async (q: string, m: SearchMode, w: number) => {
    if (q.length < 2) { setResults([]); setTotal(0); return; }
    setLoading(true);
    try {
      const url = m === "semantic"
        ? `/api/search?q=${encodeURIComponent(q)}&mode=semantic&weight=${w}`
        : `/api/search?q=${encodeURIComponent(q)}&mode=relevance`;
      const res  = await fetch(url);
      const data = await res.json();
      setResults(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(value, mode, weight), 300);
  };

  const handleModeChange = (m: SearchMode) => {
    setMode(m);
    if (query.length >= 2) runSearch(query, m, weight);
  };

  const handleWeightChange = (w: number) => {
    setWeight(w);
    if (query.length >= 2) runSearch(query, mode, w);
  };

  return (
    <div
      data-component="SearchOverlay"
      className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-24 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-lowest rounded-2xl shadow-2xl w-full max-w-2xl border border-ghost-border overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ghost-border">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-on-surface-variant">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
          />
          <button
            onClick={onClose}
            className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 px-5 py-3 border-b border-ghost-border">
          {(["relevance", "semantic"] as SearchMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                mode === m
                  ? "bg-brand text-on-brand"
                  : "text-on-surface-variant hover:text-brand"
              }`}
            >
              {m}
            </button>
          ))}
          <span className="ml-auto text-xs text-on-surface-variant self-center">
            {mode === "semantic" ? "Vector similarity" : "Keyword (BM25)"}
          </span>
        </div>

        {/* Semantic weight slider */}
        {mode === "semantic" && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-ghost-border">
            <span className="text-xs text-on-surface-variant shrink-0">BM25</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={weight}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
              className="flex-1 accent-brand h-1.5 cursor-pointer"
            />
            <span className="text-xs text-on-surface-variant shrink-0">Semantic</span>
            <span className="text-xs font-mono text-brand w-8 text-right shrink-0">
              {weight.toFixed(2)}
            </span>
          </div>
        )}

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-5 py-8 text-sm text-center text-on-surface-variant">
              Searching…
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-5 py-8 text-sm text-center text-on-surface-variant">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul>
              {results.map((r, i) => (
                <li key={i}>
                  <Link
                    href={r.url}
                    onClick={() => {
                      onClose();
                      if (r.trackUrl) fetch(r.trackUrl, { method: "GET", mode: "no-cors" }).catch(() => {});
                    }}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-low transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-medium text-on-surface group-hover:text-brand transition-colors">
                        {r.title}
                      </div>
                      <div className="text-xs text-on-surface-variant mt-0.5 truncate max-w-md">
                        {r.url}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-on-surface-variant opacity-60 text-right">
                      <span className="block">{r.score.toFixed(2)}</span>
                      <span className="block text-[10px] uppercase tracking-wide">
                        {mode === "semantic" ? "similarity" : "BM25"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!loading && query.length < 2 && (
            <div className="px-5 py-8 text-sm text-center text-on-surface-variant">
              Type at least 2 characters to search
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && results.length > 0 && (
          <div className="px-5 py-2 border-t border-ghost-border text-xs text-on-surface-variant text-right">
            {total} result{total !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
