// Absolute origin for URLs that leave the app (sitemap, robots). NEXT_PUBLIC_SITE_URL
// wins; on Vercel the production domain is the fallback, locally localhost.
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
