// Default time-based cache window (seconds) for published content. Freshness is
// driven by the publish webhook (revalidatePath/revalidateTag); this 1-hour TTL
// is the fallback ceiling. Query modules feed it to cacheLife({ revalidate }) in
// their "use cache" functions. Keep the `export const revalidate` in the
// catch-all page route in sync with this value.
export const CACHE_TTL = 3600;
