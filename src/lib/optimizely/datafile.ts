const DATAFILE_URL = `https://cdn.optimizely.com/datafiles/${process.env.OPTIMIZELY_FX_SDK_KEY}.json`;
const TTL_MS = 60_000;

// Module-level cache. `next: { revalidate }` only applies inside the App Router's
// fetch cache; middleware ignores it, so without this the datafile was downloaded on
// every navigation. A failed refresh keeps serving the last good copy.
let cached: { text: string; fetchedAt: number } | null = null;

// Shared by middleware and the server SDK wrapper - must stay dependency-free so
// both runtimes can import it.
export async function fetchDatafile(timeoutMs?: number): Promise<string | null> {
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.text;
  try {
    const res = await fetch(DATAFILE_URL, {
      next: { revalidate: 60 },
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    } as RequestInit);
    if (!res.ok) return cached?.text ?? null;
    const text = await res.text();
    cached = { text, fetchedAt: Date.now() };
    return text;
  } catch {
    return cached?.text ?? null;
  }
}
