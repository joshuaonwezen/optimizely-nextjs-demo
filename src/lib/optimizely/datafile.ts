const DATAFILE_URL = `https://cdn.optimizely.com/datafiles/${process.env.OPTIMIZELY_FX_SDK_KEY}.json`;

// Shared by middleware (edge runtime) and the server SDK wrapper — must stay
// dependency-free so both runtimes can import it.
export async function fetchDatafile(timeoutMs?: number): Promise<string | null> {
  try {
    const res = await fetch(DATAFILE_URL, {
      next: { revalidate: 60 },
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    } as RequestInit);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
