// CMS instance origin with any trailing slash removed. Callers append paths
// ("/util/javascript/communicationinjector.js"), and the CMS 404s on a `//` path:
// a value saved as "https://app-xxx.cms.optimizely.com/" silently stopped the
// on-page edit overlay from loading while the preview itself still rendered.
export function getCmsUrl(): string {
  return (process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "").replace(/\/+$/, "");
}
