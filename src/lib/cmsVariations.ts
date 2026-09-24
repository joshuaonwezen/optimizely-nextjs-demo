// Edge-safe. Mirrors redirects.ts exactly: middleware cannot import the Graph client
// (and "use cache"/cacheTag do not work in the middleware runtime), so it reaches the
// CMS variation names over HTTP via /api/cms-variations instead. Keep it that way.

const TTL_MS = 30_000;

// Best-effort in-memory guard so the hot path does zero I/O. A cold worker just does
// the subrequest; correctness never depends on this global surviving.
let cache: { at: number; names: string[] } | null = null;

export async function loadCmsVariationNames(origin: string): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.names;
  try {
    const res = await fetch(`${origin}/api/cms-variations`, {
      headers: { "x-mw-cms-variations": "1" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return cache?.names ?? [];
    const body = (await res.json()) as { names?: string[] };
    cache = { at: Date.now(), names: body.names ?? [] };
    return cache.names;
  } catch {
    // Never fail a request over this. An empty list rejects the segment, which
    // degrades to base content rather than to an error.
    return cache?.names ?? [];
  }
}
