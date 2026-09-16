import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

// Served at /robots.txt.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/preview", "/api/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
