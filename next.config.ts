import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { CACHE_TTL } from "./src/lib/optimizely/client";

// `npm run analyze` opens the treemap; a normal build is unaffected.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "1",
});

const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Demo pages render their own source with fs.readFileSync; some read scripts/.
    "/demo/(.*)": ["./src/**/*", "./scripts/**/*"],
  },

  /**
   * Enables the `"use cache"` directive plus cacheTag() / cacheLife(), without
   * the full cacheComponents migration (which would also force ppr: true).
   * Lets a query module cache its own return value instead of depending on
   * next: { revalidate, tags } reaching the underlying fetch() - which the
   * cms-sdk Graph client does not forward.
   */
  experimental: {
    useCache: true,
    // Both Optimizely SDKs are large barrel exports; this trims what a client
    // chunk pulls in per named import.
    optimizePackageImports: ["@optimizely/optimizely-sdk", "@optimizely/cms-sdk"],
  },

  compiler: {
    // console.error survives so Graph/render failures stay diagnosable in prod;
    // the warn on the FX decision hot path does not ship.
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  /**
   * Allow the Optimizely CMS to embed this site in an iframe for Visual Builder.
   * Without the Content-Security-Policy frame-ancestors directive, the on-page
   * editor iframe will be blocked by the browser.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${cmsUrl}`,
          },
        ],
      },
    ];
  },

  /**
   * Allow Next.js Image to load images from the Optimizely CMS and Graph CDN.
   */
  images: {
    // AVIF first, WebP fallback. Next's default is WebP only, so AVIF was never
    // being served to browsers that support it.
    formats: ["image/avif", "image/webp"],
    // Matches the published-content TTL used everywhere else.
    minimumCacheTTL: CACHE_TTL,
    // Default tops out at 3840px. The 2048/3840 cuts were only ever reachable
    // via the many `fill` + `sizes="100vw"` call sites and cost real variant
    // generation for displays this demo does not target.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cms.optimizely.com",
      },
      {
        protocol: "https",
        hostname: "**.cmp.optimizely.com",
      },
      {
        protocol: "https",
        hostname: "cg.optimizely.com",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
