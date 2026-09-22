"use client";

import { READ_CATEGORIES_COOKIE } from "@/lib/optimizely/cookieNames";
import { keyFromTermUri } from "@/lib/taxonomy";

// Which CMS category terms this visitor reads most.
//
// The counters live in localStorage (per browser, survives the session) and the top
// few are mirrored into a cookie so the server can read them with no network call.
// See the note on READ_CATEGORIES_COOKIE in cookieNames.ts.
//
// Values are taxonomy term KEYS, never URIs: they end up in a Graph filter and in a
// "use cache" key, so the shape has to stay tight and bounded.

const STORAGE_KEY = "mb_read_category_counts";
// Kept in step with the reader in lib/optimizely/profile.ts, which caps at 3 too.
const MAX_CATEGORIES = 3;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

// `n` = how many times seen, `t` = when last seen. Both matter: see rank().
type Entry = { n: number; t: number };
type Counts = Record<string, Entry>;

function readCounts(): Counts {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const counts: Counts = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      // Tolerate the bare-number shape an earlier build wrote.
      if (typeof value === "number" && Number.isFinite(value)) {
        counts[key] = { n: value, t: 0 };
        continue;
      }
      if (value && typeof value === "object") {
        const { n, t } = value as { n?: unknown; t?: unknown };
        if (typeof n === "number" && Number.isFinite(n)) {
          counts[key] = { n, t: typeof t === "number" && Number.isFinite(t) ? t : 0 };
        }
      }
    }
    return counts;
  } catch {
    return {};
  }
}

// Same guard the server applies, so a hand-edited localStorage cannot put anything
// unexpected into the cookie.
function isTermKey(key: string): boolean {
  return /^[a-z0-9_]{1,64}$/.test(key);
}

// Read count first, then most-recently-seen, then key.
//
// The recency tier is load-bearing, not a nicety. Every article carries four or five
// terms and each view scores them all equally, so after one or two articles EVERYTHING
// is tied at n=1 and whatever sits in the next tier decides the whole ranking. When
// that tier was the key, the result was alphabetical: reading a mortgages article then
// a first-home article evicted the mortgages terms outright, and "most-read" was really
// "alphabetically first". Recency makes the small-n case behave the way a visitor
// expects, and counts take over once someone has actually read a few things.
//
// The key remains as a final tier so the order stays deterministic, which matters: this
// list becomes a Graph filter and part of a "use cache" key.
function rank(counts: Counts): string[] {
  return Object.entries(counts)
    .filter(([key]) => isTermKey(key))
    .sort(
      ([aKey, a], [bKey, b]) => b.n - a.n || b.t - a.t || aKey.localeCompare(bKey),
    )
    .slice(0, MAX_CATEGORIES)
    .map(([key]) => key);
}

/** Record that the visitor viewed content in these category term URIs. */
export function recordCategoryView(uris: string[]): void {
  if (typeof window === "undefined" || uris.length === 0) return;

  const keys = uris
    .map((uri) => keyFromTermUri(uri) ?? uri)
    .filter((key) => isTermKey(key));
  if (keys.length === 0) return;

  const counts = readCounts();
  const now = Date.now();
  for (const key of keys) counts[key] = { n: (counts[key]?.n ?? 0) + 1, t: now };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Private mode or blocked storage: the cookie below still reflects this view.
  }

  const top = rank(counts);
  if (top.length > 0) {
    document.cookie = `${READ_CATEGORIES_COOKIE}=${top.join(",")}; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
  }
}

/** The visitor's most-read category term keys, most-read first. */
export function readTopCategories(): string[] {
  if (typeof window === "undefined") return [];
  return rank(readCounts());
}
