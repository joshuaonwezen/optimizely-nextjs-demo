import type { MetadataRoute } from "next";
import { getAllPageRoutes } from "@/lib/graphql/queries/GetAllPagePaths";
import { getSiteUrl } from "@/lib/siteUrl";

// Served at /sitemap.xml. Same page list as generateStaticParams, so the sitemap
// only advertises URLs the catch-all route actually renders.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const routes = await getAllPageRoutes();
  return routes.map((segments) => ({
    url: segments.length ? `${siteUrl}/${segments.join("/")}` : siteUrl,
    changeFrequency: "weekly",
    priority: segments.length ? 0.8 : 1,
  }));
}
