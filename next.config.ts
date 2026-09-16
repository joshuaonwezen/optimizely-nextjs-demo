import type { NextConfig } from "next";

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

export default nextConfig;
